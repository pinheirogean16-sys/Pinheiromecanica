import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const veiculos = await prisma.veiculo.findMany({
      where: { cliente_id: id, empresa_id: user.empresa_id },
      orderBy: { modelo: 'asc' }
    });

    return NextResponse.json(veiculos);
  } catch (error) {
    console.error('List client veiculos error:', error);
    return NextResponse.json({ error: 'Erro ao buscar veículos do cliente' }, { status: 500 });
  }
}
