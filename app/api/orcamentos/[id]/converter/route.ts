import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const rawOrcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        OrcamentoServico: true,
        OrcamentoPeca: true,
      }
    });

    if (!rawOrcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    const { OrcamentoServico, OrcamentoPeca, ...rest } = rawOrcamento;
    const orcamento = {
      ...rest,
      servicos: OrcamentoServico,
      pecas: OrcamentoPeca,
    };

    if (!orcamento.veiculo_id) {
      return NextResponse.json({ 
        error: 'É necessário vincular um veículo ao orçamento antes de converter em OS' 
      }, { status: 400 });
    }

    if (orcamento.status === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Orçamento já foi convertido em OS' }, { status: 400 });
    }

    // Função para buscar o menor número de OS disponível (reutilizando lacunas de excluídos)
    async function obterProximoNumeroOS(tx: any): Promise<number> {
      const ordens = await tx.ordemServico.findMany({
        select: { numero: true },
        orderBy: { numero: 'asc' }
      });

      let nextNumber = 1;
      for (const o of ordens) {
        if (o.numero === nextNumber) {
          nextNumber++;
        } else if (o.numero > nextNumber) {
          break;
        }
      }
      return nextNumber;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let result: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await prisma.$transaction(async (tx) => {
          const proximoNumero = await obterProximoNumeroOS(tx);

          // 1. Criar a OS com número sequencial real livre de lacunas
          const os = await tx.ordemServico.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              numero: proximoNumero,
              tipoOS: 'OFICINA',
              cliente_id: orcamento.cliente_id,
              veiculo_id: orcamento.veiculo_id!,
              status: 'ABERTA',
              orcamento_id: orcamento.id,
              valor_servicos: orcamento.valor_servicos,
              valor_pecas: orcamento.valor_pecas,
              valor_total: orcamento.valor_total,
              desconto: orcamento.desconto,
              observacoes: orcamento.observacoes,
              created_by: user?.name || user?.email || 'Sistema',
              data_entrada: new Date(),
              updated_at: new Date(),
            }
          });

          // 2. Criar serviços da OS
          if (orcamento.servicos.length > 0) {
            await tx.servicoOS.createMany({
              data: orcamento.servicos.map(s => ({
                id: globalThis.crypto.randomUUID(),
                os_id: os.id,
                descricao: s.descricao,
                horas: s.horas,
                valor_hora: s.valor_hora,
                valor_total: s.valor_total,
              }))
            });
          }

          // 3. Criar peças aplicadas na OS (Somente as que possuem vínculo com estoque)
          if (orcamento.pecas.length > 0) {
            for (const p of orcamento.pecas) {
              if (p.peca_id) {
                // Verifica se a peça existe no estoque antes de aplicar
                const pecaExistente = await tx.peca.findUnique({ where: { id: p.peca_id } });
                
                if (pecaExistente) {
                  console.error('[PECAAPLICADA AUDIT] CREATE_CONVERSION', '/app/api/orcamentos/[id]/converter/route.ts');
                  await tx.pecaAplicada.create({
                    data: {
                      id: globalThis.crypto.randomUUID(),
                      os_id: os.id,
                      peca_id: p.peca_id,
                      quantidade: p.quantidade,
                      valor_unit: p.valor_unit,
                      valor_total: p.valor_total,
                    }
                  });

                  // Baixa de estoque automática na conversão (opcional, mas comum)
                  if (pecaExistente.quantidade >= p.quantidade) {
                    await tx.peca.update({
                      where: { id: p.peca_id },
                      data: { quantidade: { decrement: p.quantidade } }
                    });
                  }
                }
              }
            }
          }

          // 4. Atualizar status do Orçamento
          await tx.orcamento.update({
            where: { id: orcamento.id },
            data: { status: 'CONVERTIDO' }
          });

          // 5. Criar evento na agenda
          await tx.eventoAgenda.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id: orcamento.empresa_id,
              titulo: `Orçamento Convertido: ${orcamento.numero}`,
              descricao: `Orçamento convertido em OS #${os.numero}`,
              data_inicio: new Date(),
              data_fim: new Date(new Date().getTime() + 3600000),
              tipo: 'OS',
              status: 'CONCLUIDO',
              os_id: os.id,
              cliente_id: os.cliente_id,
              veiculo_id: os.veiculo_id,
              usuario_id: user?.id || 'admin',
              updated_at: new Date(),
            }
          });

          return os;
        });

        // Se a transação completou sem erros na concorrência, saímos do loop de tentativa
        break;
      } catch (err: any) {
        const isUniqueConstraint = err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'));
        if (isUniqueConstraint && attempts < maxAttempts) {
          console.warn(`[CONCORRENCIA] Colisão detectada ao converter orçamento para OS. Tentativa ${attempts} falhou. Retentando...`);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao converter orçamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao converter orçamento' }, { status: 500 });
  }
}
