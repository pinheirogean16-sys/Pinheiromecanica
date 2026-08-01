import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('foto') as File;
    const execucaoId = formData.get('execucao_id') as string;
    const itemId = formData.get('item_id') as string || null;
    const legenda = formData.get('legenda') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato não suportado. Use JPG, PNG ou WEBP.' }, { status: 400 });
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    // Criar pasta de uploads se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'checklist');
    await mkdir(uploadDir, { recursive: true });

    // Gerar nome único
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${execucaoId || 'unlinked'}_${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL relativa para acesso
    const url = `/uploads/checklist/${fileName}`;

    let foto = null;
    // Salvar no banco apenas se for uma execução real
    if (execucaoId && execucaoId !== 'temp') {
      foto = await prisma.checklistFoto.create({
        data: {
          id: crypto.randomUUID(),
          execucao_id: execucaoId,
          item_id: itemId,
          url,
          legenda
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      url, // Sempre retorna a URL
      foto // Retorna o objeto do banco se criado
    });

  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
  }
}
