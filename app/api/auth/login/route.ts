import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { log } from '@/lib/logger';

// ============================================================
// RATE LIMITING
// ⚠️ TODO: Migrar para Redis ou tabela no banco (multi-instância)
// ============================================================
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    // ============================================================
    // 1. Verificar rate limit
    // ============================================================
    const attempt = loginAttempts.get(ip);

    if (attempt && attempt.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((attempt.lockUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${minutesLeft} min.` },
        { status: 429 }
      );
    }

    if (attempt && attempt.count >= MAX_ATTEMPTS && attempt.lockUntil <= Date.now()) {
      loginAttempts.delete(ip);
    }

    // ============================================================
    // 2. Validar entrada
    // ============================================================
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // ============================================================
    // 3. Buscar usuário
    // ============================================================
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (!user) {
      registrarTentativa(ip);
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // ============================================================
    // 4. Validar senha
    // ============================================================
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      registrarTentativa(ip);
      log('WARN', 'AUTH', 'Tentativa de login falhou', { email, ip });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // ============================================================
    // 5. Validar empresa (multi-tenancy)
    // ============================================================
    if (!user.empresa_id || user.empresa_id === 'default') {
      log('ERROR', 'AUTH', 'Usuário sem empresa válida', { userId: user.id });
      return NextResponse.json(
        { error: 'Usuário sem empresa vinculada. Contate o administrador.' },
        { status: 403 }
      );
    }

    // ============================================================
    // 6. Sucesso: limpar rate limit e gerar token
    // ============================================================
    loginAttempts.delete(ip);

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      empresa_id: user.empresa_id,
    });

    // ============================================================
    // 7. Resposta + Cookie seguro
    // ============================================================
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empresa_id: user.empresa_id,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas (alinha com o JWT)
      path: '/',
    });

    log('INFO', 'AUTH', 'Login bem-sucedido', { userId: user.id, ip });

    return response;
  } catch (error: any) {
    log('ERROR', 'AUTH', 'Erro interno no login', { error: error.message, ip });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function registrarTentativa(ip: string) {
  const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  const newCount = current.count + 1;
  const shouldLock = newCount >= MAX_ATTEMPTS;

  loginAttempts.set(ip, {
    count: newCount,
    lockUntil: shouldLock ? Date.now() + LOCK_DURATION_MS : 0,
  });
}
