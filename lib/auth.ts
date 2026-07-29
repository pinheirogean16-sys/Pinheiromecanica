import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const getJwtSecret = () => process.env.JWT_SECRET || 'pinheiro-pro-dev-jwt-secret-key-2026';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  empresa_id: string;
}

export function signToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    if (payload) {
      payload.empresa_id = 'default';
    }
    return payload as UserTokenPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
