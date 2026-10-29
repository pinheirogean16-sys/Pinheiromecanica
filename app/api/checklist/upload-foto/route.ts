import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { v2 as cloudinary } from 'cloudinary';

// ============================================================
// CONFIGURAÇÃO DO CLOUDINARY
// Aceita duas formas:
//   1) CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME (padrão recomendado)
//   2) CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
// ============================================================
const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
const hasSeparateVars =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryUrl) {
  // O SDK do Cloudinary lê a CLOUDINARY_URL automaticamente.
  // Apenas garantimos secure: true.
  cloudinary.config({ secure: true });
} else if (hasSeparateVars) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.error(
    '[CLOUDINARY] Nenhuma configuração encontrada. Defina CLOUDINARY_URL (formato cloudinary://KEY:SECRET@CLOUD) ou as 3 variáveis separadas.'
  );
}

// C04: validação por magic bytes (não confia no header enviado pelo cliente)
function detectImageType(buffer: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    // ✅ TRAVA DE SEGURANÇA: aceita CLOUDINARY_URL OU as 3 vars
    if (!hasCloudinaryUrl && !hasSeparateVars) {
      return NextResponse.json(
        {
          error:
            'Servidor sem configuração do Cloudinary. Configure CLOUDINARY_URL (formato cloudinary://API_KEY:API_SECRET@CLOUD_NAME) ou as 3 variáveis separadas (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).',
        },
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

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'Formato não suportado. Use JPG, PNG ou WEBP (validado pelo conteúdo do arquivo).' },
        { status: 400 }
      );
    }

    // M09: valida que a execução pertence à empresa do usuário
    if (execucaoId && execucaoId !== 'temp') {
      const execucao = await prisma.checklistExecucao.findFirst({
        where: { id: execucaoId, empresa_id: user.empresa_id },
        select: { id: true, checklist_id: true },
      });

      if (!execucao) {
        return NextResponse.json(
          { error: 'Execução de checklist não encontrada nesta empresa' },
          { status: 400 }
        );
      }

      if (itemId) {
        const itemPertence = await prisma.checklistItem.findFirst({
          where: { id: itemId, checklist_id: execucao.checklist_id },
          select: { id: true },
        });
        if (!itemPertence) {
          return NextResponse.json(
            { error: 'Item não pertence ao checklist desta execução' },
            { status: 400 }
          );
        }
      }
    }

    // ✅ UPLOAD PARA O CLOUDINARY
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'vehlox/checklists',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
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

    log(
      'INFO',
      'CHECKLIST',
      'Foto de checklist enviada para o Cloudinary',
      { execucaoId, size: file.size, tipo: detected.mime, url },
      user.name
    );

    return NextResponse.json({
      success: true,
      url,
      foto,
    });
  } catch (error: any) {
    log('ERROR', 'CHECKLIST', 'Erro no upload Cloudinary', { error: error.message }, 'SISTEMA');
    return apiError(error, 'CHECKLIST', 'Erro ao processar upload da foto.');
  }
}
