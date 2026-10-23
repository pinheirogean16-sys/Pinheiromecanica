// app/api/webhooks/asaas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const authToken = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expectedToken || authToken !== expectedToken) {
      log('WARN', 'ASAAS_WEBHOOK', 'Webhook não autorizado', {}, 'SISTEMA');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { event, payment, subscription } = body;

    log('INFO', 'ASAAS_WEBHOOK', `Evento: ${event}`, { event }, 'ASAAS');

    // ✅ Pagamento confirmado → desbloqueia
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const empresa = await prisma.empresa.findUnique({
        where: { asaas_customer_id: payment.customer },
      });

      if (empresa && empresa.status !== 'ATIVO') {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { status: 'ATIVO', asaas_status: 'ACTIVE' },
        });
        log('INFO', 'ASAAS_WEBHOOK', 'Empresa ativada por pagamento', { empresaId: empresa.id }, 'ASAAS');
      }
    }

    // ⚠️ Pagamento vencido → bloqueia
    if (event === 'PAYMENT_OVERDUE') {
      const empresa = await prisma.empresa.findUnique({
        where: { asaas_customer_id: payment.customer },
      });

      if (empresa && empresa.status !== 'BLOQUEADO') {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { status: 'BLOQUEADO', asaas_status: 'OVERDUE' },
        });
        log('WARN', 'ASAAS_WEBHOOK', 'Empresa bloqueada por inadimplência', { empresaId: empresa.id }, 'ASAAS');
      }
    }

    // ❌ Assinatura cancelada/inativada
    if (['SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED'].includes(event)) {
      const asaasSubscriptionId = subscription?.id;
      if (asaasSubscriptionId) {
        const empresa = await prisma.empresa.findFirst({
          where: { asaas_subscription_id: asaasSubscriptionId },
        });
        if (empresa) {
          await prisma.empresa.update({
            where: { id: empresa.id },
            data: { status: 'CANCELADO', asaas_status: 'CANCELLED' },
          });
          log('WARN', 'ASAAS_WEBHOOK', 'Empresa cancelada', { empresaId: empresa.id }, 'ASAAS');
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log('ERROR', 'ASAAS_WEBHOOK', 'Erro ao processar webhook', { error: error?.message }, 'ASAAS');
    return NextResponse.json({ received: true }); // 200 evita reenvios em loop
  }
}
