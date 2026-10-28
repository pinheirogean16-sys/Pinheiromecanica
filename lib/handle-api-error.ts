import { toast } from 'sonner';

export function handleApiError(error: any, options: { defaultMessage?: string } = {}) {
  // ✅ 1. TRAVA DE SEGURANÇA ABSOLUTA PARA O 402
  const errorString = JSON.stringify(error || {});
  const isUpgradeRequired = 
    error?.status === 402 || 
    error?.statusCode === 402 ||
    error?.response?.status === 402 ||
    error?.info?.code === 'UPGRADE_REQUIRED' ||
    error?.data?.code === 'UPGRADE_REQUIRED' ||
    error?.message?.includes('UPGRADE_REQUIRED') ||
    errorString.includes('UPGRADE_REQUIRED');

  if (isUpgradeRequired) {
    return; // Ignora completamente o toast
  }

  // 2. Se for erro real, mostra o toast
  const message = error?.message || options?.defaultMessage || 'Ocorreu um erro inesperado.';
  toast.error(message);
}
