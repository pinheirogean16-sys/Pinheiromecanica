import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { isRateLimited } from '@/lib/rate-limit';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/cadastro',
  '/trial',
  '/esqueci-senha',
  '/offline.html',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js'
];

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/register',
  '/api/auditoria',
  '/api/debug/error-log'
];

function checkIsPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`🛡️ [Middleware] EXECUTADO - Rota: ${pathname}`);

  // 1. Lightweight Rate Limiter for APIs
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login') && !pathname.startsWith('/api/register')) {
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const { limited, count, reset } = isRateLimited(ip, 150, 60000); // 150 req/min

    if (limited) {
      const response = NextResponse.json(
        { error: 'Muitas requisições. Por favor, tente novamente em breve.' }, 
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', '150');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', reset.toString());
      return response;
    }
  }

  let response: NextResponse;
  const isPublic = checkIsPublic(pathname);

  if (isPublic) {
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
          // If the token in cookies is invalid/expired, redirect to login
          response = NextResponse.redirect(new URL('/login', request.url));
          // Clear cookie
          response.cookies.set('auth-token', '', { maxAge: -1 });
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

  // 2. Add Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  // Protect all routes except static files, assets, images and next internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.gif|.*\\.webp|.*\\.css|.*\\.js).*)'],
};
