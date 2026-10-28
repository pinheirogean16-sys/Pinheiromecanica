// lib/asaas.ts

const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL!;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

// ✅ OBRIGATÓRIO: User-Agent para contas criadas a partir de 13/06/2024
const ASAAS_USER_AGENT = 'Vehlox-SaaS/1.0.0';

async function asaasFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!ASAAS_BASE_URL || !ASAAS_API_KEY) {
    throw new Error('Asaas não configurado: verifique ASAAS_BASE_URL e ASAAS_API_KEY no .env');
  }

  const res = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ASAAS_USER_AGENT,
      'access_token': ASAAS_API_KEY,
      ...options.headers,
    },
    cache: 'no-store',
  });

  const data = await res.json();

  if (!res.ok) {
    const asaasError =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Erro ${res.status} na API do Asaas`;

    throw new Error(`[Asaas ${res.status}] ${asaasError}`);
  }

  return data;
}

// ============================================================
// CUSTOMERS
// ============================================================
export async function criarClienteAsaas(params: {
  name: string;
  cpfCnpj?: string;
  email: string;
  externalReference: string;
}) {
  return asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function atualizarClienteAsaas(
  customerId: string,
  params: { cpfCnpj?: string; name?: string; email?: string }
) {
  return asaasFetch<{ id: string }>(`/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export async function criarAssinaturaAsaas(params: {
  customer: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'YEARLY';
  description: string;
}) {
  return asaasFetch<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// PAYMENTS (Faturas geradas pela assinatura)
// ============================================================
export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'; // ✅ ADICIONADO
  dueDate: string;
  invoiceUrl: string;
  invoiceNumber?: string;
  bankSlipUrl?: string;
  subscription?: string; // ✅ ADICIONADO
  customer?: string;
  description?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  confirmedDate?: string;
};

export async function listarPagamentosAssinatura(subscriptionId: string) {
  return asaasFetch<{ data: AsaasPayment[] }>(`/subscriptions/${subscriptionId}/payments`);
}

// ============================================================
// CHECKOUT & PIX
// ============================================================

export async function obterPagamento(paymentId: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate: string;
};

export async function obterQrCodePix(paymentId: string) {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}
