import { NextResponse, type NextRequest } from 'next/server';

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

const STATIC_EXTENSIONS =
  /\.(?:css|js|jsx|ts|tsx|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|txt|xml)$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Assets estáticos
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

  // 3. Apenas verifica existência do cookie (rápido)
  // A validação real acontece em cada API via requireAuth()
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
