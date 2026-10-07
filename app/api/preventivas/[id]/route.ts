import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const editPreventivaSchema = z.object({
  componente: z.enum(['OLEO', 'FILTROS', 'REVISAO', 'FREIOS', 'DIFERENCIAL', 'CAIXA', 'SUSPENSAO', 'COMPRESSOR', 'TURBINA']).optional(),
  descricao: z.string().optional().nullable(),
  km_limite: z.preprocess((val) => (val === '' ? null : Number(val)), z.number().int().optional().nullable()),
  data_limite: z.string().optional().nullable(),
  status: z.string().optional()
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const id = (await params).id;
    const beforeObj = await prisma.preventiva.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!beforeObj) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    const body = editPreventivaSchema.parse(await request.json());

    const updateData: any = {};
    if (body.componente !== undefined) updateData.componente = body.componente;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.km_limite !== undefined) updateData.km_limite = body.km_limite;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.data_limite !== undefined) {
      updateData.data_limite = body.data_limite ? new Date(body.data_limite) : null;
    }

    const updated = await prisma.preventiva.update({
      where: { id },
      data: updateData
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EDITAR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: beforeObj,
      dados_depois: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao editar preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao editar preventiva' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const id = (await params).id;
    const beforeObj = await prisma.preventiva.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!beforeObj) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    await prisma.preventiva.delete({ where: { id } });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EXCLUIR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: beforeObj
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log('ERROR', 'PREVENTIVAS', 'Erro ao excluir preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir preventiva' }, { status: 500 });
  }
}
