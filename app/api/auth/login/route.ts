import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { log } from '@/lib/logger';
import { isRateLimited, resetRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

// Schema de validação de entrada
const loginSchema = z.object({
  email: z.string().email('E-mail inválido').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Senha obrigatória'),
});

function extrairIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = extrairIp(request);

  try {
    const body = await request.json();
    
    // Validação com zod
    const parsed = loginSchema.parse(body);
    const { email: emailNormalizado, password } = parsed;

    // Rate limit por email + ip
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
        { error: `Muitas tentativas. Tente novamente em ${minutesLeft} min.` },
        { status: 429 }
      );
    }

    // Busca todos os usuários com o e-mail (pode haver múltiplos, um por empresa)
    const candidatos = await prisma.user.findMany({
      where: { email: emailNormalizado },
    });

    if (candidatos.length === 0) {
      log('WARN', 'AUTH', 'Tentativa de login com email inexistente', {
        email: emailNormalizado,
        ip,
      });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Itera sobre os candidatos e verifica a senha
    let user: typeof candidatos[number] | null = null;
    for (const candidato of candidatos) {
      const ok = await bcrypt.compare(password, candidato.password_hash);
      if (ok) {
        user = candidato;
        break;
      }
    }

    if (!user) {
      log('WARN', 'AUTH', 'Tentativa de login falhou', {
        email: emailNormalizado,
        ip,
      });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (!user.empresa_id || user.empresa_id === 'default') {
      log('ERROR', 'AUTH', 'Usuário sem empresa válida', { userId: user.id });
      return NextResponse.json(
        { error: 'Usuário sem empresa vinculada. Contate o administrador.' },
        { status: 403 }
      );
    }

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

    // Reset do rate limit após login bem-sucedido
    await resetRateLimit(rateLimitKey);

    // Gera o token JWT
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      empresa_id: user.empresa_id,
      token_version: user.token_version ?? 0,
    });

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

    // Cookie seguro
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    });

    log('INFO', 'AUTH', 'Login bem-sucedido', { userId: user.id, ip });

    return response;
  } catch (error: any) {
    // Tratamento de erro de validação do zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log('ERROR', 'AUTH', 'Erro interno no login', {
      error: error?.message,
      ip,
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
