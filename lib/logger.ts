// ============================================================
// LOGGER VEHLOX
// Usa process.stdout/stderr DIRECTAMENTE para evitar recursão
// (não usa console.log/error que podem estar sobrescritos)
// ============================================================

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

// ============================================================
// Saída segura — NÃO usa console.* para evitar recursão
// ============================================================
function safeWrite(level: LogLevel, output: string) {
  try {
    if (level === 'ERROR' || level === 'WARN') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  } catch {
    // Se até isso falhar, não faz nada (não pode travar a app)
  }
}

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

  let output = '';
  try {
    output = JSON.stringify(entry);
  } catch {
    output = `[${level}] ${modulo}: ${mensagem}`;
  }

  safeWrite(level, output);
}

// ============================================================
// Atalhos
// ============================================================
export const logInfo = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('INFO', modulo, msg, dados);

export const logWarn = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('WARN', modulo, msg, dados);

export const logError = (modulo: string, msg: string, dados?: Record<string, unknown>) =>
  log('ERROR', modulo, msg, dados);
