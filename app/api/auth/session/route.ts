import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return NextResponse.json({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    empresa_id: session.empresa_id
  });
}
