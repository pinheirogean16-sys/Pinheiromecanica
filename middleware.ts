import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { isRateLimited } from '@/lib/rate-limit';

const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/register', '/api/auditoria'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Lightweight Rate Limiter for APIs to protect Hostinger CPU/RAM
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login') && !pathname.startsWith('/api/register')) {
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const { limited, count, reset } = isRateLimited(ip, 120, 60000); // 120 requests per minute

    if (limited) {
      const response = NextResponse.json(
        { error: 'Muitas requisições. Por favor, tente novamente em breve.' }, 
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', '120');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', reset.toString());
      return response;
    }
  }

  let response: NextResponse;

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    response = NextResponse.next();
  } else {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      if (pathname.startsWith('/api')) {
        response = NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      } else {
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    } else {
      const payload = await verifyTokenEdge(token);

      if (!payload) {
        if (pathname.startsWith('/api')) {
          response = NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        } else {
          response = NextResponse.redirect(new URL('/login', request.url));
        }
      } else {
        response = NextResponse.next();
        response.headers.set('X-User-Id', payload.id);
        response.headers.set('X-User-Role', payload.role);
        response.headers.set('X-User-Name', payload.name);
        response.headers.set('X-Empresa-Id', payload.empresa_id);
      }
    }
  }

  // 2. Add Security Headers for Enterprise-grade Compliance on all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');

  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)'],
};
