import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// M08: gera senha temporária criptograficamente segura
// 16 caracteres, base64url (letras, números, - e _)
function gerarSenhaTemporaria(): string {
  // 12 bytes → 16 caracteres base64url (96 bits de entropia)
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// M08: rate limit simples em memória por usuário admin
// (protege contra abuso; para multi-instância, migrar para Redis/tabela)
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

    // Valida o ID recebido
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { error, user } = await requireRole(['ADMIN']);
    if (error) return error;

    // M08: rate limit por admin
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

    // M08: senha temporária forte e criptograficamente segura
    const tempPassword = gerarSenhaTemporaria();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password_hash },
    });

    // M08: auditoria — registra quem resetou a senha de quem
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

    // NOTA DE SEGURANÇA: a senha temporária é retornada no corpo da resposta
    // apenas UMA vez. O admin deve copiá-la e entregar ao usuário. Não há
    // sistema de e-mail neste projeto no momento. Se/quando houver, essa
    // resposta deve ser alterada para NÃO devolver a senha em texto plano.
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
