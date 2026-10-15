import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Peca_categoria } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { notificarEstoqueBaixo } from '@/lib/notificacoes';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { apiError } from '@/lib/api-error';

// A15: `quantidade` NÃO pode ser alterada por este endpoint.
// Alteração de saldo de estoque só pode acontecer via
// POST /api/estoque/movimentacao, que grava MovimentacaoEstoque e usa
// increment/decrement atômico. Isso evita "estoque fantasma" e garante
// rastreabilidade de toda entrada/saída.
const updatePecaSchema = z.object({
  codigo: z.string().min(2).trim().optional(),
  descricao: z.string().min(3).trim().optional(),
  fabricante: z.string().max(200).optional().nullable(),
  categoria: z.nativeEnum(Peca_categoria).optional(),
  estoque_minimo: z.number().min(0).optional(),
  localizacao: z.string().max(200).optional().nullable(),
  preco_custo: z.number().nonnegative().optional(),
  preco_venda: z.number().nonnegative().optional(),
  unidadeMedida: z.string().max(20).optional(),
  unidadeCompra: z.string().max(20).optional(),
  fatorConversao: z.number().min(0.0001).optional(),
  permiteFracionado: z.boolean().optional(),
});

// ============================================================
// GET — Buscar peça com últimas aplicações
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawPeca = await prisma.peca.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        PecaAplicada: {
          include: {
            OrdemServico: {
              include: {
                Cliente: true,
                Veiculo: true,
              },
            },
          },
          orderBy: { OrdemServico: { created_at: 'desc' } },
          take: 10,
        },
      },
    });

    if (!rawPeca) {
      return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
    }

    const { PecaAplicada, ...rest } = rawPeca;
    const peca = {
      ...rest,
      aplicacoes: PecaAplicada.map((pa) => {
        const { OrdemServico, ...paRest } = pa;
        return {
          ...paRest,
          os: OrdemServico
            ? {
                ...OrdemServico,
                cliente: OrdemServico.Cliente,
                veiculo: OrdemServico.Veiculo,
              }
            : null,
        };
      }),
    };

    return NextResponse.json(peca);
  } catch (error: any) {
    return apiError(error, 'PECA', 'Erro ao buscar peça');
  }
}

// ============================================================
// PUT — Atualizar dados cadastrais da peça
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const data = updatePecaSchema.parse(await request.json());

    const antes = await prisma.peca.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    if (data.codigo && data.codigo !== antes.codigo) {
      const existing = await prisma.peca.findFirst({
        where: {
          codigo: data.codigo,
          empresa_id: user.empresa_id,
          NOT: { id },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Código de peça já cadastrado em outro item' },
          { status: 409 }
        );
      }
    }

    const peca = await prisma.peca.update({
      where: { id },
      data: {
        ...data,
        preco_custo:
          data.preco_custo !== undefined
            ? roundDecimal(data.preco_custo)
            : undefined,
        preco_venda:
          data.preco_venda !== undefined
            ? roundDecimal(data.preco_venda)
            : undefined,
        updated_by: user?.name || user?.email || 'Sistema',
      },
    });

    // Notifica estoque baixo — silencioso se falhar
    if (peca.quantidade <= peca.estoque_minimo) {
      try {
        await notificarEstoqueBaixo(peca);
      } catch {
        // notificação é efeito colateral; não quebra a atualização
      }
    }

    await createAuditLog({
      modulo: 'PECA',
      acao: 'EDITAR',
      entidade: 'Peca',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: peca,
    });

    log('INFO', 'PECA', 'Peça atualizada', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(peca);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'PECA', 'Erro ao atualizar peça');
  }
}

// ============================================================
// DELETE — Excluir peça (somente se sem vínculos)
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.peca.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    // Verificar dependências antes de tentar deletar.
    // Evita 500 por violação de FK (PecaAplicada e MovimentacaoEstoque usam Restrict).
    const [aplicacoesCount, movimentacoesCount] = await Promise.all([
      prisma.pecaAplicada.count({ where: { peca_id: id } }),
      prisma.movimentacaoEstoque.count({ where: { peca_id: id } }),
    ]);

    if (aplicacoesCount > 0 || movimentacoesCount > 0) {
      return NextResponse.json(
        {
          error:
            'Esta peça possui histórico (aplicações em OS ou movimentações de estoque) e não pode ser excluída. Considere desativá-la em vez de excluir.',
        },
        { status: 409 }
      );
    }

    await prisma.peca.delete({
      where: { id },
    });

    await createAuditLog({
      modulo: 'PECA',
      acao: 'EXCLUIR',
      entidade: 'Peca',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
    });

    log('INFO', 'PECA', 'Peça excluída', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'PECA', 'Erro ao excluir peça');
  }
}
