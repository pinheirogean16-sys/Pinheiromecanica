// lib/use-plan.ts
import { useState, useEffect } from 'react';
import { apiFetch } from './api';

export function usePlan() {
  const [plano, setPlano] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ plano: string }>('/api/configuracoes/plano', { silentError: true })
      .then((data) => setPlano(data.plano))
      .catch(() => setPlano('BASICO'))
      .finally(() => setLoading(false));
  }, []);

  // Se for PRO ou TRIAL, tem acesso a tudo.
  const isPro = plano === 'PRO' || plano === 'TRIAL';
  
  return { plano, isPro, loading };
}
