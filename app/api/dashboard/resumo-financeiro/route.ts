import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';
import { getCachedResumoFinanceiro } from '@/lib/dashboard-cache';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar dados financeiros
    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresa_id = user.empresa_id;
    const resumo = await getCachedResumoFinanceiro(empresa_id);

    return NextResponse.json(resumo);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar resumo financeiro');
  }
}
