// ============================================================
// MÁSCARAS E VALIDAÇÕES — VEHLOX
// Baseado nas funções originais do projeto + validações extras
// ============================================================

// ============================================================
// MÁSCARAS (suas funções originais — mantidas)
// ============================================================

export function maskCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

export function maskCEP(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

export function maskPlaca(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^([A-Z]{3})(\d)/, '$1-$2')
    .slice(0, 8);
}

// ============================================================
// AUXILIARES
// ============================================================

/** Remove tudo que não é número */
export function apenasNumeros(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

/** Aplica máscara de CPF ou CNPJ automaticamente pelo tamanho */
export function maskCpfCnpj(value: string): string {
  const nums = apenasNumeros(value);
  return nums.length > 11 ? maskCNPJ(value) : maskCPF(value);
}

// ============================================================
// VALIDAÇÕES (algoritmo oficial)
// ============================================================

/** Valida CPF (algoritmo oficial) */
export function validarCPF(cpf: string): boolean {
  const nums = apenasNumeros(cpf);
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false; // todos dígitos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(nums[10]);
}

/** Valida CNPJ (algoritmo oficial) */
export function validarCNPJ(cnpj: string): boolean {
  const nums = apenasNumeros(cnpj);
  if (nums.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(nums)) return false;

  let tamanho = nums.length - 2;
  let numeros = nums.substring(0, tamanho);
  const digitos = nums.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = nums.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

/** Valida CPF ou CNPJ automaticamente pelo tamanho */
export function validarCpfCnpj(valor: string): boolean {
  const nums = apenasNumeros(valor);
  if (nums.length === 11) return validarCPF(nums);
  if (nums.length === 14) return validarCNPJ(nums);
  return false;
}

/** Valida telefone brasileiro (10 ou 11 dígitos) */
export function validarTelefone(tel: string): boolean {
  const nums = apenasNumeros(tel);
  return nums.length === 10 || nums.length === 11;
}

/** Valida CEP (8 dígitos) */
export function validarCEP(cep: string): boolean {
  const nums = apenasNumeros(cep);
  return nums.length === 8;
}
