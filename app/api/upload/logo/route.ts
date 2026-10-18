import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

    // 1. Validação de tipo e tamanho
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo deve ser uma imagem.' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 2MB.' }, { status: 400 });
    }

    // 2. Prepara o diretório de destino
    // Em produção (Hostinger standalone), os arquivos estáticos ficam em .next/standalone/public
    // Em dev, ficam em public/
    const isProd = process.env.NODE_ENV === 'production';
    const uploadDir = isProd 
      ? join(process.cwd(), '.next', 'standalone', 'public', 'uploads')
      : join(process.cwd(), 'public', 'uploads');

    // Garante que a pasta existe
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 3. Gera um nome único para o arquivo
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logo-${timestamp}.${ext}`;
    const filePath = join(uploadDir, fileName);

    // 4. Salva o arquivo no disco
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 5. Retorna a URL pública (relativa)
    return NextResponse.json({ url: `/uploads/${fileName}` });

  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
  }
}
