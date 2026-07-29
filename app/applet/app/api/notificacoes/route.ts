import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// High-capacity in-memory registry to block concurrent duplicate creations within the same process event-loop
const activeInsertionLocks = new Set<string>();

/**
 * GET: Retrieves notifications for a given user or enterprise
 * Supported query params: ?usuario_id=X&empresa_id=Y&somente_nao_lidas=true/false
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const empresa_id = searchParams.get('empresa_id') || 'default';
    const somente_nao_lidas = searchParams.get('somente_nao_lidas') === 'true';

    if (!usuario_id) {
      return NextResponse.json({ error: 'Parâmetro usuario_id é obrigatório.' }, { status: 400 });
    }

    const whereClause: any = {
      usuario_id,
      empresa_id,
    };

    if (somente_nao_lidas) {
      whereClause.lida = false;
    }

    const notifications = await prisma.notificacao.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar notificações.' }, { status: 500 });
  }
}

/**
 * POST: Creates a new notification with advanced deduplication (Enterprise Protection)
 * Checks for duplicate unread notifications of the same type/link/user within 24h
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titulo, mensagem, link, usuario_id, empresa_id } = body;

    // Validate required fields
    if (!titulo || !mensagem || !usuario_id) {
      return NextResponse.json(
        { error: 'Os campos titulo, mensagem e usuario_id são obrigatórios.' },
        { status: 400 }
      );
    }

    const currentEmpresaId = empresa_id || 'default';
    const normalizedLink = link || null;

    // 1. Concurrent in-memory locking based on signature
    // Match by user, title/type, and target link (defining OS or stock product)
    const signatureKey = `${currentEmpresaId}:${usuario_id}:${titulo}:${normalizedLink || ''}`;

    if (activeInsertionLocks.has(signatureKey)) {
      console.log(`[Deduplication][Memory Lock] Ignorando requisição duplicada simultânea para a chave: ${signatureKey}`);
      return NextResponse.json({
        success: true,
        message: 'Deduplicado com sucesso (bloqueio por concorrência ativo).',
        deduplicated: true,
      });
    }

    // Set lock
    activeInsertionLocks.add(signatureKey);

    try {
      // 2. Perform safe read-check inside a transaction isolation block to prevent race conditions
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        // Query if there is already an identical unread notification created in the last 24 hours
        const existingNotification = await tx.notificacao.findFirst({
          where: {
            titulo: titulo, // Mesmo tipo
            link: normalizedLink, // Mesmo produto ou OS (vinculado pelo link)
            usuario_id: usuario_id, // Mesmo usuário
            empresa_id: currentEmpresaId,
            lida: false, // Status não lido
            created_at: {
              gte: twentyFourHoursAgo, // Criada nas últimas 24 horas
            },
          },
          select: {
            id: true,
            created_at: true,
          },
        });

        if (existingNotification) {
          return {
            deduplicated: true,
            message: `Notificação idêntica já existente criada em ${existingNotification.created_at.toISOString()}. Operação deduplicada.`,
            id: existingNotification.id,
          };
        }

        // Create the notification
        const created = await tx.notificacao.create({
          data: {
            id: body.id || undefined,
            titulo,
            mensagem,
            link: normalizedLink,
            usuario_id,
            empresa_id: currentEmpresaId,
            lida: false,
          },
        });

        return {
          deduplicated: false,
          data: created,
        };
      });

      if (result.deduplicated) {
        return NextResponse.json({
          success: true,
          message: result.message,
          deduplicated: true,
          id: result.id,
        });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });

    } finally {
      // Always release lock
      activeInsertionLocks.delete(signatureKey);
    }

  } catch (error: any) {
    console.error('Erro ao processar criação de notificação:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * PATCH / PUT: Updates read status for notifications
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, lida } = body;

    if (!id) {
      return NextResponse.json({ error: 'O id da notificação é obrigatório.' }, { status: 400 });
    }

    const updated = await prisma.notificacao.update({
      where: { id },
      data: { lida: lida !== undefined ? lida : true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
