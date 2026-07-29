export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  modulo: string;
  mensagem: string;
  dados: any;
  usuario: string;
}

export function log(level: LogLevel, modulo: string, mensagem: string, dados?: any, usuario: string = 'sistema') {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    modulo,
    mensagem,
    dados: dados || {},
    usuario
  };
  
  // Em ambiente de produção, poderíamos enviar para um serviço de logs
  console.log(JSON.stringify(entry));
}
