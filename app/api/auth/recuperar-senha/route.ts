import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { isRateLimited } from '@/lib/rate-limit';

const recuperarSchema = z.object({
  email: z.string().email('E-mail inválido').transform(v => v.toLowerCase().trim()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recuperarSchema.parse(body);
    const { email } = parsed;

    // Rate limit para evitar abuso (ex: 5 tentativas por 15 minutos por e-mail)
    const rateLimitKey = `recuperar-senha:${email}`;
    const rateCheck = await isRateLimited(rateLimitKey, 5, 15 * 60 * 1000);
    if (rateCheck.limited) {
      log('WARN', 'AUTH', 'Rate limit bloqueou solicitação de recuperação', { email });
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    // Busca TODOS os usuários com o e-mail (pode haver múltiplos, um por empresa)
    const users = await prisma.user.findMany({ where: { email } });

    // Por segurança, mesmo se o e-mail não existir, retornamos sucesso
    // (evita que um atacante descubra quais e-mails estão cadastrados)
    if (users.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Para cada usuário encontrado, gera um token único e envia um e-mail separado
    for (const user of users) {
      // Invalida tokens anteriores (se existirem)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: null,
          reset_token_expires: null,
        },
      });

      // Gera um novo token único e aleatório
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
    }

    log('INFO', 'AUTH', 'Solicitação de recuperação de senha processada', { email });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log('ERROR', 'AUTH', 'Erro ao solicitar recuperação de senha', { error: error?.message });
    return NextResponse.json(
      { error: 'Erro ao solicitar recuperação.' },
      { status: 500 }
    );
  }
}
