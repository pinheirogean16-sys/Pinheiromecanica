export interface SuperAdminCandidate {
  id?: string | null;
  email?: string | null;
  empresa_id?: string | null;
}

let warned = false;

export function isSuperAdmin(user: SuperAdminCandidate | null | undefined): boolean {
  if (!user) return false;

  const superId = process.env.SUPER_ADMIN_USER_ID?.trim();
  if (superId) {
    return !!user.id && user.id === superId;
  }

  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  const empresaId = process.env.SUPER_ADMIN_EMPRESA_ID?.trim();
  if (email && empresaId) {
    return !!user.email && !!user.empresa_id && user.email === email && user.empresa_id === empresaId;
  }

  if (!warned) {
    warned = true;
    console.error(
      '[super-admin] Defina SUPER_ADMIN_USER_ID (ou SUPER_ADMIN_EMAIL + SUPER_ADMIN_EMPRESA_ID). ' +
        'Sem isso, o painel master fica inacessível.'
    );
  }
  return false;
}
