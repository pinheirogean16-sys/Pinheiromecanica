import { toast } from 'sonner';
import { ApiError } from './api';

export interface HandleErrorOptions {
  showToast?: boolean;
  defaultMessage?: string;
}

export interface ProcessedError {
  message: string;
  status: number;
  statusText: string;
  info?: any;
  isNetworkError: boolean;
  isTimeout: boolean;
}

export function handleApiError(error: any, options: HandleErrorOptions = {}): ProcessedError {
  const { showToast = true, defaultMessage = 'Ocorreu um erro inesperado' } = options;

  // ✅ 1. TRAVA DE SEGURANÇA ABSOLUTA PARA O 402
  // Verifica em todas as propriedades possíveis antes de qualquer coisa
  const isUpgradeRequired =
    error?.status === 402 ||
    error?.statusCode === 402 ||
    error?.info?.code === 'UPGRADE_REQUIRED' ||
    error?.data?.code === 'UPGRADE_REQUIRED' ||
    error?.response?.status === 402;

  if (isUpgradeRequired) {
    return {
      message: error?.info?.message || error?.data?.message || error?.message || 'Recurso exclusivo do plano PRO',
      status: 402,
      statusText: 'Payment Required',
      info: error?.info || error?.data,
      isNetworkError: false,
      isTimeout: false,
    };
  }

  let message = defaultMessage;
  let status = 0;
  let statusText = 'Unknown Error';
  let info: any = null;
  let isNetworkError = false;
  let isTimeout = false;

  if (error instanceof ApiError) {
    status = error.status;
    statusText = error.statusText;
    info = error.info;
    message = error.message;

    switch (status) {
      case 400:
        if (!error.message || error.message.includes('Erro HTTP 400')) message = 'Dados inválidos.';
        break;
      case 401:
        if (!error.message || error.message.includes('Erro HTTP 401')) message = 'Sessão expirada ou não autorizada.';
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth-expired'));
        break;
      case 403:
        if (!error.message || error.message.includes('Erro HTTP 403')) message = 'Você não possui permissão para realizar esta ação.';
        break;
      case 404:
        if (!error.message || error.message.includes('Erro HTTP 404')) message = 'O recurso solicitado não foi encontrado.';
        break;
      case 408:
        isTimeout = true;
        if (!error.message || error.message.includes('Erro HTTP 408')) message = 'A requisição demorou muito (Timeout).';
        break;
      case 429:
        if (!error.message || error.message.includes('Erro HTTP 429')) message = 'Limite de requisições excedido. Aguarde um momento.';
        break;
      case 500:
        if (!error.message || error.message.includes('Erro HTTP 500')) message = 'Erro interno do servidor.';
        break;
    }

    if (status === 0 || statusText === 'Network Error') {
      isNetworkError = true;
      message = 'Não foi possível conectar ao servidor.';
    }
  } else if (error instanceof Error) {
    message = error.message;
    if (error.name === 'AbortError') {
      isTimeout = true;
      status = 408;
      message = 'Tempo limite esgotado.';
    } else if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
      isNetworkError = true;
      message = 'Erro de rede ou conexão de internet.';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  if (!message) message = defaultMessage;

  if (showToast) {
    toast.error(message);
  }

  return {
    message,
    status,
    statusText,
    info,
    isNetworkError,
    isTimeout,
  };
}
