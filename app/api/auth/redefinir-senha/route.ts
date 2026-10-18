import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, novaSenha } = body;

    if (!token || !novaSenha || novaSenha.length < 8) {
      return NextResponse.json({ error: 'Dados inválidos ou senha muito curta.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { reset_token: token },
    });

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        reset_token: null,
        reset_token_expires: null,
        token_version: { increment: 1 }, 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // 👇 Isso vai aparecer no log da Hostinger se algo falhar
    console.error("ERRO NO REDEFINIR SENHA:", error); 
    return NextResponse.json({ error: 'Erro interno ao redefinir senha.' }, { status: 500 });
  }
}
