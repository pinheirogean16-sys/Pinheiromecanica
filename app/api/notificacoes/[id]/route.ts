import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

// ============================================================
// PATCH — Marcar notificação como lida
// ============================================================
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const notif = await prisma.notificacao.findFirst({
      where: {
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id,
      },
    });

    if (!notif) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    // ✅ Redundância de segurança: empresa_id no where
    const notificacao = await prisma.notificacao.update({
      where: {
        id: notif.id,
        empresa_id: user.empresa_id,
      },
      data: { lida: true },
    });

    return NextResponse.json(notificacao);
  } catch (error: any) {
    return apiError(error, 'NOTIFICACAO', 'Erro ao atualizar notificação');
  }
}

// ============================================================
// DELETE — Excluir notificação
// ============================================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const notif = await prisma.notificacao.findFirst({
      where: {
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id,
      },
    });

    if (!notif) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    // ✅ Redundância de segurança: empresa_id no where
    await prisma.notificacao.delete({
      where: {
        id: notif.id,
        empresa_id: user.empresa_id,
      },
    });

    log(
      'INFO',
      'NOTIFICACAO',
      'Notificação excluída',
      { id: notif.id, titulo: notif.titulo },
      user?.name
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'NOTIFICACAO', 'Erro ao excluir notificação');
  }
}
