import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const eventoSchema = z.object({
  titulo: z.string().min(1).trim(),
  descricao: z.string().optional().nullable().transform(v => v?.trim() || null),
  data_inicio: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Data de início inválida" }),
  data_fim: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Data de fim inválida" }),
  tipo: z.enum(['OS', 'REVISAO', 'MANUTENCAO_PREVENTIVA', 'VISTORIA', 'ENTREGA', 'OUTRO']),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).default('AGENDADO'),
  cor: z.string().optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  veiculo_id: z.string().optional().nullable(),
  mecanico_id: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const mecanico_id = searchParams.get('mecanico_id');

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };

    if (start && end) {
      where.OR = [
        {
          data_inicio: {
            gte: new Date(start),
            lte: new Date(end),
          }
        },
        {
          data_fim: {
            gte: new Date(start),
            lte: new Date(end),
          }
        },
        {
          AND: [
            { data_inicio: { lte: new Date(start) } },
            { data_fim: { gte: new Date(end) } }
          ]
        }
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (status) {
      where.status = status;
    }

    if (mecanico_id) {
      where.mecanico_id = mecanico_id;
    }

    const rawEvents = await prisma.eventoAgenda.findMany({
      where,
      include: {
        OrdemServico: { select: { id: true, numero: true } },
        Cliente: { select: { id: true, nome: true } },
        Veiculo: { select: { id: true, placa: true, modelo: true } },
        User_EventoAgenda_mecanico_idToUser: { select: { id: true, name: true } },
      },
      orderBy: { data_inicio: 'asc' },
    });

    const events = rawEvents.map(event => {
      const { OrdemServico, Cliente, Veiculo, User_EventoAgenda_mecanico_idToUser, ...rest } = event;
      return {
        ...rest,
        os: OrdemServico,
        cliente: Cliente,
        veiculo: Veiculo,
        mecanico: User_EventoAgenda_mecanico_idToUser,
      };
    });

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Prisma Error loading Agenda:", error);
    log('ERROR', 'AGENDA', 'Erro ao buscar agenda', { error: error.message, stack: error.stack }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = eventoSchema.parse(await request.json());
    
    const empresa_id = user?.empresa_id || 'default';

    const event = await prisma.eventoAgenda.create({
      data: {
        ...body,
        empresa_id,
        data_inicio: new Date(body.data_inicio),
        data_fim: new Date(body.data_fim),
        usuario_id: user.id,
      },
    });

    await createAuditLog({
      modulo: 'AGENDA',
      acao: 'CRIAR',
      entidade: 'EventoAgenda',
      entidade_id: event.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: event
    });

    log('INFO', 'AGENDA', 'Evento de agenda criado', { id: event.id, titulo: event.titulo }, user?.name);

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    log('ERROR', 'AGENDA', 'Erro ao criar evento', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Erro ao criar evento' }, { status: 500 });
  }
}
