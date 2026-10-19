import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para criar orçamentos
    if (!checkPermission(user, 'orcamentos', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const now = new Date();
    const year = now.getFullYear();

    // Busca o último número do ano atual pertencente à empresa
    const lastOrcamento = await prisma.orcamento.findFirst({
      where: {
        empresa_id: user.empresa_id,
        numero: {
          startsWith: `ORC-${year}-`,
        },
      },
      orderBy: {
        numero: 'desc',
      },
      select: { numero: true },
    });

    let nextNumber = 1;
    if (lastOrcamento?.numero) {
      const parts = lastOrcamento.numero.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSequence)) {
        nextNumber = lastSequence + 1;
      }
    }

    const numero = `ORC-${year}-${nextNumber.toString().padStart(4, '0')}`;

    return NextResponse.json({ numero });
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'ORCAMENTO', 'Erro ao gerar próximo número');
  }
}
