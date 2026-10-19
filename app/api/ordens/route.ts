import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import crypto from 'crypto';
import { z } from 'zod';
import { notificarNovaOS, notificarEstoqueBaixo, notificarOSFinalizada } from '@/lib/notificacoes';
import { sincronizarPreventivasAposOS } from '@/lib/preventivas';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { converterUnidade } from '@/lib/unidades';
import { validarEProcessarLeiturasVeiculo } from '@/lib/odometro-horimetro';
import { apiError } from '@/lib/api-error';

// ============================================================
// CONSTANTES
// ============================================================
const STATUS_OS = [
  'ABERTA', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO',
  'AGUARDANDO_APROVACAO', 'FINALIZADA', 'ENTREGUE', 'CANCELADA',
] as const;

const TIPOS_OS = ['OFICINA', 'CAMPO'] as const;

const TIPOS_ATENDIMENTO = ['OFICINA', 'CAMPO', 'EMERGENCIAL'] as const;

const FORMAS_PAGAMENTO = [
  'DINHEIRO', 'PIX', 'BOLETO', 'CARTAO', 'PARCELADO',
] as const;

const CENTROS_CUSTO = [
  'OFICINA', 'CAMPO', 'RESGATE', 'MOTOR', 'CAIXA', 'DIFERENCIAL',
  'ELETRICA', 'INJECAO', 'BORRACHARIA',
] as const;

const MAX_ITENS = 200;

// ============================================================
// PREPROCESSADORES
// ============================================================
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

const preprocessQuantidade = (val: any) => {
  if (val === null || val === undefined || val === '') return 1;
  const n = Number(val);
  return isNaN(n) ? 1 : n;
};

const jsonString = (val: any, fallback: string) => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val !== 'string') return fallback;
  try {
    JSON.parse(val);
    return val;
  } catch {
    return fallback;
  }
};

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const osSchema = z.object({
  tipoOS: z.enum(TIPOS_OS).optional().nullable().default('OFICINA'),
  cliente_id: z.string({ required_error: 'Cliente é obrigatório' }).min(1, 'Cliente é obrigatório'),
  veiculo_id: z.string({ required_error: 'Veículo é obrigatório' }).min(1, 'Veículo é obrigatório'),
  mecanico_id: z.string().optional().nullable().transform(v => v === '' || v === 'null' || v === 'undefined' ? null : v),
  diagnostico: z.string().max(2000).optional().nullable().default(''),
  data_previsao: z.string().optional().nullable().default(''),
  status: z.enum(STATUS_OS).optional().default('ABERTA'),

  tipo_atendimento: z.enum(TIPOS_ATENDIMENTO).optional().nullable().default('OFICINA'),
  km_saida: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  km_retorno: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  km_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  valor_km: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  total_deslocamento: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),

  despesa_pedagio: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_combustivel: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_hospedagem: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_alimentacao: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_diaria_tecnica: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_guincho: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesa_outros: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  despesas_comprovantes: z.string().optional().nullable().default('{}').transform(v => jsonString(v, '{}')),

  mao_obra_externa_horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_externa_valor: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_externa_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_equipe: z.string().optional().nullable().default('[]').transform(v => jsonString(v, '[]')),

  local_atendimento: z.string().max(500).optional().nullable().default(''),
  local_cidade: z.string().max(100).optional().nullable().default(''),
  local_estado: z.string().max(2).optional().nullable().default(''),
  local_gps: z.string().max(100).optional().nullable().default(''),

  timeline_viagem: z.string().optional().nullable().default('[]').transform(v => jsonString(v, '[]')),
  ferramentas_levadas: z.string().optional().nullable().default('[]').transform(v => jsonString(v, '[]')),

  servicos: z.array(z.object({
    id: z.string().optional().nullable(),
    descricao: z.string().max(500).optional().default('Serviço').transform(v => v ? v.trim() : 'Serviço'),
    horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(1)),
    valor_hora: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0))
  })).max(MAX_ITENS, `Máximo de ${MAX_ITENS} serviços`).optional().default([]),

  pecas: z.array(z.object({
    pecaId: z.string().optional().nullable(),
    peca_id: z.string().optional().nullable(),
    quantidade: z.preprocess(preprocessQuantidade, z.number().positive()),
    unidade: z.string().max(20).optional().nullable().default('un'),
    valor_unit: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    origem: z.string().max(50).optional().nullable().default('OFICINA')
  })).max(MAX_ITENS, `Máximo de ${MAX_ITENS} peças`).optional().default([]).transform((pecas) => pecas.map(p => ({
    ...p,
    pecaId: p.peca_id || p.pecaId
  }))),

  desconto: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  forma_pagamento: z.enum(FORMAS_PAGAMENTO).optional().nullable().default('DINHEIRO'),
  numero_parcelas: z.preprocess(preprocessInteger, z.number().int().min(1).max(60).optional().nullable()),
  dias_entre_parcelas: z.preprocess(preprocessInteger, z.number().int().min(1).max(365).optional().nullable()),
  data_vencimento_primeira: z.string().optional().nullable(),

  centro_custo: z.enum(CENTROS_CUSTO).optional().nullable().default('OFICINA'),
  custo_km: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(1.5)),
  assinatura_cliente: z.string().max(200).optional().nullable(),
  assinatura_mecanico: z.string().max(200).optional().nullable(),
  assinatura_supervisor: z.string().max(200).optional().nullable(),
  assinatura_hash: z.string().max(200).optional().nullable(),
  assinatura_timestamp: z.string().optional().nullable(),

  km_veiculo: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  horimetro_veiculo: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  confirmar_salto_km: z.boolean().optional().default(false),
  confirmar_salto_horimetro: z.boolean().optional().default(false),
  autorizar_reducao_km: z.boolean().optional().default(false),
  autorizar_reducao_horimetro: z.boolean().optional().default(false),
  justificativa_ajuste_leitura: z.string().max(1000).optional().nullable(),

  preventivas_ids: z.array(z.string()).max(50).optional().default([]),
  preventiva_id: z.string().optional().nullable()
});

// ✅ CORRIGIDO: Blindagem do Zod para nulos/zeros e limite máximo de 1000
const listarOSQuerySchema = z.object({
  q: z.string().nullish().transform(v => v?.slice(0, 100) || ''),
  status: z.enum(STATUS_OS).nullish(),
  tipoOS: z.enum(TIPOS_OS).nullish(),
  page: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 10 : val),
    z.coerce.number().int().min(1).max(1000).default(10) // Aumentado para 1000
  ),
});

// ============================================================
// HELPER: próximo número de OS (otimizado com _max)
// ============================================================
async function obterProximoNumeroOS(tx: any, empresaId: string): Promise<number> {
  const maxResult = await tx.ordemServico.aggregate({
    _max: { numero: true },
    where: { empresa_id: empresaId },
  });
  return (maxResult._max.numero || 0) + 1;
}

// ============================================================
// GET — Listar ordens de serviço
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'os', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ CORRIGIDO: `|| undefined` previne o erro "Expected string, received null"
    const parsed = listarOSQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      status: searchParams.get('status') || undefined,
      tipoOS: searchParams.get('tipoOS') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const { q, status, tipoOS, page, limit } = parsed;

    const where: any = { empresa_id: user.empresa_id };

    if (tipoOS) where.tipoOS = tipoOS;

    if (q) {
      where.OR = [
        { Cliente: { nome: { contains: q } } },
        { Veiculo: { placa: { contains: q } } },
        { Veiculo: { modelo: { contains: q } } },
      ];
    }

    if (status) where.status = status;

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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'OS', 'Erro ao listar ordens de serviço');
  }
}

// ============================================================
// POST — Criar ordem de serviço
// ============================================================
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
    const empresaId = user.empresa_id;

    // ============================================================
    // VALIDAÇÕES DE VÍNCULO (IDOR fix)
    // ============================================================
    if (!body.cliente_id || typeof body.cliente_id !== 'string' || body.cliente_id.trim() === '') {
      return NextResponse.json({ error: 'cliente_id é obrigatório e deve ser válido' }, { status: 400 });
    }
    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id: empresaId },
    });
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
    }

    if (!body.veiculo_id || typeof body.veiculo_id !== 'string' || body.veiculo_id.trim() === '') {
      return NextResponse.json({ error: 'veiculo_id é obrigatório e deve ser válido' }, { status: 400 });
    }
    const veiculoExistente = await prisma.veiculo.findFirst({
      where: { id: body.veiculo_id, empresa_id: empresaId },
    });
    if (!veiculoExistente) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
    }

    if (body.mecanico_id) {
      const mecanicoOk = await prisma.user.findFirst({
        where: { id: body.mecanico_id, empresa_id: empresaId },
        select: { id: true },
      });
      if (!mecanicoOk) {
        return NextResponse.json({ error: 'Mecânico não encontrado nesta empresa' }, { status: 400 });
      }
    }

    const preventivasIds: string[] = [];
    if (Array.isArray(body.preventivas_ids)) {
      preventivasIds.push(...body.preventivas_ids);
    }
    if (body.preventiva_id && !preventivasIds.includes(body.preventiva_id)) {
      preventivasIds.push(body.preventiva_id);
    }

    if (preventivasIds.length > 0) {
      const preventivasValidas = await prisma.preventiva.findMany({
        where: { id: { in: preventivasIds }, empresa_id: empresaId },
        select: { id: true },
      });
      if (preventivasValidas.length !== preventivasIds.length) {
        return NextResponse.json(
          { error: 'Uma ou mais preventivas não pertencem a esta empresa' },
          { status: 400 }
        );
      }
    }

    const leiturasRes = await validarEProcessarLeiturasVeiculo({
      veiculoId: body.veiculo_id,
      empresaId,
      kmInformado: body.km_veiculo !== undefined ? body.km_veiculo : null,
      horimetroInformado: body.horimetro_veiculo !== undefined ? body.horimetro_veiculo : null,
      confirmarSaltoKm: body.confirmar_salto_km,
      confirmarSaltoHorimetro: body.confirmar_salto_horimetro,
      autorizarReducaoKm: body.autorizar_reducao_km,
      autorizarReducaoHorimetro: body.autorizar_reducao_horimetro,
      justificativa: body.justificativa_ajuste_leitura,
      usuario: user,
      contexto: 'CRIACAO_OS',
    });

    if (!leiturasRes.sucesso) {
      return NextResponse.json({ error: leiturasRes.erro }, { status: 400 });
    }

    const createdBy = user.email || user.name || 'Sistema';

    let attempts = 0;
    const maxAttempts = 3;
    let result: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await prisma.$transaction(async (tx) => {
          const proximoNumero = await obterProximoNumeroOS(tx, empresaId);

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
              status: body.status || 'ABERTA',
              desconto: roundDecimal(body.desconto || 0),
              forma_pagamento: body.forma_pagamento,
              numero_parcelas: body.numero_parcelas,
              dias_entre_parcelas: body.dias_entre_parcelas,
              data_vencimento_primeira: body.data_vencimento_primeira ? new Date(body.data_vencimento_primeira) : null,
              created_by: createdBy,
              updated_at: new Date(),

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

              centro_custo: body.centro_custo || 'OFICINA',
              custo_km: body.custo_km || 1.5,
              assinatura_cliente: body.assinatura_cliente || null,
              assinatura_mecanico: body.assinatura_mecanico || null,
              assinatura_supervisor: body.assinatura_supervisor || null,
              assinatura_hash: body.assinatura_hash || null,
              assinatura_timestamp: body.assinatura_timestamp ? new Date(body.assinatura_timestamp) : null,
            },
          });

          // ============================================================
          // SERVIÇOS
          // ============================================================
          if (body.servicos && body.servicos.length > 0) {
            await tx.servicoOS.createMany({
              data: (body.servicos as any[]).map((s: any) => {
                const horas = parseFloat(s.horas) || 1;
                const valorHora = roundDecimal(parseFloat(s.valor_hora) || 0);
                const valorTotal = roundDecimal(parseFloat(s.valor_total) || horas * valorHora);

                return {
                  id: globalThis.crypto.randomUUID(),
                  os_id: ordem.id,
                  descricao: s.descricao,
                  horas: horas,
                  valor_hora: valorHora,
                  valor_total: valorTotal,
                };
              }),
            });
          }

          // ============================================================
          // PEÇAS
          // ============================================================
          if (body.pecas && body.pecas.length > 0) {
            const pecaTotaisSolicitados: Record<string, number> = {};
            const pecaValoresEnviados: Record<string, number> = {};

            // Validação prévia: preço da peça não pode ser menor que custo
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
                } catch {
                  throw new Error(`Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`);
                }
              }

              pecaTotaisSolicitados[pecaId] = (pecaTotaisSolicitados[pecaId] || 0) + convertedQty;

              if (p.valor_unit && Number(p.valor_unit) > 0) {
                pecaValoresEnviados[pecaId] = Number(p.valor_unit);
              }
            }

            // Bloquear preço abaixo do custo
            for (const pecaId in pecaValoresEnviados) {
              const valorEnviado = pecaValoresEnviados[pecaId];
              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) continue;
              const precoCusto = Number(peca.preco_custo);
              if (valorEnviado < precoCusto) {
                throw new Error(
                  `Preço unitário para ${peca.descricao} (R$ ${valorEnviado.toFixed(2)}) está abaixo do custo (R$ ${precoCusto.toFixed(2)}). Ajuste o valor ou peça autorização.`
                );
              }
            }

            // Validar estoque agregado
            for (const pecaId in pecaTotaisSolicitados) {
              const totalReq = pecaTotaisSolicitados[pecaId];
              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) throw new Error(`Peça ${pecaId} não encontrada`);
              if (peca.quantidade < totalReq) {
                const dispUnStr = peca.unidadeMedida || 'un';
                throw new Error(
                  `Estoque insuficiente total para a peça: ${peca.descricao}. Disponível: ${peca.quantidade} ${dispUnStr}, Solicitado total na OS: ${totalReq} ${dispUnStr}`
                );
              }
            }

            for (const p of (body.pecas as any[])) {
              const pecaId = p.pecaId;
              const qty = p.quantidade || 1;
              const reqUnidade = p.unidade || 'un';
              if (!pecaId) throw new Error('ID da peça é obrigatório');

              const peca = await tx.peca.findFirst({ where: { id: pecaId, empresa_id: empresaId } });
              if (!peca) throw new Error(`Peça ${pecaId} não encontrada`);

              let convertedQty = qty;
              if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
                try {
                  convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
                } catch {
                  throw new Error(`Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`);
                }
              }

              if (!peca.permiteFracionado && !Number.isInteger(convertedQty)) {
                throw new Error(
                  `A peça ${peca.descricao} não permite fracionamento. Conversão de ${qty} ${reqUnidade} resultou em ${convertedQty} ${peca.unidadeMedida}.`
                );
              }

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

              await tx.pecaAplicada.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  os_id: ordem.id,
                  peca_id: pecaId,
                  quantidade: qty,
                  unidade: reqUnidade,
                  valor_unit: valorUnit,
                  valor_total: valorTotal,
                  origem: p.origem || 'OFICINA',
                },
              });

              await tx.peca.update({
                where: { id: pecaId },
                data: { quantidade: { decrement: convertedQty } },
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
                  empresa_id: empresaId,
                },
              });
            }
          }

          // ============================================================
          // CÁLCULOS FINANCEIROS
          // ============================================================
          const servicosSummary = await tx.servicoOS.aggregate({
            where: { os_id: ordem.id },
            _sum: { valor_total: true },
          });

          const pecasSummary = await tx.pecaAplicada.aggregate({
            where: { os_id: ordem.id },
            _sum: { valor_total: true },
          });

          const valor_servicos = roundDecimal(
            servicosSummary._sum.valor_total ? Number(servicosSummary._sum.valor_total) : 0
          );
          const valor_pecas = roundDecimal(
            pecasSummary._sum.valor_total ? Number(pecasSummary._sum.valor_total) : 0
          );

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

          const valor_total = roundDecimal(
            Math.max(0, (valor_servicos + valor_pecas + totalDeslocamento + totalDespesas + totalMaoObraExterna) - (body.desconto || 0))
          );

          const appliedPecas = await tx.pecaAplicada.findMany({
            where: { os_id: ordem.id },
            include: { Peca: true },
          });
          const custo_pecas = roundDecimal(
            appliedPecas.reduce(
              (acc: number, p: any) => acc + (p.quantidade * (p.Peca?.preco_custo ? Number(p.Peca.preco_custo) : 0)),
              0
            )
          );

          let mecanicoComissao = 0;
          if (body.mecanico_id) {
            const mecanico = await tx.user.findUnique({ where: { id: body.mecanico_id } });
            if (mecanico) {
              mecanicoComissao = mecanico.comissao ? Number(mecanico.comissao) : 0;
            }
          }
          const custo_mao_obra = roundDecimal(valor_servicos * (mecanicoComissao / 100));

          const custo_deslocamento = roundDecimal((body.km_total || 0) * (body.custo_km || 1.5));
          const despesas_extras = totalDespesas;

          const custo_real = roundDecimal(
            custo_pecas + custo_mao_obra + custo_deslocamento + despesas_extras + totalMaoObraExterna
          );

          const lucro_bruto = roundDecimal(valor_total - custo_real);
          const margem_lucro = valor_total > 0 ? roundDecimal((lucro_bruto / valor_total) * 100) : 0;
          const impostosSimulados = roundDecimal(valor_total * 0.06);
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
              total_liquido,
            },
            include: { Veiculo: true, Cliente: true },
          });

          // ============================================================
          // PREVENTIVAS
          // ============================================================
          if (body.status === 'FINALIZADA' && preventivasIds.length > 0) {
            const syncPrev = await sincronizarPreventivasAposOS(updatedOrdem, {
              tx,
              preventivasIds,
              usuario: user,
              kmVeiculo: leiturasRes.kmFinalAtualizar,
              horimetroVeiculo: leiturasRes.horimetroFinalAtualizar,
            });
            if (!syncPrev.sucesso) {
              throw new Error(syncPrev.erro || 'Falha ao sincronizar manutenções preventivas vinculadas à OS');
            }
          }

          await createAuditLog({
            modulo: 'OS',
            acao: 'CRIAR',
            entidade: 'OrdemServico',
            entidade_id: updatedOrdem.id,
            usuario: user?.name || user?.email || 'Sistema',
            empresa_id: empresaId,
            dados_depois: updatedOrdem,
          });

          return updatedOrdem;
        });

        break;
      } catch (err: any) {
        const isUniqueConstraint =
          err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'));

        if (isUniqueConstraint && attempts < maxAttempts) {
          log('WARN', 'OS', 'Colisão de numeração ao criar OS, retentando', { tentativa: attempts }, user?.name);
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 50));
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

    log('INFO', 'OS', 'Ordem de Serviço criada', { id: result.id, numero: result.numero }, user?.name);

    // ============================================================
    // NOTIFICAÇÕES (fora da transação)
    // ============================================================
    try {
      await notificarNovaOS(result);
      if (result.status === 'FINALIZADA') {
        await notificarOSFinalizada(result);
      }
      if (body.pecas && body.pecas.length > 0) {
        for (const p of (body.pecas as any[])) {
          const pecaId = p.pecaId;
          if (pecaId) {
            const peca = await prisma.peca.findFirst({
              where: { id: pecaId, empresa_id: user.empresa_id },
            });
            if (peca && peca.quantidade <= peca.estoque_minimo) {
              await notificarEstoqueBaixo(peca);
            }
          }
        }
      }
    } catch (err) {
      log('ERROR', 'OS', 'Erro ao processar notificações de OS', { error: err }, 'sistema');
    }

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    log('ERROR', 'OS', 'Erro ao criar OS', { error: error?.message }, 'sistema');

    if (error instanceof z.ZodError || error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues ? error.issues[0]?.message : 'Dados inválidos' },
        { status: 400 }
      );
    }

    const mensagensNegocio = [
      'não encontrada',
      'obrigatório',
      'inválid',
      'insuficiente',
      'abaixo do custo',
      'não permite fracionamento',
      'Conversão incompatível',
      'não pertencem a esta empresa',
    ];

    if (error.message && mensagensNegocio.some((m) => error.message.includes(m))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return apiError(error, 'OS', 'Erro ao criar ordem de serviço');
  }
}
