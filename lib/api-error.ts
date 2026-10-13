import { NextResponse } from 'next/server';
import { log } from './logger';

// ============================================================
// apiError — Resposta de erro segura para APIs (server-side)
// Loga o erro real no servidor, devolve mensagem pública
// ============================================================
export function apiError(
  error: unknown,
  modulo: string,
  mensagemPublica = 'Erro interno do servidor',
  status = 500
): NextResponse {
  const err = error as any;

  log('ERROR', modulo, 'Erro na API', {
    message: err?.message,
    stack: err?.stack,
    code: err?.code,
  });

  // Zod (validação)
  if (err?.issues && Array.isArray(err.issues) && err.issues[0]?.message) {
    return NextResponse.json(
      { error: err.issues[0].message },
      { status: 400 }
    );
  }

  // Prisma: unique constraint
  if (err?.code === 'P2002') {
    return NextResponse.json(
      { error: 'Este registro já existe no sistema' },
      { status: 409 }
    );
  }

  // Prisma: foreign key
  if (err?.code === 'P2003') {
    return NextResponse.json(
      { error: 'Registro relacionado não encontrado' },
      { status: 400 }
    );
  }

  // Prisma: not found
  if (err?.code === 'P2025') {
    return NextResponse.json(
      { error: 'Registro não encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ error: mensagemPublica }, { status });
}
