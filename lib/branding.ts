// ============================================================
// BRANDING FIXO — VEHLOX
// Não editável pelo usuário
// ============================================================

export const BRANDING = {
  // Nome e identidade
  name: 'VEHLOX',
  fullName: 'VEHLOX Sistema de Gestão',
  slogan: 'Sistema de Gestão para Oficinas',
  shortName: 'VEHLOX',

  // Descrição (usada no metadata)
  description:
    'VEHLOX — Sistema de gestão para oficinas mecânicas de linha pesada',

  // Logo (arquivo em /public)
  logo: {
    url: '/vehlox-logo.png',
    alt: 'VEHLOX',
    width: 180,
    height: 180,
  },

  // Favicon (opcional — se quiser trocar, salve /public/favicon.ico)
    favicon: '/vehlox-favicon-512.png',

  // Paleta VEHLOX
  colors: {
    primary: '#f97316',        // Laranja VEHLOX
    primaryDark: '#ea580c',    // Laranja escuro (hover)
    primaryLight: '#fb923c',   // Laranja claro
    dark: '#09090b',           // Preto (zinc-950)
    darkAlt: '#18181b',        // Cinza escuro (zinc-900)
    light: '#fafafa',          // Branco/cinza claro (zinc-50)
    lightAlt: '#f4f4f5',       // Cinza (zinc-100)
  },

  // Empresa (rodapé / notas)
  company: {
    legalName: 'VEHLOX',
    cnpj: '',                  // Deixe vazio se não quiser exibir
  },
} as const;

export type Branding = typeof BRANDING;
