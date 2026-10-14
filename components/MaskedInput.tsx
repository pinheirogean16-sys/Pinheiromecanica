'use client';

import { forwardRef, useCallback, InputHTMLAttributes } from 'react';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskPlaca, maskCpfCnpj, apenasNumeros } from '@/lib/masks';

// ============================================================
// TIPOS DE MÁSCARA SUPORTADOS
// ============================================================
type MaskType = 'cpf' | 'cnpj' | 'cpfCnpj' | 'telefone' | 'cep' | 'placa' | 'numero';

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Tipo de máscara a aplicar */
  mask: MaskType;
  /** Callback chamado a cada mudança (retorna valor formatado por padrão) */
  onChange?: (value: string) => void;
  /**
   * Se `true`, o onChange retorna apenas números (sem máscara).
   * Útil quando o backend espera dados limpos.
   * Padrão: `false` (retorna com máscara visual)
   */
  rawValue?: boolean;
}

// ============================================================
// APLICA A MÁSCARA CORRETA BASEADA NO TIPO
// ============================================================
function aplicarMascara(tipo: MaskType, valor: string): string {
  switch (tipo) {
    case 'cpf':
      return maskCPF(valor);
    case 'cnpj':
      return maskCNPJ(valor);
    case 'cpfCnpj':
      return maskCpfCnpj(valor);
    case 'telefone':
      return maskPhone(valor);
    case 'cep':
      return maskCEP(valor);
    case 'placa':
      return maskPlaca(valor);
    case 'numero':
      return apenasNumeros(valor);
    default:
      return valor;
  }
}

// ============================================================
// COMPONENTE
// ============================================================
export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, rawValue = false, value, ...props }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const valorDigitado = e.target.value;
        const valorFormatado = aplicarMascara(mask, valorDigitado);

        // Atualiza o input visualmente
        e.target.value = valorFormatado;

        // Chama o onChange do pai
        if (onChange) {
          onChange(rawValue ? apenasNumeros(valorFormatado) : valorFormatado);
        }
      },
      [mask, onChange, rawValue]
    );

    // Formata o valor inicial (vindo do form/estado)
    const valorInicial =
      typeof value === 'string' ? aplicarMascara(mask, value) : value;

    // Define o inputMode para abrir teclado correto no celular
    const inputMode =
      mask === 'numero' ||
      mask === 'cpf' ||
      mask === 'cnpj' ||
      mask === 'cpfCnpj' ||
      mask === 'telefone' ||
      mask === 'cep'
        ? 'numeric'
        : 'text';

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode={inputMode}
        value={valorInicial}
        onChange={handleChange}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

// ============================================================
// EXEMPLO DE USO
// ============================================================
/*
import { MaskedInput } from '@/components/MaskedInput';

// Exemplo 1 — Com estado controlado (padrão):
const [cpf, setCpf] = useState('');

<MaskedInput
  mask="cpf"
  value={cpf}
  onChange={(valor) => setCpf(valor)}  // valor COM máscara: "123.456.789-01"
  placeholder="000.000.000-00"
  className="input"
/>

// Exemplo 2 — Salvando SEM máscara (rawValue):
<MaskedInput
  mask="cpf"
  value={cpf}
  onChange={(valor) => setCpf(valor)}  // valor SEM máscara: "12345678901"
  rawValue={true}
  placeholder="000.000.000-00"
/>

// Exemplo 3 — Com defaultValue (não controlado):
<MaskedInput
  mask="telefone"
  defaultValue="48984052808"
  name="telefone"
  className="input"
/>

// Exemplo 4 — CNPJ da empresa:
<MaskedInput
  mask="cnpj"
  value={empresa.cnpj}
  onChange={(valor) => setEmpresa({ ...empresa, cnpj: valor })}
/>

// Exemplo 5 — CPF ou CNPJ automático:
<MaskedInput
  mask="cpfCnpj"
  value={cliente.cpf_cnpj}
  onChange={(valor) => setCliente({ ...cliente, cpf_cnpj: valor })}
/>
*/
