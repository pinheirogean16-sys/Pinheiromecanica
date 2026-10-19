import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ============================================================
// GERAÇÃO DE SENHA TEMPORÁRIA
// ============================================================
// randomBytes(12) → 96 bits de entropia.
// base64url evita caracteres que quebram copiar/colar (+, /, =).
// 16 caracteres gerados (12 bytes * 8 / 6 = 16).
function gerarSenhaTemporaria(): string {
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ============================================================
// RATE LIMIT POR ADMIN (com limpeza periódica contra memory leak)
// ============================================================
const adminHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minuto
const MAX_HITS = 5; // 5 resets por minuto por admin
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const lastCleanup = { value: Date.now() };

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup.value < CLEANUP_INTERVAL_MS) return;
  lastCleanup.value = now;

  for (const [adminId, entry] of adminHits.entries()) {
    if (now > entry.resetAt) {
      adminHits.delete(adminId);
    }
  }
}

function checkRateLimit(adminId: string): boolean {
  cleanupExpiredEntries(); // ✅ Limpa antes de checar

  const now = Date.now();
  const entry = adminHits.get(adminId);
  if (!entry || now > entry.resetAt) {
    adminHits.set(adminId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_HITS;
}

// ============================================================
// POST — Reset de senha por admin
// ============================================================
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

    if (!user?.empresa_id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // ✅ NOVO: bloqueia auto-reset — o admin deve usar /api/usuario
    // (com senha_atual) para trocar a própria senha. Evita auto-deslogar
    // por acidente e mantém o padrão de "ação sensível exige senha atual".
    if (user.id === id) {
      return NextResponse.json(
        {
          error:
            'Para trocar sua própria senha, use o menu "Meu Perfil" (exige senha atual).',
        },
        { status: 400 }
      );
    }

    // ✅ Rate limit com limpeza periódica
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
      select: {
        id: true,
        email: true,
        token_version: true,
      },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado nesta empresa' },
        { status: 404 }
      );
    }

    const tempPassword = gerarSenhaTemporaria();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    // ✅ Defense in Depth: empresa_id no where
    await prisma.user.update({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
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
      dados_antes: {
        token_version: targetUser.token_version ?? 0,
      },
      dados_depois: {
        targetUserId: id,
        targetUserEmail: targetUser.email,
        resetBy: user.id,
        token_version: (targetUser.token_version ?? 0) + 1,
        timestamp: new Date().toISOString(),
      },
    });

    log(
      'INFO',
      'USUARIOS',
      'Senha resetada por admin',
      { targetId: id, targetEmail: targetUser.email },
      user.name
    );

    // ✅ Senha temporária é retornada em plain text para exibição única.
    // O frontend deve:
    // 1. NÃO salvar em localStorage/sessionStorage
    // 2. NÃO logar no console
    // 3. Exibir em modal com botão "Copiar" e sumir após fechar
    return NextResponse.json({
      success: true,
      tempPassword,
      aviso: 'Exiba esta senha apenas uma vez e oriente o usuário a trocá-la no primeiro login.',
    });
  } catch (error: any) {
    return apiError(error, 'USUARIOS', 'Erro ao resetar senha');
  }
}
