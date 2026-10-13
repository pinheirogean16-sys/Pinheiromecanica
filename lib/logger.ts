export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  modulo: string;
  mensagem: string;
  dados: Record<string, unknown>;
  usuario: string;
  ambiente: string;
}

const NIVEIS_ATIVOS: Record<LogLevel, boolean> = {
  DEBUG: process.env.NODE_ENV !== 'production',
  INFO: true,
  WARN: true,
  ERROR: true,
};

export function log(
  level: LogLevel,
  modulo: string,
  mensagem: string,
  dados: Record<string, unknown> = {},
  usuario: string = 'sistema'
) {
  if (!NIVEIS_ATIVOS[level]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    modulo,
    mensagem,
    dados,
    usuario,
    ambiente: process.env.NODE_ENV || 'development',
  };

  // Em produção, o ideal é enviar para Pino/Sentry/Datadog
  // Por enquanto, loga em JSON estruturado
  const output = JSON.stringify(entry);

  if (level === 'ERROR') {
    console.error(output);
  } else if (level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

// Atalhos
export const logInfo = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('INFO', modulo, msg, dados);

export const logWarn = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('WARN', modulo, msg, dados);

export const logError = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('ERROR', modulo, msg, dados);
