export type Role = 'ADMIN' | 'LIDER' | 'MECANICO' | 'ESTOQUISTA' | 'FINANCEIRO';

export type Modulo = 
  | 'dashboard'
  | 'os'
  | 'orcamentos'
  | 'clientes'
  | 'fornecedores'
  | 'veiculos'
  | 'pecas'
  | 'financeiro'
  | 'checklist'
  | 'logs'
  | 'usuarios'
  | 'nfe'
  | 'configuracoes'
  | 'relatorios'
  | 'notificacoes';

export type Acao = 
  | 'visualizar'
  | 'criar'
  | 'editar'
  | 'excluir'
  | 'exportar'
  | 'gerenciar';

export const ROLES: Record<Role, string[]> = {
  ADMIN: ['*'], // acesso total
  LIDER: [
    'ler',
    'dashboard.visualizar',
    'os.visualizar', 'os.criar', 'os.editar', 'os.excluir', 'os.gerenciar',
    'os.editar_proprio', 'os.excluir_proprio',
    'orcamentos.visualizar', 'orcamentos.criar', 'orcamentos.editar', 'orcamentos.excluir',
    'agenda.visualizar', 'agenda.gerenciar', 'agenda.criar', 'agenda.editar', 'agenda.excluir',
    'clientes.visualizar', 'clientes.criar', 'clientes.editar', 'clientes.excluir',
    'fornecedores.visualizar', 'fornecedores.criar', 'fornecedores.editar', 'fornecedores.excluir',
    'veiculos.visualizar', 'veiculos.criar', 'veiculos.editar', 'veiculos.excluir',
    'pecas.visualizar', 'pecas.criar', 'pecas.editar', 'pecas.gerenciar', 'pecas.excluir',
    'usuarios.visualizar',
    'financeiro.visualizar',
    'checklist.visualizar', 'checklist.executar', 'checklist.criar', 'checklist.editar', 'checklist.excluir',
    'nfe.visualizar', 'nfe.importar'
  ],
  MECANICO: [
    'ler',
    'os.visualizar', 'os.criar', 'os.editar_proprio', 'os.excluir_proprio',
    'checklist.*',
    'agenda.visualizar',
    'clientes.visualizar',
    'veiculos.visualizar',
    'pecas.visualizar',
    'usuarios.visualizar',
    'dashboard.visualizar'
  ],
  FINANCEIRO: [
    'dashboard.visualizar',
    'financeiro.visualizar', 'financeiro.criar', 'financeiro.editar', 'financeiro.gerenciar', 'financeiro.excluir',
    'clientes.visualizar', 'clientes.criar', 'clientes.editar',
    'usuarios.visualizar',
    'fornecedores.visualizar', 'fornecedores.criar', 'fornecedores.editar',
    'veiculos.visualizar',
    'pecas.visualizar'
  ],
  ESTOQUISTA: [
    'dashboard.visualizar',
    'pecas.visualizar', 'pecas.criar', 'pecas.editar', 'pecas.gerenciar', 'pecas.excluir',
    'usuarios.visualizar',
    'clientes.visualizar',
    'fornecedores.visualizar', 'fornecedores.criar', 'fornecedores.editar',
    'veiculos.visualizar',
    'nfe.visualizar', 'nfe.importar'
  ],
};

// Normalização para evitar quebras de chamadas singulares e plurais (ex: cliente -> clientes)
function normalizeModulo(modulo: string): string {
  const map: Record<string, string> = {
    'cliente': 'clientes',
    'veiculo': 'veiculos',
    'peca': 'pecas',
    'orcamento': 'orcamentos',
    'notificacao': 'notificacoes',
    'configuracao': 'configuracoes'
  };
  const normalized = map[modulo.toLowerCase()];
  return normalized || modulo;
}

export function checkPermission(user: { role: string } | null | undefined, modulo: string, acao: string): boolean {
  if (!user || !user.role) return false;
  
  const userRole = user.role as Role;
  if (userRole === 'ADMIN') return true;
  
  const permissoes = ROLES[userRole] || [];
  
  const normModulo = normalizeModulo(modulo);
  
  // Verifica permissão curinga ou específica do módulo
  return (
    permissoes.includes('*') || 
    permissoes.includes(`${normModulo}.*`) ||
    permissoes.includes(`${normModulo}.${acao}`) ||
    permissoes.includes(`${modulo}.*`) ||
    permissoes.includes(`${modulo}.${acao}`)
  );
}

