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

export async function POST() {
  try {
    // 1. Autenticação
    const { error, user } = await requireAuth();
    if (error) return error;

    // 2. Busca dados da empresa (incluindo o e-mail do Admin para o Asaas)
    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      include: { 
        User: { 
          where: { role: 'ADMIN' }, 
          take: 1 
        } 
      }
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // 3. Validação do CNPJ (O Asaas exige para criar assinaturas)
    if (!empresa.cnpj) {
      return NextResponse.json(
        { error: 'Para assinar o plano PRO, preencha o CNPJ da sua empresa em Configurações > Empresa.' },
        { status: 400 }
      );
    }

    const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
    const adminEmail = empresa.User[0]?.email || user.email;
    let customerId = empresa.asaas_customer_id;

    // 4. Cria ou atualiza o cliente no Asaas
    if (!customerId) {
      const cliente = await criarClienteAsaas({
        name: empresa.nome,
        cpfCnpj: cnpjLimpo,
        email: adminEmail,
        externalReference: empresa.id,
      });
      customerId = cliente.id;

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { asaas_customer_id: customerId },
      });
    } else {
      await atualizarClienteAsaas(customerId, {
        cpfCnpj: cnpjLimpo,
        name: empresa.nome,
        email: adminEmail,
      }).catch(err => console.error('Erro ao atualizar cliente Asaas:', err));
    }

    // 5. Cria a Assinatura (R$ 149,90 / mês) via PIX
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 1); // Vencimento amanhã
    const nextDueDate = hoje.toISOString().split('T')[0];

    const assinatura = await criarAssinaturaAsaas({
      customer: customerId,
      billingType: 'PIX', // ✅ ALTERADO: Força PIX para gerar o QR Code na hora
      value: 149.90,
      nextDueDate,
      cycle: 'MONTHLY',
      description: 'Assinatura VEHLOX - Plano PRO',
    });

    // 6. Salva os dados da assinatura no banco
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { 
        asaas_subscription_id: assinatura.id,
        asaas_status: 'PENDING'
      },
    });

    // 7. Busca a primeira fatura gerada para pegar o link e o ID
    log('INFO', 'PAGAMENTO', 'Aguardando fatura do Asaas...', { assinatura_id: assinatura.id }, user.name);
    
    let pagamentos = await listarPagamentosAssinatura(assinatura.id);
    let primeiraFatura = pagamentos.data?.[0];

    // ✅ NOVO: Retry loop para esperar o Asaas gerar a fatura (evita devolver null)
    let attempts = 0;
    while (!primeiraFatura && attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      pagamentos = await listarPagamentosAssinatura(assinatura.id);
      primeiraFatura = pagamentos.data?.[0];
      attempts++;
    }

    if (!primeiraFatura) {
      log('WARN', 'PAGAMENTO', 'Assinatura criada, mas fatura não gerada', { empresa_id: empresa.id }, user.name);
      return NextResponse.json({
        success: true,
        message: 'Assinatura criada, mas a fatura ainda está sendo gerada. Tente novamente em instantes.',
        invoiceUrl: null,
        paymentId: null,
      });
    }

    log('INFO', 'PAGAMENTO', 'Fatura PIX gerada com sucesso', { 
      empresa_id: empresa.id, 
      assinatura_id: assinatura.id,
      fatura_id: primeiraFatura.id
    }, user.name);

    // 8. Retorna o ID e o link para o frontend
    return NextResponse.json({
      success: true,
      paymentId: primeiraFatura.id, // ✅ NOVO: Retorna o ID para a nossa página de Checkout
      invoiceUrl: primeiraFatura.invoiceUrl,
      subscriptionId: assinatura.id,
    });

  } catch (error: any) {
    console.error('Erro ao gerar assinatura:', error);
    return apiError(error, 'PAGAMENTO', 'Erro ao gerar assinatura. Verifique os dados da empresa e tente novamente.');
  }
}
