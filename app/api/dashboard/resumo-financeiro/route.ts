import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getCachedResumoFinanceiro } from '@/lib/dashboard-cache';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresa_id = user?.empresa_id || 'default';
    const resumo = await getCachedResumoFinanceiro(empresa_id);

    return NextResponse.json(resumo);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar resumo financeiro' }, { status: 500 });
  }
}

