import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { obterHistoricoExecucoesPreventiva } from '@/lib/preventivas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se preventiva pertence à mesma empresa
    const preventiva = await prisma.preventiva.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id
      },
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      }
    });

    if (!preventiva) {
      return NextResponse.json({ error: 'Preventiva não encontrada' }, { status: 404 });
    }

    const historico = await obterHistoricoExecucoesPreventiva(id, user.empresa_id);

    return NextResponse.json({
      preventiva,
      historico
    });
  } catch (error: any) {
    log('ERROR', 'PREVENTIVAS_HISTORICO', 'Erro ao obter histórico de preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao obter histórico de preventiva' }, { status: 500 });
  }
}
