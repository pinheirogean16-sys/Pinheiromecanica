import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const notificacao = await prisma.notificacao.update({
      where: { 
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id || 'default'
      },
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
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.notificacao.delete({
      where: { 
        id,
        usuario_id: user.id,
        empresa_id: user.empresa_id || 'default'
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir notificação' }, { status: 500 });
  }
}
