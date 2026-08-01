import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const eventoSchema = z.object({
  titulo: z.string().min(1).trim().optional(),
  descricao: z.string().optional().nullable().transform(v => v?.trim() || null),
  data_inicio: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Data de início inválida" }),
  data_fim: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Data de fim inválida" }),
  tipo: z.enum(['OS', 'REVISAO', 'MANUTENCAO_PREVENTIVA', 'VISTORIA', 'ENTREGA', 'OUTRO']).optional(),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).optional(),
  cor: z.string().optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  veiculo_id: z.string().optional().nullable(),
  mecanico_id: z.string().optional().nullable(),
});

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const rawEvent = await prisma.eventoAgenda.findUnique({
      where: { id: params.id },
      include: {
        OrdemServico: { select: { id: true, numero: true } },
        Cliente: { select: { id: true, nome: true } },
        Veiculo: { select: { id: true, placa: true, modelo: true } },
        User_EventoAgenda_mecanico_idToUser: { select: { id: true, name: true } },
      },
    });

    if (!rawEvent) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    // Validar empresa
    if (rawEvent.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { OrdemServico, Cliente, Veiculo, User_EventoAgenda_mecanico_idToUser, ...rest } = rawEvent;
    const event = {
      ...rest,
      os: OrdemServico,
      cliente: Cliente,
      veiculo: Veiculo,
      mecanico: User_EventoAgenda_mecanico_idToUser,
    };

    return NextResponse.json(event);
  } catch (error) {
    log('ERROR', 'AGENDA', 'Erro ao buscar evento', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar evento' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = params;
    const body = eventoSchema.parse(await request.json());

    const antes = await prisma.eventoAgenda.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const event = await prisma.eventoAgenda.update({
      where: { id },
      data: {
        ...body,
        data_inicio: body.data_inicio ? new Date(body.data_inicio) : undefined,
        data_fim: body.data_fim ? new Date(body.data_fim) : undefined,
      },
    });

    await createAuditLog({
      modulo: 'AGENDA',
      acao: 'EDITAR',
      entidade: 'EventoAgenda',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: event
    });

    log('INFO', 'AGENDA', 'Evento de agenda atualizado', { id }, user?.name);

    return NextResponse.json(event);
  } catch (error: any) {
    log('ERROR', 'AGENDA', 'Erro ao atualizar evento', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Erro ao atualizar evento' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = params;
    const antes = await prisma.eventoAgenda.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.eventoAgenda.delete({
      where: { id },
    });

    await createAuditLog({
      modulo: 'AGENDA',
      acao: 'EXCLUIR',
      entidade: 'EventoAgenda',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'AGENDA', 'Evento de agenda excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'AGENDA', 'Erro ao excluir evento', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir evento' }, { status: 500 });
  }
}
