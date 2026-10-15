import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import * as crypto from 'crypto';

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const checklistItemSchema = z.object({
  id: z.string().optional(),
  descricao: z
    .string()
    .min(1, 'Descrição do item é obrigatória')
    .max(500, 'Descrição muito longa'),
  tipo: z.string().max(50).optional().default('TEXTO'),
  obrigatorio: z.boolean().optional().default(true),
  ordem: z.number().int().nonnegative().optional(),
});

const createChecklistSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(200, 'Nome muito longo'),
  descricao: z.string().max(1000).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  ativo: z.boolean().optional().default(true),
  itens: z
    .array(checklistItemSchema)
    .max(200, 'Máximo de 200 itens por checklist')
    .optional()
    .default([]),
});

// ============================================================
// HELPER: normaliza o retorno para que o front sempre encontre
// o campo `itens` (C10). Mantém `ChecklistItem` para compatibilidade
// com telas antigas que ainda leem o nome do model Prisma.
// ============================================================
function normalizarChecklist(raw: any) {
  const itens = Array.isArray(raw?.ChecklistItem) ? raw.ChecklistItem : [];
  const totalExecucoes =
    raw?._count?.ChecklistExecucao ?? raw?._count?.execucoes ?? 0;

  return {
    ...raw,
    itens,
    ChecklistItem: itens, // compatibilidade com telas legadas
    _count: { execucoes: totalExecucoes },
  };
}

// ============================================================
// GET — Listar checklists da empresa
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para ver checklists
    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const checklists = await prisma.checklist.findMany({
      where: { empresa_id: user.empresa_id },
      include: {
        ChecklistItem: { orderBy: { ordem: 'asc' } },
        _count: { select: { ChecklistExecucao: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // C10: padroniza o campo `itens` e `_count.execucoes`
    const normalizados = checklists.map(normalizarChecklist);

    return NextResponse.json(normalizados);
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao buscar checklists');
  }
}

// ============================================================
// POST — Criar novo checklist
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para criar
    if (!checkPermission(user, 'checklist', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = createChecklistSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { nome, descricao, categoria, ativo, itens } = parsed.data;

    const checklistId = crypto.randomUUID();

    const checklistItemsData = itens.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      descricao: item.descricao,
      tipo: item.tipo || 'TEXTO',
      obrigatorio: typeof item.obrigatorio === 'boolean' ? item.obrigatorio : true,
      ordem: typeof item.ordem === 'number' ? item.ordem : index,
    }));

    const createdChecklist = await prisma.checklist.create({
      data: {
        id: checklistId,
        nome,
        descricao: descricao || null,
        categoria: categoria || null,
        ativo: typeof ativo === 'boolean' ? ativo : true,
        empresa_id: user.empresa_id,
        updated_at: new Date(),
        ChecklistItem: { create: checklistItemsData },
      },
      include: {
        ChecklistItem: { orderBy: { ordem: 'asc' } },
        _count: { select: { ChecklistExecucao: true } },
      },
    });

    // Auditoria
    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'CRIAR',
      entidade: 'Checklist',
      entidade_id: createdChecklist.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        nome: createdChecklist.nome,
        categoria: createdChecklist.categoria,
        itens: checklistItemsData.length,
      },
    });

    log(
      'INFO',
      'CHECKLIST',
      'Checklist criado',
      {
        checklistId: createdChecklist.id,
        itens: checklistItemsData.length,
        userId: user.id,
      },
      user.name
    );

    // Devolve normalizado (com `itens`)
    return NextResponse.json(normalizarChecklist(createdChecklist), { status: 201 });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao criar checklist');
  }
}
