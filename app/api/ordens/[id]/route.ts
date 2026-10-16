import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { OrdemServico_status as StatusOS } from '@prisma/client';
import { notificarOSFinalizada, notificarEstoqueBaixo } from '@/lib/notificacoes';
import { sincronizarPreventivasAposOS, obterExecucoesPreventivasDaOS } from '@/lib/preventivas';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { converterUnidade } from '@/lib/unidades';
import { validarEProcessarLeiturasVeiculo } from '@/lib/odometro-horimetro';

// ============================================================
// SERIALIZAÇÃO DE DECIMAIS
// ============================================================
function serializeDecimals(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals);
  }

  if (obj instanceof Date) return obj;

  if ('toNumber' in obj && typeof (obj as any).toNumber === 'function') {
    try {
      return (obj as any).toNumber();
    } catch {
      return obj;
    }
  }

  let keys: string[] = [];
  try {
    keys = Object.keys(obj);
  } catch {
    return obj;
  }

  const converted: Record<string, any> = {};
  for (const key of keys) {
    try {
      converted[key] = serializeDecimals((obj as any)[key]);
    } catch {
      converted[key] = (obj as any)[key];
    }
  }
  return converted;
}

// ============================================================
// HELPER: Recuperar preventivas vinculadas via fallback
// ============================================================
async function recuperarPreventivasFallback(
  osId: string,
  empresaId: string,
  osData: any
): Promise<string[]> {
  const ids: string[] = [];

  try {
    const execucoes = await prisma.preventivaExecucao.findMany({
      where: { os_id: osId, empresa_id: empresaId },
      select: { preventiva_id: true },
    });
    execucoes.forEach((e: any) => {
      if (e.preventiva_id && !ids.includes(e.preventiva_id)) {
        ids.push(e.preventiva_id);
      }
    });
  } catch {}

  if (ids.length === 0 && osData?.preventiva_id) {
    ids.push(osData.preventiva_id);
  }

  if (ids.length === 0 && Array.isArray(osData?.preventivas_ids)) {
    osData.preventivas_ids.forEach((pid: string) => {
      if (pid && !ids.includes(pid)) ids.push(pid);
    });
  }

  if (ids.length === 0 && osData?.observacoes) {
    try {
      const meta = typeof osData.observacoes === 'string'
        ? JSON.parse(osData.observacoes)
        : osData.observacoes;
      if (Array.isArray(meta?.preventivas_ids)) {
        meta.preventivas_ids.forEach((pid: string) => {
          if (pid && !ids.includes(pid)) ids.push(pid);
        });
      }
      if (meta?.preventiva_id && !ids.includes(meta.preventiva_id)) {
        ids.push(meta.preventiva_id);
      }
    } catch {}
  }

  return ids;
}

// ============================================================
// GERA MOVIMENTAÇÃO FINANCEIRA AO FINALIZAR OS
// ============================================================
async function gerarMovimentacaoFinanceira(tx: any, os: any, userId: string) {
  const empresaId = os.empresa_id;
  if (!empresaId) throw new Error('OS sem empresa_id definida');

  const existeEntrada = await tx.movimentacaoFinanceira.findFirst({
    where: { os_id: os.id, tipo: 'ENTRADA' },
  });

  if (existeEntrada) return;

  if (os.forma_pagamento === 'PARCELADO' && os.numero_parcelas && os.numero_parcelas > 1) {
    const numParcelas = os.numero_parcelas;
    const diasIntervalo = os.dias_entre_parcelas || 28;
    const valorParcela = roundDecimal(os.valor_total / numParcelas);
    const dataBase = os.data_vencimento_primeira
      ? new Date(os.data_vencimento_primeira)
      : new Date();

    for (let i = 0; i < numParcelas; i++) {
      const vencimento = new Date(dataBase);
      vencimento.setDate(vencimento.getDate() + i * diasIntervalo);
      vencimento.setUTCHours(12, 0, 0, 0);

      const mov = await tx.movimentacaoFinanceira.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          empresa_id: empresaId,
          tipo: 'ENTRADA',
          descricao: `OS #${os.numero} - ${os.cliente?.nome} - Parcela ${i + 1}/${numParcelas}`,
          valor: valorParcela,
          data_vencimento: vencimento,
          status: 'PENDENTE',
          forma_pagamento: 'BOLETO',
          categoria: 'SERVIÇOS',
          os_id: os.id,
          cliente_id: os.cliente_id,
          created_by: userId,
          data: new Date(),
          updated_at: new Date(),
        },
      });

      await createAuditLog({
        modulo: 'FINANCEIRO',
        acao: 'CRIAR_AUTO',
        entidade: 'MovimentacaoFinanceira',
        entidade_id: mov.id,
        empresa_id: empresaId,
        usuario: 'SISTEMA',
        dados_depois: mov,
      });
    }
  } else {
    const vencimentoPadrao = os.data_vencimento_primeira
      ? new Date(os.data_vencimento_primeira)
      : new Date();
    vencimentoPadrao.setUTCHours(12, 0, 0, 0);

    const mov = await tx.movimentacaoFinanceira.create({
      data: {
        id: globalThis.crypto.randomUUID(),
        empresa_id: empresaId,
        tipo: 'ENTRADA',
        descricao: `Recebimento OS #${os.numero} - ${os.cliente?.nome || 'Cliente'}`,
        valor: roundDecimal(os.valor_total || 0),
        os_id: os.id,
        cliente_id: os.cliente_id,
        forma_pagamento: os.forma_pagamento || 'DINHEIRO',
        data_vencimento: vencimentoPadrao,
        created_by: userId,
        data: new Date(),
        status: 'PENDENTE',
        categoria: 'SERVIÇOS',
        updated_at: new Date(),
      },
    });

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'CRIAR_AUTO',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: mov.id,
      empresa_id: empresaId,
      usuario: 'SISTEMA',
      dados_depois: mov,
    });
  }
}

// ============================================================
// PREPROCESSADORES ZOD
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

// ============================================================
// SCHEMAS
// ============================================================
const updateOsSchema = z
  .object({
    tipoOS: z.string().optional().nullable(),
    status: z.nativeEnum(StatusOS).optional(),
    diagnostico: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    desconto: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    mecanico_id: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v === '' || v === 'null' || v === 'undefined' ? null : v)),
    forma_pagamento: z.string().optional().nullable().default('DINHEIRO'),
    numero_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
    dias_entre_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
    data_vencimento_primeira: z.string().optional().nullable(),

    tipo_atendimento: z.string().optional().nullable().default('OFICINA'),
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
    despesas_comprovantes: z.string().optional().nullable().default('{}'),

    mao_obra_externa_horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    mao_obra_externa_valor: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    mao_obra_externa_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
    mao_obra_equipe: z.string().optional().nullable().default('[]'),

    local_atendimento: z.string().optional().nullable().default(''),
    local_cidade: z.string().optional().nullable().default(''),
    local_estado: z.string().optional().nullable().default(''),
    local_gps: z.string().optional().nullable().default(''),

    timeline_viagem: z.string().optional().nullable().default('[]'),
    ferramentas_levadas: z.string().optional().nullable().default('[]'),

    servicos: z
      .array(
        z.object({
          id: z.string().optional().nullable(),
          descricao: z
            .string()
            .optional()
            .default('Serviço')
            .transform((v) => (v ? v.trim() : 'Serviço')),
          horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(1)),
          valor_hora: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
          valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
        })
      )
      .optional()
      .default([]),
    pecas: z
      .array(
        z.object({
          pecaId: z.string().optional().nullable(),
          peca_id: z.string().optional().nullable(),
          quantidade: z.preprocess(preprocessQuantidade, z.number().positive()),
          unidade: z.string().optional().nullable().default('un'),
          valor_unit: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
          valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
          origem: z.string().optional().nullable().default('OFICINA'),
        })
      )
      .optional()
      .default([])
      .transform((pecas) =>
        pecas.map((p) => ({ ...p, pecaId: p.peca_id || p.pecaId }))
      ),
    centro_custo: z.string().optional().nullable(),
    custo_km: z.preprocess(preprocessNumber, z.number().nonnegative().optional()),
    assinatura_cliente: z.string().optional().nullable(),
    assinatura_mecanico: z.string().optional().nullable(),
    assinatura_supervisor: z.string().optional().nullable(),
    assinatura_hash: z.string().optional().nullable(),
    assinatura_timestamp: z.string().optional().nullable(),
    km_veiculo: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
    horimetro_veiculo: z.preprocess(preprocessNumber, z.number().optional().nullable()),
    confirmar_salto_km: z.boolean().optional().default(false),
    confirmar_salto_horimetro: z.boolean().optional().default(false),
    autorizar_reducao_km: z.boolean().optional().default(false),
    autorizar_reducao_horimetro: z.boolean().optional().default(false),
    justificativa_ajuste_leitura: z.string().optional().nullable(),
    preventivas_ids: z.array(z.string()).optional().default([]),
    preventiva_id: z.string().optional().nullable(),
    motivo_cancelamento: z.string().max(500).optional().nullable(),
    // A26: permite ao ADMIN forçar reescrita de assinatura (caso extremo)
    forcar_reescrita_assinatura: z.boolean().optional().default(false),
  })
  .partial();

const putOsSchema = z.object({
  tipoOS: z.string().optional().nullable().default('OFICINA'),
  cliente_id: z.string({ required_error: 'Cliente é obrigatório' }).min(1, 'Cliente é obrigatório'),
  veiculo_id: z.string({ required_error: 'Veículo é obrigatório' }).min(1, 'Veículo é obrigatório'),
  mecanico_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === 'null' || v === 'undefined' ? null : v)),
  diagnostico: z.string().optional().nullable().default(''),
  data_previsao: z.string().optional().nullable().default(''),
  status: z.nativeEnum(StatusOS),
  observacoes: z.string().optional().nullable().default(''),
  desconto: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  forma_pagamento: z.string().optional().nullable().default('DINHEIRO'),
  numero_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  dias_entre_parcelas: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  data_vencimento_primeira: z.string().optional().nullable(),
  tipo_atendimento: z.string().optional().nullable().default('OFICINA'),
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
  despesas_comprovantes: z.string().optional().nullable().default('{}'),
  mao_obra_externa_horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_externa_valor: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_externa_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
  mao_obra_equipe: z.string().optional().nullable().default('[]'),
  local_atendimento: z.string().optional().nullable().default(''),
  local_cidade: z.string().optional().nullable().default(''),
  local_estado: z.string().optional().nullable().default(''),
  local_gps: z.string().optional().nullable().default(''),
  timeline_viagem: z.string().optional().nullable().default('[]'),
  ferramentas_levadas: z.string().optional().nullable().default('[]'),
  servicos: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
        descricao: z
          .string()
          .optional()
          .default('Serviço')
          .transform((v) => (v ? v.trim() : 'Serviço')),
        horas: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(1)),
        valor_hora: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
        valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
      })
    )
    .optional()
    .default([]),
  pecas: z
    .array(
      z.object({
        pecaId: z.string().optional().nullable(),
        peca_id: z.string().optional().nullable(),
        quantidade: z.preprocess(preprocessQuantidade, z.number().positive()),
        unidade: z.string().optional().nullable().default('un'),
        valor_unit: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
        valor_total: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(0)),
        origem: z.string().optional().nullable().default('OFICINA'),
      })
    )
    .optional()
    .default([])
    .transform((pecas) =>
      pecas.map((p) => ({ ...p, pecaId: p.peca_id || p.pecaId }))
    ),
  centro_custo: z.string().optional().nullable().default('OFICINA'),
  custo_km: z.preprocess(preprocessNumber, z.number().nonnegative().optional().default(1.5)),
  assinatura_cliente: z.string().optional().nullable(),
  assinatura_mecanico: z.string().optional().nullable(),
  assinatura_supervisor: z.string().optional().nullable(),
  assinatura_hash: z.string().optional().nullable(),
  assinatura_timestamp: z.string().optional().nullable(),
  km_veiculo: z.preprocess(preprocessInteger, z.number().int().optional().nullable()),
  horimetro_veiculo: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  confirmar_salto_km: z.boolean().optional().default(false),
  confirmar_salto_horimetro: z.boolean().optional().default(false),
  autorizar_reducao_km: z.boolean().optional().default(false),
  autorizar_reducao_horimetro: z.boolean().optional().default(false),
  justificativa_ajuste_leitura: z.string().optional().nullable(),
  preventivas_ids: z.array(z.string()).optional().default([]),
  preventiva_id: z.string().optional().nullable(),
  forcar_reescrita_assinatura: z.boolean().optional().default(false),
});

// ============================================================
// GET — Buscar OS
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'os', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawOrdem = await prisma.ordemServico.findFirst({
      where: { id, empresa_id: user.empresa_id },
      include: {
        Cliente: true,
        Veiculo: true,
        User: { select: { id: true, name: true, email: true } },
        ServicoOS: true,
        PecaAplicada: { include: { Peca: true } },
      },
    });

    if (!rawOrdem) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    }

    const { Cliente, Veiculo, User, ServicoOS, PecaAplicada, ...rest } = rawOrdem;

    const mappedPecas = PecaAplicada.map((pa) => {
      const { Peca, ...paRest } = pa;
      return { ...paRest, peca: Peca };
    });

    const execsResult = await obterExecucoesPreventivasDaOS(id, user.empresa_id);
    const preventivasExecucoes = execsResult.dados || [];
    const preventivasIds = preventivasExecucoes.map((pe: any) => pe.preventiva_id);

    const ordem = {
      ...rest,
      cliente: Cliente,
      veiculo: Veiculo,
      mecanico: User,
      servicos: ServicoOS,
      pecas_aplicadas: mappedPecas,
      preventivas_execucoes: preventivasExecucoes,
      preventivas_ids: preventivasIds,
      preventivas_historico_indisponivel: execsResult.indisponivel,
      preventivas_historico_motivo: execsResult.motivo || null,
      preventivas_historico_erro: execsResult.erro || null,
    };

    return NextResponse.json(serializeDecimals(ordem));
  } catch (error: any) {
    return apiError(error, 'OS', 'Erro ao buscar OS');
  }
}

// ============================================================
// PATCH — Atualizar parcialmente (e cancelar)
// ============================================================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (
      !checkPermission(user, 'os', 'editar') &&
      !checkPermission(user, 'os', 'editar_proprio')
    ) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const body = updateOsSchema.parse(await request.json());

    const antes = await prisma.ordemServico.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    if (user.role !== 'ADMIN' && antes.created_by !== user.name && antes.created_by !== user.email) {
      log('WARN', 'OS', 'Tentativa de edição de OS de outro usuário negada', {
        id,
        userId: user?.id,
        owner: antes.created_by,
      }, user?.name);
      return NextResponse.json(
        { error: 'Você só pode editar suas próprias OS' },
        { status: 403 }
      );
    }

    // ============================================================
    // A26: bloqueia alteração de assinatura se já existe hash registrado.
    // A assinatura é imutável após homologação.
    // ============================================================
    const querMexerEmAssinatura =
      body.assinatura_cliente !== undefined ||
      body.assinatura_mecanico !== undefined ||
      body.assinatura_supervisor !== undefined ||
      body.assinatura_hash !== undefined;

    if (querMexerEmAssinatura && antes.assinatura_hash) {
      if (user.role !== 'ADMIN' || !body.forcar_reescrita_assinatura) {
        log(
          'WARN',
          'OS',
          'Tentativa de reescrever assinatura já homologada (A26 - PATCH)',
          { osId: id, userId: user.id },
          user?.name
        );
        return NextResponse.json(
          {
            error:
              'Esta OS já possui assinatura homologada e ela não pode ser alterada. Fale com um administrador se precisar refazer.',
          },
          { status: 403 }
        );
      }
    }

    // ============================================================
    // A01: CANCELAMENTO (em vez de exclusão)
    // ============================================================
    if (body.status === 'CANCELADA') {
      const result = await prisma.$transaction(async (tx) => {
        if (antes.status === 'CANCELADA') {
          throw new Error('OS já está cancelada');
        }
        if (antes.status === 'ENTREGUE') {
          throw new Error('OS entregue não pode ser cancelada');
        }

        const pagos = await tx.movimentacaoFinanceira.count({
          where: { os_id: id, status: 'PAGO' },
        });
        if (pagos > 0) {
          throw new Error(
            'Existem lançamentos financeiros PAGOS vinculados a esta OS. Registre um estorno antes de cancelar.'
          );
        }

        await tx.movimentacaoFinanceira.updateMany({
          where: { os_id: id, status: { not: 'PAGO' } },
          data: { status: 'CANCELADO', updated_at: new Date(), updated_by: user?.name || 'Sistema' },
        });

        const pecasAplicadas = await tx.pecaAplicada.findMany({
          where: { os_id: id },
          include: { Peca: true },
        });

        for (const item of pecasAplicadas) {
          let qtdDevolver = item.quantidade;
          if (
            item.unidade &&
            item.Peca?.unidadeMedida &&
            item.unidade.toLowerCase() !== item.Peca.unidadeMedida.toLowerCase()
          ) {
            try {
              qtdDevolver = converterUnidade(
                item.quantidade,
                item.unidade,
                item.Peca.unidadeMedida
              );
            } catch {
              qtdDevolver = item.quantidade;
            }
          }

          await tx.peca.update({
            where: { id: item.peca_id },
            data: { quantidade: { increment: qtdDevolver } },
          });

          await tx.movimentacaoEstoque.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              peca_id: item.peca_id,
              tipo: 'ENTRADA',
              quantidade: qtdDevolver,
              motivo: 'DEVOLUCAO',
              observacao: `Devolução automática por cancelamento da OS #${antes.numero}`,
              os_id: id,
              usuario_id: user.id || 'system',
              empresa_id: antes.empresa_id,
            },
          });
        }

        const ordemAtualizada = await tx.ordemServico.update({
          where: { id },
          data: {
            status: 'CANCELADA',
            observacoes: body.motivo_cancelamento
              ? `${antes.observacoes ? antes.observacoes + '\n\n' : ''}[CANCELAMENTO] ${body.motivo_cancelamento}`
              : antes.observacoes,
            updated_by: user?.name || user?.email || 'Sistema',
          },
          include: { Cliente: true },
        });

        return ordemAtualizada;
      });

      await createAuditLog({
        modulo: 'OS',
        acao: 'CANCELAR',
        entidade: 'OrdemServico',
        entidade_id: id,
        usuario: user?.name || user?.email || 'Sistema',
        empresa_id: user.empresa_id,
        dados_antes: antes,
        dados_depois: result,
      });

      log(
        'INFO',
        'OS',
        'OS cancelada',
        { id, motivo: body.motivo_cancelamento || 'não informado' },
        user?.name
      );

      if (user?.empresa_id) {
        const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
        invalidateDashboardCache(user.empresa_id);
      }

      return NextResponse.json(serializeDecimals(result));
    }

    // ============================================================
    // PATCH normal (edição parcial)
    // ============================================================
    const veiculoId = antes.veiculo_id;
    let leiturasRes: any = { kmFinalAtualizar: null, horimetroFinalAtualizar: null, sucesso: true };
    if (body.km_veiculo !== undefined || body.horimetro_veiculo !== undefined) {
      leiturasRes = await validarEProcessarLeiturasVeiculo({
        veiculoId,
        empresaId: user.empresa_id,
        kmInformado: body.km_veiculo,
        horimetroInformado: body.horimetro_veiculo,
        confirmarSaltoKm: body.confirmar_salto_km,
        confirmarSaltoHorimetro: body.confirmar_salto_horimetro,
        autorizarReducaoKm: body.autorizar_reducao_km,
        autorizarReducaoHorimetro: body.autorizar_reducao_horimetro,
        justificativa: body.justificativa_ajuste_leitura,
        usuario: user,
        contexto: 'EDICAO_OS_PATCH',
        osId: id,
      });
      if (!leiturasRes.sucesso) {
        return NextResponse.json({ error: leiturasRes.erro }, { status: 400 });
      }
    }

    const preventivasIds: string[] = [];
    if (Array.isArray(body.preventivas_ids)) preventivasIds.push(...body.preventivas_ids);
    if (body.preventiva_id && !preventivasIds.includes(body.preventiva_id)) {
      preventivasIds.push(body.preventiva_id);
    }

    if (preventivasIds.length === 0) {
      const fallbackIds = await recuperarPreventivasFallback(id, user.empresa_id, antes);
      preventivasIds.push(...fallbackIds);

      if (preventivasIds.length > 0) {
        log('INFO', 'OS', 'Preventivas recuperadas via fallback (PATCH)', {
          osId: id,
          preventivasIds,
          status: body.status,
        }, user?.name);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (body.pecas && body.pecas.length > 0) {
        for (const p of body.pecas) {
          const actualPecaId = p.peca_id || (p as any).pecaId;

          const peca = await tx.peca.findFirst({
            where: { id: actualPecaId, empresa_id: user.empresa_id },
          });
          if (!peca) throw new Error(`Peça ${actualPecaId} não encontrada nesta empresa`);

          const qty = p.quantidade || 1;
          const reqUnidade = p.unidade || 'un';

          let convertedQty = qty;
          if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
            try {
              convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
            } catch {
              throw new Error(
                `Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`
              );
            }
          }

          if (!peca.permiteFracionado && !Number.isInteger(convertedQty)) {
            throw new Error(
              `A peça ${peca.descricao} não permite fracionamento. Conversão de ${qty} ${reqUnidade} resultou em ${convertedQty} ${peca.unidadeMedida}.`
            );
          }

          if (peca.quantidade < convertedQty) {
            const dispUnStr = peca.unidadeMedida || 'un';
            throw new Error(
              `Estoque insuficiente para: ${peca.descricao}. Disponível: ${peca.quantidade} ${dispUnStr}, Solicitado: ${convertedQty} ${dispUnStr} (${qty} ${reqUnidade})`
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
              os_id: id,
              peca_id: actualPecaId,
              quantidade: qty,
              unidade: reqUnidade,
              valor_unit: valorUnit,
              valor_total: valorTotal,
            },
          });

          await tx.peca.update({
            where: { id: actualPecaId },
            data: { quantidade: { decrement: convertedQty } },
          });

          await tx.movimentacaoEstoque.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              peca_id: actualPecaId,
              tipo: 'SAIDA',
              quantidade: convertedQty,
              motivo: 'OS',
              os_id: id,
              usuario_id: user.id || 'system',
              empresa_id: antes.empresa_id || user?.empresa_id,
            },
          });
        }
      }

      if (body.servicos && body.servicos.length > 0) {
        await tx.servicoOS.createMany({
          data: (body.servicos as any[]).map((s: any) => {
            const horas = parseFloat(s.horas) || 1;
            const valorHora = roundDecimal(parseFloat(s.valor_hora) || 0);
            const valorTotal = roundDecimal(parseFloat(s.valor_total) || horas * valorHora);
            return {
              id: globalThis.crypto.randomUUID(),
              os_id: id,
              descricao: s.descricao,
              horas,
              valor_hora: valorHora,
              valor_total: valorTotal,
            };
          }),
        });
      }

      const updateData: any = {};
      if (body.tipoOS !== undefined) updateData.tipoOS = body.tipoOS;
      if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.status === 'FINALIZADA') updateData.data_finalizada = new Date();
      }
      if (body.diagnostico !== undefined) updateData.diagnostico = body.diagnostico;
      if (body.observacoes !== undefined) updateData.observacoes = body.observacoes;
      if (body.desconto !== undefined) updateData.desconto = roundDecimal(body.desconto);
      if (body.mecanico_id !== undefined)
        updateData.mecanico_id = body.mecanico_id || (body as any).mecanicoId;
      if (body.forma_pagamento !== undefined) updateData.forma_pagamento = body.forma_pagamento;
      if (body.numero_parcelas !== undefined) updateData.numero_parcelas = body.numero_parcelas;
      if (body.dias_entre_parcelas !== undefined)
        updateData.dias_entre_parcelas = body.dias_entre_parcelas;
      if (body.data_vencimento_primeira !== undefined) {
        updateData.data_vencimento_primeira = body.data_vencimento_primeira
          ? new Date(body.data_vencimento_primeira)
          : null;
      }
      if (body.centro_custo !== undefined) updateData.centro_custo = body.centro_custo;
      if (body.custo_km !== undefined) updateData.custo_km = body.custo_km;

      // A26: só atualiza assinatura se não estiver bloqueada
      if (body.assinatura_cliente !== undefined)
        updateData.assinatura_cliente = body.assinatura_cliente;
      if (body.assinatura_mecanico !== undefined)
        updateData.assinatura_mecanico = body.assinatura_mecanico;
      if (body.assinatura_supervisor !== undefined)
        updateData.assinatura_supervisor = body.assinatura_supervisor;
      if (body.assinatura_hash !== undefined) updateData.assinatura_hash = body.assinatura_hash;
      if (body.assinatura_timestamp !== undefined) {
        updateData.assinatura_timestamp = body.assinatura_timestamp
          ? new Date(body.assinatura_timestamp)
          : null;
      }

      if (body.tipo_atendimento !== undefined) updateData.tipo_atendimento = body.tipo_atendimento;
      if (body.km_saida !== undefined) updateData.km_saida = body.km_saida;
      if (body.km_retorno !== undefined) updateData.km_retorno = body.km_retorno;
      if (body.km_total !== undefined) updateData.km_total = body.km_total;
      if (body.valor_km !== undefined) updateData.valor_km = body.valor_km;
      if (body.total_deslocamento !== undefined)
        updateData.total_deslocamento = body.total_deslocamento;

      if (body.despesa_pedagio !== undefined) updateData.despesa_pedagio = body.despesa_pedagio;
      if (body.despesa_combustivel !== undefined)
        updateData.despesa_combustivel = body.despesa_combustivel;
      if (body.despesa_hospedagem !== undefined)
        updateData.despesa_hospedagem = body.despesa_hospedagem;
      if (body.despesa_alimentacao !== undefined)
        updateData.despesa_alimentacao = body.despesa_alimentacao;
      if (body.despesa_diaria_tecnica !== undefined)
        updateData.despesa_diaria_tecnica = body.despesa_diaria_tecnica;
      if (body.despesa_guincho !== undefined) updateData.despesa_guincho = body.despesa_guincho;
      if (body.despesa_outros !== undefined) updateData.despesa_outros = body.despesa_outros;
      if (body.despesas_comprovantes !== undefined)
        updateData.despesas_comprovantes = body.despesas_comprovantes;

      if (body.mao_obra_externa_horas !== undefined)
        updateData.mao_obra_externa_horas = body.mao_obra_externa_horas;
      if (body.mao_obra_externa_valor !== undefined)
        updateData.mao_obra_externa_valor = body.mao_obra_externa_valor;
      if (body.mao_obra_externa_total !== undefined)
        updateData.mao_obra_externa_total = body.mao_obra_externa_total;
      if (body.mao_obra_equipe !== undefined) updateData.mao_obra_equipe = body.mao_obra_equipe;

      if (body.local_atendimento !== undefined) updateData.local_atendimento = body.local_atendimento;
      if (body.local_cidade !== undefined) updateData.local_cidade = body.local_cidade;
      if (body.local_estado !== undefined) updateData.local_estado = body.local_estado;
      if (body.local_gps !== undefined) updateData.local_gps = body.local_gps;

      if (body.timeline_viagem !== undefined) updateData.timeline_viagem = body.timeline_viagem;
      if (body.ferramentas_levadas !== undefined)
        updateData.ferramentas_levadas = body.ferramentas_levadas;

      updateData.updated_by = user?.name || user?.email || 'Sistema';

      const servicosSummary = await tx.servicoOS.aggregate({
        where: { os_id: id },
        _sum: { valor_total: true },
      });
      const pecasSummary = await tx.pecaAplicada.aggregate({
        where: { os_id: id },
        _sum: { valor_total: true },
      });

      updateData.valor_servicos = roundDecimal(
        servicosSummary._sum.valor_total ? Number(servicosSummary._sum.valor_total) : 0
      );
      updateData.valor_pecas = roundDecimal(
        pecasSummary._sum.valor_total ? Number(pecasSummary._sum.valor_total) : 0
      );

      const currentDesconto = Number(
        body.desconto !== undefined ? body.desconto : antes.desconto || 0
      );
      const currentDeslocamento = Number(
        body.total_deslocamento !== undefined
          ? body.total_deslocamento
          : antes.total_deslocamento || 0
      );
      const currentMaoObraExterna = Number(
        body.mao_obra_externa_total !== undefined
          ? body.mao_obra_externa_total
          : antes.mao_obra_externa_total || 0
      );

      const currentPedagio = Number(
        body.despesa_pedagio !== undefined ? body.despesa_pedagio : antes.despesa_pedagio || 0
      );
      const currentCombustivel = Number(
        body.despesa_combustivel !== undefined
          ? body.despesa_combustivel
          : antes.despesa_combustivel || 0
      );
      const currentHospedagem = Number(
        body.despesa_hospedagem !== undefined
          ? body.despesa_hospedagem
          : antes.despesa_hospedagem || 0
      );
      const currentAlimentacao = Number(
        body.despesa_alimentacao !== undefined
          ? body.despesa_alimentacao
          : antes.despesa_alimentacao || 0
      );
      const currentDiariaTecnica = Number(
        body.despesa_diaria_tecnica !== undefined
          ? body.despesa_diaria_tecnica
          : antes.despesa_diaria_tecnica || 0
      );
      const currentGuincho = Number(
        body.despesa_guincho !== undefined ? body.despesa_guincho : antes.despesa_guincho || 0
      );
      const currentOutros = Number(
        body.despesa_outros !== undefined ? body.despesa_outros : antes.despesa_outros || 0
      );

      const totalDespesas = roundDecimal(
        currentPedagio +
          currentCombustivel +
          currentHospedagem +
          currentAlimentacao +
          currentDiariaTecnica +
          currentGuincho +
          currentOutros
      );

      updateData.valor_total = roundDecimal(
        updateData.valor_servicos +
          updateData.valor_pecas +
          currentDeslocamento +
          totalDespesas +
          currentMaoObraExterna -
          currentDesconto
      );

      const appliedPecas = await tx.pecaAplicada.findMany({
        where: { os_id: id },
        include: { Peca: true },
      });
      const custo_pecas = roundDecimal(
        appliedPecas.reduce(
          (acc: number, p: any) =>
            acc +
            p.quantidade * (p.Peca?.preco_custo ? Number(p.Peca.preco_custo) : 0),
          0
        )
      );

      let mecanicoComissao = 0;
      const currentMecanicoId =
        updateData.mecanico_id !== undefined ? updateData.mecanico_id : antes.mecanico_id;
      if (currentMecanicoId) {
        const mecanico = await tx.user.findUnique({ where: { id: currentMecanicoId } });
        if (mecanico) {
          mecanicoComissao = mecanico.comissao ? Number(mecanico.comissao) : 0;
        }
      }
      const custo_mao_obra = roundDecimal(updateData.valor_servicos * (mecanicoComissao / 100));

      const currentKMToral = Number(
        updateData.km_total !== undefined ? updateData.km_total : antes.km_total || 0
      );
      const currentCustoKM = Number(
        updateData.custo_km !== undefined ? updateData.custo_km : antes.custo_km || 1.5
      );
      const custo_deslocamento = roundDecimal(currentKMToral * currentCustoKM);
      const despesas_extras = totalDespesas;

      const custo_real = roundDecimal(
        custo_pecas + custo_mao_obra + custo_deslocamento + despesas_extras + currentMaoObraExterna
      );

      const lucro_bruto = roundDecimal(updateData.valor_total - custo_real);
      const margem_lucro =
        updateData.valor_total > 0
          ? roundDecimal((lucro_bruto / updateData.valor_total) * 100)
          : 0;
      const impostosSimulados = roundDecimal(updateData.valor_total * 0.06);
      const total_liquido = roundDecimal(lucro_bruto - impostosSimulados);

      updateData.custo_pecas = custo_pecas;
      updateData.custo_mao_obra = custo_mao_obra;
      updateData.custo_deslocamento = custo_deslocamento;
      updateData.despesas_extras = despesas_extras;
      updateData.custo_real = custo_real;
      updateData.lucro_bruto = lucro_bruto;
      updateData.margem_lucro = margem_lucro;
      updateData.total_liquido = total_liquido;

      const rawOrdem = await tx.ordemServico.update({
        where: { id },
        data: updateData,
        include: { Cliente: true },
      });

      const { Cliente, ...ordemRest } = rawOrdem;
      const ordem = { ...ordemRest, cliente: Cliente };

      if (body.status === 'FINALIZADA') {
        await gerarMovimentacaoFinanceira(
          tx,
          ordem,
          user?.name || user?.email || 'Sistema'
        );

        if (preventivasIds && preventivasIds.length > 0) {
          const syncPrev = await sincronizarPreventivasAposOS(ordem, {
            tx,
            preventivasIds,
            usuario: user,
            kmVeiculo: leiturasRes.kmFinalAtualizar,
            horimetroVeiculo: leiturasRes.horimetroFinalAtualizar,
          });
          if (!syncPrev.sucesso) {
            throw new Error(
              syncPrev.erro || 'Falha ao sincronizar manutenções preventivas vinculadas à OS'
            );
          }
        }
      }

      return ordem;
    },
    { timeout: 15000 });

    await createAuditLog({
      modulo: 'OS',
      acao: 'EDITAR_PARCIAL',
      entidade: 'OrdemServico',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: result,
    });

    log('INFO', 'OS', 'OS atualizada (PATCH)', { id, status: body.status, preventivasIds }, user?.name);

    try {
      if (body.status === 'FINALIZADA' && antes.status !== 'FINALIZADA') {
        await notificarOSFinalizada(result);
      }
      if (body.pecas && body.pecas.length > 0) {
        for (const p of body.pecas) {
          const actualPecaId = p.peca_id || (p as any).pecaId;
          const peca = await prisma.peca.findUnique({ where: { id: actualPecaId } });
          if (peca && peca.quantidade <= peca.estoque_minimo) {
            await notificarEstoqueBaixo(peca);
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

    return NextResponse.json(serializeDecimals(result));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    if (
      error?.message?.includes('já está cancelada') ||
      error?.message?.includes('não pode ser cancelada') ||
      error?.message?.includes('PAGOS vinculados') ||
      error?.message?.includes('Estoque insuficiente') ||
      error?.message?.includes('Conversão incompatível') ||
      error?.message?.includes('não permite fracionamento')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, 'OS', 'Erro ao atualizar OS');
  }
}

// ============================================================
// PUT — Atualizar completamente
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const user = authResult.user;

    if (
      !checkPermission(user, 'os', 'editar') &&
      !checkPermission(user, 'os', 'editar_proprio')
    ) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const body = putOsSchema.parse(await request.json());

    const antes = await prisma.ordemServico.findFirst({
      where: { id, empresa_id: user.empresa_id },
      include: { ServicoOS: true, PecaAplicada: true },
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    if (user.role !== 'ADMIN' && antes.created_by !== user.name && antes.created_by !== user.email) {
      log('WARN', 'OS', 'Tentativa de edição (PUT) de OS de outro usuário negada', {
        id,
        userId: user?.id,
        owner: antes.created_by,
      }, user?.name);
      return NextResponse.json(
        { error: 'Você só pode editar suas próprias OS' },
        { status: 403 }
      );
    }

    // ============================================================
    // A26: mesma proteção no PUT.
    // ============================================================
    const querMexerEmAssinaturaPut =
      body.assinatura_cliente !== undefined ||
      body.assinatura_mecanico !== undefined ||
      body.assinatura_supervisor !== undefined ||
      body.assinatura_hash !== undefined;

    if (querMexerEmAssinaturaPut && antes.assinatura_hash) {
      if (user.role !== 'ADMIN' || !body.forcar_reescrita_assinatura) {
        log(
          'WARN',
          'OS',
          'Tentativa de reescrever assinatura já homologada (A26 - PUT)',
          { osId: id, userId: user.id },
          user?.name
        );
        return NextResponse.json(
          {
            error:
              'Esta OS já possui assinatura homologada e ela não pode ser alterada. Fale com um administrador se precisar refazer.',
          },
          { status: 403 }
        );
      }
    }

    if (body.cliente_id) {
      const clienteOk = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id },
      });
      if (!clienteOk) {
        return NextResponse.json(
          { error: 'Cliente não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.veiculo_id) {
      const veiculoOk = await prisma.veiculo.findFirst({
        where: { id: body.veiculo_id, empresa_id: user.empresa_id },
      });
      if (!veiculoOk) {
        return NextResponse.json(
          { error: 'Veículo não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    const veiculoIdFinal = body.veiculo_id || antes.veiculo_id;
    let leiturasRes: any = { kmFinalAtualizar: null, horimetroFinalAtualizar: null, sucesso: true };
    if (body.km_veiculo !== undefined || body.horimetro_veiculo !== undefined) {
      leiturasRes = await validarEProcessarLeiturasVeiculo({
        veiculoId: veiculoIdFinal,
        empresaId: user.empresa_id,
        kmInformado: body.km_veiculo,
        horimetroInformado: body.horimetro_veiculo,
        confirmarSaltoKm: body.confirmar_salto_km,
        confirmarSaltoHorimetro: body.confirmar_salto_horimetro,
        autorizarReducaoKm: body.autorizar_reducao_km,
        autorizarReducaoHorimetro: body.autorizar_reducao_horimetro,
        justificativa: body.justificativa_ajuste_leitura,
        usuario: user,
        contexto: 'EDICAO_OS_PUT',
        osId: id,
      });
      if (!leiturasRes.sucesso) {
        return NextResponse.json({ error: leiturasRes.erro }, { status: 400 });
      }
    }

    const preventivasIds: string[] = [];
    if (Array.isArray(body.preventivas_ids)) preventivasIds.push(...body.preventivas_ids);
    if (body.preventiva_id && !preventivasIds.includes(body.preventiva_id)) {
      preventivasIds.push(body.preventiva_id);
    }

    if (preventivasIds.length === 0) {
      const fallbackIds = await recuperarPreventivasFallback(id, user.empresa_id, antes);
      preventivasIds.push(...fallbackIds);

      if (preventivasIds.length > 0) {
        log('INFO', 'OS', 'Preventivas recuperadas via fallback (PUT)', {
          osId: id,
          preventivasIds,
          status: body.status,
        }, user?.name);
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.ordemServico.update({
          where: { id },
          data: {
            tipoOS: body.tipoOS || 'OFICINA',
            cliente_id: body.cliente_id,
            veiculo_id: body.veiculo_id,
            mecanico_id: body.mecanico_id || null,
            diagnostico: body.diagnostico,
            data_previsao: body.data_previsao ? new Date(body.data_previsao) : null,
            status: body.status,
            observacoes: body.observacoes,
            desconto: roundDecimal(body.desconto),
            forma_pagamento: body.forma_pagamento,
            numero_parcelas: body.numero_parcelas,
            dias_entre_parcelas: body.dias_entre_parcelas,
            data_vencimento_primeira: body.data_vencimento_primeira
              ? new Date(body.data_vencimento_primeira)
              : null,
            updated_by: user?.name || user?.email || 'Sistema',

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
            assinatura_timestamp: body.assinatura_timestamp
              ? new Date(body.assinatura_timestamp)
              : null,
          },
        });

        await tx.servicoOS.deleteMany({ where: { os_id: id } });
        if (body.servicos && body.servicos.length > 0) {
          await tx.servicoOS.createMany({
            data: (body.servicos as any[]).map((s: any) => {
              const horas = parseFloat(s.horas) || 1;
              const valorHora = roundDecimal(parseFloat(s.valor_hora) || 0);
              const valorTotal = roundDecimal(parseFloat(s.valor_total) || horas * valorHora);
              return {
                id: globalThis.crypto.randomUUID(),
                os_id: id,
                descricao: s.descricao || s.nome || '',
                horas,
                valor_hora: valorHora,
                valor_total: valorTotal,
              };
            }),
          });
        }

        const pecasAntigas = await tx.pecaAplicada.findMany({
          where: { os_id: id },
          include: { Peca: true },
        });
        for (const p of pecasAntigas) {
          let originalQty = p.quantidade;
          if (
            p.unidade &&
            p.Peca.unidadeMedida &&
            p.unidade.toLowerCase() !== p.Peca.unidadeMedida.toLowerCase()
          ) {
            try {
              originalQty = converterUnidade(p.quantidade, p.unidade, p.Peca.unidadeMedida);
            } catch (e) {
              log('WARN', 'OS', 'Falha ao converter ao devolver estoque', { error: e });
            }
          }
          await tx.peca.update({
            where: { id: p.peca_id },
            data: { quantidade: { increment: originalQty } },
          });
        }

        await tx.pecaAplicada.deleteMany({ where: { os_id: id } });

        if (body.pecas && body.pecas.length > 0) {
          const pecaTotaisSolicitados: Record<string, number> = {};
          for (const p of body.pecas) {
            const actualPecaId = p.peca_id || (p as any).pecaId;
            const qty = p.quantidade || 1;
            const reqUnidade = p.unidade || 'un';
            if (!actualPecaId) throw new Error('ID da peça é obrigatório');

            const peca = await tx.peca.findFirst({
              where: { id: actualPecaId, empresa_id: user.empresa_id },
            });
            if (!peca) throw new Error(`Peça ${actualPecaId} não encontrada nesta empresa`);

            let convertedQty = qty;
            if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
              try {
                convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
              } catch {
                throw new Error(
                  `Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`
                );
              }
            }

            pecaTotaisSolicitados[actualPecaId] =
              (pecaTotaisSolicitados[actualPecaId] || 0) + convertedQty;
          }

          for (const pecaId in pecaTotaisSolicitados) {
            const totalReq = pecaTotaisSolicitados[pecaId];
            const peca = await tx.peca.findFirst({
              where: { id: pecaId, empresa_id: user.empresa_id },
            });
            if (!peca) throw new Error(`Peça ${pecaId} não encontrada nesta empresa`);
            if (peca.quantidade < totalReq) {
              const dispUnStr = peca.unidadeMedida || 'un';
              throw new Error(
                `Estoque insuficiente total para a peça: ${peca.descricao}. Disponível: ${peca.quantidade} ${dispUnStr}, Solicitado total na OS: ${totalReq} ${dispUnStr}`
              );
            }
          }

          for (const p of body.pecas) {
            const actualPecaId = p.peca_id || (p as any).pecaId;
            const qty = p.quantidade || 1;
            const reqUnidade = p.unidade || 'un';
            const peca = await tx.peca.findFirst({
              where: { id: actualPecaId, empresa_id: user.empresa_id },
            });
            if (!peca) throw new Error(`Peça ${actualPecaId} não encontrada nesta empresa`);

            let convertedQty = qty;
            if (peca.unidadeMedida && reqUnidade.toLowerCase() !== peca.unidadeMedida.toLowerCase()) {
              try {
                convertedQty = converterUnidade(qty, reqUnidade, peca.unidadeMedida);
              } catch {
                throw new Error(
                  `Conversão incompatível para ${peca.descricao}: de '${reqUnidade}' para '${peca.unidadeMedida}'.`
                );
              }
            }

            if (!peca.permiteFracionado && !Number.isInteger(convertedQty)) {
              throw new Error(
                `A peça ${peca.descricao} não permite fracionamento. Conversão de ${qty} ${reqUnidade} resultou em ${convertedQty} ${peca.unidadeMedida}.`
              );
            }

            if (peca.quantidade < convertedQty) {
              const dispUnStr = peca.unidadeMedida || 'un';
              throw new Error(
                `Estoque insuficiente para: ${peca.descricao}. Disponível: ${peca.quantidade} ${dispUnStr}, Solicitado: ${convertedQty} ${dispUnStr} (${qty} ${reqUnidade})`
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
                os_id: id,
                peca_id: actualPecaId,
                quantidade: qty,
                unidade: reqUnidade,
                valor_unit: valorUnit,
                valor_total: valorTotal,
                origem: p.origem || 'OFICINA',
              },
            });

            await tx.peca.update({
              where: { id: actualPecaId },
              data: { quantidade: { decrement: convertedQty } },
            });

            await tx.movimentacaoEstoque.create({
              data: {
                id: globalThis.crypto.randomUUID(),
                peca_id: actualPecaId,
                tipo: 'SAIDA',
                quantidade: convertedQty,
                motivo: 'OS',
                os_id: id,
                usuario_id: user.id || 'system',
                empresa_id: antes.empresa_id || user?.empresa_id,
              },
            });
          }
        }

        const servicosSummary = await tx.servicoOS.aggregate({
          where: { os_id: id },
          _sum: { valor_total: true },
        });

        const pecasSummary = await tx.pecaAplicada.aggregate({
          where: { os_id: id },
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
          valor_servicos +
            valor_pecas +
            totalDeslocamento +
            totalDespesas +
            totalMaoObraExterna -
            (body.desconto || 0)
        );

        const appliedPecas = await tx.pecaAplicada.findMany({
          where: { os_id: id },
          include: { Peca: true },
        });
        const custo_pecas = roundDecimal(
          appliedPecas.reduce(
            (acc: number, p: any) =>
              acc +
              p.quantidade * (p.Peca?.preco_custo ? Number(p.Peca.preco_custo) : 0),
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
        const margem_lucro =
          valor_total > 0 ? roundDecimal((lucro_bruto / valor_total) * 100) : 0;
        const impostosSimulados = roundDecimal(valor_total * 0.06);
        const total_liquido = roundDecimal(lucro_bruto - impostosSimulados);

        const rawOrdemFinal = await tx.ordemServico.update({
          where: { id },
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
          include: { Cliente: true },
        });

        const { Cliente, ...ordemRest } = rawOrdemFinal;
        const ordemFinal = { ...ordemRest, cliente: Cliente };

        if (body.status === 'FINALIZADA') {
          await gerarMovimentacaoFinanceira(
            tx,
            ordemFinal,
            user?.name || user?.email || 'Sistema'
          );

          if (preventivasIds && preventivasIds.length > 0) {
            const syncPrev = await sincronizarPreventivasAposOS(ordemFinal, {
              tx,
              preventivasIds,
              usuario: user,
              kmVeiculo: leiturasRes.kmFinalAtualizar,
              horimetroVeiculo: leiturasRes.horimetroFinalAtualizar,
            });
            if (!syncPrev.sucesso) {
              throw new Error(
                syncPrev.erro || 'Falha ao sincronizar manutenções preventivas vinculadas à OS'
              );
            }
          }
        }

        return ordemFinal;
      },
      { timeout: 15000 }
    );

    await createAuditLog({
      modulo: 'OS',
      acao: 'EDITAR_TOTAL',
      entidade: 'OrdemServico',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: result,
    });

    log('INFO', 'OS', 'OS atualizada (PUT)', { id, preventivasIds }, user?.name);

    try {
      if (body.status === 'FINALIZADA' && antes.status !== 'FINALIZADA') {
        await notificarOSFinalizada(result);
      }
      if (body.pecas && body.pecas.length > 0) {
        for (const p of body.pecas) {
          const actualPecaId = p.peca_id || (p as any).pecaId;
          const peca = await prisma.peca.findUnique({ where: { id: actualPecaId } });
          if (peca && peca.quantidade <= peca.estoque_minimo) {
            await notificarEstoqueBaixo(peca);
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

    return NextResponse.json(serializeDecimals(result));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'OS', 'Erro ao atualizar OS');
  }
}

// ============================================================
// DELETE — A01: bloqueado. Use PATCH com status CANCELADA
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (
      !checkPermission(user, 'os', 'excluir') &&
      !checkPermission(user, 'os', 'excluir_proprio')
    ) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const antes = await prisma.ordemServico.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });

    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    log(
      'WARN',
      'OS',
      'Tentativa de exclusão física de OS bloqueada (A01)',
      { id, osNumero: antes.numero, status: antes.status },
      user?.name
    );

    return NextResponse.json(
      {
        error:
          'Exclusão de OS não é permitida. Use a ação "Cancelar OS" para encerrar o registro preservando o histórico e o financeiro.',
        osNumero: antes.numero,
        acaoRecomendada: 'PATCH /api/ordens/[id] com { "status": "CANCELADA", "motivo_cancelamento": "..." }',
      },
      { status: 405 }
    );
  } catch (error: any) {
    return apiError(error, 'OS', 'Erro ao processar exclusão de OS');
  }
}
