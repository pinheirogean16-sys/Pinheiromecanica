import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { getCachedStats } from '@/lib/dashboard-cache';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresa_id = user.empresa_id;
    const stats = await getCachedStats(empresa_id);

    return NextResponse.json(stats);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado com apiError
    return apiError(error, 'DASHBOARD', 'Erro ao buscar estatísticas');
  }
}
