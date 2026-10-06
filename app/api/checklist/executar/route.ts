import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { notificarChecklistExecutado } from '@/lib/notificacoes';

const execucaoSchema = z.object({
  checklist_id: z.string().min(1, 'ID do checklist é obrigatório'),
  os_id: z.string().optional().nullable(),
  respostas: z.record(z.string(), z.any()),
  observacoes: z.string().optional().nullable(),
  executado_por: z.string().trim().min(1, 'Executor do checklist é obrigatório').default('Mecânico'),
  fotos: z.array(z.object({
    url: z.string().url(),
    item_id: z.string().optional().nullable(),
    legenda: z.string().optional().nullable()
  })).optional()
});

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'executar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = execucaoSchema.parse(await request.json());

    // Validar se checklist pertence à empresa
    const chk = await prisma.checklist.findFirst({
      where: { id: body.checklist_id, empresa_id: user.empresa_id }
    });
    if (!chk) {
      return NextResponse.json({ error: 'Checklist não encontrado nesta empresa' }, { status: 400 });
    }

    // Se houver OS_ID, buscamos o veiculo_id vinculado à OS pertencente à empresa
    let veiculo_id = null;
    if (body.os_id) {
      const os = await prisma.ordemServico.findFirst({
        where: { id: body.os_id, empresa_id: user.empresa_id },
        select: { veiculo_id: true }
      });
      if (!os) {
        return NextResponse.json({ error: 'OS não encontrada nesta empresa' }, { status: 400 });
      }
      veiculo_id = os.veiculo_id;
    }

    const execucaoId = globalThis.crypto.randomUUID();

    // Criar a execução
    const execucao = await prisma.$transaction(async (tx) => {
      const created = await tx.checklistExecucao.create({
        data: {
          id: execucaoId,
          checklist_id: body.checklist_id,
          os_id: body.os_id || null,
          veiculo_id,
          executado_por: body.executado_por,
          respostas: JSON.stringify(body.respostas), // Database schema expects String
          observacoes: body.observacoes,
          data: new Date(),
          empresa_id: user.empresa_id
        }
      });

      if (body.fotos && body.fotos.length > 0) {
        await tx.checklistFoto.createMany({
          data: body.fotos.map((foto) => ({
            id: globalThis.crypto.randomUUID(),
            execucao_id: execucaoId,
            item_id: foto.item_id || null,
            url: foto.url,
            legenda: foto.legenda || null
          }))
        });
      }

      const fullExec = await tx.checklistExecucao.findUnique({
        where: { id: execucaoId },
        include: {
          ChecklistFoto: true
        }
      });

      return fullExec;
    });

    if (!execucao) {
      throw new Error('Falha ao obter execução do banco com fotos.');
    }

    // --- NOTIFICAÇÃO AUTOMÁTICA ---
    try {
      await notificarChecklistExecutado(execucao);
    } catch (err) {
      log('ERROR', 'CHECKLIST', 'Erro ao notificar execução de checklist', { err }, 'sistema');
    }

    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'CRIAR',
      entidade: 'ChecklistExecucao',
      entidade_id: execucao.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: execucao
    });

    log('INFO', 'CHECKLIST', 'Checklist executado', { id: execucao.id, por: body.executado_por }, user?.name);

    const mappedResponse = {
      ...execucao,
      respostas: execucao.respostas ? JSON.parse(execucao.respostas) : {},
      fotos: execucao.ChecklistFoto,
      ChecklistFoto: undefined
    };

    return NextResponse.json(mappedResponse, { status: 201 });
  } catch (error: any) {
    console.error('[CHECKLIST EXECUTE POST ERROR]', JSON.stringify(error, null, 2));
    log('ERROR', 'CHECKLIST', 'Execute checklist error', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao registrar execução do checklist' }, { status: 500 });
  }
}
