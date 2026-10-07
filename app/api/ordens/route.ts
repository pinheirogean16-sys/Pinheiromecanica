import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import crypto from 'crypto';
import { z } from 'zod';
import { notificarNovaOS, notificarEstoqueBaixo, notificarOSFinalizada } from '@/lib/notificacoes';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { converterUnidade } from '@/lib/unidades';

const preprocessNumber = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

const preprocessInteger = (val: any) => {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const osSchema = z.object({
  tipoOS: z.string().optional().nullable().default('OFICINA'),
  cliente_id: z.string({ required_error: 'Cliente é obrigatório' }).min(1, 'Cliente é obrigatório'),
  veiculo_id: z.string({ required_error: 'Veículo é obrigatório' }).min(1, 'Veículo é obrigatório'),
  mecanico_id: z.string().optional().nullable().transform(v => v === '' || v === 'null' || v === 'undefined' ? null : v),
  diagnostico: z.string().optional().nullable().default(''),
  data_previsao: z.string().optional().nullable().default(''),
  status: z.string().optional().default('ABERTA'),
  
  // Atendimento Externo e Deslocamento
  tipo_atendimento: z.string().optional().nullable().default('OFICINA'),
  km_saida: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  km_retorno: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  km_total: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  valor_km: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  total_deslocamento: z.preprocess(preprocessNumber, z.number().optional().default(0)),

  despesa_pedagio: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_combustivel: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_hospedagem: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_alimentacao: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_diaria_tecnica: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_guincho: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesa_outros: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  despesas_comprovantes: z.string().optional().nullable().default('{}'),

  mao_obra_externa_horas: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  mao_obra_externa_valor: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  mao_obra_externa_total: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  mao_obra_equipe: z.string().optional().nullable().default('[]'),

  local_atendimento: z.string().optional().nullable().default(''),
  local_cidade: z.string().optional().nullable().default(''),
  local_estado: z.string().optional().nullable().default(''),
  local_gps: z.string().optional().nullable().default(''),

  timeline_viagem: z.string().optional().nullable().default('[]'),
  ferramentas_levadas: z.string().optional().nullable().default('[]'),

  servicos: z.array(z.object({
    id: z.string().optional().nullable(),
    descricao: z.string().optional().default('Serviço').transform(v => v ? v.trim() : 'Serviço'),
    horas: z.preprocess(preprocessNumber, z.number().optional().default(1)),
    valor_hora: z.preprocess(preprocessNumber, z.number().optional().default(0)),
    valor_total: z.preprocess(preprocessNumber, z.number().optional().default(0))
  })).optional().default([]),
  pecas: z.array(z.object({
    pecaId: z.string().optional().nullable(),
    peca_id: z.string().optional().nullable(),
    quantidade: z.preprocess(preprocessNumber, z.number().optional().default(1).transform(v => Math.max(1, v))),
    unidade: z.string().optional().nullable().default('un'),
    valor_unit: z.preprocess(preprocessNumber, z.number().optional().default(0)),
    valor_total: z.preprocess(preprocessNumber, z.number().optional().default(0)),
    origem: z.string().optional().nullable().default('OFICINA')
  })).optional().default([]).transform((pecas) => pecas.map(p => ({
    ...p,
    pecaId: p.peca_id || p.pecaId
  }))),
  desconto: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  valor_total: z.preprocess(preprocessNumber, z.number().optional().default(0)),
  forma_pagamento: z.string().optional().nullable().default('DINHEIRO'),
  numero_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  dias_entre_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  data_vencimento_primeira: z.string().optional().nullable(),
  
  centro_custo: z.string().optional().nullable().default('OFICINA'),
  custo_km: z.preprocess(preprocessNumber, z.number().optional().default(1.5)),
  assinatura_cliente: z.string().optional().nullable(),
  assinatura_mecanico: z.string().optional().nullable(),
  assinatura_supervisor: z.string().optional().nullable(),
  assinatura_hash: z.string().optional().nullable(),
  assinatura_timestamp: z.string().optional().nullable()
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'os', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const tipoOS = searchParams.get('tipoOS');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {
      empresa_id: user.empresa_id
    };

    if (tipoOS) {
      where.tipoOS = tipoOS;
    }

    if (q) {
      where.OR = [
        { Cliente: { nome: { contains: q } } },
        { Veiculo: { placa: { contains: q } } },
        { Veiculo: { modelo: { contains: q } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [rawItems, total] = await Promise.all([
      prisma.ordemServico.findMany({
        where,
        include: {
          Cliente: { select: { nome: true } },
          Veiculo: { select: { placa: true, modelo: true } },
          User: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ordemServico.count({ where }),
    ]);

    const items = rawItems.map(item => {
      const { Cliente, Veiculo, User, ...rest } = item;
      return {
        ...rest,
        cliente: Cliente,
        veiculo: Veiculo,
        mecanico: User,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Erro de Prisma ao buscar OS:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'os', 'criar')) {
      log('WARN', 'OS', 'Tentativa de criação de OS negada', { userId: user?.id }, user?.name);
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const rawBody = await request.json();
    const normalizedBody = {
      ...rawBody,
      cliente_id: rawBody.cliente_id || rawBody.clienteId,
      veiculo_id: rawBody.veiculo_id || rawBody.veiculoId,
      mecanico_id: rawBody.mecanico_id || rawBody.mecanicoId,
    };
    const body = osSchema.parse(normalizedBody);
    
    // Função para buscar o menor número de OS disponível (reutilizando lacunas de excluídos)
    async function obterProximoNumeroOS(tx: any, targetEmpresaId: string): Promise<number> {
      const ordens = await tx.ordemServico.findMany({
        where: { empresa_id: targetEmpresaId },
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

    const empresaId = user.empresa_id;

    if (!body.cliente_id || typeof body.cliente_id !== 'string' || body.cliente_id.trim() === '') {
      return NextResponse.json({ error: 'cliente_id é obrigatório e deve ser válido' }, { status: 400 });
    }
    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id: empresaId }
    });
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
    }

    if (!body.veiculo_id || typeof body.veiculo_id !== 'string' || body.veiculo_id.trim() === '') {
      return NextResponse.json({ error: 'veiculo_id é obrigatório e deve ser válido' }, { status: 400 });
    }
    const veiculoExistente = await prisma.veiculo.findFirst({
      where: { id: body.veiculo_id, empresa_id: empresaId }
    });
    if (!veiculoExistente) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
    }

    let attempts = 0;
    const maxAttempts = 3;
    let result: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await prisma.$transaction(async (tx) => {
          const proximoNumero = await obterProximoNumeroOS(tx, empresaId);

          console.error('CRIANDO OS');
          console.error('PAYLOAD COMPLETO', JSON.stringify(body, null, 2));
          console.error('UPDATED_AT RECEBIDO', (body as any).updated_at);

          const ordem = await tx.ordemServico.create({
            data: {
              id: crypto.randomUUID(),
              numero: proximoNumero,
              empresa_id: empresaId,
              tipoOS: body.tipoOS || 'OFICINA',
              cliente_id: body.cliente_id,
              veiculo_id: body.veiculo_id,
              mecanico_id: body.mecanico_id || null,
              diagnostico: body.diagnostico,
              data_previsao: body.data_previsao ? new Date(body.data_previsao) : null,
              status: (body.status as any) || 'ABERTA',
              desconto: roundDecimal(body.desconto || 0),
              forma_pagamento: body.forma_pagamento,
              numero_parcelas: body.numero_parcelas,
              dias_entre_parcelas: body.dias_entre_parcelas,
              data_vencimento_primeira: body.data_vencimento_primeira ? new Date(body.data_vencimento_primeira) : null,
              created_by: user?.name || user?.email || 'Sistema',
              updated_at: new Date(),

              // Atendimento Externo e Deslocamento
              tipo_atendimento: body.tipo_atendimento || 'OFICINA',
              km_saida: body.km_saida || 0,
              km_retorno: body.km_retorno || 0,
              km_total: body.km_total || 0,
              valor_km: body.valor_km || 0,
              total_deslocamento: body.total_deslocamento || 0,

              despesa_pedagio: body.despesa_pedagio || 0,
              despesa_combustivel: body.despesa_combustivel || 0,
              despesa_hospedagem: body.despesa_hospedagem || 0,
              despesa_alimentacao: body.despesa_alimentacao || 0,
              despesa_diaria_tecnica: body.despesa_diaria_tecnica || 0,
              despesa_guincho: body.despesa_guincho || 0,
              despesa_outros: body.despesa_outros || 0,
              despesas_comprovantes: body.despesas_comprovantes || '{}',

              mao_obra_externa_horas: body.mao_obra_externa_horas || 0,
              mao_obra_externa_valor: body.mao_obra_externa_valor || 0,
              mao_obra_externa_total: body.mao_obra_externa_total || 0,
              mao_obra_equipe: body.mao_obra_equipe || '[]',

              local_atendimento: body.local_atendimento || '',
              local_cidade: body.local_cidade || '',
              local_estado: body.local_estado || '',
              local_gps: body.local_gps || '',

              timeline_viagem: body.timeline_viagem || '[]',
              ferramentas_levadas: body.ferramentas_levadas || '[]',

              // Motor Financeiro e Assinaturas
              centro_custo: body.centro_custo || 'OFICINA',
              custo_km: body.custo_km || 1.5,
              assinatura_cliente: body.assinatura_cliente || null,
              assinatura_mecanico: body.assinatura_mecanico || null,
              assinatura_supervisor: body.assinatura_supervisor || null,
              assinatura_hash: body.assinatura_hash || null,
              assinatura_timestamp: body.assinatura_timestamp ? new Date(body.assinatura_timestamp) : null
            }
          });
          
          if (body.servicos && body.servicos.length > 0) {
            await tx.servicoOS.createMany({
              data: (body.servicos as any[]).map((s: any) => {
                const horas = parseFloat(s.horas) || 1;
                const valorHora = roundDecimal(parseFloat(s.valor_hora) || 0);
                const valorTotal = roundDecimal(parseFloat(s.valor_total) || (horas * valorHora));
                
                return {
                  id: globalThis.crypto.randomUUID(),
                  os_id: ordem.id,
                  descricao: s.descricao,
                  horas: horas,
                  valor_hora: valorHora,
                  valor_total: valorTotal
                };
              })
            });
          }
          
          if (body.pecas && body.pecas.length > 0) {
            // Validar de forma agregada a soma total solicitada para cada peca_id
            const pecaTotaisSolicitados: Record<string, number> = {};
            for (const p of (body.pecas as any[])) {
              const pecaId = p.pecaId;
              if (!pecaId) throw new Error('ID da peça é obrigatório');
              const qty = p.quantidade || 1;
              const reqUnidade = p.unidade || 'un';

              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) throw new Error(`Peça ${pecaId} não encontrada`);

              let convertedQty = qty;
              if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
                try {
                  convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
                } catch (err: any) {
                  throw new Error(`Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`);
                }
              }

              pecaTotaisSolicitados[pecaId] = (pecaTotaisSolicitados[pecaId] || 0) + convertedQty;
            }

            // Validar se o total somado ultrapassa o estoque disponível
            for (const pecaId in pecaTotaisSolicitados) {
              const totalReq = pecaTotaisSolicitados[pecaId];
              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) throw new Error(`Peça ${pecaId} não encontrada`);
              if (peca.quantidade < totalReq) {
                const dispUnStr = peca.unidadeMedida || 'un';
                throw new Error(`Estoque insuficiente total para a peça: ${peca.descricao}. Disponível: ${peca.quantidade} ${dispUnStr}, Solicitado total na OS: ${totalReq} ${dispUnStr}`);
              }
            }

            for (const p of (body.pecas as any[])) {
              const pecaId = p.pecaId;
              const qty = p.quantidade || 1;
              const reqUnidade = p.unidade || 'un';
              if (!pecaId) throw new Error('ID da peça é obrigatório');

              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) throw new Error(`Peça ${pecaId} não encontrada`);

              // Autoconverte para unidade de estoque
              let convertedQty = qty;
              if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
                try {
                  convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
                } catch (err: any) {
                  throw new Error(`Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`);
                }
              }

              // Impede fracionamento se não permitido
              if (!peca.permiteFracionado && !Number.isInteger(convertedQty)) {
                throw new Error(`A peça ${peca.descricao} não permite fracionamento. Conversão de ${qty} ${reqUnidade} resultou em ${convertedQty} ${peca.unidadeMedida}.`);
              }

              // Calcula preço proporcional
              let valorUnit = p.valor_unit;
              if (!valorUnit) {
                if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
                  const ratio = converterUnidade(1, reqUnidade, peca.unidadeMedida);
                  valorUnit = roundDecimal(Number(peca.preco_venda) * ratio);
                } else {
                  valorUnit = roundDecimal(Number(peca.preco_venda));
                }
              }
              const valorTotal = roundDecimal(qty * valorUnit);

              console.error('[PECAAPLICADA AUDIT] CREATE', '/app/api/ordens/route.ts');
              await tx.pecaAplicada.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  os_id: ordem.id,
                  peca_id: pecaId,
                  quantidade: qty,
                  unidade: reqUnidade,
                  valor_unit: valorUnit,
                  valor_total: valorTotal,
                  origem: p.origem || 'OFICINA'
                }
              });
              
              await tx.peca.update({
                where: { id: pecaId },
                data: { quantidade: { decrement: convertedQty } }
              });

              await tx.movimentacaoEstoque.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  peca_id: pecaId,
                  tipo: 'SAIDA',
                  quantidade: convertedQty,
                  motivo: 'OS',
                  os_id: ordem.id,
                  usuario_id: user.id || 'system',
                  empresa_id: empresaId
                }
              });
            }
          }
          
          const servicosSummary = await tx.servicoOS.aggregate({
            where: { os_id: ordem.id },
            _sum: { valor_total: true }
          });
          
          console.error('[PECAAPLICADA AUDIT] AGGREGATE', '/app/api/ordens/route.ts');
          const pecasSummary = await tx.pecaAplicada.aggregate({
            where: { os_id: ordem.id },
            _sum: { valor_total: true }
          });
          
          const valor_servicos = roundDecimal(servicosSummary._sum.valor_total ? Number(servicosSummary._sum.valor_total) : 0);
          const valor_pecas = roundDecimal(pecasSummary._sum.valor_total ? Number(pecasSummary._sum.valor_total) : 0);
          
          const totalDeslocamento = roundDecimal(body.total_deslocamento || 0);
          const totalDespesas = roundDecimal(
            (body.despesa_pedagio || 0) +
            (body.despesa_combustivel || 0) +
            (body.despesa_hospedagem || 0) +
            (body.despesa_alimentacao || 0) +
            (body.despesa_diaria_tecnica || 0) +
            (body.despesa_guincho || 0) +
            (body.despesa_outros || 0)
          );
          const totalMaoObraExterna = roundDecimal(body.mao_obra_externa_total || 0);

          const valor_total = roundDecimal((valor_servicos + valor_pecas + totalDeslocamento + totalDespesas + totalMaoObraExterna) - (body.desconto || 0));
          
          // Obter custo real das peças aplicadas
          console.error('[PECAAPLICADA AUDIT] FINDMANY', '/app/api/ordens/route.ts');
          const appliedPecas = await tx.pecaAplicada.findMany({
            where: { os_id: ordem.id },
            include: { Peca: true }
          });
          const custo_pecas = roundDecimal(appliedPecas.reduce((acc: number, p: any) => acc + (p.quantidade * (p.Peca?.preco_custo ? Number(p.Peca.preco_custo) : 0)), 0));

          // Calcular custo de comissão de mão de obra
          let mecanicoComissao = 0;
          if (body.mecanico_id) {
            const mecanico = await tx.user.findUnique({ where: { id: body.mecanico_id } });
            if (mecanico) {
              mecanicoComissao = mecanico.comissao ? Number(mecanico.comissao) : 0;
            }
          }
          const custo_mao_obra = roundDecimal(valor_servicos * (mecanicoComissao / 100));

          // Custos adicionais de deslocamento
          const custo_deslocamento = roundDecimal((body.km_total || 0) * (body.custo_km || 1.5));
          const despesas_extras = totalDespesas;

          // Custo real absoluto
          const custo_real = roundDecimal(custo_pecas + custo_mao_obra + custo_deslocamento + despesas_extras + totalMaoObraExterna);

          // Lucros
          const lucro_bruto = roundDecimal(valor_total - custo_real);
          const margem_lucro = valor_total > 0 ? roundDecimal((lucro_bruto / valor_total) * 100) : 0;
          const impostosSimulados = roundDecimal(valor_total * 0.06); // Simples Nacional 6%
          const total_liquido = roundDecimal(lucro_bruto - impostosSimulados);

          const updatedOrdem = await tx.ordemServico.update({
            where: { id: ordem.id },
            data: { 
              valor_servicos, 
              valor_pecas, 
              valor_total,
              custo_pecas,
              custo_mao_obra,
              custo_km: body.custo_km || 1.5,
              custo_deslocamento,
              despesas_extras,
              custo_real,
              lucro_bruto,
              margem_lucro,
              total_liquido
            },
            include: { Veiculo: true, Cliente: true }
          });

          await createAuditLog({
            modulo: 'OS',
            acao: 'CRIAR',
            entidade: 'OrdemServico',
            entidade_id: updatedOrdem.id,
            usuario: user?.name || user?.email || 'Sistema',
            dados_depois: updatedOrdem
          });

          return updatedOrdem;
        });

        // Se a transação completou sem erros na concorrência, saímos do loop de tentativa
        break;
      } catch (err: any) {
        const isUniqueConstraint = err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'));
        if (isUniqueConstraint && attempts < maxAttempts) {
          console.warn(`[CONCORRENCIA] Colisão detectada ao gerar número de OS. Tentativa ${attempts} falhou. Retentando...`);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          continue;
        }
        throw err;
      }
    }

    log('INFO', 'OS', 'Ordem de Serviço criada', { id: result.id, numero: result.numero }, user?.name);

    try {
      await notificarNovaOS(result);
      if (result.status === 'FINALIZADA') {
        await notificarOSFinalizada(result);
      }
      if (body.pecas && body.pecas.length > 0) {
        for (const p of (body.pecas as any[])) {
          const pecaId = p.pecaId;
          if (pecaId) {
            const peca = await prisma.peca.findFirst({ where: { id: pecaId, empresa_id: user.empresa_id } });
            if (peca && peca.quantidade <= peca.estoque_minimo) {
              await notificarEstoqueBaixo(peca);
            }
          }
        }
      }
    } catch (err) {
      log('ERROR', 'OS', 'Erro ao processar notificações de OS', { error: err }, 'sistema');
    }
    
    // Invalida o cache do dashboard do estabelecimento correspondente
    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    log('ERROR', 'OS', 'Erro ao criar OS', { error }, 'sistema');
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      return NextResponse.json({ error: error.issues ? error.issues[0]?.message : 'Dados inválidos' }, { status: 400 });
    }
    if (error.message && (error.message.includes('não encontrada') || error.message.includes('obrigatório') || error.message.includes('inválid') || error.message.includes('insuficiente'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Erro ao criar ordem de serviço' }, { status: 500 });
  }
}
