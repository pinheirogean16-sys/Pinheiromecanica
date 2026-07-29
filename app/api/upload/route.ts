import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // Qualquer usuário autenticado pode fazer upload (limitado pela interface posterior)
    // Mas vamos logar quem está fazendo
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documentos');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const url = `/uploads/documentos/${fileName}`;

    log('INFO', 'UPLOAD', 'Arquivo enviado', { fileName, size: file.size, url }, user?.name);

    return NextResponse.json({ success: true, url });

  } catch (error) {
    log('ERROR', 'UPLOAD', 'Erro ao fazer upload', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
  }
}
