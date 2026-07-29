/**
 * Helper leve para normalizar termos de busca
 * Removendo acentos, espaços extras, convertendo para minúsculas
 */

export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD') // divide caracteres com acentos em caractere + acento
    .replace(/[\u0300-\u036f]/g, '') // remove os acentos
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // substitui múltiplos espaços por um único espaço
}

/**
 * Divide o termo de busca em uma lista de termos menores (tokens/palavras)
 * para realizar buscas parciais e resilientes (estilo AND em múltiplos campos)
 */
export function tokenizeSearch(text: string | null | undefined): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}
