import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { z } from 'zod';

// M08: validação estrita de entrada
const clientErrorSchema = z.object({
  message: z.string().max(2000),
  url: z.string().max(2000).optional(),
  filename: z.string().max(500).optional(),
  lineno: z.union([z.number(), z.string()]).optional(),
  colno: z.union([z.number(), z.string()]).optional(),
  stack: z.string().max(10000).optional(),
  userAgent: z.string().max(500).optional(),
});

// M08: rate limit simples em memória por IP
// (limita flood trivial; para multi-instância, migrar para Redis/tabela)
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minuto
const MAX_HITS = 20; // 20 erros por minuto por IP

// ✅ NOVO: limpeza periódica para evitar memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const lastCleanup = { value: Date.now() };

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup.value < CLEANUP_INTERVAL_MS) return;
  lastCleanup.value = now;

  for (const [ip, entry] of ipHits.entries()) {
    if (now > entry.resetAt) {
      ipHits.delete(ip);
    }
  }
}

function checkRateLimit(ip: string): boolean {
  cleanupExpiredEntries(); // 👈 limpa antes de checar

  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_HITS;
}

// M08: sanitização contra log injection
// Remove quebras de linha/tabs que poderiam forjar entradas falsas no log
function sanitizeLogValue(v: string | undefined, maxLen = 500): string {
  if (!v) return '';
  return v.replace(/[\r\n\t]/g, ' ').slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  try {
    // M08: rate limit por IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido' },
        { status: 429 }
      );
    }

    // M08: limite de tamanho do corpo (evita payload gigante)
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 50_000) {
      return NextResponse.json(
        { success: false, error: 'Payload muito grande' },
        { status: 413 }
      );
    }

    const raw = await req.json();
    const parsed = clientErrorSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Payload inválido' },
        { status: 400 }
      );
    }

    const body = parsed.data;

    // M03/M08: sanitiza antes de logar. Remove console.error (vai só para o logger).
    const safeMessage = sanitizeLogValue(body.message, 1000);
    const safeUrl = sanitizeLogValue(body.url, 500);
    const safeStack = sanitizeLogValue(body.stack, 3000);
    const safeUserAgent = sanitizeLogValue(body.userAgent, 300);
    const safeLocation = `${sanitizeLogValue(body.filename, 200)}:${body.lineno ?? '?'}:${body.colno ?? '?'}`;

    log(
      'ERROR',
      'CLIENT',
      `Erro no cliente: ${safeMessage}`,
      {
        url: safeUrl,
        stack: safeStack,
        location: safeLocation,
        userAgent: safeUserAgent,
        ip,
      },
      'client-monitor'
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    log(
      'WARN',
      'CLIENT',
      'Falha ao processar log de erro do cliente',
      { error: err?.message },
      'sistema'
    );
    return NextResponse.json({ success: false });
  }
}
