import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado! Defina no painel da Hostinger.');
}
const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      empresa_id: payload.empresa_id as string || 'default',
    };
  } catch (error) {
    console.error('Edge Verify Error:', error);
    return null;
  }
}
