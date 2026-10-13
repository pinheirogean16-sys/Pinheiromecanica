import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const checklist = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
      include: {
        ChecklistItem: { orderBy: { ordem: 'asc' } },
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(checklist);
  } catch (error: any) {
    log('ERROR', 'CHECKLIST', 'Erro ao buscar checklist', {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Erro ao buscar checklist' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const { nome, descricao, categoria, ativo, itens } = body;

    const checklistExistente = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });

    if (!checklistExistente) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.checklistItem.deleteMany({ where: { checklistId: id } });

      return tx.checklist.update({
        where: { id },
        data: {
          nome,
          descricao: descricao || null,
          categoria: categoria || null,
          ativo: typeof ativo === 'boolean' ? ativo : true,
          updated_at: new Date(),
          ChecklistItem: {
            create: Array.isArray(itens)
              ? itens.map((item: any, index: number) => ({
                  id: item.id || crypto.randomUUID(),
                  descricao: item.descricao || '',
                  tipo: item.tipo || 'TEXTO',
                  obrigatorio:
                    typeof item.obrigatorio === 'boolean'
                      ? item.obrigatorio
                      : true,
                  ordem:
                    typeof item.ordem === 'number' ? item.ordem : index,
                }))
              : [],
          },
        },
        include: { ChecklistItem: true },
      });
    });

    log('INFO', 'CHECKLIST', 'Checklist atualizado', {
      checklistId: id,
      userId: user.id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    log('ERROR', 'CHECKLIST', 'Erro ao atualizar checklist', {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Erro ao atualizar checklist' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const checklist = await prisma.checklist.findFirst({
      where: { id, empresa_id: user.empresa_id },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    await prisma.checklist.delete({ where: { id } });

    log('INFO', 'CHECKLIST', 'Checklist deletado', {
      checklistId: id,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log('ERROR', 'CHECKLIST', 'Erro ao deletar checklist', {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Erro ao deletar checklist' },
      { status: 500 }
    );
  }
}
