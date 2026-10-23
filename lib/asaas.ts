// lib/asaas.ts

const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL!;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

// ✅ OBRIGATÓRIO: User-Agent para contas criadas a partir de 13/06/2024
const ASAAS_USER_AGENT = 'Vehlox-SaaS/1.0.0';

async function asaasFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ASAAS_USER_AGENT, // ✅ Header obrigatório
      'access_token': ASAAS_API_KEY,   // ✅ Autenticação do Asaas
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    // Extrai a mensagem de erro real do Asaas (pode vir em data.errors[0].description)
    const asaasError =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Erro ${res.status} na API do Asaas`;

    // Lança um erro com contexto suficiente para debug nos logs
    throw new Error(`[Asaas ${res.status}] ${asaasError}`);
  }

  return data;
}

// ============================================================
// CUSTOMERS
// ============================================================
export async function criarClienteAsaas(params: {
  name: string;
  cpfCnpj?: string; // ✅ Opcional: nem toda empresa tem CNPJ no cadastro
  email: string;
  externalReference: string;
}) {
  return asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export async function criarAssinaturaAsaas(params: {
  customer: string; // asaas_customer_id
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
