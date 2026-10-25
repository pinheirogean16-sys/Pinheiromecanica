// ============================================================
// Helpers compartilhados por todas as impressões
// (OS, Orçamento, Preventiva, DANFE, Relatório de Viagem…)
// ============================================================

export function formatCurrency(val: number | null | undefined): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '—';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCpfCnpj(doc: string | null | undefined): string {
  if (!doc) return '—';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) return formatCPF(doc);
  if (digits.length === 14) return formatCNPJ(doc);
  return doc;
}

/**
 * Converte valor numérico para reais por extenso.
 * Corrigido para o caso de valor < 1 (ex.: 0.50 → "cinquenta centavos").
 */
export function numeroPorExtenso(valor: number): string {
  const unidades = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const dezenas = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const especiais = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

  function converteGrupo(n: number): string {
    if (n === 0) return '';
    let r = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) r += c === 1 && resto === 0 ? 'cem' : centenas[c];
    if (resto > 0) {
      if (r) r += ' e ';
      if (resto < 10) r += unidades[resto];
      else if (resto < 20) r += especiais[resto - 10];
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        r += dezenas[d];
        if (u > 0) r += ' e ' + unidades[u];
      }
    }
    return r;
  }

  if (valor === 0) return 'zero reais';

  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);

  let texto = '';
  if (reais >= 1_000_000) {
    const mi = Math.floor(reais / 1_000_000);
    const resto = reais % 1_000_000;
    texto = converteGrupo(mi) + (mi === 1 ? ' milhão' : ' milhões');
    if (resto > 0) texto += ' e ' + converteGrupo(resto);
  } else if (reais >= 1000) {
    const mil = Math.floor(reais / 1000);
    const resto = reais % 1000;
    texto = converteGrupo(mil) + ' mil';
    if (resto > 0) texto += ' e ' + converteGrupo(resto);
  } else if (reais > 0) {
    texto = converteGrupo(reais);
  }

  if (reais > 0) texto += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    if (texto) texto += ' e ';
    texto += converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return texto;
}

/**
 * Aguarda fontes e imagens carregarem antes de abrir o diálogo de impressão.
 * Evita imprimir com logo em branco.
 */
export async function waitForPrint(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {}
  const images = Array.from(document.images);
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
  await new Promise((r) => setTimeout(r, 50));
}
