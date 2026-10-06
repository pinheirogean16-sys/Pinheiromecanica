import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'Pinheirodiesel2026@Seguro#ERP';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
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
    console.error('Edge Verify Error:', error);
    return null;
  }
}
