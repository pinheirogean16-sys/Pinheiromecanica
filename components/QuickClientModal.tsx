'use client';

import { useState, useEffect } from 'react';
import { X, User, Building2, Phone, Mail, MapPin, Loader2, Check, AlertCircle } from 'lucide-react';
import { maskCPF, maskCNPJ, maskPhone } from '@/lib/masks';
import { isValidCPF, isValidCNPJ } from '@/lib/validators';

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: any) => void;
}

export default function QuickClientModal({ isOpen, onClose, onSuccess }: QuickClientModalProps) {
  const [tipo, setTipo] = useState<'PF' | 'PJ'>('PJ');
  const [nome, setNome] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleDocumentoChange = (val: string) => {
    if (tipo === 'PF') {
      setCpfCnpj(maskCPF(val));
    } else {
      setCpfCnpj(maskCNPJ(val));
    }
    if (errorMsg) setErrorMsg(null);
  };

  const handleTelefoneChange = (val: string) => {
    setTelefone(maskPhone(val));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações locais
    const cleanDoc = cpfCnpj.replace(/\D/g, '');
    if (!nome.trim() || nome.trim().length < 3) {
      setErrorMsg('Informe o nome ou razão social (mínimo 3 caracteres).');
      return;
    }

    if (tipo === 'PF') {
      if (cleanDoc.length !== 11) {
        setErrorMsg('CPF incompleto (deve conter 11 dígitos).');
        return;
      }
      if (!isValidCPF(cleanDoc)) {
        setErrorMsg('CPF inválido. Verifique os dígitos digitados.');
        return;
      }
    } else {
      if (cleanDoc.length !== 14) {
        setErrorMsg('CNPJ incompleto (deve conter 14 dígitos).');
        return;
      }
      if (!isValidCNPJ(cleanDoc)) {
        setErrorMsg('CNPJ inválido. Verifique os dígitos digitados.');
        return;
      }
    }

    const cleanTel = telefone.replace(/\D/g, '');
    if (!cleanTel || cleanTel.length < 8) {
      setErrorMsg('Informe um telefone de contato válido.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tipo,
        tipo_pessoa: tipo === 'PF' ? 'FISICA' : 'JURIDICA',
        nome: nome.trim(),
        razao_social: tipo === 'PJ' ? nome.trim() : null,
        nome_fantasia: tipo === 'PJ' && nomeFantasia.trim() ? nomeFantasia.trim() : null,
        cpf_cnpj: cpfCnpj.trim(),
        telefone: telefone.trim(),
        email: email.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim().toUpperCase() || null,
        perfil: 'CLIENTE',
        status: 'ATIVO',
        ativo: true
      };

      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao cadastrar cliente. Verifique os dados informados.');
        return;
      }

      // Sucesso: notifica callback e fecha modal
      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Falha ao cadastrar cliente rápido:', err);
      setErrorMsg('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-quick-client-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-black">
              <User size={20} />
            </div>
            <div>
              <h2 id="modal-quick-client-title" className="text-base font-black text-white uppercase italic tracking-tight">
                Cadastro Rápido de Cliente
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Vínculo imediato à Ordem de Serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body com Rolagem Interna Segura */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-400 font-bold">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toggle PF / PJ */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
              Tipo de Pessoa
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setTipo('PJ');
                  setCpfCnpj('');
                  setErrorMsg(null);
                }}
                className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tipo === 'PJ'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Building2 size={15} />
                Pessoa Jurídica (PJ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo('PF');
                  setCpfCnpj('');
                  setErrorMsg(null);
                }}
                className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tipo === 'PF'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <User size={15} />
                Pessoa Física (PF)
              </button>
            </div>
          </div>

          {/* Nome ou Razão Social */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
              {tipo === 'PJ' ? 'Razão Social / Nome da Empresa *' : 'Nome Completo do Cliente *'}
            </label>
            <input
              type="text"
              required
              placeholder={tipo === 'PJ' ? 'EX: TRANSPORTADORA SILVA LTDA' : 'EX: JOÃO CARLOS DA SILVA'}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
            />
          </div>

          {/* Nome Fantasia (apenas se PJ) */}
          {tipo === 'PJ' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                Nome Fantasia (Opcional)
              </label>
              <input
                type="text"
                placeholder="EX: SILVA LOGÍSTICA"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>
          )}

          {/* CPF ou CNPJ + Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                {tipo === 'PJ' ? 'CNPJ *' : 'CPF *'}
              </label>
              <input
                type="text"
                required
                placeholder={tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                value={cpfCnpj}
                onChange={(e) => handleDocumentoChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold font-mono text-white outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
                <Phone size={12} className="text-zinc-500" />
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                required
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold font-mono text-white outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* E-mail (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
              <Mail size={12} className="text-zinc-500" />
              E-mail para Orçamentos & Faturas (Opcional)
            </label>
            <input
              type="email"
              placeholder="cliente@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner lowercase"
            />
          </div>

          {/* Cidade e UF (Opcionais) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
                <MapPin size={12} className="text-zinc-500" />
                Cidade (Opcional)
              </label>
              <input
                type="text"
                placeholder="EX: RONDONÓPOLIS"
                value={cidade}
                onChange={(e) => setCidade(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="MT"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-center text-white uppercase outline-none focus:border-orange-500 transition shadow-inner font-mono"
              />
            </div>
          </div>

          {/* Footer de Ações */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-orange-950/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando Cliente...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Cadastrar e Selecionar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
