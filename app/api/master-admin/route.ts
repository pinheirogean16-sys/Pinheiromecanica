import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';
import { criarAssinaturaAsaas, atualizarClienteAsaas } from '@/lib/asaas'; // ✅ Importação atualizada

// ============================================================
// CONSTANTES
// ============================================================
const PRECO_PRO = 149.90;
const PRECO_BASICO = 89.90;
const DIAS_TRIAL = Number(process.env.TRIAL_DIAS ?? 14); // ✅ configurável

const PLANOS_VALIDOS = ['TRIAL', 'BASICO', 'PRO'] as const;
const STATUS_VALIDOS = ['ATIVO', 'BLOQUEADO', 'CANCELADO'] as const;

const patchMasterSchema = z.object({
  empresa_id: z.string().min(1, 'ID da empresa obrigatório'),
  status: z.enum(STATUS_VALIDOS).optional(),
  plano: z.enum(PLANOS_VALIDOS).optional(),
});

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
// HELPERS
// ============================================================
function isSuperAdmin(email: string): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    log('ERROR', 'MASTER', 'SUPER_ADMIN_EMAIL não configurado no ambiente', {}, 'sistema');
    return false;
  }
  return email === superAdminEmail;
}

function calcularFimTrial(): Date {
  return new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000);
}

function getValorPlano(plano: 'PRO' | 'BASICO'): number {
  return plano === 'PRO' ? PRECO_PRO : PRECO_BASICO;
}

// ==========================================
// GET: Buscar dados para o Painel Master
// ==========================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!isSuperAdmin(user.email)) {
      return NextResponse.json({ error: 'Acesso negado. Área restrita.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const { page, limit } = getMasterQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    const skip = (page - 1) * limit;

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
      prisma.empresa.count({ where: { plano: 'PRO' } }),
      prisma.empresa.count({ where: { plano: 'BASICO' } }),
    ]);

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
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
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

    // ✅ Busca a empresa ANTES de atualizar (para usar trial_ends_at e asaas_customer_id)
    const empresaAntes = await prisma.empresa.findUnique({
      where: { id: empresa_id },
    });

    if (!empresaAntes) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // ============================================================
    // MONTA O OBJETO DE ATUALIZAÇÃO
    // ============================================================
    const updateData: any = {};

    if (status) updateData.status = status;

    if (plano) {
      updateData.plano = plano;

      if (plano === 'TRIAL') {
        updateData.trial_ends_at = calcularFimTrial();
        if (!status && empresaAntes.status === 'BLOQUEADO') {
          updateData.status = 'ATIVO';
        }
      } else {
        // PRO ou BASICO: limpa a data de trial
        updateData.trial_ends_at = null;
      }
    }

    // ============================================================
    // ATUALIZA A EMPRESA PRIMEIRO (garante consistência local)
    // ============================================================
    const updated = await prisma.empresa.update({
      where: { id: empresa_id },
      data: updateData,
    });

    // ============================================================
    // INTEGRAÇÃO ASAAS — CRIA ASSINATURA NA CONVERSÃO DE PLANO
    // ============================================================
    // Só cria assinatura se:
    // 1. O plano foi alterado para PRO ou BASICO (não TRIAL)
    // 2. A empresa ainda não tem assinatura ativa
    // 3. A empresa tem um customer no Asaas
    if (
      plano &&
      plano !== 'TRIAL' &&
      !empresaAntes.asaas_subscription_id &&
      empresaAntes.asaas_customer_id
    ) {
      try {
        // ✅ NOVO: Garante que a empresa tenha CNPJ e atualiza o cliente no Asaas
        if (!empresaAntes.cnpj) {
          throw new Error('A empresa precisa de um CNPJ cadastrado para gerar a assinatura.');
        }

        await atualizarClienteAsaas(empresaAntes.asaas_customer_id, {
          cpfCnpj: empresaAntes.cnpj.replace(/\D/g, ''),
        });

        // ✅ nextDueDate = fim do trial se ainda válido; senão, hoje
        const hoje = new Date();
        const fimTrial = empresaAntes.trial_ends_at
          ? new Date(empresaAntes.trial_ends_at)
          : null;

        const dataPrimeiraCobranca = fimTrial && fimTrial > hoje ? fimTrial : hoje;
        const nextDueDate = dataPrimeiraCobranca.toISOString().split('T')[0];

        const valorPlano = getValorPlano(plano as 'PRO' | 'BASICO');

        const subscription = await criarAssinaturaAsaas({
          customer: empresaAntes.asaas_customer_id,
          billingType: 'BOLETO', // ou 'PIX'
          value: valorPlano,
          nextDueDate,
          cycle: 'MONTHLY',
          description: `Assinatura Plano ${plano} - ${empresaAntes.nome}`,
        });

        // ✅ Salva o subscription_id e status local
        await prisma.empresa.update({
          where: { id: empresa_id },
          data: {
            asaas_subscription_id: subscription.id,
            asaas_status: 'ACTIVE',
          },
        });

        log(
          'INFO',
          'ASAAS',
          'Assinatura criada na conversão de plano',
          {
            empresaId: empresa_id,
            plano,
            valor: valorPlano,
            nextDueDate,
            subscriptionId: subscription.id,
          },
          user.email
        );
      } catch (asaasError: any) {
        // ⚠️ Não bloqueia a mudança de plano — o admin pode tentar novamente depois
        log(
          'ERROR',
          'ASAAS',
          'Falha ao criar assinatura na conversão de plano',
          {
            empresaId: empresa_id,
            plano,
            error: asaasError?.message || String(asaasError),
          },
          user.email
        );
      }
    }

    // ============================================================
    // AUDITORIA
    // ============================================================
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
        asaas_subscription_id: empresaAntes.asaas_subscription_id,
      },
      dados_depois: {
        status: updated.status,
        plano: updated.plano,
        trial_ends_at: updated.trial_ends_at?.toISOString() || null,
        asaas_subscription_id: updated.asaas_subscription_id,
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
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'MASTER', 'Erro ao atualizar empresa');
  }
}
