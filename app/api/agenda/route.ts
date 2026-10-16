import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

// A33: schema reforçado com validação de coerência
const eventoSchema = z
  .object({
    titulo: z.string().min(1, 'Título é obrigatório').max(200).trim(),
    descricao: z.string().max(2000).optional().nullable().transform((v) => v?.trim() || null),
    data_inicio: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Data de início inválida' }),
    data_fim: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Data de fim inválida' }),
    tipo: z.enum(['OS', 'REVISAO', 'MANUTENCAO_PREVENTIVA', 'VISTORIA', 'ENTREGA', 'OUTRO']),
    status: z
      .enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'])
      .default('AGENDADO'),
    cor: z.string().max(20).optional().nullable(),
    os_id: z.string().optional().nullable(),
    cliente_id: z.string().optional().nullable(),
    veiculo_id: z.string().optional().nullable(),
    mecanico_id: z.string().optional().nullable(),
  })
  .refine(
    (data) => new Date(data.data_fim).getTime() > new Date(data.data_inicio).getTime(),
    {
      message: 'Data de fim deve ser posterior à data de início',
      path: ['data_fim'],
    }
  )
  .refine(
    (data) => {
      // A33: se for tipo OS, exige os_id vinculado
      if (data.tipo === 'OS' && !data.os_id) return false;
      return true;
    },
    {
      message: 'Eventos do tipo OS exigem uma Ordem de Serviço vinculada',
      path: ['os_id'],
    }
  );

// ============================================================
// GET — Listar eventos da agenda
// ============================================================
export async function GET(request: NextRequest) {
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
      empresa_id: user.empresa_id,
    };

    // A33: valida que start/end são datas reais antes de usar
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const datasValidas =
      startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());

    if (datasValidas) {
      where.OR = [
        { data_inicio: { gte: startDate, lte: endDate } },
        { data_fim: { gte: startDate, lte: endDate } },
        {
          AND: [
            { data_inicio: { lte: startDate } },
            { data_fim: { gte: endDate } },
          ],
        },
      ];
    } else if (start || end) {
      // Filtro parcial enviado: rejeita para não confundir o calendário
      return NextResponse.json(
        { error: 'Informe start e end válidos no formato ISO' },
        { status: 400 }
      );
    }

    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (mecanico_id) where.mecanico_id = mecanico_id;

    // M06: limite de segurança para não carregar milhares de eventos
    const rawEvents = await prisma.eventoAgenda.findMany({
      where,
      include: {
        OrdemServico: { select: { id: true, numero: true } },
        Cliente: { select: { id: true, nome: true } },
        Veiculo: { select: { id: true, placa: true, modelo: true } },
        User_EventoAgenda_mecanico_idToUser: { select: { id: true, name: true } },
      },
      orderBy: { data_inicio: 'asc' },
      take: 500,
    });

    const events = rawEvents.map((event) => {
      const {
        OrdemServico,
        Cliente,
        Veiculo,
        User_EventoAgenda_mecanico_idToUser,
        ...rest
      } = event;
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
    return apiError(error, 'AGENDA', 'Erro ao buscar agenda');
  }
}

// ============================================================
// POST — Criar evento na agenda
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'agenda', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = eventoSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    // A33/M09: valida vínculos por empresa
    if (body.cliente_id) {
      const cli = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id },
        select: { id: true },
      });
      if (!cli) {
        return NextResponse.json(
          { error: 'Cliente não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.veiculo_id) {
      const vei = await prisma.veiculo.findFirst({
        where: { id: body.veiculo_id, empresa_id },
        select: { id: true },
      });
      if (!vei) {
        return NextResponse.json(
          { error: 'Veículo não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.os_id) {
      const os = await prisma.ordemServico.findFirst({
        where: { id: body.os_id, empresa_id },
        select: { id: true },
      });
      if (!os) {
        return NextResponse.json(
          { error: 'Ordem de serviço não encontrada nesta empresa' },
          { status: 400 }
        );
      }
    }

    // A33/M09: valida mecânico por empresa (antes não validava)
    if (body.mecanico_id) {
      const mec = await prisma.user.findFirst({
        where: { id: body.mecanico_id, empresa_id },
        select: { id: true },
      });
      if (!mec) {
        return NextResponse.json(
          { error: 'Mecânico não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    const event = await prisma.eventoAgenda.create({
      data: {
        id: globalThis.crypto.randomUUID(),
        ...body,
        empresa_id,
        data_inicio: new Date(body.data_inicio),
        data_fim: new Date(body.data_fim),
        usuario_id: user.id || 'system',
        updated_at: new Date(),
      },
    });

    await createAuditLog({
      modulo: 'AGENDA',
      acao: 'CRIAR',
      entidade: 'EventoAgenda',
      entidade_id: event.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: event,
    });

    log(
      'INFO',
      'AGENDA',
      'Evento de agenda criado',
      { id: event.id, titulo: event.titulo },
      user?.name
    );

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'AGENDA', 'Erro ao criar evento');
  }
}
