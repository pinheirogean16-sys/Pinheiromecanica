import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const osId = searchParams.get('osId');
    const checklistId = searchParams.get('checklistId');
    const veiculoId = searchParams.get('veiculoId');

    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);

    const where: any = { empresa_id: user.empresa_id };
    if (osId) where.os_id = osId;
    if (checklistId) where.checklist_id = checklistId;
    if (veiculoId) where.veiculo_id = veiculoId;

    const [items, total] = await Promise.all([
      prisma.checklistExecucao.findMany({
        where,
        include: {
          Checklist: { select: { id: true, nome: true, categoria: true } },
          OrdemServico: {
            select: {
              id: true,
              numero: true,
              Cliente: { select: { id: true, nome: true } },
              Veiculo: { select: { id: true, placa: true, modelo: true } },
            },
          },
          Veiculo: { select: { id: true, placa: true, modelo: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checklistExecucao.count({ where }),
    ]);

    const mapped = items.map((exec) => ({
      id: exec.id,
      checklist_id: exec.checklist_id,
      os_id: exec.os_id,
      veiculo_id: exec.veiculo_id,
      executado_por: exec.executado_por,
      data: exec.data,
      created_at: exec.created_at,
      observacoes: exec.observacoes,
      tem_respostas: !!exec.respostas,
      checklist: exec.Checklist,
      os: exec.OrdemServico,
      veiculo: exec.Veiculo,
    }));

    return NextResponse.json({
      items: mapped,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST_EXECUCOES', 'Erro ao buscar execuções de checklist');
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Rota descontinuada. Use POST /api/checklist/executar para registrar execução de checklist.',
    },
    { status: 410 }
  );
}
