// app/api/webhooks/asaas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

// ✅ TIPO DO PAYLOAD (baseado na documentação oficial)
interface AsaasWebhookPayload {
  id: string; // evt_... (chave de idempotência)
  event: string;
  dateCreated?: string;
  payment?: {
    id: string;
    customer: string; // cus_...
    subscription?: string; // sub_...
    status: string;
    value: number;
    dueDate: string;
  };
  subscription?: {
    id: string; // sub_...
    customer: string;
    status: string;
  };
}

export async function POST(request: Request) {
  try {
    // ============================================================
    // 1. VALIDAR TOKEN DO ASAAS
    // ============================================================
    const authToken = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expectedToken || authToken !== expectedToken) {
      log('WARN', 'ASAAS_WEBHOOK', 'Webhook não autorizado', {}, 'SISTEMA');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body: AsaasWebhookPayload = await request.json();
    const { id: eventId, event, payment, subscription } = body;

    if (!eventId || !event) {
      log('WARN', 'ASAAS_WEBHOOK', 'Payload inválido: id ou event ausente', { body }, 'ASAAS');
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    log('INFO', 'ASAAS_WEBHOOK', `Evento recebido: ${event}`, { eventId, event }, 'ASAAS');

    // ============================================================
    // 2. IDEMPOTÊNCIA — EVITAR PROCESSAMENTO DUPLICADO
    // ============================================================
    // O Asaas usa modelo "at least once": o mesmo evento pode chegar várias vezes.
    // Usamos a tabela AuditLog como controle temporário (sem alterar o schema).
    const jaProcessado = await prisma.auditLog.findFirst({
      where: {
        modulo: 'ASAAS_WEBHOOK',
        entidade_id: eventId,
      },
      select: { id: true },
    });

    if (jaProcessado) {
      log('INFO', 'ASAAS_WEBHOOK', `Evento ${eventId} já processado. Ignorando duplicata.`, { eventId, event }, 'ASAAS');
      return NextResponse.json({ received: true, duplicate: true });
    }

    // ============================================================
    // 3. PROCESSAR EVENTOS DE PAGAMENTO
    // ============================================================
    if (payment?.customer) {
      const empresa = await prisma.empresa.findUnique({
        where: { asaas_customer_id: payment.customer },
      });

      if (!empresa) {
        log('WARN', 'ASAAS_WEBHOOK', 'Empresa não encontrada para o customer do Asaas', {
          eventId,
          event,
          customerId: payment.customer,
        }, 'ASAAS');
        // Registra o evento como processado mesmo assim, para não retentar eternamente
      } else {
        // ✅ Pagamento confirmado/recebido → ATIVA a empresa
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          if (empresa.status !== 'ATIVO') {
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: { status: 'ATIVO', asaas_status: 'ACTIVE' },
            });
            log('INFO', 'ASAAS_WEBHOOK', 'Empresa ATIVADA por pagamento', {
              eventId,
              empresaId: empresa.id,
              event,
            }, 'ASAAS');
          }
        }

        // ⚠️ Pagamento vencido → BLOQUEIA a empresa
        if (event === 'PAYMENT_OVERDUE') {
          if (empresa.status !== 'BLOQUEADO') {
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: { status: 'BLOQUEADO', asaas_status: 'OVERDUE' },
            });
            log('WARN', 'ASAAS_WEBHOOK', 'Empresa BLOQUEADA por inadimplência', {
              eventId,
              empresaId: empresa.id,
            }, 'ASAAS');
          }
        }

        // 🔄 Estorno / Chargeback → BLOQUEIA (opcional, mas recomendado)
        if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED') {
          if (empresa.status !== 'BLOQUEADO') {
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: { status: 'BLOQUEADO', asaas_status: event === 'PAYMENT_REFUNDED' ? 'REFUNDED' : 'CHARGEBACK' },
            });
            log('WARN', 'ASAAS_WEBHOOK', `Empresa BLOQUEADA por ${event}`, {
              eventId,
              empresaId: empresa.id,
            }, 'ASAAS');
          }
        }
      }
    }

    // ============================================================
    // 4. PROCESSAR EVENTOS DE ASSINATURA (cancelamento/inativação)
    // ============================================================
    if (subscription?.id && ['SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED'].includes(event)) {
      const empresa = await prisma.empresa.findFirst({
        where: { asaas_subscription_id: subscription.id },
      });

      if (empresa) {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { status: 'CANCELADO', asaas_status: 'CANCELLED' },
        });
        log('WARN', 'ASAAS_WEBHOOK', 'Empresa CANCELADA por evento de assinatura', {
          eventId,
          empresaId: empresa.id,
          event,
        }, 'ASAAS');
      } else {
        log('WARN', 'ASAAS_WEBHOOK', 'Empresa não encontrada para a assinatura', {
          eventId,
          event,
          subscriptionId: subscription.id,
        }, 'ASAAS');
      }
    }

    // ============================================================
    // 5. REGISTRAR EVENTO COMO PROCESSADO (IDEMPOTÊNCIA)
    // ============================================================
    // Usamos AuditLog como controle. Em produção, considere criar uma tabela
    // dedicada (ex: AsaasWebhookEvent) para não misturar com logs de auditoria.
    await prisma.auditLog.create({
      data: {
        id: eventId, // ✅ Usa o ID do evento do Asaas para garantir unicidade
        modulo: 'ASAAS_WEBHOOK',
        acao: 'PROCESSAR',
        entidade: 'AsaasEvent',
        entidade_id: eventId,
        usuario: 'SISTEMA',
        empresa_id: 'ASAAS_GLOBAL',
        dados_depois: JSON.stringify({ event, paymentId: payment?.id, subscriptionId: subscription?.id }),
      },
    });

    // ✅ O Asaas exige HTTP 200 exato para considerar sucesso
    return NextResponse.json({ received: true });
  } catch (error: any) {
    log('ERROR', 'ASAAS_WEBHOOK', 'Erro ao processar webhook', {
      error: error?.message,
      stack: error?.stack,
    }, 'ASAAS');

    // ⚠️ Retornar 200 mesmo em erro evita que o Asaas entre em loop de retentativas.
    // O erro já foi logado para investigação manual.
    return NextResponse.json({ received: true, error: true });
  }
}
