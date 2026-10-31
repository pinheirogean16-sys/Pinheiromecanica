const MAX_URL_LENGTH = 2048;
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

function hasControlOrBackslash(v: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001F\u007F\\]/.test(v);
}

function isHttpsUrl(v: string): boolean {
  if (v.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
}

function isSafeRelativePath(v: string, prefix?: string): boolean {
  if (v.length > MAX_URL_LENGTH) return false;
  if (!v.startsWith('/') || v.startsWith('//')) return false;
  if (v.includes('..')) return false;
  if (prefix && !v.startsWith(prefix)) return false;
  return true;
}

export function isSafePhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || hasControlOrBackslash(v)) return false;
  if (DATA_IMAGE_RE.test(v)) return true;
  return isHttpsUrl(v) || isSafeRelativePath(v, '/uploads/');
}

export function isSafeLogoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || hasControlOrBackslash(v)) return false;
  return isHttpsUrl(v) || isSafeRelativePath(v);
}

export function openPhotoSafely(value: unknown): boolean {
  if (typeof window === 'undefined' || !isSafePhotoUrl(value)) return false;
  window.open(value.trim(), '_blank', 'noopener,noreferrer');
  return true;
}
