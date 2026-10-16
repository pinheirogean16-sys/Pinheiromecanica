import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { log } from '@/lib/logger';
import { isRateLimited, resetRateLimit } from '@/lib/rate-limit';

// ============================================================
// A11: rate limit persistido no banco (LoginAttempt)
// - Sobrevive a restart
// - Compartilhado entre workers (se houver mais de um)
// - Limite: 5 tentativas por email+IP em 5 minutos
// ============================================================
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

function extrairIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = extrairIp(request);

  try {
    // ============================================================
    // 1. Validar entrada primeiro (para ter o email antes do rate limit)
    // ============================================================
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const emailNormalizado = String(email).toLowerCase().trim();

    // ============================================================
    // 2. Rate limit composto: email + IP
    // A chave inclui email para não bloquear todos os usuários de um
    // mesmo IP (escritório compartilhado), e inclui IP para não permitir
    // que um atacante teste a mesma conta por vários IPs sem limite.
    // ============================================================
    const rateLimitKey = `login:${emailNormalizado}:${ip}`;

    const rateCheck = await isRateLimited(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);

    if (rateCheck.limited) {
      const msLeft = Math.max(0, rateCheck.reset - Date.now());
      const minutesLeft = Math.ceil(msLeft / 60000);

      log('WARN', 'AUTH', 'Rate limit bloqueou tentativa de login', {
        email: emailNormalizado,
        ip,
        count: rateCheck.count,
        msLeft,
      });

      return NextResponse.json(
        {
          error: `Muitas tentativas. Tente novamente em ${minutesLeft} min.`,
        },
        { status: 429 }
      );
    }

    // ============================================================
    // 3. Buscar usuário
    // ============================================================
    const user = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (!user) {
      log('WARN', 'AUTH', 'Tentativa de login com email inexistente', {
        email: emailNormalizado,
        ip,
      });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // ============================================================
    // 4. Validar senha
    // ============================================================
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      log('WARN', 'AUTH', 'Tentativa de login falhou', {
        email: emailNormalizado,
        ip,
      });
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
    // 5b. C06: bloquear login de usuário desativado
    // ============================================================
    if (user.ativo === false) {
      log('WARN', 'AUTH', 'Tentativa de login de usuário desativado', {
        userId: user.id,
        email: emailNormalizado,
        ip,
      });
      return NextResponse.json(
        { error: 'Usuário desativado. Contate o administrador.' },
        { status: 403 }
      );
    }

    // ============================================================
    // 6. Sucesso: limpa o rate limit desta chave
    // ============================================================
    await resetRateLimit(rateLimitKey);

    // C06: inclui token_version no JWT. Se a senha for trocada depois,
    // o valor no banco é incrementado e este token deixa de valer.
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      empresa_id: user.empresa_id,
      token_version: user.token_version ?? 0,
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
    log('ERROR', 'AUTH', 'Erro interno no login', {
      error: error?.message,
      ip,
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
