import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// M08: gera senha temporária criptograficamente segura
function gerarSenhaTemporaria(): string {
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// M08: rate limit simples em memória por usuário admin
const adminHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minuto
const MAX_HITS = 5; // 5 resets por minuto por admin

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const entry = adminHits.get(adminId);
  if (!entry || now > entry.resetAt) {
    adminHits.set(adminId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_HITS;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { error, user } = await requireRole(['ADMIN']);
    if (error) return error;

    if (!checkRateLimit(user.id)) {
      log(
        'WARN',
        'USUARIOS',
        'Rate limit excedido no reset de senha',
        { adminId: user.id, targetId: id },
        user.name
      );
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 1 minuto.' },
        { status: 429 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado nesta empresa' },
        { status: 404 }
      );
    }

    const tempPassword = gerarSenhaTemporaria();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password_hash,
        // C06: incrementa token_version — invalida sessões antigas do usuário alvo
        token_version: (targetUser.token_version ?? 0) + 1,
      },
    });

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'RESET_PASSWORD',
      entidade: 'User',
      entidade_id: id,
      usuario: user.name || user.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        targetUserId: id,
        targetUserEmail: targetUser.email,
        resetBy: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    log(
      'INFO',
      'USUARIOS',
      'Senha resetada',
      { targetId: id, targetEmail: targetUser.email },
      user.name
    );

    return NextResponse.json({ success: true, tempPassword });
  } catch (error: any) {
    log(
      'ERROR',
      'USUARIOS',
      'Erro ao resetar senha',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao resetar' }, { status: 500 });
  }
}
