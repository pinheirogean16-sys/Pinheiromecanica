'use client';

import { useState } from 'react';
import WorkOrderTypeSelector from '@/components/WorkOrderTypeSelector';
import WorkOrderOffice from '@/components/WorkOrderOffice';
import WorkOrderField from '@/components/WorkOrderField';

export default function NovaOSPage() {
  const [tipoOS, setTipoOS] = useState<'OFICINA' | 'CAMPO' | null>(null);

  if (!tipoOS) {
    return (
      <WorkOrderTypeSelector onSelect={(type) => setTipoOS(type)} />
    );
  }

  if (tipoOS === 'OFICINA') {
    return (
      <WorkOrderOffice onBack={() => setTipoOS(null)} />
    );
  }

  return (
    <WorkOrderField onBack={() => setTipoOS(null)} />
  );
}
