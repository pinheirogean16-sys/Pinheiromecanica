import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const configEmpresaSchema = z.object({
  nome_fantasia: z.string().optional().nullable().transform((v) => v?.trim()),
  razao_social: z.string().optional().nullable().transform((v) => v?.trim()),
  cnpj: z.string().optional().nullable().transform((v) => v?.trim()),
  inscricao_estadual: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  cep: z.string().optional().nullable(),
  regime_tributario: z.string().optional().nullable(),
  rodape_personalizado: z.string().optional().nullable(),
  token_nfse: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  pix: z.string().optional().nullable(),
  banco: z.string().optional().nullable(),
  agencia: z.string().optional().nullable(),
  conta: z.string().optional().nullable(),
});

// ============================================================
// GET — Buscar configuração da empresa do usuário
// ============================================================
export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'configuracoes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const config = await prisma.configuracaoEmpresa.findFirst({
      where: { empresa_id: user.empresa_id },
    });
    return NextResponse.json(config || {});
  } catch (error: any) {
    return apiError(error, 'CONFIG', 'Erro ao buscar configurações');
  }
}

// ============================================================
// PUT — Salvar configuração da empresa do usuário
// ============================================================
export async function PUT(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'configuracoes', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = configEmpresaSchema.parse(await request.json());

    // Busca o registro da empresa do usuário
    const antes = await prisma.configuracaoEmpresa.findFirst({
      where: { empresa_id: user.empresa_id },
    });

    const agora = new Date();

    let config;

    if (antes) {
      // Registro já existe para esta empresa — atualiza
      config = await prisma.configuracaoEmpresa.update({
        where: { 
          id: antes.id,
          empresa_id: user.empresa_id // 👈 Redundância de segurança
        },
        data: {
          ...(body as any),
          updated_at: agora,
        },
      });
    } else {
      // Primeira vez desta empresa salvando — cria novo registro
      config = await prisma.configuracaoEmpresa.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          empresa_id: user.empresa_id,
          ...(body as any),
          updated_at: agora,
        } as any,
      });
    }

    await createAuditLog({
      modulo: 'CONFIG',
      acao: 'EDITAR',
      entidade: 'ConfiguracaoEmpresa',
      entidade_id: config.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: config,
    });

    log(
      'INFO',
      'CONFIG',
      'Configurações da empresa atualizadas',
      { id: config.id, empresa_id: user.empresa_id },
      user?.name
    );

    return NextResponse.json(config);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'CONFIG', 'Erro ao salvar configurações');
  }
}
