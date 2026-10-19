import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const movimentacaoSchema = z.object({
  peca_id: z.string().min(1, 'Peça é obrigatória'),
  tipo: z.enum(['ENTRADA', 'SAIDA'], {
    required_error: 'Tipo é obrigatório (ENTRADA ou SAIDA)',
  }),
  quantidade: z.coerce
    .number()
    .positive('Quantidade deve ser maior que zero'),
  motivo: z.enum(['COMPRA', 'VENDA', 'AJUSTE', 'USO_INTERNO', 'PERDA', 'DEVOLUCAO']).default('AJUSTE'),
  observacao: z.string().max(1000, 'Observação muito longa').optional().nullable(),
  os_id: z.string().optional().nullable(),
});

const listarMovimentacoesQuerySchema = z.object({
  peca_id: z.string().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  motivo: z.enum(['COMPRA', 'VENDA', 'AJUSTE', 'USO_INTERNO', 'PERDA', 'DEVOLUCAO']).optional(),
  data: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data inválida' }
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================
// GET — Listar movimentações (com paginação e filtros validados)
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ NOVO: validação dos filtros com zod
    const parsed = listarMovimentacoesQuerySchema.parse({
      peca_id: searchParams.get('peca_id') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      motivo: searchParams.get('motivo') || undefined,
      data: searchParams.get('data') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { peca_id, tipo, motivo, data: dataRef, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const where: any = { empresa_id: user.empresa_id };
    if (peca_id) where.peca_id = peca_id;
    if (tipo) where.tipo = tipo;
    if (motivo) where.motivo = motivo;

    if (dataRef) {
      const startDate = new Date(dataRef);
      const endDate = new Date(dataRef);
      endDate.setDate(endDate.getDate() + 1);
      where.created_at = { gte: startDate, lt: endDate };
    }

    const [items, total] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          Peca: { select: { descricao: true, codigo: true } },
          OrdemServico: { select: { numero: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movimentacaoEstoque.count({ where }),
    ]);

    const mapped = items.map((m) => {
      const { Peca, OrdemServico, ...rest } = m;
      return {
        ...rest,
        peca: Peca,
        os: OrdemServico,
      };
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
    return apiError(error, 'ESTOQUE', 'Erro ao listar movimentações');
  }
}

// ============================================================
// POST — Registrar movimentação de estoque
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = movimentacaoSchema.parse(await request.json());
    const { peca_id, tipo, quantidade, motivo, observacao, os_id } = body;

    const result = await prisma.$transaction(async (tx) => {
      const peca = await tx.peca.findFirst({
        where: { id: peca_id, empresa_id: user.empresa_id },
      });

      if (!peca) {
        throw new Error('Peça não encontrada nesta empresa');
      }

      if (os_id) {
        const osOk = await tx.ordemServico.findFirst({
          where: { id: os_id, empresa_id: user.empresa_id },
          select: { id: true },
        });
        if (!osOk) {
          throw new Error('OS vinculada não encontrada nesta empresa');
        }
      }

      // A05: operação atômica de estoque
      if (tipo === 'SAIDA') {
        const updateResult = await tx.peca.updateMany({
          where: {
            id: peca_id,
            empresa_id: user.empresa_id,
            quantidade: { gte: quantidade },
          },
          data: { quantidade: { decrement: quantidade } },
        });

        if (updateResult.count === 0) {
          const atual = await tx.peca.findUnique({
            where: { id: peca_id },
            select: { quantidade: true, unidadeMedida: true, descricao: true },
          });
          const disp = atual?.quantidade ?? 0;
          const un = atual?.unidadeMedida || 'un';
          throw new Error(
            `Estoque insuficiente para ${atual?.descricao || 'a peça'}. Disponível: ${disp} ${un}, Solicitado: ${quantidade} ${un}`
          );
        }
      } else {
        await tx.peca.update({
          where: { id: peca_id },
          data: { quantidade: { increment: quantidade } },
        });
      }

      const mov = await tx.movimentacaoEstoque.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          peca_id,
          tipo,
          quantidade,
          motivo: motivo || 'AJUSTE',
          observacao: observacao || null,
          os_id: os_id || null,
          usuario_id: user.id,
          empresa_id: user.empresa_id,
        },
      });

      return mov;
    });

    // ✅ NOVO: auditoria da movimentação
    await createAuditLog({
      modulo: 'ESTOQUE',
      acao: tipo === 'ENTRADA' ? 'ENTRADA_ESTOQUE' : 'SAIDA_ESTOQUE',
      entidade: 'MovimentacaoEstoque',
      entidade_id: result.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        peca_id,
        tipo,
        quantidade,
        motivo,
        os_id: os_id || null,
      },
    });

    log(
      'INFO',
      'ESTOQUE',
      'Movimentação registrada',
      { peca_id, tipo, quantidade, motivo },
      user.name
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (
      error?.message?.includes('Estoque insuficiente') ||
      error?.message?.includes('Peça não encontrada') ||
      error?.message?.includes('OS vinculada não encontrada')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return apiError(error, 'ESTOQUE', 'Erro ao registrar movimentação');
  }
}
