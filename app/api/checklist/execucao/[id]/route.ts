import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

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
    console.error('GET EXECUCAO ID', id);
    console.error('[GET EXECUCAO] PASSO 1 - Antes do findFirst');
    const execucao = await prisma.checklistExecucao.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        Checklist: {
          include: {
            ChecklistItem: {
              orderBy: { ordem: 'asc' }
            }
          }
        },
        OrdemServico: {
          include: {
            Cliente: true,
            Veiculo: true
          }
        },
        ChecklistFoto: true
      }
    });

    console.error('[GET EXECUCAO] PASSO 2 - Após findUnique');
    console.error('[GET EXECUCAO] PASSO 3', !!execucao);

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    console.error('[GET EXECUCAO] PASSO 4 - Mapeamento');
    const mappedExecucao = {
      ...execucao,
      checklist: execucao.Checklist ? {
        ...execucao.Checklist,
        itens: execucao.Checklist.ChecklistItem,
        ChecklistItem: undefined
      } : null,
      os: execucao.OrdemServico ? {
        ...execucao.OrdemServico,
        cliente: execucao.OrdemServico.Cliente,
        veiculo: execucao.OrdemServico.Veiculo,
        Cliente: execucao.OrdemServico.Cliente,
        Veiculo: execucao.OrdemServico.Veiculo
      } : null,
      fotos: execucao.ChecklistFoto,
      Checklist: undefined,
      OrdemServico: undefined,
      ChecklistFoto: undefined
    };

    console.error('[GET EXECUCAO] PASSO 5 - Mapeamento concluído');
    console.error('[GET EXECUCAO] PASSO 6 - Retornando JSON');

    return NextResponse.json(mappedExecucao);
  } catch (error: any) {
    console.error('GET EXECUCAO FULL ERROR', error);
    console.error('GET EXECUCAO MESSAGE', error?.message);
    console.error('GET EXECUCAO STACK', error?.stack);
    return NextResponse.json({ error: error?.message || 'Erro ao buscar execução' }, { status: 500 });
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
    const antes = await prisma.checklistExecucao.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    await prisma.checklistExecucao.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EXCLUIR',
      entidade: 'ChecklistExecucao',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'CHECKLIST', 'Execução de checklist excluída', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'CHECKLIST', 'Delete execucao error', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir execução' }, { status: 500 });
  }
}
