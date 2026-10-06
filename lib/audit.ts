import { prisma } from './prisma';
import crypto from 'crypto';
import { getSession } from './auth';

export interface AuditData {
  modulo: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  usuario: string;
  empresa_id?: string;
  dados_antes?: any;
  dados_depois?: any;
  ip?: string;
}

export async function createAuditLog(data: AuditData) {
  try {
    let resolvedEmpresaId = data.empresa_id;
    if (!resolvedEmpresaId) {
      try {
        const session = await getSession();
        if (session?.empresa_id) {
          resolvedEmpresaId = session.empresa_id;
        }
      } catch (e) {
        // Fallback gracefully in background/non-cookie contexts
      }
    }

    if (!resolvedEmpresaId || resolvedEmpresaId === 'default') {
      return null;
    }

    return await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        modulo: data.modulo,
        acao: data.acao,
        entidade: data.entidade,
        entidade_id: data.entidade_id,
        usuario: data.usuario,
        empresa_id: resolvedEmpresaId,
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
