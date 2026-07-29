import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const updateClienteSchema = z.object({
  tipo: z.enum(['PF', 'PJ']).optional(),
  tipo_pessoa: z.string().optional(),
  nome: z.string().min(3).trim().optional(),
  razao_social: z.string().optional().nullable(),
  nome_fantasia: z.string().optional().nullable(),
  cpf_cnpj: z.string().min(11).trim().optional(),
  inscricao_estadual: z.string().optional().nullable(),
  telefone: z.string().min(8).trim().optional(),
  telefone_secundario: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  status: z.string().optional(),
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
    const rawCliente = await prisma.cliente.findUnique({
      where: { id },
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
  } catch (error) {
    log('ERROR', 'CLIENTE', 'Erro ao buscar cliente', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'cliente', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateClienteSchema.parse(await request.json());

    const antes = await prisma.cliente.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (body.cpf_cnpj) {
      const existing = await prisma.cliente.findFirst({
        where: {
          cpf_cnpj: body.cpf_cnpj,
          id: { not: id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'CPF/CNPJ já cadastrado em outro cliente' }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        tipo: body.tipo,
        tipo_pessoa: body.tipo_pessoa,
        nome: body.nome,
        razao_social: body.razao_social,
        nome_fantasia: body.nome_fantasia,
        cpf_cnpj: body.cpf_cnpj,
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
      dados_antes: antes,
      dados_depois: cliente
    });

    log('INFO', 'CLIENTE', 'Cliente atualizado', { id }, user?.name);

    return NextResponse.json(cliente);
  } catch (error) {
    log('ERROR', 'CLIENTE', 'Erro ao atualizar cliente', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'cliente', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.cliente.findUnique({ where: { id } });
    
    await prisma.cliente.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'CLIENTE',
      acao: 'EXCLUIR',
      entidade: 'Cliente',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'CLIENTE', 'Cliente excluído', { id }, user?.name);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'CLIENTE', 'Erro ao excluir cliente', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir cliente. Verifique se não há OS vinculadas.' }, { status: 500 });
  }
}
