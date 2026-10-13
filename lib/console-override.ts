// ============================================================
// CONSOLE OVERRIDE
// Silencia console.log em produção e redireciona erros para o logger
// ============================================================

import { log } from './logger';

const isProduction = process.env.NODE_ENV === 'production';

let initialized = false;

export function initConsoleOverride() {
  if (initialized) return;
  initialized = true;

  if (!isProduction) return; // Em dev, deixa o console normal

  // Silencia console.log e console.info em produção
  console.log = () => {};
  console.info = () => {};

  // Redireciona console.warn para o logger
  console.warn = (...args: any[]) => {
    log('WARN', 'CONSOLE', args.map(String).join(' '), {});
  };

  // Redireciona console.error para o logger
  console.error = (...args: any[]) => {
    const mensagem = args
      .map((a) => {
        if (a instanceof Error) return a.message + '\n' + (a.stack || '');
        if (typeof a === 'object') {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');

    log('ERROR', 'CONSOLE', mensagem, {});
  };
}
