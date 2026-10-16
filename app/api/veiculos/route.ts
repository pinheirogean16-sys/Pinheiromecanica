import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Veiculo_tipo } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

const veiculoSchema = z.object({
  placa: z.string()
    .min(3, 'Placa ou identificador deve ter no mínimo 3 caracteres')
    .max(20, 'Placa ou identificador deve ter no máximo 20 caracteres')
    .trim()
    .transform(v => v.toUpperCase()),
  modelo: z.string().min(2, 'Modelo obrigatório').trim(),
  marca: z.string().min(2, 'Marca obrigatória').trim(),
  ano: z.coerce.number().int().min(1900, 'Ano inválido').max(2035, 'Ano inválido'),
  tipo: z.nativeEnum(Veiculo_tipo),
  quilometragem: z.coerce.number().nonnegative().optional().nullable(),
  horimetro_atual: z.coerce.number().nonnegative().optional().nullable(),
  cliente_id: z.string().min(1, 'Cliente obrigatório'),
});

// ============================================================
// GET — Listar veículos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para listar
    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').slice(0, 100);
    const tipo = searchParams.get('tipo') as Veiculo_tipo | null;
    const cliente_id = searchParams.get('cliente_id');

    // M06: teto de paginação
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      empresa_id: user.empresa_id,
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
            select: { nome: true, id: true },
          },
        },
        orderBy: { modelo: 'asc' },
        skip,
        take: limit,
      }),
      prisma.veiculo.count({ where }),
    ]);

    const items = rawItems.map((item) => {
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    // B05: erro real em vez de lista vazia silenciosa
    log(
      'ERROR',
      'VEICULO',
      'Erro ao listar veículos',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json(
      { error: 'Erro ao listar veículos' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — Criar veículo
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = veiculoSchema.parse(await request.json());

    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id: user.empresa_id },
      select: { id: true },
    });
    if (!clienteExistente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado nesta empresa' },
        { status: 400 }
      );
    }

    const existing = await prisma.veiculo.findFirst({
      where: {
        placa: body.placa,
        empresa_id: user.empresa_id,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Placa já cadastrada nesta empresa' },
        { status: 409 }
      );
    }

    let veiculo;
    try {
      veiculo = await prisma.veiculo.create({
        data: {
          ...body,
          id: globalThis.crypto.randomUUID(),
          empresa_id: user.empresa_id,
          created_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        },
        include: {
          Cliente: true,
        },
      });
    } catch (err: any) {
      // Constraint unique (placa, empresa_id) estourou
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Placa já cadastrada nesta empresa' },
          { status: 409 }
        );
      }
      throw err;
    }

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
      empresa_id: user.empresa_id,
      dados_depois: {
        id: veiculo.id,
        placa: veiculo.placa,
        modelo: veiculo.modelo,
        marca: veiculo.marca,
        tipo: veiculo.tipo,
      },
    });

    log(
      'INFO',
      'VEICULO',
      'Veículo criado',
      { id: veiculo.id, placa: veiculo.placa },
      user?.name
    );

    return NextResponse.json(mappedVeiculo, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'VEICULO', 'Erro ao criar veículo');
  }
}
