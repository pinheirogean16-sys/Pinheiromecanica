import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET não definido.');
}

const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface EdgeUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  empresa_id: string;
}

export async function verifyTokenEdge(token: string): Promise<EdgeUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: 'pinheiro-diesel-pro',
      audience: 'erp-oficina',
    });

    const empresa_id = payload.empresa_id as string;
    if (!empresa_id || empresa_id === 'default') {
      return null;
    }

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      empresa_id,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[auth-edge] Token verification failed:', error);
    }
    return null;
  }
}
