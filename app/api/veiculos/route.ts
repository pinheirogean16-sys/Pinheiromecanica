import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Veiculo_tipo } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const veiculoSchema = z.object({
  placa: z.string().min(7).max(8).trim().transform(v => v.toUpperCase()),
  modelo: z.string().min(2).trim(),
  marca: z.string().min(2).trim(),
  ano: z.coerce.number().int().min(1900).max(2030),
  tipo: z.nativeEnum(Veiculo_tipo),
  quilometragem: z.coerce.number().optional().nullable(),
  horimetro_atual: z.coerce.number().optional().nullable(),
  cliente_id: z.string().min(1)
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const tipo = searchParams.get('tipo') as Veiculo_tipo | null;
    const cliente_id = searchParams.get('cliente_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {
      empresa_id: user.empresa_id
    };

    if (q) {
      where.OR = [
        { placa: { contains: q } },
        { modelo: { contains: q } },
        { marca: { contains: q } },
        { Cliente: { nome: { contains: q } } },
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (cliente_id) {
      where.cliente_id = cliente_id;
    }

    const [rawItems, total] = await Promise.all([
      prisma.veiculo.findMany({
        where,
        include: {
          Cliente: {
            select: { nome: true, id: true }
          }
        },
        orderBy: { modelo: 'asc' },
        skip,
        take: limit,
      }),
      prisma.veiculo.count({ where }),
    ]);

    const items = rawItems.map(item => {
      const { Cliente, ...rest } = item;
      return {
        ...rest,
        cliente: Cliente,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Prisma Error listing veiculos:", error);
    log('ERROR', 'VEICULO', 'Erro ao listar veículos', { error: error.message, stack: error.stack }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = veiculoSchema.parse(await request.json());

    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id: user.empresa_id }
    });
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
    }
    
    const existing = await prisma.veiculo.findFirst({
      where: { 
        placa: body.placa,
        empresa_id: user.empresa_id
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Placa já cadastrada nesta empresa' }, { status: 400 });
    }

    const veiculo = await prisma.veiculo.create({
      data: {
        ...body,
        id: crypto.randomUUID(),
        empresa_id: user.empresa_id,
        created_by: user?.name || user?.email || 'Sistema',
        updated_at: new Date()
      },
      include: {
        Cliente: true
      }
    });

    const mappedVeiculo = {
      ...veiculo,
      cliente: (veiculo as any).Cliente || (veiculo as any).cliente,
    };

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'CRIAR',
      entidade: 'Veiculo',
      entidade_id: veiculo.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: mappedVeiculo
    });

    log('INFO', 'VEICULO', 'Veículo criado', { id: veiculo.id, placa: veiculo.placa }, user?.name);

    return NextResponse.json(mappedVeiculo, { status: 201 });
  } catch (error: any) {
    console.error("Prisma Error creating veiculo:", error);
    log('ERROR', 'VEICULO', 'Erro ao criar veículo', { error: error.message, stack: error.stack }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar veículo' }, { status: 500 });
  }
}
