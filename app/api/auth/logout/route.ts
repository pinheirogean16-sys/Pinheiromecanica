import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export async function POST() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // Incrementa o token_version do usuário.
    // Isso invalida TODOS os tokens JWT emitidos antes deste momento,
    // encerrando a sessão em todos os dispositivos.
    await prisma.user.update({
      where: { id: user.id },
      data: { token_version: { increment: 1 } },
    });

    // Log de auditoria do logout
    await createAuditLog({
      modulo: 'AUTH',
      acao: 'LOGOUT',
      entidade: 'User',
      entidade_id: user.id,
      usuario: user.name || user.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: { mensagem: 'Logout realizado com sucesso' },
    });

    log('INFO', 'AUTH', 'Logout realizado', {
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth-token');
    return response;
  } catch (error: any) {
    log('ERROR', 'AUTH', 'Erro no logout', {
      error: error?.message,
      userId: error?.userId,
    });
    return NextResponse.json(
      { error: 'Erro ao processar logout' },
      { status: 500 }
    );
  }
}
