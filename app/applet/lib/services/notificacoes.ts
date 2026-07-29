import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const activeInsertionLocks = new Set<string>();

interface CreateNotificationInput {
  titulo: string;
  mensagem: string;
  link?: string | null;
  usuario_id: string;
  empresa_id?: string;
  id?: string;
}

/**
 * Creates a notification safely applying enterprise-grade deduplication:
 * - Block identical concurrent calls (Memory event-loop locks)
 * - Restricts creation if an unread notification of the same type/link/user has been created in the last 24h
 * - Uses transaction locks for true sequential safety
 */
export async function createNotification(input: CreateNotificationInput) {
  const { titulo, mensagem, link, usuario_id, empresa_id, id } = input;

  if (!titulo || !mensagem || !usuario_id) {
    throw new Error('campos obrigatórios ausentes: titulo, mensagem e usuario_id');
  }

  const currentEmpresaId = empresa_id || 'default';
  const normalizedLink = link || null;

  // 1. Concurrent in-memory protection
  const signatureKey = `${currentEmpresaId}:${usuario_id}:${titulo}:${normalizedLink || ''}`;

  if (activeInsertionLocks.has(signatureKey)) {
    console.log(`[Deduplication][Service Lock] Ignorando chamada duplicada simultânea no processo para a chave: ${signatureKey}`);
    return {
      success: true,
      message: 'Deduplicado por trava de concorrência ativa.',
      deduplicated: true,
    };
  }

  activeInsertionLocks.add(signatureKey);

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 2. Transaciona o check e a gravação de forma segura
    const result = await prisma.$transaction(async (tx) => {
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
          message: `Notificação idêntica já existente criada em ${existingNotification.created_at.toISOString()}. Deduplicado com sucesso no service.`,
          id: existingNotification.id,
        };
      }

      // Cria normalmente
      const created = await tx.notificacao.create({
        data: {
          id,
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

    return result;

  } finally {
    // Release event locks
    activeInsertionLocks.delete(signatureKey);
  }
}
