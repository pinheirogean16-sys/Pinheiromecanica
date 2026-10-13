import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/handle-api-error';
import * as crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const checklists = await prisma.checklist.findMany({
      where: { empresa_id: user.empresa_id },
      include: {
        ChecklistItem: { orderBy: { ordem: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(checklists);
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao buscar checklists');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { nome, descricao, categoria, ativo, itens } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "O campo 'nome' é obrigatório." },
        { status: 400 }
      );
    }

    const checklistId = crypto.randomUUID();

    const checklistItemsData = Array.isArray(itens)
      ? itens.map((item: any, index: number) => ({
          id: item.id || crypto.randomUUID(),
          descricao: item.descricao || '',
          tipo: item.tipo || 'TEXTO',
          obrigatorio:
            typeof item.obrigatorio === 'boolean' ? item.obrigatorio : true,
          ordem: typeof item.ordem === 'number' ? item.ordem : index,
        }))
      : [];

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
      include: { ChecklistItem: true },
    });

    log('INFO', 'CHECKLIST', 'Checklist criado', {
      checklistId: createdChecklist.id,
      itens: checklistItemsData.length,
      userId: user.id,
    });

    return NextResponse.json(createdChecklist, { status: 201 });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao criar checklist');
  }
}
