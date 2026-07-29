import { NextResponse } from 'next/server';
import { Peca_categoria } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const categorias = Object.values(Peca_categoria);
  return NextResponse.json(categorias);
}
