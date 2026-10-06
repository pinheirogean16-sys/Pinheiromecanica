import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { randomUUID } from 'crypto';

const updateChecklistSchema = z.object({
  nome: z.string().min(1, 'Nome do checklist deve possuir pelo menos 1 caractere').trim().optional(),
  categoria: z.string().optional(),
  itens: z.array(z.object({
    descricao: z.string().min(1, 'Descrição do item é obrigatória').trim(),
    tipo: z.enum(['SIM_NAO', 'TEXTO', 'FOTO', 'NUMERICO']),
    obrigatorio: z.boolean().default(true)
  })).optional()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const checklist = await prisma.checklist.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        ChecklistItem: {
          orderBy: { ordem: 'asc' }
        },
        _count: {
          select: { ChecklistExecucao: true }
        }
      }
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist não encontrado' }, { status: 404 });
    }

    const mappedChecklist = {
      ...checklist,
      itens: checklist.ChecklistItem,
      ChecklistItem: undefined,
      _count: {
        execucoes: checklist._count.ChecklistExecucao
      }
    };

    return NextResponse.json(mappedChecklist);
  } catch (error) {
    console.error('[CHECKLIST GET BY ID ERROR]', JSON.stringify(error, null, 2));
    log('ERROR', 'CHECKLIST', 'Get checklist error', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar checklist' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateChecklistSchema.parse(await request.json());

    const antesDb = await prisma.checklist.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: { ChecklistItem: { orderBy: { ordem: 'asc' } } }
    });
    if (!antesDb) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const antesMapped = {
      ...antesDb,
      itens: antesDb.ChecklistItem,
      ChecklistItem: undefined
    };

    const result = await prisma.$transaction(async (tx) => {
      // Se enviou itens, deletar antigos e criar novos
      if (body.itens) {
        await tx.checklistItem.deleteMany({
          where: { checklist_id: id }
        });

        const itemsToCreate = body.itens.map((item, index) => ({
          id: randomUUID(),
          checklist_id: id,
          descricao: item.descricao,
          tipo: item.tipo,
          ordem: index + 1,
          obrigatorio: item.obrigatorio
        }));

        if (itemsToCreate.length > 0) {
          await tx.checklistItem.createMany({
            data: itemsToCreate
          });
        }
      }

      const updatedChecklist = await tx.checklist.update({
        where: { id },
        data: {
          nome: body.nome,
          categoria: body.categoria,
        },
        include: {
          ChecklistItem: {
            orderBy: { ordem: 'asc' }
          }
        }
      });

      return {
        ...updatedChecklist,
        itens: updatedChecklist.ChecklistItem,
        ChecklistItem: undefined
      };
    });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EDITAR',
      entidade: 'Checklist',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antesMapped,
      dados_depois: result
    });

    log('INFO', 'CHECKLIST', 'Checklist atualizado', { id }, user?.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CHECKLIST PUT ERROR]', JSON.stringify(error, null, 2));
    log('ERROR', 'CHECKLIST', 'Update checklist error', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar checklist' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    const antes = await prisma.checklist.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const execucoesCount = await prisma.checklistExecucao.count({
      where: { checklist_id: id }
    });

    if (execucoesCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um checklist que já possui execuções vinculadas.' },
        { status: 400 }
      );
    }

    await prisma.checklist.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EXCLUIR',
      entidade: 'Checklist',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'CHECKLIST', 'Checklist excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'CHECKLIST', 'Delete checklist error', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir checklist' }, { status: 500 });
  }
}
