import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { email } });

    // Por segurança, mesmo se o e-mail não existir, retornamos sucesso (evita hacker descobrir contas)
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Gera um token único e aleatório
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // Expira em 1 hora

    // Salva no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: token,
        reset_token_expires: expires,
      },
    });

    // Monta o link e o HTML do e-mail
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://login.pinheiromecanica.com'}/redefinir-senha?token=${token}`;
    
    const html = `
      <div style="font-family: sans-serif; background-color: #09090b; color: #fff; padding: 40px; text-align: center;">
        <h2 style="color: #f97316;">Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha do VEHLOX.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #f97316; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Redefinir Senha</a>
        <p style="margin-top: 20px; font-size: 12px; color: #a1a1aa;">Este link expira em 1 hora. Se não foi você, ignore este e-mail.</p>
      </div>
    `;

    await sendEmail(user.email, 'Recuperação de Senha - VEHLOX', html);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao solicitar recuperação.' }, { status: 500 });
  }
}
