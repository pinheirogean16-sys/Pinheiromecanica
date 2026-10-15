import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/register',
  '/api/auth/refresh',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
];

const STATIC_EXTENSIONS =
  /\.(?:css|js|jsx|ts|tsx|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|txt|xml)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Assets estáticos e internos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    STATIC_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Rotas públicas (login, register, manifest, etc)
  if (
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )
  ) {
    return NextResponse.next();
  }

  // 3. Valida o JWT de verdade (C01b) — não basta o cookie existir
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return denyAccess(pathname, request);
  }

  const payload = await verifyTokenEdge(token);

  if (!payload) {
    // Token inválido, expirado ou forjado — nega acesso
    return denyAccess(pathname, request);
  }

  return NextResponse.next();
}

function denyAccess(pathname: string, request: NextRequest) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
