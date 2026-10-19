import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Peca_categoria } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { notificarEstoqueBaixo } from '@/lib/notificacoes';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-search';
import { LISTA_UNIDADES } from '@/lib/unidades';

// ============================================================
// CONSTANTES
// ============================================================
const MAX_ITENS = 100;
const UNIDADES_VALIDAS = LISTA_UNIDADES.map((u) => u.sigla);

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const pecaSchema = z.object({
  codigo: z.string().min(2, 'Código muito curto').max(100).trim(),
  descricao: z.string().min(3, 'Descrição muito curta').max(500).trim(),
  fabricante: z.string().max(200).optional().nullable(),
  categoria: z.nativeEnum(Peca_categoria),
  quantidade: z.number().min(0).default(0),
  estoque_minimo: z.number().min(0).default(5),
  localizacao: z.string().max(200).optional().nullable(),
  preco_custo: z.number().nonnegative(),
  preco_venda: z.number().nonnegative(),
  unidadeMedida: z.enum(UNIDADES_VALIDAS as [string, ...string[]]).default('un'),
  unidadeCompra: z.enum(UNIDADES_VALIDAS as [string, ...string[]]).default('un'),
  fatorConversao: z.number().min(0.0001).default(1),
  permiteFracionado: z.boolean().default(false),
});

const listarPecasQuerySchema = z.object({
  q: z.string().optional().transform((v) => v?.slice(0, 100) || ''),
  categoria: z.nativeEnum(Peca_categoria).optional(),
  onlySearch: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_ITENS).default(10),
});

// ============================================================
// SERIALIZAÇÃO DE DECIMAIS
// ============================================================
function serializeDecimals(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serializeDecimals);
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
// GET — Listar peças
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar peças
    if (!checkPermission(user, 'pecas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // ✅ NOVO: validação com zod
    // O `|| undefined` é essencial. Se o parâmetro não vier na URL, 
    // o searchParams.get retorna `null`. O Zod coerce.number() transforma `null` em `0`, 
    // quebrando o .min(1). Usando `|| undefined`, o .default() do Zod entra em ação.
    const parsed = listarPecasQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      categoria: searchParams.get('categoria') || undefined,
      onlySearch: searchParams.get('onlySearch') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const { q, categoria, onlySearch, page, limit: rawLimit } = parsed;

    // onlySearch: exige termo mínimo de 2 caracteres
    if (onlySearch && (!q || q.trim().length < 2)) {
      return NextResponse.json({
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
    }

    const limit = onlySearch ? 20 : rawLimit;

    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (q) {
      const rawTerms = q
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(Boolean);

      if (rawTerms.length > 0) {
        where.AND = rawTerms.map((term) => {
          const normTerm = normalizeText(term);

          const orConditions: any[] = [
            { id: { contains: term } },
            { codigo: { contains: term } },
            { descricao: { contains: term } },
            { fabricante: { contains: term } },
          ];

          if (normTerm !== term && normTerm) {
            orConditions.push(
              { id: { contains: normTerm } },
              { codigo: { contains: normTerm } },
              { descricao: { contains: normTerm } },
              { fabricante: { contains: normTerm } }
            );
          }

          return { OR: orConditions };
        });
      }
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const skip = (page - 1) * limit;

    const [pecas, total] = await Promise.all([
      prisma.peca.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.peca.count({ where }),
    ]);

    // ✅ NOVO: serializa Decimal antes de retornar
    return NextResponse.json({
      items: serializeDecimals(pecas || []),
      total: total || 0,
      page,
      totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    // ✅ NOVO: não engole o erro, retorna 500 real
    return apiError(error, 'PECA', 'Erro ao listar peças');
  }
}

// ============================================================
// POST — Criar peça
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ Mantida a flexibilidade: criar peça na OS exige permissão de OS
    const canCreatePeca =
      checkPermission(user, 'pecas', 'criar') ||
      checkPermission(user, 'os', 'criar') ||
      checkPermission(user, 'os', 'editar');

    if (!canCreatePeca) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const data = pecaSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    // ✅ NOVO: valida preço de venda >= custo
    if (data.preco_venda < data.preco_custo) {
      return NextResponse.json(
        {
          error: `Preço de venda (R$ ${data.preco_venda.toFixed(2)}) não pode ser menor que o custo (R$ ${data.preco_custo.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.peca.findUnique({
      where: {
        codigo_empresa_id: {
          codigo: data.codigo,
          empresa_id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código de peça já cadastrado para esta empresa' },
        { status: 400 }
      );
    }

    const peca = await prisma.$transaction(async (tx) => {
      const createdPeca = await tx.peca.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          ...data,
          empresa_id,
          preco_custo: roundDecimal(data.preco_custo),
          preco_venda: roundDecimal(data.preco_venda),
          created_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        },
      });

      if (data.quantidade > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            id: globalThis.crypto.randomUUID(),
            peca_id: createdPeca.id,
            tipo: 'ENTRADA',
            quantidade: data.quantidade,
            motivo: 'CADASTRO_INICIAL',
            observacao: 'Saldo inicial cadastrado no almoxarifado',
            os_id: null,
            usuario_id: user.id,
            empresa_id,
          },
        });
      }

      return createdPeca;
    });

    // ✅ NOVO: serializa Decimal antes de auditar
    const pecaSerializada = serializeDecimals(peca);

    await createAuditLog({
      modulo: 'PECA',
      acao: 'CRIAR',
      entidade: 'Peca',
      entidade_id: peca.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: pecaSerializada,
    });

    log('INFO', 'PECA', 'Peça criada', { id: peca.id, codigo: peca.codigo }, user?.name);

    if (peca.quantidade <= peca.estoque_minimo) {
      try {
        // ✅ NOVO: usa versão serializada (sem Decimal)
        await notificarEstoqueBaixo(pecaSerializada);
      } catch (err: any) {
        log(
          'WARN',
          'PECA',
          'Erro ao notificar estoque baixo',
          { error: err?.message, pecaId: peca.id },
          'sistema'
        );
      }
    }

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(pecaSerializada, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'PECA', 'Erro ao criar peça');
  }
}
