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
const DIAS_TRIAL = 14;

const PLANOS_VALIDOS = ['TRIAL', 'BASICO', 'PRO'] as const;
const STATUS_VALIDOS = ['ATIVO', 'BLOQUEADO', 'CANCELADO'] as const;

const patchMasterSchema = z.object({
  empresa_id: z.string().min(1, 'ID da empresa obrigatório'),
  status: z.enum(STATUS_VALIDOS).optional(),
  plano: z.enum(PLANOS_VALIDOS).optional(),
});

// ✅ CORRIGIDO: preprocess para nunca quebrar com null/0
const getMasterQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 50 : val),
    z.coerce.number().int().min(1).max(100).default(50)
  ),
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

// ============================================================
// HELPER: calcula data de término do trial
// ============================================================
function calcularFimTrial(): Date {
  return new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000);
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

    // ✅ CORRIGIDO: `|| undefined` para o .default() funcionar
    const { page, limit } = getMasterQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    const skip = (page - 1) * limit;

    // ✅ NOVO: contagem global de planos (para MRR correto, independente da paginação)
    const [
      empresas,
      totalEmpresas,
      totalUsuarios,
      totalOS,
      logsRecentes,
      countPro,
      countBasico,
    ] = await Promise.all([
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
      // ✅ MRR correto: conta TODAS as empresas do plano, não só as da página
      prisma.empresa.count({ where: { plano: 'PRO' } }),
      prisma.empresa.count({ where: { plano: 'BASICO' } }),
    ]);

    // ✅ MRR global (não depende da paginação)
    const mrr = countPro * PRECO_PRO + countBasico * PRECO_BASICO;

    return NextResponse.json({
      stats: {
        totalEmpresas,
        totalUsuarios,
        totalOS,
        mrr,
        empresasPro: countPro,
        empresasBasico: countBasico,
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

    // ✅ Verifica se a empresa existe antes de atualizar
    const empresaAntes = await prisma.empresa.findUnique({
      where: { id: empresa_id },
    });

    if (!empresaAntes) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // ✅ NOVO: monta o objeto de atualização incluindo trial_ends_at
    const updateData: any = {};

    if (status) updateData.status = status;

    if (plano) {
      updateData.plano = plano;

      // Se o plano virou TRIAL, define 14 dias a partir de agora
      if (plano === 'TRIAL') {
        updateData.trial_ends_at = calcularFimTrial();
        // Se estava bloqueado, desbloqueia (novo trial)
        if (!status && empresaAntes.status === 'BLOQUEADO') {
          updateData.status = 'ATIVO';
        }
      } else {
        // PRO ou BASICO: limpa a data de trial (não é mais necessária)
        updateData.trial_ends_at = null;
      }
    }

    // Atualiza a empresa
    const updated = await prisma.empresa.update({
      where: { id: empresa_id },
      data: updateData,
    });

    // ✅ Auditoria da alteração
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
        trial_ends_at: empresaAntes.trial_ends_at?.toISOString() || null,
      },
      dados_depois: {
        status: updated.status,
        plano: updated.plano,
        trial_ends_at: updated.trial_ends_at?.toISOString() || null,
      },
    });

    log(
      'INFO',
      'MASTER',
      'Empresa atualizada pelo super admin',
      {
        empresa_id,
        status: updated.status,
        plano: updated.plano,
        trial_ends_at: updated.trial_ends_at?.toISOString() || null,
      },
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
