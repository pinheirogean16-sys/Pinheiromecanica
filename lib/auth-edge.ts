import { jwtVerify } from 'jose';

const getSecret = () => {
  const secretStr = process.env.JWT_SECRET || 'pinheiro-pro-dev-jwt-secret-key-2026';
  return new TextEncoder().encode(secretStr);
};

export async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
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
