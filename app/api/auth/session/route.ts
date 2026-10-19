import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Valida se o token_version do JWT é igual ao do banco.
    // Se forem diferentes, o token foi invalidado (ex: logout em todos os dispositivos).
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { token_version: true },
    });

    if (!user || user.token_version !== (session.token_version ?? 0)) {
      log('WARN', 'AUTH', 'Sessão inválida: token_version desatualizado', {
        userId: session.id,
        tokenVersionJWT: session.token_version,
        tokenVersionDB: user?.token_version,
      });
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }

    // Retorna os dados do usuário (sem informações sensíveis)
    return NextResponse.json({
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        empresa_id: session.empresa_id,
      },
    });
  } catch (error: any) {
    log('ERROR', 'AUTH', 'Erro ao buscar sessão', { error: error?.message });
    return NextResponse.json(
      { error: 'Erro interno ao buscar sessão' },
      { status: 500 }
    );
  }
}
