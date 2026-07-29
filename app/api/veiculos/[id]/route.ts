import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { Veiculo_tipo } from '@prisma/client';

const updateVeiculoSchema = z.object({
  placa: z.string().min(7).max(8).trim().transform(v => v.toUpperCase()).optional(),
  modelo: z.string().min(2).trim().optional(),
  marca: z.string().min(2).trim().optional(),
  ano: z.coerce.number().int().min(1900).max(2030).optional(),
  tipo: z.nativeEnum(Veiculo_tipo).optional(),
  quilometragem: z.coerce.number().optional().nullable(),
  horimetro_atual: z.coerce.number().optional().nullable(),
  cliente_id: z.string().min(1).optional()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawVeiculo = await prisma.veiculo.findUnique({
      where: { id },
      include: {
        Cliente: true,
        OrdemServico: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    if (!rawVeiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const { Cliente, OrdemServico, ...rest } = rawVeiculo;
    const veiculo = {
      ...rest,
      cliente: Cliente,
      ordens: OrdemServico
    };

    return NextResponse.json(veiculo);
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao buscar veículo', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar veículo' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculo', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateVeiculoSchema.parse(await request.json());

    const antes = await prisma.veiculo.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (body.placa) {
      const existing = await prisma.veiculo.findFirst({
        where: {
          placa: body.placa,
          id: { not: id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'Placa já cadastrada em outro veículo' }, { status: 400 });
      }
    }

    const veiculo = await prisma.veiculo.update({
      where: { id },
      data: {
        ...body,
        updated_by: user?.name || user?.email || 'Sistema'
      }
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EDITAR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: veiculo
    });

    log('INFO', 'VEICULO', 'Veículo atualizado', { id }, user?.name);

    return NextResponse.json(veiculo);
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao atualizar veículo', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculo', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.veiculo.findUnique({ where: { id } });
    
    await prisma.veiculo.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EXCLUIR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'VEICULO', 'Veículo excluído', { id }, user?.name);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao excluir veículo', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir veículo. Verifique se não há OS vinculadas.' }, { status: 500 });
  }
}
