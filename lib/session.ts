import { cookies } from 'next/headers';
import { verifyToken, UserTokenPayload } from './auth';

export async function getServerSession(): Promise<UserTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  return verifyToken(token);
}
