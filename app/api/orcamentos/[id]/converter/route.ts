import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import { converterUnidade } from '@/lib/unidades';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // A25/C05: exige permissão específica para converter orçamentos
    if (!checkPermission(user, 'orcamentos', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawOrcamento = await prisma.orcamento.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        OrcamentoServico: true,
        OrcamentoPeca: true,
      },
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
      return NextResponse.json(
        {
          error:
            'É necessário vincular um veículo ao orçamento antes de converter em OS',
        },
        { status: 400 }
      );
    }

    if (orcamento.status === 'CONVERTIDO') {
      return NextResponse.json(
        { error: 'Orçamento já foi convertido em OS' },
        { status: 400 }
      );
    }

    if (orcamento.status === 'REPROVADO') {
      return NextResponse.json(
        { error: 'Orçamento reprovado não pode ser convertido em OS' },
        { status: 400 }
      );
    }

    if (orcamento.status !== 'APROVADO') {
      return NextResponse.json(
        {
          error:
            'Apenas orçamentos com status APROVADO podem ser convertidos em OS',
        },
        { status: 400 }
      );
    }

    async function obterProximoNumeroOS(tx: any, empresaId: string): Promise<number> {
      // ✅ OTIMIZADO: usa _max para achar o maior número em vez de carregar todas as OS
      const maxResult = await tx.ordemServico.aggregate({
        _max: { numero: true },
        where: { empresa_id: empresaId },
      });

      return (maxResult._max.numero || 0) + 1;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let result: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await prisma.$transaction(async (tx) => {
          const empresaId = user.empresa_id;
          const proximoNumero = await obterProximoNumeroOS(tx, empresaId);

          // 1. Criar a OS
          const os = await tx.ordemServico.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id: empresaId,
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
            },
          });

          // 2. Criar serviços da OS
          if (orcamento.servicos.length > 0) {
            await tx.servicoOS.createMany({
              data: orcamento.servicos.map((s) => ({
                id: globalThis.crypto.randomUUID(),
                os_id: os.id,
                descricao: s.descricao,
                horas: s.horas,
                valor_hora: s.valor_hora,
                valor_total: s.valor_total,
              })),
            });
          }

          // 3. Criar peças aplicadas E baixar do estoque corretamente (A02)
          if (orcamento.pecas.length > 0) {
            for (const p of orcamento.pecas) {
              if (!p.peca_id) continue;

              // M09: busca a peça filtrando por empresa
              const pecaExistente = await tx.peca.findFirst({
                where: { id: p.peca_id, empresa_id: empresaId },
              });

              if (!pecaExistente) {
                throw new Error(
                  `Peça do orçamento não encontrada no estoque desta empresa: ${p.descricao}`
                );
              }

              const reqUnidade = p.unidade || 'un';
              let convertedQty = p.quantidade;
              if (
                pecaExistente.unidadeMedida &&
                reqUnidade.toLowerCase() !== pecaExistente.unidadeMedida.toLowerCase()
              ) {
                try {
                  convertedQty = converterUnidade(
                    p.quantidade,
                    reqUnidade,
                    pecaExistente.unidadeMedida
                  );
                } catch {
                  throw new Error(
                    `Conversão incompatível para ${pecaExistente.descricao}: de '${reqUnidade}' para '${pecaExistente.unidadeMedida}'.`
                  );
                }
              }

              if (!pecaExistente.permiteFracionado && !Number.isInteger(convertedQty)) {
                throw new Error(
                  `A peça ${pecaExistente.descricao} não permite fracionamento. Conversão de ${p.quantidade} ${reqUnidade} resultou em ${convertedQty} ${pecaExistente.unidadeMedida}.`
                );
              }

              if (pecaExistente.quantidade < convertedQty) {
                const dispUnStr = pecaExistente.unidadeMedida || 'un';
                throw new Error(
                  `Estoque insuficiente para: ${pecaExistente.descricao}. Disponível: ${pecaExistente.quantidade} ${dispUnStr}, Necessário: ${convertedQty} ${dispUnStr} (${p.quantidade} ${reqUnidade}). Converta o orçamento apenas após repor o estoque.`
                );
              }

              await tx.pecaAplicada.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  os_id: os.id,
                  peca_id: p.peca_id,
                  quantidade: p.quantidade,
                  unidade: reqUnidade,
                  valor_unit: p.valor_unit,
                  valor_total: p.valor_total,
                },
              });

              // ✅ Redundância de segurança: empresa_id no where
              await tx.peca.update({
                where: {
                  id: p.peca_id,
                  empresa_id: empresaId,
                },
                data: { quantidade: { decrement: convertedQty } },
              });

              await tx.movimentacaoEstoque.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  peca_id: p.peca_id,
                  tipo: 'SAIDA',
                  quantidade: convertedQty,
                  motivo: 'OS',
                  os_id: os.id,
                  usuario_id: user.id || 'system',
                  empresa_id: empresaId,
                },
              });
            }
          }

          // 4. Atualizar status do Orçamento
          // ✅ Redundância de segurança: empresa_id no where
          await tx.orcamento.update({
            where: {
              id: orcamento.id,
              empresa_id: empresaId,
            },
            data: { status: 'CONVERTIDO' },
          });

          // 5. Criar evento na agenda
          await tx.eventoAgenda.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id: empresaId,
              titulo: `Orçamento Convertido: ${orcamento.numero}`,
              descricao: `Orçamento convertido em OS #${os.numero}`,
              data_inicio: new Date(),
              data_fim: new Date(new Date().getTime() + 3600000),
              tipo: 'OS',
              status: 'CONCLUIDO',
              os_id: os.id,
              cliente_id: os.cliente_id,
              veiculo_id: os.veiculo_id,
              usuario_id: user.id || 'system',
              updated_at: new Date(),
            },
          });

          return os;
        });

        break;
      } catch (err: any) {
        const isUniqueConstraint =
          err.code === 'P2002' ||
          (err.message && err.message.includes('Unique constraint'));

        if (
          !isUniqueConstraint ||
          err.message?.includes('Estoque insuficiente') ||
          err.message?.includes('Conversão incompatível') ||
          err.message?.includes('não permite fracionamento') ||
          err.message?.includes('não encontrada no estoque')
        ) {
          throw err;
        }

        if (isUniqueConstraint && attempts < maxAttempts) {
          log(
            'WARN',
            'ORCAMENTOS',
            'Colisão de numeração ao converter orçamento, retentando',
            { orcamentoId: id, tentativa: attempts },
            user?.name
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 200 + 50)
          );
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Não foi possível gerar a OS. Tente novamente.' },
        { status: 500 }
      );
    }

    // ✅ NOVO: auditoria da conversão
    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'CONVERTER',
      entidade: 'Orcamento',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: { status: orcamento.status },
      dados_depois: { status: 'CONVERTIDO', os_id: result.id, os_numero: result.numero },
    });

    log(
      'INFO',
      'ORCAMENTOS',
      'Orçamento convertido em OS',
      { orcamentoId: id, osId: result.id, osNumero: result.numero },
      user?.name
    );

    return NextResponse.json(result);
  } catch (error: any) {
    log(
      'ERROR',
      'ORCAMENTOS',
      'Erro ao converter orçamento',
      { error: error.message },
      'sistema'
    );

    // Erros de negócio específicos retornam 400 com mensagem amigável
    if (
      error?.message?.includes('Estoque insuficiente') ||
      error?.message?.includes('Conversão incompatível') ||
      error?.message?.includes('não permite fracionamento') ||
      error?.message?.includes('não encontrada no estoque')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ✅ Erros internos usam apiError (não vazam stack trace)
    return apiError(error, 'ORCAMENTOS', 'Erro ao converter orçamento');
  }
}
