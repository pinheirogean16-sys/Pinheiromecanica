import jwt from 'jsonwebtoken';
import { User_role as Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'Pinheirodiesel2026@Seguro#ERP';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  empresa_id: string;
}

export function signToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as any;
    if (!payload || !payload.empresa_id || payload.empresa_id === 'default') {
      return null;
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
