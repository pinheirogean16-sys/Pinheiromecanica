import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

// ============================================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================================
// VALIDAÇÃO POR MAGIC BYTES (não confia no content-type do cliente)
// ============================================================
type TipoDetectado = {
  ext: 'pdf' | 'jpg' | 'png' | 'webp';
  mime: string;
};

function detectFileType(buffer: Buffer): TipoDetectado | null {
  if (buffer.length < 12) return null;

  // PDF: 25 50 44 46 ("%PDF")
  if (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 // F
  ) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

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
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

// ============================================================
// POST — Upload de documento
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão específica para upload de documentos
    // (a maioria dos papéis operacionais tem, mas bloqueia quem não deveria)
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

    // ✅ NOVO: valida tamanho ANTES de carregar na memória
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    // ✅ NOVO: valida pelo conteúdo real (magic bytes)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectFileType(buffer);
    if (!detected) {
      return NextResponse.json(
        {
          error:
            'Formato não suportado. Envie PDF, JPG, PNG ou WEBP (validado pelo conteúdo do arquivo).',
        },
        { status: 400 }
      );
    }

    // ✅ NOVO: pasta isolada por empresa (evita vazamento entre tenants)
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'documentos',
      user.empresa_id
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err: any) {
      log(
        'ERROR',
        'UPLOAD',
        'Falha ao criar diretório de upload',
        { error: err?.message },
        user?.name
      );
      return NextResponse.json(
        { error: 'Erro ao preparar armazenamento. Contate o suporte.' },
        { status: 500 }
      );
    }

    // ✅ NOVO: nome gerado internamente (UUID) — nunca usa input do cliente
    const safeFileName = `${globalThis.crypto.randomUUID()}.${detected.ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    // ✅ NOVO: garantia extra contra path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      log(
        'ERROR',
        'UPLOAD',
        'Path traversal bloqueado no upload de documento',
        { userId: user.id },
        user?.name
      );
      return NextResponse.json({ error: 'Caminho de arquivo inválido' }, { status: 400 });
    }

    await writeFile(resolvedPath, buffer);

    const url = `/uploads/documentos/${user.empresa_id}/${safeFileName}`;

    // ✅ NOVO: log com apenas metadados seguros (sem nome original do cliente)
    log(
      'INFO',
      'UPLOAD',
      'Documento enviado',
      {
        fileName: safeFileName,
        tipo: detected.mime,
        size: file.size,
        empresa_id: user.empresa_id,
      },
      user?.name
    );

    return NextResponse.json({
      success: true,
      url,
      tipo: detected.mime,
    });
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'UPLOAD', 'Erro ao processar upload');
  }
}
