import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    
    if (!body.respostas) {
      return NextResponse.json({ error: 'Respostas são obrigatórias' }, { status: 400 });
    }

    const execucao = await prisma.checklistExecucao.create({
      data: {
        id: crypto.randomUUID(),
        empresa_id: user.empresa_id,
        checklist_id: id,
        os_id: body.osId || null,
        veiculo_id: body.veiculoId || null,
        executado_por: body.executadoPor || user.name || 'Sistema',
        respostas: typeof body.respostas === 'string' ? body.respostas : JSON.stringify(body.respostas),
        observacoes: body.observacoes
      }
    });
    
    return NextResponse.json(execucao, { status: 201 });
  } catch (error) {
    console.error('Erro ao executar checklist:', error);
    return NextResponse.json({ error: 'Erro ao executar checklist' }, { status: 500 });
  }
}
