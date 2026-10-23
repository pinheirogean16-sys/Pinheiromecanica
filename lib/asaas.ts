// lib/asaas.ts
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL!;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

async function asaasFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.description || 'Erro na API do Asaas');
  }
  return data;
}

export async function criarClienteAsaas(params: {
  name: string;
  cpfCnpj: string;
  email: string;
  externalReference: string;
}) {
  return asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function criarAssinaturaAsaas(params: {
  customer: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  value: number;
  nextDueDate: string; // "YYYY-MM-DD"
  cycle: 'MONTHLY' | 'YEARLY';
  description: string;
}) {
  return asaasFetch<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
