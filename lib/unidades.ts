/**
 * Sistema Global de Unidades de Medida - Pinheiro Mecânica Diesel
 * Oferece suporte avançado para múltiplas unidades, grupos de compatibilidade,
 * fatores de conversão e formatação técnica industrial.
 */

export type GrupoUnidade = 'comprimento' | 'quantidade' | 'peso' | 'volume' | 'area' | 'tempo';

export interface UnidadeMedida {
  sigla: string;
  nome: string;
  grupo: GrupoUnidade;
  fatorParaPadrao: number; // Multiplicador para converter ao padrão do grupo
}

export const LISTA_UNIDADES: UnidadeMedida[] = [
  // Comprimento (Padrão: metro 'm')
  { sigla: 'm', nome: 'Metro', grupo: 'comprimento', fatorParaPadrao: 1 },
  { sigla: 'cm', nome: 'Centímetro', grupo: 'comprimento', fatorParaPadrao: 0.01 },
  { sigla: 'mm', nome: 'Milímetro', grupo: 'comprimento', fatorParaPadrao: 0.001 },

  // Quantidade (Padrão: unidade 'un')
  { sigla: 'un', nome: 'Unidade', grupo: 'quantidade', fatorParaPadrao: 1 },
  { sigla: 'pc', nome: 'Peça', grupo: 'quantidade', fatorParaPadrao: 1 },
  { sigla: 'kit', nome: 'Kit', grupo: 'quantidade', fatorParaPadrao: 1 },
  { sigla: 'cx', nome: 'Caixa', grupo: 'quantidade', fatorParaPadrao: 1 },

  // Peso (Padrão: quilograma 'kg')
  { sigla: 'kg', nome: 'Quilograma', grupo: 'peso', fatorParaPadrao: 1 },
  { sigla: 'g', nome: 'Grama', grupo: 'peso', fatorParaPadrao: 0.001 },
  { sigla: 't', nome: 'Tonelada', grupo: 'peso', fatorParaPadrao: 1000 },

  // Volume (Padrão: litro 'L')
  { sigla: 'L', nome: 'Litro', grupo: 'volume', fatorParaPadrao: 1 },
  { sigla: 'ml', nome: 'Mililitro', grupo: 'volume', fatorParaPadrao: 0.001 },
  { sigla: 'galao', nome: 'Galão', grupo: 'volume', fatorParaPadrao: 3.6 }, // Galão de óleo padrão ~3.6L

  // Área (Padrão: metro quadrado 'm²')
  { sigla: 'm2', nome: 'Metro Quadrado', grupo: 'area', fatorParaPadrao: 1 },

  // Tempo (Padrão: hora 'h')
  { sigla: 'h', nome: 'Hora', grupo: 'tempo', fatorParaPadrao: 1 },
  { sigla: 'diaria', nome: 'Diária', grupo: 'tempo', fatorParaPadrao: 8 }, // 1 diária comercial = 8h
];

/**
 * Retorna as unidades compatíveis (mesmo grupo) para conversão
 */
export function obterUnidadesCompativeis(sigla: string): UnidadeMedida[] {
  const uni = LISTA_UNIDADES.find(u => u.sigla.toLowerCase() === sigla.toLowerCase());
  if (!uni) return [];
  return LISTA_UNIDADES.filter(u => u.grupo === uni.grupo);
}

/**
 * Converte um valor de uma unidade de origem para uma unidade de destino.
 * Exemplo: converter(50, 'cm', 'm') => 0.5
 */
export function converterUnidade(valor: number, origem: string, destino: string): number {
  if (origem.toLowerCase() === destino.toLowerCase()) return valor;

  const uniOrigem = LISTA_UNIDADES.find(u => u.sigla.toLowerCase() === origem.toLowerCase());
  const uniDestino = LISTA_UNIDADES.find(u => u.sigla.toLowerCase() === destino.toLowerCase());

  if (!uniOrigem || !uniDestino) {
    throw new Error(`Unidade inválida ou não encontrada: ${origem} ou ${destino}`);
  }

  if (uniOrigem.grupo !== uniDestino.grupo) {
    throw new Error(`Incompatibilidade de unidades: Não é possível converter ${uniOrigem.nome} (${uniOrigem.grupo}) para ${uniDestino.nome} (${uniDestino.grupo})`);
  }

  // Converte para o padrão do grupo e depois para o destino
  const valorPadrao = valor * uniOrigem.fatorParaPadrao;
  return valorPadrao / uniDestino.fatorParaPadrao;
}

/**
 * Formata de forma técnica legível e profissional valores fracionados
 */
export function formatarMedida(valor: number, sigla: string): string {
  if (isNaN(valor)) return '0 ' + sigla;

  // Se for inteiro, não mostra casas decimais
  if (Number.isInteger(valor)) {
    return `${valor} ${sigla}`;
  }

  // Se for flutuante, formata inteligentemente até 3 casas decimais eliminando zeros à direita
  const formatado = parseFloat(valor.toFixed(3));
  return `${formatado} ${sigla}`;
}

/**
 * Sugestões de unidades favoritas/principais de uso rápido em oficinas de motores pesados
 */
export const UNIDADES_FAVORITAS = ['un', 'L', 'kg', 'm', 'pc', 'h'];
