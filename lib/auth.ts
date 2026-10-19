import { SignJWT, jwtVerify } from 'jose';
import { User_role as Role } from '@prisma/client';
import { prisma } from './prisma';

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

// Identificação do emissor/audiência (mantida para compatibilidade
// com tokens já emitidos — se mudar, todos os tokens atuais expiram).
const JWT_ISSUER = 'pinheiro-diesel-pro';
const JWT_AUDIENCE = 'erp-oficina';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  empresa_id: string;
  // C06: opcional para compatibilidade com tokens emitidos antes
  // da migration. Tokens antigos = undefined → tratados como 0.
  token_version?: number;
}

// ============================================================
// GERAR TOKEN
// ============================================================
export async function signToken(payload: UserTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(SECRET_KEY);
}

// ============================================================
// VERIFICAR TOKEN (stateless — usado no edge / middleware)
// Não consulta o banco. Apenas valida criptograficamente o JWT.
// ============================================================
export async function verifyToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
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
      // C06: tokens antigos não têm token_version; trata como 0.
      token_version:
        typeof payload.token_version === 'number' ? payload.token_version : 0,
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
// VERIFICAR SESSÃO (C06) — JWT + consulta no banco
// Retorna null se:
//  - JWT inválido/expirado
//  - Usuário não existe mais
//  - Usuário foi desativado (ativo = false)
//  - Usuário mudou de empresa (defesa em profundidade)
//  - token_version do JWT não bate com o do banco (senha trocada, logout forçado)
//
// ✅ CORREÇÃO: agora busca role/email/name do banco e sobrescreve
// os valores do JWT. Mudanças de role/email/nome por admin têm
// efeito imediato — sem esperar o token expirar (8h).
// ============================================================
export async function verifySession(
  token: string
): Promise<UserTokenPayload | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        ativo: true,
        token_version: true,
        empresa_id: true,
      },
    });

    if (!user) return null;
    if (!user.ativo) return null;
    if (user.empresa_id !== payload.empresa_id) return null;

    const dbVersion = user.token_version ?? 0;
    const tokenVersion = payload.token_version ?? 0;
    if (dbVersion !== tokenVersion) return null;

    // ✅ CORREÇÃO: sobrescreve com os valores ATUAIS do banco.
    // Se o admin rebaixou este usuário (role), trocou o email ou o nome,
    // a próxima requisição já vê o valor atualizado — sem esperar o token expirar.
    return {
      ...payload,
      email: user.email,
      name: user.name,
      role: user.role,
      empresa_id: user.empresa_id,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[auth] Session verification failed:', error);
    }
    return null;
  }
}

// ============================================================
// OBTER SESSÃO (via cookie) — já usa verifySession
// ============================================================
export async function getSession(): Promise<UserTokenPayload | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifySession(token);
}
