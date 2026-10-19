import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// CONSTANTES
// ============================================================
const PRECO_PRO = 149.90;
const PRECO_BASICO = 89.90;

const PLANOS_VALIDOS = ['TRIAL', 'BASICO', 'PRO'] as const;
const STATUS_VALIDOS = ['ATIVO', 'BLOQUEADO', 'CANCELADO'] as const;

const patchMasterSchema = z.object({
  empresa_id: z.string().min(1, 'ID da empresa obrigatório'),
  status: z.enum(STATUS_VALIDOS).optional(),
  plano: z.enum(PLANOS_VALIDOS).optional(),
});

const getMasterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================
// HELPER: valida se o usuário é o super admin
// ============================================================
function isSuperAdmin(email: string): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    log('ERROR', 'MASTER', 'SUPER_ADMIN_EMAIL não configurado no ambiente', {}, 'sistema');
    return false;
  }
  return email === superAdminEmail;
}

// ==========================================
// GET: Buscar dados para o Painel Master
// ==========================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA
    if (!isSuperAdmin(user.email)) {
      return NextResponse.json({ error: 'Acesso negado. Área restrita.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = getMasterQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    const skip = (page - 1) * limit;

    // ✅ NOVO: paginação + contagens em paralelo
    const [empresas, totalEmpresas, totalUsuarios, totalOS, logsRecentes] = await Promise.all([
      prisma.empresa.findMany({
        include: {
          _count: { select: { User: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.empresa.count(),
      prisma.user.count(),
      prisma.ordemServico.count(),
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    // MRR baseado nas constantes (não hardcoded)
    let mrr = 0;
    empresas.forEach((emp) => {
      if (emp.plano === 'PRO') mrr += PRECO_PRO;
      if (emp.plano === 'BASICO') mrr += PRECO_BASICO;
    });

    return NextResponse.json({
      stats: {
        totalEmpresas,
        totalUsuarios,
        totalOS,
        mrr,
      },
      empresas,
      paginacao: {
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalEmpresas / limit)),
      },
      logsRecentes,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'MASTER', 'Erro interno no servidor master');
  }
}

// ==========================================
// PATCH: Atualizar Plano ou Status da Empresa
// ==========================================
export async function PATCH(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA
    if (!isSuperAdmin(user.email)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchMasterSchema.parse(body);
    const { empresa_id, status, plano } = parsed;

    if (!status && !plano) {
      return NextResponse.json(
        { error: 'Informe status ou plano para atualizar.' },
        { status: 400 }
      );
    }

    // ✅ NOVO: verifica se a empresa existe antes de atualizar
    const empresaAntes = await prisma.empresa.findUnique({
      where: { id: empresa_id },
    });

    if (!empresaAntes) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // Atualiza a empresa
    const updated = await prisma.empresa.update({
      where: { id: empresa_id },
      data: {
        ...(status && { status }),
        ...(plano && { plano }),
      },
    });

    // ✅ NOVO: auditoria da alteração
    await createAuditLog({
      modulo: 'MASTER',
      acao: 'EDITAR',
      entidade: 'Empresa',
      entidade_id: empresa_id,
      usuario: user.email,
      empresa_id: empresa_id,
      dados_antes: {
        status: empresaAntes.status,
        plano: empresaAntes.plano,
      },
      dados_depois: {
        status: updated.status,
        plano: updated.plano,
      },
    });

    log(
      'INFO',
      'MASTER',
      'Empresa atualizada pelo super admin',
      { empresa_id, status, plano },
      user.email
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'MASTER', 'Erro ao atualizar empresa');
  }
}
