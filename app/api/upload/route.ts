import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

// Configura o Cloudinary com as credenciais do .env
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// (Função detectFileType permanece a mesma)
type TipoDetectado = {
  ext: 'pdf' | 'jpg' | 'png' | 'webp';
  mime: string;
};

function detectFileType(buffer: Buffer): TipoDetectado | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (
      !checkPermission(user, 'documentos', 'criar') &&
      !checkPermission(user, 'os', 'editar') &&
      !checkPermission(user, 'os', 'criar')
    ) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectFileType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie PDF, JPG, PNG ou WEBP.' },
        { status: 400 }
      );
    }

    // ✅ UPLOAD PARA O CLOUDINARY (em vez de gravar no disco)
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `vehlox/${user.empresa_id}`, // Pasta isolada por empresa
          resource_type: 'auto', // Detecta automaticamente imagens/PDFs
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // ✅ Retorna a URL segura e permanente do Cloudinary
    const url = uploadResult.secure_url;

    log(
      'INFO',
      'UPLOAD',
      'Documento enviado para o Cloudinary',
      {
        public_id: uploadResult.public_id,
        tipo: detected.mime,
        size: file.size,
        empresa_id: user.empresa_id,
      },
      user?.name
    );

    return NextResponse.json({
      success: true,
      url, // Ex: "https://res.cloudinary.com/seu-cloud/image/upload/v.../foto.jpg"
      tipo: detected.mime,
    });
  } catch (error: any) {
    return apiError(error, 'UPLOAD', 'Erro ao processar upload');
  }
}
