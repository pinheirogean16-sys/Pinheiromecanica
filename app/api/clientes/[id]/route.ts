import { NextResponse } from 'next/server';
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

function validarCpfCnpj(valor: string): boolean {
  const nums = valor.replace(/\D/g, '');
  if (nums.length === 11) return validarCPF(nums);
  if (nums.length === 14) return validarCNPJ(nums);
  return false;
}

// ============================================================
// SCHEMA DE VALIDAÇÃO PARA UPDATE
// ============================================================
const updateClienteSchema = z.object({
  tipo: z.enum(['PF', 'PJ']).optional(),
  tipo_pessoa: z.enum(['FISICA', 'JURIDICA']).optional(), // 👈 ENUM
  nome: z.string().min(3).trim().optional(),
  razao_social: z.string().optional().nullable(),
  nome_fantasia: z.string().optional().nullable(),
  cpf_cnpj: z.string().min(11).trim().optional().refine(
    (v) => !v || validarCpfCnpj(v), // 👈 Validação real
    'CPF/CNPJ inválido (dígitos verificadores não conferem)'
  ),
  inscricao_estadual: z.string().optional().nullable(),
  telefone: z.string().min(8).trim().optional(),
  telefone_secundario: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  status: z.enum(['ATIVO', 'INATIVO']).optional(), // 👈 ENUM
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  perfil: z.enum(['CLIENTE', 'FORNECEDOR', 'AMBOS']).optional(),
  ativo: z.boolean().optional(),
});

// ============================================================
// GET — Buscar cliente por ID
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'clientes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawCliente = await prisma.cliente.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        Veiculo: true,
        OrdemServico: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            Veiculo: true
          }
        },
        _count: {
          select: { Veiculo: true, OrdemServico: true }
        }
      }
    });

    if (!rawCliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const { Veiculo, OrdemServico, _count, ...rest } = rawCliente;
    const cliente = {
      ...rest,
      veiculos: Veiculo,
      ordens: OrdemServico.map(o => {
        const { Veiculo: osVeiculo, ...oRest } = o;
        return {
          ...oRest,
          veiculo: osVeiculo
        };
      }),
      _count: {
        veiculos: _count?.Veiculo ?? 0,
        ordens: _count?.OrdemServico ?? 0
      }
    };

    return NextResponse.json(cliente);
  } catch (error: any) {
    return apiError(error, 'CLIENTE', 'Erro ao buscar cliente');
  }
}

// ============================================================
// PUT — Atualizar cliente
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: 'clientes' (plural)
    if (!checkPermission(user, 'clientes', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateClienteSchema.parse(await request.json());

    const antes = await prisma.cliente.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    if (body.cpf_cnpj) {
      const cpfCnpjLimpo = body.cpf_cnpj.replace(/\D/g, '');
      const existing = await prisma.cliente.findFirst({
        where: {
          cpf_cnpj: cpfCnpjLimpo,
          empresa_id: user.empresa_id,
          id: { not: id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'CPF/CNPJ já cadastrado em outro cliente nesta empresa' }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { 
        id,
        empresa_id: user.empresa_id // 👈 Redundância de segurança
      },
      data: {
        tipo: body.tipo,
        tipo_pessoa: body.tipo_pessoa,
        nome: body.nome,
        razao_social: body.razao_social,
        nome_fantasia: body.nome_fantasia,
        cpf_cnpj: body.cpf_cnpj ? body.cpf_cnpj.replace(/\D/g, '') : undefined, // Normaliza
        inscricao_estadual: body.inscricao_estadual,
        telefone: body.telefone,
        telefone_secundario: body.telefone_secundario,
        contato: body.contato,
        email: body.email,
        status: body.status,
        cep: body.cep,
        endereco: body.endereco,
        numero: body.numero,
        complemento: body.complemento,
        bairro: body.bairro,
        cidade: body.cidade,
        uf: body.uf !== undefined ? (body.uf || body.estado) : undefined,
        estado: body.estado !== undefined ? (body.estado || body.uf) : (body.uf !== undefined ? (body.uf || body.estado) : undefined),
        observacoes: body.observacoes,
        perfil: body.perfil,
        ativo: body.status === 'INATIVO' ? false : (body.ativo !== undefined ? body.ativo : undefined),
        updated_by: user?.name || user?.email || 'Sistema'
      }
    });

    await createAuditLog({
      modulo: 'CLIENTE',
      acao: 'EDITAR',
      entidade: 'Cliente',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id, // 👈 Adicionado
      dados_antes: antes,
      dados_depois: cliente
    });

    log('INFO', 'CLIENTE', 'Cliente atualizado', { id }, user?.name);

    return NextResponse.json(cliente);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'CLIENTE', 'Erro ao atualizar cliente');
  }
}

// ============================================================
// DELETE — Excluir cliente
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: 'clientes' (plural)
    if (!checkPermission(user, 'clientes', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.cliente.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    
    // Redundância de segurança: empresa_id no where
    await prisma.cliente.delete({
      where: { 
        id,
        empresa_id: user.empresa_id // 👈 Redundância de segurança
      }
    });

    await createAuditLog({
      modulo: 'CLIENTE',
      acao: 'EXCLUIR',
      entidade: 'Cliente',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id, // 👈 Adicionado
      dados_antes: antes
    });

    log('INFO', 'CLIENTE', 'Cliente excluído', { id }, user?.name);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'CLIENTE', 'Erro ao excluir cliente. Verifique se não há OS vinculadas.');
  }
}
