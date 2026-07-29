import { prisma } from './prisma';
import crypto from 'crypto';

export interface AuditData {
  modulo: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  usuario: string;
  dados_antes?: any;
  dados_depois?: any;
  ip?: string;
}

export async function createAuditLog(data: AuditData) {
  try {
    return await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        modulo: data.modulo,
        acao: data.acao,
        entidade: data.entidade,
        entidade_id: data.entidade_id,
        usuario: data.usuario,
        dados_antes: typeof data.dados_antes === 'object' ? JSON.stringify(data.dados_antes) : (data.dados_antes || null),
        dados_depois: typeof data.dados_depois === 'object' ? JSON.stringify(data.dados_depois) : (data.dados_depois || null),
        ip: data.ip
      }
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    // Não paramos o fluxo se o log falhar, mas avisamos no console
  }
}
