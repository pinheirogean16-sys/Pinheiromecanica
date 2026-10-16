import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

// ============================================================
// GET — Listar execuções de checklist com paginação e permissão
// A23: rota agora é SOMENTE leitura. O POST foi consolidado em
// /api/checklist/executar (que tem validação Zod, transação,
// auditoria e notificação). Esta rota não deve mais aceitar escrita.
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para listar execuções
    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const osId = searchParams.get('osId');
    const checklistId = searchParams.get('checklistId');
    const veiculoId = searchParams.get('veiculoId');

    // M06: limite máximo por página
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);

    // Filtros opcionais — sempre com empresa_id
    const where: any = {
      empresa_id: user.empresa_id,
    };
    if (osId) where.os_id = osId;
    if (checklistId) where.checklist_id = checklistId;
    if (veiculoId) where.veiculo_id = veiculoId;

    const [items, total] = await Promise.all([
      prisma.checklistExecucao.findMany({
        where,
        include: {
          Checklist: {
            select: {
              id: true,
              nome: true,
              categoria: true,
            },
          },
          OrdemServico: {
            select: {
              id: true,
              numero: true,
              Cliente: { select: { id: true, nome: true } },
              Veiculo: { select: { id: true, placa: true, modelo: true } },
            },
          },
          Veiculo: {
            select: { id: true, placa: true, modelo: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checklistExecucao.count({ where }),
    ]);

    // A23: nunca devolve o JSON de respostas em massa (pode ser grande).
    // O detalhe de cada execução é buscado em /api/checklist/execucao/[id].
    const mapped = items.map((exec) => ({
      id: exec.id,
      checklist_id: exec.checklist_id,
      os_id: exec.os_id,
      veiculo_id: exec.veiculo_id,
      executado_por: exec.executado_por,
      data: exec.data,
      created_at: exec.created_at,
      observacoes: exec.observacoes,
      // Não devolve `respostas` (grande) — só uma flag se existe
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
    return apiError(
      error,
      'CHECKLIST_EXECUCOES',
      'Erro ao buscar execuções de checklist'
    );
  }
}

// ============================================================
// POST — DESATIVADO
// A23: consolidação. Use POST /api/checklist/executar.
// ============================================================
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Rota descontinuada. Use POST /api/checklist/executar para registrar execução de checklist.',
    },
    { status: 410 }
  );
}
