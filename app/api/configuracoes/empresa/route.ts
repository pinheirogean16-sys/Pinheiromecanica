import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const configEmpresaSchema = z.object({
  nome_fantasia: z.string().optional().nullable().transform(v => v?.trim()),
  razao_social: z.string().optional().nullable().transform(v => v?.trim()),
  cnpj: z.string().optional().nullable().transform(v => v?.trim()),
  inscricao_estadual: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
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
  conta: z.string().optional().nullable()
});

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'configuracoes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const config = await prisma.configuracaoEmpresa.findUnique({
      where: { id: 'config_empresa' }
    });
    return NextResponse.json(config || {});
  } catch (error) {
    log('ERROR', 'CONFIG', 'Erro ao buscar configurações', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'configuracoes', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = configEmpresaSchema.parse(await request.json());
    
    const antes = await prisma.configuracaoEmpresa.findUnique({
      where: { id: 'config_empresa' }
    });

    const config = await prisma.configuracaoEmpresa.upsert({
      where: { id: 'config_empresa' },
      update: body as any,
      create: {
        id: 'config_empresa',
        ...body
      } as any
    });

    await createAuditLog({
      modulo: 'CONFIG',
      acao: 'EDITAR',
      entidade: 'ConfiguracaoEmpresa',
      entidade_id: 'config_empresa',
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: config
    });

    log('INFO', 'CONFIG', 'Configurações da empresa atualizadas', { id: 'config_empresa' }, user?.name);

    return NextResponse.json(config);
  } catch (error) {
    log('ERROR', 'CONFIG', 'Erro ao salvar configurações', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
