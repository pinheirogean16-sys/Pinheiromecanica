// app/api/pagamento/assinar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';
import {
  criarClienteAsaas,
  atualizarClienteAsaas,
  criarAssinaturaAsaas,
  listarPagamentosAssinatura,
} from '@/lib/asaas';

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: Pega o plano escolhido (padrão PRO)
    const body = await request.json().catch(() => ({}));
    const planoEscolhido = body.plano === 'BASICO' ? 'BASICO' : 'PRO';
    const valorAssinatura = planoEscolhido === 'BASICO' ? 89.90 : 149.90;
    const descricaoAssinatura = planoEscolhido === 'BASICO' 
      ? 'Assinatura VEHLOX - Plano Básico' 
      : 'Assinatura VEHLOX - Plano PRO';

    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      include: { User: { where: { role: 'ADMIN' }, take: 1 } }
    });

    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    if (!empresa.cnpj) {
      return NextResponse.json(
        { error: 'Para assinar, preencha o CNPJ da sua empresa em Configurações > Empresa.' },
        { status: 400 }
      );
    }

    const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
    const adminEmail = empresa.User[0]?.email || user.email;
    let customerId = empresa.asaas_customer_id;

    if (!customerId) {
      const cliente = await criarClienteAsaas({
        name: empresa.nome,
        cpfCnpj: cnpjLimpo,
        email: adminEmail,
        externalReference: empresa.id,
      });
      customerId = cliente.id;
      await prisma.empresa.update({ where: { id: empresa.id }, data: { asaas_customer_id: customerId } });
    } else {
      await atualizarClienteAsaas(customerId, { cpfCnpj: cnpjLimpo, name: empresa.nome, email: adminEmail })
        .catch(err => console.error('Erro ao atualizar cliente Asaas:', err));
    }

    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 1);
    const nextDueDate = hoje.toISOString().split('T')[0];

    const assinatura = await criarAssinaturaAsaas({
      customer: customerId,
      billingType: 'PIX',
      value: valorAssinatura, // ✅ Usa o valor dinâmico
      nextDueDate,
      cycle: 'MONTHLY',
      description: descricaoAssinatura, // ✅ Usa a descrição dinâmica
    });

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { asaas_subscription_id: assinatura.id, asaas_status: 'PENDING' },
    });

    let pagamentos = await listarPagamentosAssinatura(assinatura.id);
    let primeiraFatura = pagamentos.data?.[0];
    let attempts = 0;

    while (!primeiraFatura && attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      pagamentos = await listarPagamentosAssinatura(assinatura.id);
      primeiraFatura = pagamentos.data?.[0];
      attempts++;
    }

    if (!primeiraFatura) {
      return NextResponse.json({ success: true, message: 'Assinatura criada, aguardando fatura.', invoiceUrl: null, paymentId: null });
    }

    return NextResponse.json({
      success: true,
      paymentId: primeiraFatura.id,
      invoiceUrl: primeiraFatura.invoiceUrl,
      subscriptionId: assinatura.id,
    });

  } catch (error: any) {
    return apiError(error, 'PAGAMENTO', 'Erro ao gerar assinatura.');
  }
}
