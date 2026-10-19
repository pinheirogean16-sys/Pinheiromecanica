import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const redefinirSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  novaSenha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = redefinirSchema.parse(body);
    const { token, novaSenha } = parsed;

    // Busca o usuário pelo token de reset
    const user = await prisma.user.findFirst({
      where: { reset_token: token },
    });

    // Verifica se o token existe e não expirou
    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      log('WARN', 'AUTH', 'Tentativa de redefinição com token inválido/expirado', { token });
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    // Hash da nova senha
    const password_hash = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha, invalida o token e incrementa token_version
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        reset_token: null,
        reset_token_expires: null,
        token_version: { increment: 1 },
      },
    });

    // Log de auditoria (opcional, mas recomendado)
    await createAuditLog({
      modulo: 'AUTH',
      acao: 'REDEFINIR_SENHA',
      entidade: 'User',
      entidade_id: user.id,
      usuario: user.name || user.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: { mensagem: 'Senha redefinida via token de recuperação' },
    });

    log('INFO', 'AUTH', 'Senha redefinida com sucesso', { userId: user.id, email: user.email });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log('ERROR', 'AUTH', 'Erro ao redefinir senha', { error: error?.message });
    return NextResponse.json(
      { error: 'Erro interno ao redefinir senha.' },
      { status: 500 }
    );
  }
}
