import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    
    if (!body.respostas) {
      return NextResponse.json({ error: 'Respostas são obrigatórias' }, { status: 400 });
    }

    const execucao = await prisma.checklistExecucao.create({
      data: {
        checklist_id: id,
        os_id: body.osId || null,
        veiculo_id: body.veiculoId || null,
        executado_por: body.executadoPor || 'Sistema',
        respostas: body.respostas,
        observacoes: body.observacoes
      }
    });
    
    return NextResponse.json(execucao, { status: 201 });
  } catch (error) {
    console.error('Erro ao executar checklist:', error);
    return NextResponse.json({ error: 'Erro ao executar checklist' }, { status: 500 });
  }
}
