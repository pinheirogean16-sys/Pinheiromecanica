import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getCachedAtividades } from '@/lib/dashboard-cache';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresa_id = user?.empresa_id || 'default';
    const atividades = await getCachedAtividades(empresa_id);

    return NextResponse.json(atividades);
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json({ error: 'Erro ao buscar atividades recentes' }, { status: 500 });
  }
}

