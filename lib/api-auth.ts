import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { checkPermission, Modulo, Acao } from './rbac';

// Verificar se o usuário está autenticado
export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }), user: null };
  }
  
  const payload = verifyToken(token);
  if (!payload || !payload.empresa_id || payload.empresa_id === 'default') {
    return { error: NextResponse.json({ error: 'Token inválido ou sem identificação de empresa' }, { status: 401 }), user: null };
  }
  
  return { error: null, user: payload };
}

// Verificar role específica
export async function requireRole(roles: string[]) {
  const { error, user } = await requireAuth();
  
  if (error) return { error, user: null };
  if (user && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), user: null };
  }
  
  return { error: null, user };
}

// Verificar permissão granular de forma centralizada
export async function requirePermission(modulo: Modulo, acao: Acao) {
  const { error, user } = await requireAuth();
  
  if (error) return { error, user: null };
  if (user && !checkPermission(user, modulo, acao)) {
    return { error: NextResponse.json({ error: `Permissão negada para ${modulo}.${acao}` }, { status: 403 }), user: null };
  }
  
  return { error: null, user };
}

