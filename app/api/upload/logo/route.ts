import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';

// ✅ CONFIGURAÇÃO EXPLÍCITA DO CLOUDINARY
// Se a CLOUDINARY_URL estiver no ambiente, o SDK a usa. 
// Caso contrário, tenta as variáveis separadas.
if (process.env.CLOUDINARY_URL) {
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// ============================================================
// MAGIC BYTES — aceita apenas imagens seguras (SEM SVG)
// ============================================================
type TipoImagem = { ext: 'jpg' | 'png' | 'webp'; mime: string };

function detectImageType(buffer: Buffer): TipoImagem | null {
  if (buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

// ============================================================
// POST — Upload de logo da empresa
// ============================================================
export async function POST(req: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'configuracoes', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `A imagem deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie JPG, PNG ou WEBP.' },
        { status: 400 }
      );
    }

    // ✅ UPLOAD PARA O CLOUDINARY (Base64 / Data URI)
    const base64Image = buffer.toString('base64');
    const dataUri = `data:${detected.mime};base64,${base64Image}`;

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `vehlox/logos/${user.empresa_id}`,
      resource_type: 'image',
      public_id: `logo-${Date.now()}-${globalThis.crypto.randomUUID()}`,
    });

    const url = uploadResult.secure_url;

    await createAuditLog({
      modulo: 'CONFIG',
      acao: 'ALTERAR_LOGO',
      entidade: 'ConfiguracaoEmpresa',
      entidade_id: user.empresa_id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: {
        logo_url: url,
        tipo: detected.mime,
        tamanho_bytes: file.size,
      },
    });

    log(
      'INFO',
      'UPLOAD_LOGO',
      'Logo da empresa atualizada no Cloudinary',
      { empresa_id: user.empresa_id, tipo: detected.mime, size: file.size },
      user?.name
    );

    return NextResponse.json({
      success: true,
      url,
      tipo: detected.mime,
    });
  } catch (error: any) {
    // ✅ ALTERADO: Agora o toast vai mostrar o erro REAL do Cloudinary
    log('ERROR', 'UPLOAD_LOGO', 'Erro ao processar upload da logo', { error: error?.message }, 'SISTEMA');
    return NextResponse.json({ 
      error: `Falha no Cloudinary: ${error?.message || 'Erro desconhecido'}` 
    }, { status: 500 });
  }
}
