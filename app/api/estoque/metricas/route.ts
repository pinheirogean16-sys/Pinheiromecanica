import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { getMetricasEstoque } from '@/lib/services/estoque-metricas';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar estoque
    if (!checkPermission(user, 'estoque', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresaId = user.empresa_id;
    const metrics = await getMetricasEstoque(empresaId);

    return NextResponse.json(metrics);
  } catch (err: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(err, 'ESTOQUE_METRICAS', 'Erro ao carregar métricas do estoque');
  }
}
