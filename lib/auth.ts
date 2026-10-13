import { SignJWT, jwtVerify } from 'jose';
import { User_role as Role } from '@prisma/client';

// ============================================================
// VALIDAÇÃO CRÍTICA: falha ao iniciar se JWT_SECRET não existir
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o sistema.'
  );
}

const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

// Access token curto + refresh token no banco
const ACCESS_TOKEN_EXPIRES_IN = '8h'; // Reduzido de 7d para 8h

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  empresa_id: string;
}

// ============================================================
// GERAR TOKEN
// ============================================================
export async function signToken(payload: UserTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .setIssuer('pinheiro-diesel-pro')
    .setAudience('erp-oficina')
    .sign(SECRET_KEY);
}

// ============================================================
// VERIFICAR TOKEN
// ============================================================
export async function verifyToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: 'pinheiro-diesel-pro',
      audience: 'erp-oficina',
    });

    if (!payload || !payload.empresa_id || payload.empresa_id === 'default') {
      return null;
    }

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      empresa_id: payload.empresa_id as string,
    };
  } catch (error) {
    // Log só em dev para não poluir produção
    if (process.env.NODE_ENV !== 'production') {
      console.error('[auth] Token verification failed:', error);
    }
    return null;
  }
}

// ============================================================
// OBTER SESSÃO (via cookie)
// ============================================================
export async function getSession(): Promise<UserTokenPayload | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
