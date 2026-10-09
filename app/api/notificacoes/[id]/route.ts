import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const notif = await prisma.notificacao.findFirst({
      where: { 
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id
      }
    });

    if (!notif) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    const notificacao = await prisma.notificacao.update({
      where: { id: notif.id },
      data: { lida: true }
    });
    return NextResponse.json(notificacao);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const notif = await prisma.notificacao.findFirst({
      where: { 
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id
      }
    });

    if (!notif) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    await prisma.notificacao.delete({
      where: { id: notif.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir notificação' }, { status: 500 });
  }
}
