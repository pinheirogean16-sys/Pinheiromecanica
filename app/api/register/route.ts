import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { criarClienteAsaas } from '@/lib/asaas';

// ============================================================
// CONFIGURAÇÃO DO TRIAL
// ============================================================
const DIAS_TRIAL = Number(process.env.TRIAL_DIAS ?? 7); // ✅ ALTERADO DE 14 PARA 7

function calcularFimTrial(): Date {
  return new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000);
}

// ============================================================
// VALIDAÇÃO REAL DE CNPJ (dígitos verificadores)
// ============================================================
function validarCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(nums)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dig1 = calcularDigito(nums.slice(0, 12), pesos1);
  if (dig1 !== parseInt(nums[12])) return false;

  const dig2 = calcularDigito(nums.slice(0, 13), pesos2);
  if (dig2 !== parseInt(nums[13])) return false;

  return true;
}

// ============================================================
// COMPARAÇÃO SEGURA CONTRA TIMING ATTACK
// ============================================================
function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const registerSchema = z.object({
  empresa_nome: z.string().min(2, 'Nome da empresa muito curto').max(200).trim(),
  cnpj: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null)
    .refine((v) => !v || validarCNPJ(v), 'CNPJ inválido (dígitos verificadores não conferem)'),
  nome_admin: z.string().min(2, 'Nome muito curto').max(200).trim(),
  email: z.string().email('E-mail inválido').max(200).transform((v) => v.toLowerCase().trim()),
  senha: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v), 'Senha deve conter ao menos uma letra')
    .refine((v) => /\d/.test(v), 'Senha deve conter ao menos um número'),
  invite_token: z
    .string({ required_error: 'Código de convite obrigatório' })
    .min(1, 'Código de convite obrigatório'),
});

// ============================================================
// POST — Cadastro de nova empresa via convite
// ============================================================
export async function POST(request: Request) {
  try {
    const inviteTokenEsperado = process.env.REGISTER_INVITE_TOKEN;

    if (!inviteTokenEsperado) {
      log('ERROR', 'REGISTER', 'REGISTER_INVITE_TOKEN não configurado — cadastro bloqueado', {}, 'SISTEMA');
      return NextResponse.json(
        { error: 'Cadastro indisponível no momento' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { empresa_nome, cnpj, nome_admin, email, senha, invite_token } = parsed.data;

    if (!safeCompare(invite_token, inviteTokenEsperado)) {
      log('WARN', 'REGISTER', 'Tentativa de cadastro com token de convite inválido', { email }, 'SISTEMA');
      return NextResponse.json({ error: 'Código de convite inválido' }, { status: 403 });
    }

    // ✅ CNPJ limpo (sem máscara) para validação e envio ao Asaas
    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;

    if (cnpjLimpo) {
      const existingEmpresa = await prisma.empresa.findFirst({
        where: { cnpj: cnpjLimpo },
        select: { id: true },
      });
      if (existingEmpresa) {
        return NextResponse.json(
          { error: 'Já existe uma empresa cadastrada com este CNPJ' },
          { status: 400 }
        );
      }
    }

    const hash = await bcrypt.hash(senha, 10);
    const trialFim = calcularFimTrial();

    // ============================================================
    // TRANSAÇÃO: cria empresa, admin e configuração
    // ============================================================
    const result = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          id: crypto.randomUUID(),
          nome: empresa_nome,
          cnpj: cnpjLimpo,
          plano: 'TRIAL',
          status: 'ATIVO',
          trial_ends_at: trialFim,
        },
      });

      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          name: nome_admin,
          email,
          password_hash: hash,
          role: 'ADMIN',
          empresa_id: empresa.id,
          updated_at: new Date(),
        },
      });

      await tx.configuracaoEmpresa.create({
        data: {
          id: crypto.randomUUID(),
          empresa_id: empresa.id,
          nome_fantasia: empresa_nome,
          razao_social: empresa_nome,
          regime_tributario: 'Simples Nacional',
          updated_at: new Date(),
        },
      });

      return { empresa, user };
    });

    // ============================================================
    // INTEGRAÇÃO ASAAS — apenas o CUSTOMER (sem assinatura)
    // A assinatura é criada no master-admin quando o plano é convertido.
    // ============================================================
    try {
      const customer = await criarClienteAsaas({
        name: empresa_nome,
        ...(cnpjLimpo ? { cpfCnpj: cnpjLimpo } : {}), // ✅ Só envia se existir
        email,
        externalReference: result.empresa.id,
      });

      await prisma.empresa.update({
        where: { id: result.empresa.id },
        data: { asaas_customer_id: customer.id },
      });

      log(
        'INFO',
        'ASAAS',
        'Customer criado no Asaas',
        {
          empresaId: result.empresa.id,
          customerId: customer.id,
        },
        'SISTEMA'
      );
    } catch (asaasError: any) {
      // Não impede o cadastro — a empresa fica criada com status TRIAL
      log(
        'ERROR',
        'ASAAS',
        'Falha ao criar customer no Asaas',
        {
          empresaId: result.empresa.id,
          error: asaasError?.message || String(asaasError),
        },
        'SISTEMA'
      );
    }

    // ============================================================
    // AUDITORIA
    // ============================================================
    await createAuditLog({
      modulo: 'REGISTER',
      acao: 'CRIAR',
      entidade: 'Empresa',
      entidade_id: result.empresa.id,
      usuario: result.user.email,
      empresa_id: result.empresa.id,
      dados_depois: {
        empresa_id: result.empresa.id,
        empresa_nome: result.empresa.nome,
        admin_id: result.user.id,
        admin_email: result.user.email,
        plano: 'TRIAL',
        trial_ends_at: trialFim.toISOString(),
      },
    });

    log(
      'INFO',
      'REGISTER',
      'Nova empresa cadastrada via convite',
      {
        empresaId: result.empresa.id,
        email,
        trialFim: trialFim.toISOString(),
        diasTrial: DIAS_TRIAL,
      },
      'SISTEMA'
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = error?.meta?.target;
      const campo = Array.isArray(target) ? target.join(',') : target || 'desconhecido';

      log('WARN', 'REGISTER', 'Violação de unicidade no cadastro (race condition)', { campo }, 'SISTEMA');

      const mensagem = campo.includes('cnpj')
        ? 'Já existe uma empresa cadastrada com este CNPJ'
        : 'Registro duplicado. Verifique os dados e tente novamente.';

      return NextResponse.json({ error: mensagem }, { status: 409 });
    }

    log('ERROR', 'REGISTER', 'Erro no registro', { error: error?.message }, 'SISTEMA');
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
