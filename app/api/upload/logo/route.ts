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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo deve ser uma imagem.' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 2MB.' }, { status: 400 });
    }

    // 👇 Define o caminho do upload
    // Em produção (Hostinger), salva em public_html/uploads
    // Em desenvolvimento, salva em public/uploads
    const isProd = process.env.NODE_ENV === 'production';
    
    // O caminho da Hostinger para o public_html.
    // Se o seu usuário for outro, ajuste aqui (ex: u123456789).
    const hostingerUser = 'u710924521'; 
    
    const uploadDir = isProd 
      ? join('/home', hostingerUser, 'public_html', 'uploads')
      : join(process.cwd(), 'public', 'uploads');

    // Cria a pasta se não existir
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Gera um nome único para o arquivo
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logo-${timestamp}.${ext}`;
    const filePath = join(uploadDir, fileName);

    // Salva o arquivo fisicamente
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Retorna a URL pública
    return NextResponse.json({ url: `/uploads/${fileName}` });

  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
  }
}
