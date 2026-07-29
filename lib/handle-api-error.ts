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

/**
 * Centralized API error handler for Next.js App Router (Hostinger Business lightweight compatible).
 * Formats standard HTTP statuses, handles special cases (timeout, offline, network errors),
 * preserves backend-specific messages, triggers user-friendly toasts, and returns
 * a standardized error payload for future-proofing (e.g., TanStack Query).
 */
export function handleApiError(error: any, options: HandleErrorOptions = {}): ProcessedError {
  const { showToast = true, defaultMessage = 'Ocorreu um erro inesperado' } = options;

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

    // Standard high-level translation of HTTP statuses if no custom backend-provided message exists
    switch (status) {
      case 400:
        if (!error.message || error.message.includes('Erro HTTP 400') || error.message.includes('HTTP 400')) {
          message = 'Dados inválidos. Por favor, verifique os campos informados.';
        }
        break;
      case 401:
        if (!error.message || error.message.includes('Erro HTTP 401') || error.message.includes('HTTP 401')) {
          message = 'Sessão expirada ou não autorizada. Faça login novamente.';
        }
        // Trigger global session expired event to do client-side cleanups and redirection
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
        break;
      case 403:
        if (!error.message || error.message.includes('Erro HTTP 403') || error.message.includes('HTTP 403')) {
          message = 'Você não possui permissão para realizar esta ação.';
        }
        break;
      case 404:
        if (!error.message || error.message.includes('Erro HTTP 404') || error.message.includes('HTTP 404')) {
          message = 'O recurso solicitado não foi encontrado no sistema.';
        }
        break;
      case 408:
        isTimeout = true;
        if (!error.message || error.message.includes('Erro HTTP 408') || error.message.includes('HTTP 408')) {
          message = 'A requisição demorou muito para responder (Timeout). Tente novamente.';
        }
        break;
      case 429:
        if (!error.message || error.message.includes('Erro HTTP 429') || error.message.includes('HTTP 429')) {
          message = 'Limite de requisições excedido. Por favor, aguarde um momento.';
        }
        break;
      case 500:
        if (!error.message || error.message.includes('Erro HTTP 500') || error.message.includes('HTTP 500')) {
          message = 'Erro interno do servidor. Nossa equipe técnica já foi notificada.';
        }
        break;
    }

    if (status === 0 || statusText === 'Network Error') {
      isNetworkError = true;
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    }
  } else if (error instanceof Error) {
    message = error.message;
    if (error.name === 'AbortError') {
      isTimeout = true;
      status = 408;
      statusText = 'Request Timeout';
      message = 'Tempo limite esgotado. A conexão demorou muito para responder.';
    } else if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
      isNetworkError = true;
      message = 'Erro de rede ou conexão de internet. Verifique se você está online.';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  // Ensure message is never empty
  if (!message) {
    message = defaultMessage;
  }

  // Display user-friendly notification
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
