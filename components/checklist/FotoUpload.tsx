'use client';

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

interface FotoUploadProps {
  execucaoId: string;
  itemId?: string;
  onUploadComplete?: (url: string) => void;
  fotosExistentes?: { id: string; url: string; legenda: string | null }[];
}

export default function FotoUpload({ execucaoId, itemId, onUploadComplete, fotosExistentes = [] }: FotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState(fotosExistentes);
  const [legenda, setLegenda] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      formData.append('execucao_id', execucaoId);
      if (itemId) formData.append('item_id', itemId);
      if (legenda) formData.append('legenda', legenda);

      const res = await fetch('/api/checklist/upload-foto', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setFotos([...fotos, data.foto]);
        setLegenda('');
        if (onUploadComplete) onUploadComplete(data.foto.url);
      }
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Fotos existentes */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative group overflow-hidden rounded-xl border border-zinc-800">
              <img 
                src={foto.url} 
                alt={foto.legenda || 'Foto do checklist'} 
                className="w-full aspect-square object-cover rounded-xl transition-all duration-300 group-hover:scale-105"
              />
              {foto.legenda && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 backdrop-blur-xs">
                  <p className="text-[9px] text-zinc-300 truncate font-semibold uppercase tracking-wider">{foto.legenda}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        <input
          type="text"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Legenda da foto (opcional)"
          className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-xs text-white focus:border-orange-500 outline-none transition min-h-[48px]"
        />
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 sm:flex-none px-4 min-h-[48px] bg-zinc-850 hover:bg-zinc-750 text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 border border-zinc-800"
          >
            <ImageIcon size={16} className="text-zinc-400" />
            <span className="text-xs font-bold">Galeria</span>
          </button>
          <button
            type="button"
            onClick={() => {
                if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                }
            }}
            disabled={uploading}
            className="flex-1 sm:flex-none px-4 min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
            <span className="text-xs font-bold">Câmera</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
