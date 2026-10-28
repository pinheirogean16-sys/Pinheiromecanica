import { toast } from 'sonner';
import { ApiError } from './api';

export function handleApiError(error: any, options: { defaultMessage?: string } = {}) {
  // 1. Verifica se é bloqueio de plano de TODAS as formas possíveis
  const isUpgradeRequired = 
    error?.status === 402 || 
    error?.response?.status === 402 ||
    error?.info?.code === 'UPGRADE_REQUIRED' ||
    error?.data?.code === 'UPGRADE_REQUIRED' ||
    error?.message?.includes('UPGRADE_REQUIRED');

  // ✅ Se for bloqueio de plano, IGNORA O TOAST. O modal já foi aberto pelo apiFetch.
  if (isUpgradeRequired) {
    return; 
  }

  // 2. Se for erro real (rede, 500, etc), mostra o toast
  const message = error?.message || options?.defaultMessage || 'Ocorreu um erro inesperado.';
  toast.error(message);
}
