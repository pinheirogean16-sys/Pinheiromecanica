import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;

  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth-token');
  return response;
}
