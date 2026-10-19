import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Schema de validação para filtros e paginação
const execucoesQuerySchema = z.object({
  osId: z.string().optional().nullable(),
  checklistId: z.string().optional().nullable(),
  veiculoId: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de início inválida' }
  ),
  data_fim: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de fim inválida' }
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// GET — Listar execuções de checklist (paginado)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    
    // Validação com zod
    const parsed = execucoesQuerySchema.parse({
      osId: searchParams.get('osId'),
      checklistId: searchParams.get('checklistId'),
      veiculoId: searchParams.get('veiculoId'),
      data_inicio: searchParams.get('data_inicio'),
      data_fim: searchParams.get('data_fim'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { osId, checklistId, veiculoId, data_inicio, data_fim, page, limit } = parsed;

    const where: any = { empresa_id: user.empresa_id };
    if (osId) where.os_id = osId;
    if (checklistId) where.checklist_id = checklistId;
    if (veiculoId) where.veiculo_id = veiculoId;

    // Filtro de período (data_inicio e data_fim)
    if (data_inicio || data_fim) {
      where.created_at = {};
      if (data_inicio) {
        where.created_at.gte = new Date(data_inicio);
      }
      if (data_fim) {
        const fim = new Date(data_fim);
        fim.setUTCHours(23, 59, 59, 999);
        where.created_at.lte = fim;
      }
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log('ERROR', 'CHECKLIST_EXECUCOES', 'Erro ao buscar execuções de checklist', { error: error?.message });
    return apiError(error, 'CHECKLIST_EXECUCOES', 'Erro ao buscar execuções de checklist');
  }
}

// ============================================================
// POST — descontinuado. Use POST /api/checklist/executar.
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
