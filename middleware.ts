import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
];

// Regex específico para arquivos estáticos (evita bypass tipo /admin.foo)
const STATIC_EXTENSIONS =
  /\.(?:css|js|jsx|ts|tsx|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|txt|xml)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Assets estáticos e internos do Next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    STATIC_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Rotas públicas
  if (
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )
  ) {
    return NextResponse.next();
  }

  // 3. Verificar cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. VALIDAR o token (antes só checava existência)
  const payload = await verifyTokenEdge(token);

  if (!payload) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Sessão expirada ou inválida' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('auth-token');
    return response;
  }

  // 5. Injetar dados do usuário nos headers (útil para APIs)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-empresa-id', payload.empresa_id);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
