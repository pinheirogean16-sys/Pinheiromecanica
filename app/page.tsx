import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redireciona para a dashboard se logado, senão para login
  redirect('/dashboard');
}
