import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/recuperar-senha',
  '/redefinir-senha',
  '/portal',                    // ✅ NOVO: Tela pública do cliente (assinatura)
  '/api/auth/login',
  '/api/auth/recuperar-senha',
  '/api/auth/redefinir-senha',
  '/api/register',
  '/api/auth/refresh',
  '/api/portal',                // ✅ NOVO: API pública do portal (GET dados + POST assinatura)
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

  // 2. Rotas públicas (login, register, portal do cliente, manifest, etc)
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

  // 4. 🔒 PROTEÇÃO DO PAINEL SUPER ADMIN
  if (pathname.startsWith('/master-admin') || pathname.startsWith('/api/master-admin')) {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    // Se o e-mail do token for diferente do e-mail mestre, bloqueia
    if (!superAdminEmail || payload.email !== superAdminEmail) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso negado. Área restrita.' }, { status: 403 });
      }
      // Se for tentar acessar a tela pela URL, chuta pro dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
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
