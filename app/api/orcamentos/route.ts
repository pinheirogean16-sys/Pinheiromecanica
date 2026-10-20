import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import { roundDecimal } from '@/lib/utils';

// ============================================================
// CONSTANTES
// ============================================================
// ✅ CORRIGIDO: Agora aceita ENVIADO na criação
const STATUS_CRIACAO_VALIDOS = ['RASCUNHO', 'ENVIADO'] as const;

const STATUS_FILTRO_VALIDOS = [
  'RASCUNHO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'CONVERTIDO',
] as const;

const MAX_ITENS = 100; // Limite de itens por orçamento (serviços ou peças)

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const orcamentoSchema = z.object({
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  data_validade: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de validade inválida' }
  ),
  status: z.enum(STATUS_CRIACAO_VALIDOS).optional().default('RASCUNHO'),
  servicos: z
    .array(
      z.object({
        descricao: z.string().min(1, 'Descrição do serviço é obrigatória').max(500).trim(),
        horas: z.number().nonnegative().default(0),
        valor_hora: z.number().nonnegative().default(0),
      })
    )
    .max(MAX_ITENS, `Máximo de ${MAX_ITENS} serviços por orçamento`)
    .optional()
    .default([]),
  pecas: z
    .array(
      z.object({
        peca_id: z.string().optional().nullable(),
        descricao: z.string().min(1, 'Descrição da peça é obrigatória').max(500).trim(),
        quantidade: z.number().nonnegative().default(0),
        valor_unit: z.number().nonnegative().default(0),
      })
    )
    .max(MAX_ITENS, `Máximo de ${MAX_ITENS} peças por orçamento`)
    .optional()
    .default([]),
  desconto: z.number().nonnegative().default(0),
  observacoes: z.string().max(2000).optional().nullable(),
  termos_condicoes: z.string().max(2000).optional().nullable(),
});

// ✅ CORRIGIDO: Blindagem total do Zod para o GET
const listarOrcamentosQuerySchema = z.object({
  q: z.string().nullish().transform(v => v?.slice(0, 100) || ''),
  status: z.enum(STATUS_FILTRO_VALIDOS).nullish(),
  cliente_id: z.string().nullish(),
  page: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 10 : val),
    z.coerce.number().int().min(1).max(1000).default(10)
  ),
});

// ============================================================
// HELPER: próximo número de orçamento
// ============================================================
async function obterProximoNumeroOrcamento(tx: any, empresaId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefixo = `ORC-${year}-`;
  const ultimo = await tx.orcamento.findFirst({
    where: { empresa_id: empresaId, numero: { startsWith: prefixo } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  let proximoSeq = 1;
  if (ultimo?.numero) {
    const partes = ultimo.numero.split('-');
    const seq = parseInt(partes[partes.length - 1], 10);
    if (!isNaN(seq)) proximoSeq = seq + 1;
  }
  return `${prefixo}${proximoSeq.toString().padStart(4, '0')}`;
}

// ============================================================
// GET — Listar orçamentos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const parsed = listarOrcamentosQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      status: searchParams.get('status') || undefined,
      cliente_id: searchParams.get('cliente_id') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const { q, status, cliente_id, page, limit } = parsed;

    const where: any = { empresa_id: user.empresa_id };
    if (q) {
      where.OR = [
        { numero: { contains: q } },
        { Cliente: { nome: { contains: q } } },
        { Veiculo: { placa: { contains: q } } },
      ];
    }
    if (status) where.status = status;
    if (cliente_id) where.cliente_id = cliente_id;

    const [items, total] = await Promise.all([
      prisma.orcamento.findMany({
        where,
        include: {
          Cliente: {
            select: {
              id: true, nome: true, cpf_cnpj: true, endereco: true,
              cidade: true, estado: true, uf: true, telefone: true, email: true,
            },
          },
          Veiculo: {
            select: {
              id: true, placa: true, modelo: true, marca: true,
              horimetro_atual: true, quilometragem: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.orcamento.count({ where }),
    ]);

    const mapped = items.map((item: any) => {
      const { Cliente, Veiculo, ...rest } = item;
      return { ...rest, Cliente, Veiculo, cliente: Cliente, veiculo: Veiculo };
    });

    return NextResponse.json({
      items: mapped,
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
    return apiError(error, 'ORCAMENTO', 'Erro ao listar orçamentos');
  }
}

// ============================================================
// POST — Criar orçamento
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = orcamentoSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    // Valida cliente
    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id },
      select: { id: true },
    });
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
    }

    // Valida veículo
    const veiculoExistente = await prisma.veiculo.findFirst({
      where: { id: body.veiculo_id, empresa_id },
      select: { id: true },
    });
    if (!veiculoExistente) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
    }

    // Valida que todas as peças (se informadas) pertencem à empresa
    const pecaIds = body.pecas
      .map((p) => p.peca_id)
      .filter((id): id is string => !!id);

    if (pecaIds.length > 0) {
      const pecasValidas = await prisma.peca.findMany({
        where: { id: { in: pecaIds }, empresa_id },
        select: { id: true },
      });

      if (pecasValidas.length !== pecaIds.length) {
        return NextResponse.json(
          { error: 'Uma ou mais peças informadas não pertencem a esta empresa' },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const numero = await obterProximoNumeroOrcamento(tx, empresa_id);

      const valor_servicos = roundDecimal(
        body.servicos.reduce((acc, s) => acc + (s.horas || 0) * (s.valor_hora || 0), 0)
      );
      const valor_pecas = roundDecimal(
        body.pecas.reduce((acc, p) => acc + (p.quantidade || 0) * (p.valor_unit || 0), 0)
      );
      const valor_total = roundDecimal(valor_servicos + valor_pecas - (body.desconto || 0));

      const orcamentoId = globalThis.crypto.randomUUID();

      const orcamento = await tx.orcamento.create({
        data: {
          id: orcamentoId,
          empresa_id,
          numero,
          cliente_id: body.cliente_id,
          veiculo_id: body.veiculo_id,
          data_validade: body.data_validade ? new Date(body.data_validade) : null,
          // ✅ CORRIGIDO: Salva o status enviado pelo usuário (RASCUNHO ou ENVIADO)
          status: body.status || 'RASCUNHO',
          desconto: roundDecimal(body.desconto),
          valor_servicos,
          valor_pecas,
          valor_total,
          observacoes: body.observacoes || null,
          termos_condicoes: body.termos_condicoes || null,
          created_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        },
      });

      if (body.servicos.length > 0) {
        await tx.orcamentoServico.createMany({
          data: body.servicos.map((s) => ({
            id: globalThis.crypto.randomUUID(),
            orcamento_id: orcamentoId,
            descricao: s.descricao,
            horas: s.horas || 0,
            valor_hora: roundDecimal(s.valor_hora || 0),
            valor_total: roundDecimal((s.horas || 0) * (s.valor_hora || 0)),
          })),
        });
      }

      if (body.pecas.length > 0) {
        await tx.orcamentoPeca.createMany({
          data: body.pecas.map((p) => ({
            id: globalThis.crypto.randomUUID(),
            orcamento_id: orcamentoId,
            peca_id: p.peca_id || null,
            descricao: p.descricao,
            quantidade: p.quantidade || 0,
            valor_unit: roundDecimal(p.valor_unit || 0),
            valor_total: roundDecimal((p.quantidade || 0) * (p.valor_unit || 0)),
          })),
        });
      }

      return orcamento;
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'CRIAR',
      entidade: 'Orcamento',
      entidade_id: result.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id,
      dados_depois: result,
    });

    log('INFO', 'ORCAMENTO', 'Orçamento criado', { id: result.id, numero: result.numero }, user?.name);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'ORCAMENTO', 'Erro ao criar orçamento');
  }
}
