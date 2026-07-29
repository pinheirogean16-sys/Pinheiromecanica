import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Em um ambiente real, salvaríamos no S3, Cloudinary, Firebase Storage, etc.
    // Para simplificar neste applet, vamos converter para Base64 e retornar,
    // ou "simular" um armazenamento retornando a base64 se for pequena.
    // Idealmente salvaríamos em /public/uploads se o server suportasse escrita persistente.
    
    // Vamos converter para base64 para que funcione no preview sem storage externo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    return NextResponse.json({ url: base64 });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
  }
}
