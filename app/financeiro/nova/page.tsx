'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NovaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/financeiro/lancamento');
  }, [router]);
  return null;
}
