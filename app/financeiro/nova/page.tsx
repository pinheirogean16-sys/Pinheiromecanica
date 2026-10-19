import { redirect } from 'next/navigation';

// Rota legada: /financeiro/nova → /financeiro/lancamento (redirect permanente).
export default function NovaRedirect() {
  redirect('/financeiro/lancamento');
}
