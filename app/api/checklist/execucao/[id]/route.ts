import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

// ============================================================
// GET — Buscar execução de checklist por ID
// ============================================================
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

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

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

    return NextResponse.json(mappedExecucao);
  } catch (error: any) {
    return apiError(error, 'CHECKLIST_EXECUCAO', 'Erro ao buscar execução');
  }
}

// ============================================================
// DELETE — Excluir execução de checklist
// ============================================================
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
      where: { 
        id,
        empresa_id: user.empresa_id 
      }
    });

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'EXCLUIR',
      entidade: 'ChecklistExecucao',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes
    });

    log('INFO', 'CHECKLIST', 'Execução de checklist excluída', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST_EXECUCAO', 'Erro ao excluir execução');
  }
}
