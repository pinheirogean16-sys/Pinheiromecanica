import { toast } from 'sonner';

export function handleApiError(error: any, options: { defaultMessage?: string } = {}) {
  // Transforma o erro em string para garantir que não vamos perder o código
  const errorString = JSON.stringify(error || {});
  
  // Verifica em todas as propriedades possíveis (status, message, string do objeto inteiro)
  const isUpgradeRequired = 
    error?.status === 402 || 
    error?.statusCode === 402 ||
    error?.response?.status === 402 ||
    error?.info?.code === 'UPGRADE_REQUIRED' ||
    error?.data?.code === 'UPGRADE_REQUIRED' ||
    error?.message?.includes('UPGRADE_REQUIRED') ||
    errorString.includes('UPGRADE_REQUIRED');

  // ✅ Se for bloqueio de plano, IGNORA O TOAST completamente.
  if (isUpgradeRequired) {
    return; 
  }

  // 2. Se for erro real (rede, 500, etc), mostra o toast
  const message = error?.message || options?.defaultMessage || 'Ocorreu um erro inesperado.';
  toast.error(message);
}
