import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';
import * as crypto from 'crypto';

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const checklistItemSchema = z.object({
  id: z.string().optional(),
  descricao: z
    .string()
    .min(1, 'Descrição do item é obrigatória')
    .max(500, 'Descrição muito longa'),
  tipo: z.string().max(50).optional().default('TEXTO'),
  obrigatorio: z.boolean().optional().default(true),
  ordem: z.number().int().nonnegative().optional(),
});

const updateChecklistSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(200, 'Nome muito longo').optional(),
  descricao: z.string().max(1000).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  ativo: z.boolean().optional(),
  itens: z
    .array(checklistItemSchema)
    .max(200, 'Máximo de 200 itens por checklist')
    .optional(),
});

// ============================================================
// HELPER: normaliza o retorno para o front (C10)
// ============================================================
function normalizarChecklist(raw: any) {
  const itens = Array.isArray(raw?.ChecklistItem) ? raw.ChecklistItem : [];
  const totalExecucoes =
    raw?._count?.ChecklistExecucao ?? raw?._count?.execucoes ?? 0;

  return {
    ...raw,
    itens,
    ChecklistItem: itens,
    _count: { execucoes: totalExecucoes },
  };
}

// ============================================================
// GET — Buscar checklist por ID
// ============================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para visualizar
    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    const checklist = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
      include: {
        ChecklistItem: { orderBy: { ordem: 'asc' } },
        _count: { select: { ChecklistExecucao: true } },
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(normalizarChecklist(checklist));
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao buscar checklist');
  }
}

// ============================================================
// PUT — Atualizar checklist
// ============================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para editar
    if (!checkPermission(user, 'checklist', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const raw = await req.json();
    const parsed = updateChecklistSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const checklistExistente = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });

    if (!checklistExistente) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    // ============================================================
    // A23: NÃO apaga itens existentes se o checklist já foi executado.
    // Se houver execuções, bloqueia edição de itens (mas permite
    // editar nome/descrição/categoria/ativo).
    // ============================================================
    const execucoesCount = await prisma.checklistExecucao.count({
      where: { checklist_id: id, empresa_id: user.empresa_id },
    });

    if (execucoesCount > 0 && body.itens !== undefined) {
      return NextResponse.json(
        {
          error: `Este checklist já foi executado ${execucoesCount}x. Editar os itens quebraria a rastreabilidade dos históricos. Edite apenas nome, descrição, categoria ou status.`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Monta updateData apenas com campos enviados
      const updateData: any = {
        updated_at: new Date(),
      };
      if (body.nome !== undefined) updateData.nome = body.nome;
      if (body.descricao !== undefined) updateData.descricao = body.descricao || null;
      if (body.categoria !== undefined) updateData.categoria = body.categoria || null;
      if (body.ativo !== undefined) updateData.ativo = body.ativo;

      // A23: itens só são alterados se o checklist não tem execuções.
      // Como bloqueamos acima, se chegou aqui é seguro apagar/recriar.
      if (body.itens !== undefined) {
        await tx.checklistItem.deleteMany({ where: { checklist_id: id } });
        updateData.ChecklistItem = {
          create: body.itens.map((item, index) => ({
            id: item.id || crypto.randomUUID(),
            descricao: item.descricao,
            tipo: item.tipo || 'TEXTO',
            obrigatorio:
              typeof item.obrigatorio === 'boolean' ? item.obrigatorio : true,
            ordem: typeof item.ordem === 'number' ? item.ordem : index,
          })),
        };
      }

      return tx.checklist.update({
        where: { id },
        data: updateData,
        include: {
          ChecklistItem: { orderBy: { ordem: 'asc' } },
          _count: { select: { ChecklistExecucao: true } },
        },
      });
    });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EDITAR',
      entidade: 'Checklist',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: {
        nome: checklistExistente.nome,
        descricao: checklistExistente.descricao,
        categoria: checklistExistente.categoria,
        ativo: checklistExistente.ativo,
      },
      dados_depois: {
        nome: updated.nome,
        descricao: updated.descricao,
        categoria: updated.categoria,
        ativo: updated.ativo,
        itensAlterados: body.itens !== undefined,
      },
    });

    log(
      'INFO',
      'CHECKLIST',
      'Checklist atualizado',
      {
        checklistId: id,
        userId: user.id,
        itensAlterados: body.itens !== undefined,
      },
      user?.name
    );

    return NextResponse.json(normalizarChecklist(updated));
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao atualizar checklist');
  }
}

// ============================================================
// DELETE — Deletar checklist
// ============================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para excluir
    if (!checkPermission(user, 'checklist', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    const checklist = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    // A23: bloquear exclusão se houver execuções vinculadas
    const execucoesCount = await prisma.checklistExecucao.count({
      where: { checklist_id: id, empresa_id: user.empresa_id },
    });

    if (execucoesCount > 0) {
      return NextResponse.json(
        {
          error: `Este checklist possui ${execucoesCount} execução(ões) registrada(s) e não pode ser excluído. Considere desativá-lo em vez de excluir.`,
        },
        { status: 409 }
      );
    }

    await prisma.checklist.delete({ where: { id } });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EXCLUIR',
      entidade: 'Checklist',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: {
        nome: checklist.nome,
        categoria: checklist.categoria,
        ativo: checklist.ativo,
      },
    });

    log(
      'INFO',
      'CHECKLIST',
      'Checklist deletado',
      {
        checklistId: id,
        userId: user.id,
      },
      user?.name
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao deletar checklist');
  }
}
