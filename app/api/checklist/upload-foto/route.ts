import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { v2 as cloudinary } from 'cloudinary';

// ✅ VALIDAÇÃO: Garante que as variáveis do Cloudinary estão configuradas
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('CREDENCIAIS DO CLOUDINARY AUSENTES NO .ENV');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function detectImageType(buffer: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return { ext: 'webp', mime: 'image/webp' };
  return null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // ✅ TRAVA DE SEGURANÇA: Se não tem as chaves, avisa na hora
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        { error: 'Serviço de armazenamento (Cloudinary) não configurado no servidor.' },
        { status: 500 }
      );
    }

    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'checklist', 'executar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('foto') as File | null;
    const execucaoId = (formData.get('execucao_id') as string) || null;
    const itemId = (formData.get('item_id') as string) || null;
    const legenda = (formData.get('legenda') as string) || null;

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectImageType(buffer);
    if (!detected) return NextResponse.json({ error: 'Formato não suportado. Use JPG, PNG ou WEBP.' }, { status: 400 });

    if (execucaoId && execucaoId !== 'temp') {
      const execucao = await prisma.checklistExecucao.findFirst({
        where: { id: execucaoId, empresa_id: user.empresa_id },
        select: { id: true, checklist_id: true },
      });

      if (!execucao) return NextResponse.json({ error: 'Execução não encontrada nesta empresa' }, { status: 400 });

      if (itemId) {
        const itemPertence = await prisma.checklistItem.findFirst({
          where: { id: itemId, checklist_id: execucao.checklist_id },
          select: { id: true },
        });
        if (!itemPertence) return NextResponse.json({ error: 'Item não pertence ao checklist desta execução' }, { status: 400 });
      }
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vehlox/checklists', resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const url = uploadResult.secure_url;

    let foto = null;
    if (execucaoId && execucaoId !== 'temp') {
      foto = await prisma.checklistFoto.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          execucao_id: execucaoId,
          item_id: itemId,
          url,
          legenda,
        },
      });
    }

    return NextResponse.json({ success: true, url, foto });
  } catch (error: any) {
    log('ERROR', 'CHECKLIST', 'Erro no upload Cloudinary', { error: error.message }, 'SISTEMA');
    return apiError(error, 'CHECKLIST', 'Erro ao processar upload da foto.');
  }
}
