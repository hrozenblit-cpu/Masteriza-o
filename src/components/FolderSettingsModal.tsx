import React, { useState } from 'react';
import { autoSaveManager, isInsideIframe } from '../audio/autoSaveManager';
import {
  FolderCheck,
  FolderPlus,
  FolderX,
  X,
  ExternalLink,
  ShieldAlert,
  Archive,
  CheckCircle2,
  HardDrive,
  Info,
} from 'lucide-react';

interface FolderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  outputDirName: string;
  onOutputDirChanged: (dirName: string) => void;
}

export function FolderSettingsModal({
  isOpen,
  onClose,
  outputDirName,
  onOutputDirChanged,
}: FolderSettingsModalProps) {
  const [subfolderName, setSubfolderName] = useState(autoSaveManager.getSubfolderName());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);

  if (!isOpen) return null;

  const hasDirectory = autoSaveManager.hasSelectedDirectory();
  const inIframe = isInsideIframe();

  const handlePickDirectory = async () => {
    setErrorMessage(null);
    setFeedbackMsg(null);
    setIsIframeBlocked(false);

    autoSaveManager.updateConfig({ subfolderName });
    const result = await autoSaveManager.selectOutputDirectory();

    if (result.success) {
      onOutputDirChanged(result.dirName);
      setFeedbackMsg(`✓ Pasta vinculada com sucesso: "${result.dirName}/${subfolderName}"!`);
      setTimeout(() => setFeedbackMsg(null), 6000);
    } else {
      if (result.isIframeBlocked) {
        setIsIframeBlocked(true);
      }
      if (result.error && !result.error.includes('cancelada')) {
        setErrorMessage(result.error);
      }
    }
  };

  const handleSubfolderChange = (name: string) => {
    const clean = name.replace(/[/\\?%*:|"<>]/g, '_');
    setSubfolderName(clean);
    autoSaveManager.updateConfig({ subfolderName: clean });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Pasta de Salvamento Automático no Computador
              </h3>
              <p className="text-xs text-slate-400">
                Organização automática em subpasta para digitalizações de fitas 1/4"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              hasDirectory
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}
          >
            {hasDirectory ? (
              <FolderCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <FolderX className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-white">
                  {hasDirectory ? 'Pasta Conectada no Disco' : 'Pasta Local Não Conectada'}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    hasDirectory
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasDirectory ? 'GRAVAÇÃO DIRETA ATIVA' : 'DOWNLOAD / ZIP'}
                </span>
              </div>
              <p className="mt-1 text-slate-300">
                {hasDirectory ? (
                  <>
                    Todos os masters e arquivos com azimute corrigido serão gravados diretamente na
                    pasta:{' '}
                    <strong className="text-emerald-300 font-mono">
                      {outputDirName || autoSaveManager.getBaseDirName()}/{subfolderName}/
                    </strong>
                    , sem abrir popups do navegador.
                  </>
                ) : (
                  <>
                    Ao exportar ou processar lotes, os arquivos serão salvos por download padrão ou
                    podem ser baixados como <strong>pacote ZIP com a subpasta já criada</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Directory Picker Action */}
          <div className="p-4 rounded-xl bg-[#0f1526] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-cyan-400" />
                Vincular Pasta no Computador
              </label>
            </div>
            <p className="text-slate-400 text-xs">
              Escolha a pasta onde estão suas fitas (ou uma pasta de sua preferência). O AuraTune criará
              automaticamente a subpasta dentro dela e salvará os arquivos diretamente.
            </p>

            <button
              onClick={handlePickDirectory}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>
                {hasDirectory ? 'Alterar Pasta Selecionada no PC' : 'Selecionar Pasta no Computador'}
              </span>
            </button>
          </div>

          {/* Iframe Notice / Standalone Tab Link */}
          {(inIframe || isIframeBlocked) && (
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 text-blue-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white text-xs block">
                    Acesso a Pastas em Janela Embutida (Iframe)
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Por segurança, navegadores como Google Chrome e Microsoft Edge restringem a seleção
                    direta de pastas do disco rígido quando o site está em um frame de teste.
                    Para desbloquear o acesso total e gravar arquivos diretamente no seu disco, abra o
                    AuraTune em uma aba dedicada do seu navegador:
                  </p>
                </div>
              </div>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs shadow transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir AuraTune em Nova Aba (Permite Gravação Direta)</span>
              </a>
            </div>
          )}

          {/* Subfolder Name Config */}
          <div className="p-4 rounded-xl bg-[#0f1526] border border-slate-800 space-y-2.5">
            <label className="font-semibold text-white block">Nome da Subpasta de Saída:</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">📁</span>
              <input
                type="text"
                value={subfolderName}
                onChange={(e) => handleSubfolderChange(e.target.value)}
                placeholder="Tapes_Processados_AuraTune"
                className="flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-700 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Nome da pasta que será criada automaticamente dentro da pasta selecionada (ou no arquivo
              ZIP).
            </span>
          </div>

          {/* Feedback & Error messages */}
          {feedbackMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ZIP Archive Solution Info */}
          <div className="p-3.5 rounded-xl bg-[#080d1a] border border-slate-800/80 flex items-start gap-3 text-[11px] text-slate-400">
            <Archive className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong>Dica para Lotes:</strong> No processamento em lote, você também pode baixar todos os
              arquivos diretamente em um único arquivo compactado <strong>.ZIP</strong> com a subpasta{' '}
              <code className="text-amber-300 font-mono">{subfolderName}/</code> já organizada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0e1424] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
