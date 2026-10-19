import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// C04: validação por magic bytes (não confia no header enviado pelo cliente)
function detectImageType(buffer: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para executar checklist
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

    // C04: valida tamanho declarado
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    // Lê bytes e valida pelo conteúdo real (magic bytes)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'Formato não suportado. Use JPG, PNG ou WEBP (validado pelo conteúdo do arquivo).' },
        { status: 400 }
      );
    }

    // M09: valida que a execução pertence à empresa do usuário (se for execução real)
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

      // ✅ NOVO: valida se o item_id pertence ao checklist da execução
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

    // C04: nome do arquivo é gerado internamente (UUID) — nunca usa input do cliente
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'checklist');
    await mkdir(uploadDir, { recursive: true });

    const safeFileName = `${globalThis.crypto.randomUUID()}.${detected.ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    // Garantia extra: o caminho resolvido deve continuar dentro de uploadDir
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      log(
        'ERROR',
        'CHECKLIST',
        'Path traversal bloqueado no upload',
        { execucaoId, userId: user.id },
        user.name
      );
      return NextResponse.json({ error: 'Caminho de arquivo inválido' }, { status: 400 });
    }

    await writeFile(resolvedPath, buffer);

    const url = `/uploads/checklist/${safeFileName}`;

    let foto = null;
    // Salva no banco apenas se for uma execução real (não rascunho "temp")
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
      'Foto de checklist enviada',
      { execucaoId, size: file.size, tipo: detected.mime },
      user.name
    );

    return NextResponse.json({
      success: true,
      url,
      foto,
    });
  } catch (error: any) {
    return apiError(error, 'CHECKLIST', 'Erro ao processar upload');
  }
}
