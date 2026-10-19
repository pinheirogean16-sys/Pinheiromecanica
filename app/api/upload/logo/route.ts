import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ============================================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================================
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// ============================================================
// MAGIC BYTES — aceita apenas imagens seguras (SEM SVG)
// ============================================================
type TipoImagem = { ext: 'jpg' | 'png' | 'webp'; mime: string };

function detectImageType(buffer: Buffer): TipoImagem | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
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

    // Exige permissão para editar configurações da empresa
    if (!checkPermission(user, 'configuracoes', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Valida tamanho ANTES de carregar na memória
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `A imagem deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    // Valida por magic bytes — bloqueia SVG (XSS) e qualquer não-imagem
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        {
          error:
            'Formato não suportado. Envie JPG, PNG ou WEBP (validado pelo conteúdo do arquivo). SVG não é permitido por segurança.',
        },
        { status: 400 }
      );
    }

    // Pasta isolada por empresa
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'logos',
      user.empresa_id
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err: any) {
      log(
        'ERROR',
        'UPLOAD_LOGO',
        'Falha ao criar diretório de logos',
        { error: err?.message },
        user?.name
      );
      return NextResponse.json(
        { error: 'Erro ao preparar armazenamento. Contate o suporte.' },
        { status: 500 }
      );
    }

    // Nome gerado com UUID — impossível prever ou colidir
    const safeFileName = `logo-${globalThis.crypto.randomUUID()}.${detected.ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    // Path traversal bloqueado
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      log(
        'ERROR',
        'UPLOAD_LOGO',
        'Path traversal bloqueado',
        { userId: user.id },
        user?.name
      );
      return NextResponse.json({ error: 'Caminho de arquivo inválido' }, { status: 400 });
    }

    await writeFile(resolvedPath, buffer);

    const url = `/uploads/logos/${user.empresa_id}/${safeFileName}`;

    // Auditoria da alteração de logo
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
      'Logo da empresa atualizada',
      { empresa_id: user.empresa_id, tipo: detected.mime, size: file.size },
      user?.name
    );

    return NextResponse.json({
      success: true,
      url,
      tipo: detected.mime,
    });
  } catch (error: any) {
    return apiError(error, 'UPLOAD_LOGO', 'Erro ao processar upload da logo');
  }
}
