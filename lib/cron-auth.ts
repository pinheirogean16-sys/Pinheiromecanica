import { timingSafeEqual, createHash } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function validarCronSecret(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = headers.get('authorization');
  if (auth?.startsWith('Bearer ') && safeEqual(auth.slice(7), secret)) return true;

  const cron = headers.get('x-cron-secret');
  if (cron && safeEqual(cron, secret)) return true;

  return false;
}
