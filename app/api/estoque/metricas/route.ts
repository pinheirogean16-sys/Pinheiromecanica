import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getMetricasEstoque } from '@/lib/services/estoque-metricas';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresaId = user.empresa_id;
    const metrics = await getMetricasEstoque(empresaId);

    return NextResponse.json(metrics);
  } catch (err) {
    log('ERROR', 'ESTOQUE_METRICAS', 'Erro ao obter métricas do estoque', { error: err }, 'sistema');
    return NextResponse.json(
      { error: 'Erro ao carregar métricas do estoque' },
      { status: 500 }
    );
  }
}
