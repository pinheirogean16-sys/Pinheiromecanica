import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';
import { obterPagamento, obterQrCodePix } from '@/lib/asaas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Segurança: Só usuários logados podem consultar
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID do pagamento não informado' }, { status: 400 });
    }

    // 2. Busca os dados principais da cobrança no Asaas
    const pagamento = await obterPagamento(id);

    let pixQrCodeBase64 = null;
    let pixCopiaECola = null;

    // 3. Se for PIX e ainda NÃO estiver pago, busca o QR Code
    const isPago = pagamento.status === 'RECEIVED' || pagamento.status === 'CONFIRMED';
    
    if (pagamento.billingType === 'PIX' && !isPago) {
      try {
        const pixData = await obterQrCodePix(id);
        pixQrCodeBase64 = pixData.encodedImage;
        pixCopiaECola = pixData.payload;
      } catch (err: any) {
        log('WARN', 'PAGAMENTO', 'Erro ao buscar QR Code do PIX', { paymentId: id, error: err.message }, user.name);
        // Não lança erro fatal, apenas segue sem o QR Code caso a API do Asaas falhe
      }
    }

    // 4. Retorna tudo o que o frontend precisa
    return NextResponse.json({
      id: pagamento.id,
      status: pagamento.status, // PENDING, RECEIVED, CONFIRMED, OVERDUE, etc.
      value: pagamento.value,
      dueDate: pagamento.dueDate,
      billingType: pagamento.billingType,
      invoiceUrl: pagamento.invoiceUrl, // Link do Asaas (fallback)
      pixQrCode: pixQrCodeBase64,       // Imagem Base64 para exibir na tela
      pixCopiaECola: pixCopiaECola,     // Código para o botão "Copiar"
    });

  } catch (error: any) {
    console.error('Erro ao buscar status do pagamento:', error);
    return apiError(error, 'PAGAMENTO', 'Erro ao buscar status do pagamento. Tente novamente.');
  }
}
