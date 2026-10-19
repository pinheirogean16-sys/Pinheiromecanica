import { NextResponse } from 'next/server';
import { Peca_categoria } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const categorias = Object.values(Peca_categoria);

    const response = NextResponse.json(categorias);
    // Enum estático — pode ser cacheado por 1h no navegador
    response.headers.set('Cache-Control', 'private, max-age=3600');
    return response;
  } catch (error: any) {
    return apiError(error, 'PECA', 'Erro ao listar categorias');
  }
}
