import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { notificarChecklistExecutado } from '@/lib/notificacoes';
import { apiError } from '@/lib/api-error';

const execucaoSchema = z.object({
  checklist_id: z.string().min(1, 'ID do checklist é obrigatório'),
  os_id: z.string().optional().nullable(),
  respostas: z.record(z.string(), z.any()),
  observacoes: z.string().max(2000).optional().nullable(),
  executado_por: z.string().trim().optional(),
  fotos: z
    .array(
      z.object({
        // Aceita URLs absolutas ou caminhos relativos (ex: /uploads/foto.jpg)
        url: z.string().min(1, 'URL da foto é obrigatória'),
        item_id: z.string().optional().nullable(),
        legenda: z.string().max(500).optional().nullable(),
      })
    )
    .max(50, 'Máximo de 50 fotos por execução')
    .optional(),
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
      where: { id: body.checklist_id, empresa_id: user.empresa_id },
      select: { id: true, nome: true },
    });
    if (!chk) {
      return NextResponse.json(
        { error: 'Checklist não encontrado nesta empresa' },
        { status: 400 }
      );
    }

    // Se houver OS_ID, valida que a OS é da empresa e pega veiculo_id
    let veiculo_id: string | null = null;
    if (body.os_id) {
      const os = await prisma.ordemServico.findFirst({
        where: { id: body.os_id, empresa_id: user.empresa_id },
        select: { veiculo_id: true },
      });
      if (!os) {
        return NextResponse.json(
          { error: 'OS não encontrada nesta empresa' },
          { status: 400 }
        );
      }
      veiculo_id = os.veiculo_id;
    }

    // A23: executor é sempre o usuário autenticado. Ignora body.executado_por.
    const executorNome =
      user.name || user.email || body.executado_por || 'Mecânico';

    const execucaoId = globalThis.crypto.randomUUID();

    const execucao = await prisma.$transaction(async (tx) => {
      const created = await tx.checklistExecucao.create({
        data: {
          id: execucaoId,
          checklist_id: body.checklist_id,
          os_id: body.os_id || null,
          veiculo_id,
          executado_por: executorNome,
          respostas: JSON.stringify(body.respostas),
          observacoes: body.observacoes || null,
          data: new Date(),
          empresa_id: user.empresa_id,
        },
      });

      if (body.fotos && body.fotos.length > 0) {
        await tx.checklistFoto.createMany({
          data: body.fotos.map((foto) => ({
            id: globalThis.crypto.randomUUID(),
            execucao_id: execucaoId,
            item_id: foto.item_id || null,
            url: foto.url,
            legenda: foto.legenda || null,
          })),
        });
      }

      const fullExec = await tx.checklistExecucao.findUnique({
        where: { id: execucaoId },
        include: {
          ChecklistFoto: true,
        },
      });

      return fullExec;
    });

    if (!execucao) {
      throw new Error('Falha ao obter execução do banco com fotos.');
    }

    // Notificação (não quebra a transação)
    try {
      await notificarChecklistExecutado(execucao);
    } catch (err: any) {
      log(
        'ERROR',
        'CHECKLIST',
        'Erro ao notificar execução de checklist',
        { error: err?.message },
        'sistema'
      );
    }

    // A23: auditoria com empresa_id
    await createAuditLog({
      modulo: 'CHECKLIST',
      acao: 'CRIAR',
      entidade: 'ChecklistExecucao',
      entidade_id: execucao.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        checklist_id: body.checklist_id,
        os_id: body.os_id || null,
        veiculo_id,
        fotos: body.fotos?.length || 0,
        executado_por: executorNome,
      },
    });

    log(
      'INFO',
      'CHECKLIST',
      'Checklist executado',
      { id: execucao.id, por: executorNome },
      user?.name
    );

    const mappedResponse = {
      ...execucao,
      respostas: execucao.respostas ? JSON.parse(execucao.respostas) : {},
      fotos: execucao.ChecklistFoto,
      ChecklistFoto: undefined,
    };

    return NextResponse.json(mappedResponse, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log(
      'ERROR',
      'CHECKLIST',
      'Erro ao registrar execução do checklist',
      { error: error?.message },
      'sistema'
    );
    return apiError(error, 'CHECKLIST', 'Erro ao registrar execução do checklist');
  }
}
