import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error, user } = await requireRole(['ADMIN']);
    if (error) return error;

    const targetUser = await prisma.user.findFirst({
      where: { id, empresa_id: user.empresa_id }
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado nesta empresa' }, { status: 404 });
    }
    
    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    await prisma.user.update({
      where: { id },
      data: { password_hash }
    });
    
    return NextResponse.json({ success: true, tempPassword });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao resetar' }, { status: 500 });
  }
}
