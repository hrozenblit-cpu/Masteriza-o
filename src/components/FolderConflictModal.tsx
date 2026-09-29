import React, { useState } from 'react';
import {
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Copy,
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { FolderCheckResult, FolderConflictAction } from '../audio/autoSaveManager';

interface FolderConflictModalProps {
  isOpen: boolean;
  conflictData: FolderCheckResult | null;
  onResolve: (action: FolderConflictAction) => void;
  onCancel: () => void;
}

export const FolderConflictModal: React.FC<FolderConflictModalProps> = ({
  isOpen,
  conflictData,
  onResolve,
  onCancel,
}) => {
  const [selectedAction, setSelectedAction] = useState<FolderConflictAction>('new_timestamp_folder');

  if (!isOpen || !conflictData) return null;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const previewTimestamp = `${conflictData.subfolderName}_${now.getFullYear()}-${pad(
    now.getMonth() + 1
  )}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-amber-500/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Pasta Existente Detectada
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {conflictData.fileCount} arquivos encontrados
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                O local selecionado já possui gravações anteriores. Escolha como proceder:
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Options */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400">Diretório: </span>
              <span className="font-semibold text-amber-300">{conflictData.baseDirName}</span> /{' '}
              <span className="font-mono text-emerald-300 font-semibold">{conflictData.subfolderName}/</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Option 1: Create New Timestamped Folder */}
            <div
              onClick={() => setSelectedAction('new_timestamp_folder')}
              className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                selectedAction === 'new_timestamp_folder'
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  selectedAction === 'new_timestamp_folder'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <FolderPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    1. Criar Nova Pasta com Data/Hora
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Recomendado
                    </span>
                  </div>
                  {selectedAction === 'new_timestamp_folder' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Preserva todos os arquivos anteriores 100% intactos e cria uma nova subpasta limpa:
                </p>
                <div className="text-[11px] font-mono text-amber-300/90 bg-slate-950/70 px-2.5 py-1 rounded-md mt-1.5 border border-slate-800">
                  📁 {previewTimestamp}/
                </div>
              </div>
            </div>

            {/* Option 2: Overwrite existing */}
            <div
              onClick={() => setSelectedAction('overwrite')}
              className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                selectedAction === 'overwrite'
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  selectedAction === 'overwrite'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-slate-100">
                    2. Substituir / Atualizar Arquivos Existentes
                  </div>
                  {selectedAction === 'overwrite' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Grava na mesma pasta e substitui apenas os arquivos que tiverem o mesmo nome (ideal se você está apenas reprocessando as mesmas faixas com ajustes).
                </p>
              </div>
            </div>

            {/* Option 3: Keep both with _v2 suffix */}
            <div
              onClick={() => setSelectedAction('keep_both_v2')}
              className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                selectedAction === 'keep_both_v2'
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  selectedAction === 'keep_both_v2'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Copy className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-slate-100">
                    3. Manter Ambos na Mesma Pasta (Sufixo _v2)
                  </div>
                  {selectedAction === 'keep_both_v2' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Salva na mesma pasta sem apagar nada, adicionando o sufixo <code className="text-amber-300 font-mono">_v2</code> aos novos arquivos (ótimo para comparação A/B).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onResolve(selectedAction)}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            Continuar com esta Opção
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
