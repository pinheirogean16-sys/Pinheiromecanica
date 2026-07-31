import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

// Rate limiting simples (em memória - para produção usar Redis)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Verificar rate limit
    const attempt = loginAttempts.get(ip);
    if (attempt) {
      if (attempt.lockUntil > Date.now()) {
        return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, { status: 429 });
      }
      if (attempt.count >= 5) {
        loginAttempts.set(ip, { count: attempt.count, lockUntil: Date.now() + 5 * 60 * 1000 });
        return NextResponse.json({ error: 'Conta bloqueada por 5 minutos.' }, { status: 429 });
      }
    }

    const body = await request.json();
    const { email, password } = body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
      loginAttempts.set(ip, { count: current.count + 1, lockUntil: current.lockUntil });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
      loginAttempts.set(ip, { count: current.count + 1, lockUntil: current.lockUntil });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    
    // Se sucesso, resetar tentativas
    loginAttempts.delete(ip);

    const token = signToken({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      empresa_id: user.empresa_id || 'default'
    });
    
    // Criar resposta E setar cookie
    const response = NextResponse.json({ 
      success: true, 
      redirect: '/dashboard',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, empresa_id: user.empresa_id || 'default' }
    });
    
    // Cookie com opções robustas e seguras
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias (igual ao JWT)
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
