import { log } from './logger';

const isProduction = process.env.NODE_ENV === 'production';
let initialized = false;

export function initConsoleOverride() {
  if (initialized) return;
  initialized = true;

  if (!isProduction) return;

  // Silencia logs em produção
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};

  // Warn: apenas strings, trunca mensagens longas
  console.warn = (...args: any[]) => {
    const msg = args
      .map((a) => (typeof a === 'string' ? a : '[obj]'))
      .join(' ')
      .slice(0, 500);
    log('WARN', 'CONSOLE', msg, {});
  };

  // Error: só extrai a mensagem, sem stack trace
  console.error = (...args: any[]) => {
    const first = args[0];
    const msg =
      first instanceof Error
        ? first.message
        : typeof first === 'string'
          ? first
          : '[error]';

    log('ERROR', 'CONSOLE', msg.slice(0, 1000), {});
  };
}
