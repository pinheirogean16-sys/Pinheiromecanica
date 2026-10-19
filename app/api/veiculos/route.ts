import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Veiculo_tipo } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';

// ============================================================
// CONSTANTES
// ============================================================
const ANO_MIN = 1900;
const ANO_MAX = new Date().getFullYear() + 1; // 2027 no máximo (veículos "do futuro" são raros)

// ============================================================
// SCHEMA DE CRIAÇÃO
// ============================================================
const veiculoSchema = z
  .object({
    placa: z
      .string()
      .min(3, 'Placa ou identificador deve ter no mínimo 3 caracteres')
      .max(20, 'Placa ou identificador deve ter no máximo 20 caracteres')
      .trim()
      .transform((v) => v.toUpperCase()),
    modelo: z.string().min(2, 'Modelo obrigatório').max(200, 'Modelo muito longo').trim(),
    marca: z.string().min(2, 'Marca obrigatória').max(100, 'Marca muito longa').trim(),
    ano: z.coerce
      .number()
      .int()
      .min(ANO_MIN, `Ano inválido (mínimo ${ANO_MIN})`)
      .max(ANO_MAX, `Ano inválido (máximo ${ANO_MAX})`),
    tipo: z.nativeEnum(Veiculo_tipo),
    quilometragem: z.coerce.number().nonnegative().optional().nullable(),
    horimetro_atual: z.coerce.number().nonnegative().optional().nullable(),
    cliente_id: z.string().min(1, 'Cliente obrigatório'),
  })
  .refine(
    (data) => (data.quilometragem ?? 0) > 0 || (data.horimetro_atual ?? 0) > 0,
    {
      message:
        'Informe ao menos uma métrica do veículo: quilometragem (KM) ou horímetro (h). Sem isso, não é possível acompanhar preventivas.',
      path: ['quilometragem'],
    }
  );

// ============================================================
// SCHEMA DE FILTRO (GET)
// ============================================================
const listarVeiculosQuerySchema = z.object({
  q: z.string().optional().transform((v) => v?.slice(0, 100).trim() || ''),
  tipo: z.nativeEnum(Veiculo_tipo).optional(),
  cliente_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================
// GET — Listar veículos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listarVeiculosQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      cliente_id: searchParams.get('cliente_id') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { q, tipo, cliente_id, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const where: any = { empresa_id: user.empresa_id };

    if (q) {
      where.OR = [
        { placa: { contains: q } },
        { modelo: { contains: q } },
        { marca: { contains: q } },
        { Cliente: { nome: { contains: q } } },
      ];
    }

    if (tipo) where.tipo = tipo;

    if (cliente_id) {
      // ✅ NOVO: valida que o cliente pertence à empresa (evita 200 vazio enganoso)
      const clienteOk = await prisma.cliente.findFirst({
        where: { id: cliente_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!clienteOk) {
        return NextResponse.json(
          { error: 'Cliente não encontrado nesta empresa' },
          { status: 404 }
        );
      }
      where.cliente_id = cliente_id;
    }

    const [rawItems, total] = await Promise.all([
      prisma.veiculo.findMany({
        where,
        include: {
          Cliente: { select: { nome: true, id: true } },
        },
        orderBy: { modelo: 'asc' },
        skip,
        take: limit,
      }),
      prisma.veiculo.count({ where }),
    ]);

    const items = rawItems.map((item) => {
      const { Cliente, ...rest } = item;
      return { ...rest, cliente: Cliente };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'VEICULO', 'Erro ao listar veículos');
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

    // Valida cliente
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

    // Verifica duplicidade de placa (UX: evita tentar INSERT que vai falhar)
    const existing = await prisma.veiculo.findFirst({
      where: { placa: body.placa, empresa_id: user.empresa_id },
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
          // ✅ Padronizado com o resto do sistema (email primeiro)
          created_by: user.email || user.name || 'Sistema',
          updated_at: new Date(),
        },
        include: {
          Cliente: { select: { nome: true, id: true } },
        },
      });
    } catch (err: any) {
      // Race condition: se outro processo criou com a mesma placa entre o
      // findFirst acima e o create, o unique constraint dispara P2002.
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Placa já cadastrada nesta empresa' },
          { status: 409 }
        );
      }
      throw err;
    }

    // ✅ Mapping garantido: include garante `Cliente`, não precisa de fallback
    const { Cliente, ...veiculoRest } = veiculo;
    const mappedVeiculo = { ...veiculoRest, cliente: Cliente };

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
        ano: veiculo.ano,
        quilometragem: veiculo.quilometragem,
        horimetro_atual: veiculo.horimetro_atual,
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
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'VEICULO', 'Erro ao criar veículo');
  }
}
