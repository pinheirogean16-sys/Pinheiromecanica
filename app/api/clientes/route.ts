import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

// ============================================================
// A12: validação real de CPF/CNPJ (dígitos verificadores)
// ============================================================
function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[10])) return false;

  return true;
}

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

function validarCpfCnpj(valor: string, tipo?: string): boolean {
  const nums = valor.replace(/\D/g, '');
  if (nums.length === 11) return validarCPF(nums);
  if (nums.length === 14) return validarCNPJ(nums);
  return false;
}

const clienteSchema = z.object({
  tipo: z.enum(['PF', 'PJ']).default('PJ'),
  tipo_pessoa: z.string().optional(),
  nome: z.string().min(3, 'Nome muito curto').trim(),
  razao_social: z.string().optional().nullable(),
  nome_fantasia: z.string().optional().nullable(),
  // A12: aceita com ou sem máscara; validação real fica no refine abaixo
  cpf_cnpj: z
    .string()
    .min(11, 'CPF/CNPJ muito curto')
    .max(20, 'CPF/CNPJ muito longo')
    .trim()
    .refine((v) => validarCpfCnpj(v), 'CPF/CNPJ inválido (dígitos verificadores não conferem)'),
  inscricao_estadual: z.string().optional().nullable(),
  telefone: z.string().min(8, 'Telefone muito curto').trim(),
  telefone_secundario: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  status: z.string().default('ATIVO'),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  estado: z.string().max(50).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  perfil: z.enum(['CLIENTE', 'FORNECEDOR', 'AMBOS']).default('CLIENTE'),
  ativo: z.boolean().optional().default(true),
});

// ============================================================
// GET — Listar clientes
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para listar
    if (!checkPermission(user, 'clientes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').slice(0, 100);
    const status = searchParams.get('status') || '';
    const perfil = searchParams.get('perfil') || '';

    // M06: teto de paginação
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (status) where.status = status;

    if (perfil) {
      if (perfil === 'CLIENTE') {
        where.perfil = { in: ['CLIENTE', 'AMBOS'] };
      } else if (perfil === 'FORNECEDOR') {
        where.perfil = { in: ['FORNECEDOR', 'AMBOS'] };
      } else {
        where.perfil = perfil;
      }
    }

    if (q) {
      where.OR = [
        { nome: { contains: q } },
        { cpf_cnpj: { contains: q } },
        { email: { contains: q } },
        { razao_social: { contains: q } },
        { nome_fantasia: { contains: q } },
      ];
    }

    const [rawClientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          _count: {
            select: {
              Veiculo: true,
              OrdemServico: true,
            },
          },
          OrdemServico: {
            select: {
              numero: true,
              valor_total: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ]);

    const clientes = rawClientes.map((cliente) => {
      const { _count, OrdemServico, ...rest } = cliente;
      return {
        ...rest,
        _count: _count
          ? {
              veiculos: _count.Veiculo,
              ordens: _count.OrdemServico,
            }
          : undefined,
        ordens: OrdemServico,
      };
    });

    return NextResponse.json({
      items: clientes,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    // B05: erro real em vez de lista vazia silenciosa
    log(
      'ERROR',
      'CLIENTE',
      'Erro ao listar clientes',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json(
      { error: 'Erro ao listar clientes' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — Criar cliente
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'clientes', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = clienteSchema.parse(await request.json());

    // A12: normaliza CPF/CNPJ só com dígitos para comparação
    const cpfCnpjLimpo = body.cpf_cnpj.replace(/\D/g, '');

    const existing = await prisma.cliente.findFirst({
      where: {
        cpf_cnpj: cpfCnpjLimpo,
        empresa_id: user.empresa_id,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'CPF/CNPJ já cadastrado nesta empresa' },
        { status: 409 }
      );
    }

    let cliente;
    try {
      cliente = await prisma.cliente.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          empresa_id: user.empresa_id,
          tipo: body.tipo,
          tipo_pessoa: body.tipo_pessoa || (body.tipo === 'PF' ? 'FISICA' : 'JURIDICA'),
          nome: body.nome,
          razao_social: body.razao_social || null,
          nome_fantasia: body.nome_fantasia || null,
          cpf_cnpj: cpfCnpjLimpo,
          inscricao_estadual: body.inscricao_estadual || null,
          telefone: body.telefone,
          telefone_secundario: body.telefone_secundario || null,
          contato: body.contato || null,
          email: body.email || null,
          status: body.status,
          cep: body.cep || null,
          endereco: body.endereco || null,
          numero: body.numero || null,
          complemento: body.complemento || null,
          bairro: body.bairro || null,
          cidade: body.cidade || null,
          uf: body.uf || body.estado || null,
          estado: body.estado || body.uf || null,
          observacoes: body.observacoes || null,
          perfil: body.perfil,
          ativo: body.ativo,
          updated_at: new Date(),
        },
      });
    } catch (err: any) {
      // Constraint unique (cpf_cnpj, empresa_id) estourou
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'CPF/CNPJ já cadastrado nesta empresa' },
          { status: 409 }
        );
      }
      throw err;
    }

    await createAuditLog({
      modulo: 'CLIENTE',
      acao: 'CRIAR',
      entidade: 'Cliente',
      entidade_id: cliente.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        id: cliente.id,
        nome: cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj,
        perfil: cliente.perfil,
      },
    });

    log(
      'INFO',
      'CLIENTE',
      'Cliente criado',
      { id: cliente.id, nome: cliente.nome },
      user?.name
    );

    return NextResponse.json(cliente, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'CLIENTE', 'Erro ao criar cliente');
  }
}
