import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const clienteSchema = z.object({
  tipo: z.enum(['PF', 'PJ']).default('PJ'),
  tipo_pessoa: z.string().optional(),
  nome: z.string().min(3).trim(),
  razao_social: z.string().optional().nullable(),
  nome_fantasia: z.string().optional().nullable(),
  cpf_cnpj: z.string().min(11).trim(),
  inscricao_estadual: z.string().optional().nullable(),
  telefone: z.string().min(8).trim(),
  telefone_secundario: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  status: z.string().default('ATIVO'),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  perfil: z.enum(['CLIENTE', 'FORNECEDOR', 'AMBOS']).default('CLIENTE'),
  ativo: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const perfil = searchParams.get('perfil') || '';

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };

    if (status) {
      where.status = status;
    }

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

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [rawClientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          _count: {
            select: {
              Veiculo: true,
              OrdemServico: true,
            }
          },
          OrdemServico: {
            select: {
              numero: true,
              valor_total: true,
              created_at: true,
            },
            orderBy: {
              created_at: 'desc'
            },
            take: 1
          }
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      prisma.cliente.count({ where })
    ]);

    const clientes = rawClientes.map(cliente => {
      const { _count, OrdemServico, ...rest } = cliente;
      return {
        ...rest,
        _count: _count ? {
          veiculos: _count.Veiculo,
          ordens: _count.OrdemServico,
        } : undefined,
        ordens: OrdemServico,
      };
    });

    return NextResponse.json({
      items: clientes,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error("Prisma Error listing clientes:", error);
    log('ERROR', 'CLIENTE', 'Erro ao listar clientes', { error: error.message, stack: error.stack }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'clientes', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = clienteSchema.parse(await request.json());
    
    const existing = await prisma.cliente.findUnique({
      where: { cpf_cnpj: body.cpf_cnpj }
    });

    if (existing) {
      return NextResponse.json({ error: 'CPF/CNPJ já cadastrado' }, { status: 400 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        id: crypto.randomUUID(),
        empresa_id: user?.empresa_id || 'default',
        tipo: body.tipo,
        tipo_pessoa: body.tipo_pessoa || (body.tipo === 'PF' ? 'FISICA' : 'JURIDICA'),
        nome: body.nome,
        razao_social: body.razao_social || null,
        nome_fantasia: body.nome_fantasia || null,
        cpf_cnpj: body.cpf_cnpj,
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
        updated_at: new Date()
      }
    });

    await createAuditLog({
      modulo: 'CLIENTE',
      acao: 'CRIAR',
      entidade: 'Cliente',
      entidade_id: cliente.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: cliente
    });

    log('INFO', 'CLIENTE', 'Cliente criado', { id: cliente.id, nome: cliente.nome }, user?.name);

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    log('ERROR', 'CLIENTE', 'Erro ao criar cliente', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}
