import React, { useState, useEffect, useRef } from 'react';
import { X, GitFork, UploadCloud, CheckCircle2, ArrowRightLeft, Radio, FileAudio, Info, AlertCircle } from 'lucide-react';
import { analyzeSplitStereoFilename, findSplitStereoPair } from '../audio/splitStereoManager';
import { PendingSplitMonoState } from './AudioUploader';

interface SplitStereoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (fileL: File, fileR: File) => void;
  pendingSplitMono?: PendingSplitMonoState | null;
  currentTrackTitle?: string;
}

export function SplitStereoModal({
  isOpen,
  onClose,
  onMerge,
  pendingSplitMono,
  currentTrackTitle,
}: SplitStereoModalProps) {
  const [fileL, setFileL] = useState<File | null>(null);
  const [fileR, setFileR] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputLRef = useRef<HTMLInputElement>(null);
  const fileInputRRef = useRef<HTMLInputElement>(null);
  const dualFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize slots when modal opens or pendingSplitMono changes
  useEffect(() => {
    if (isOpen) {
      if (pendingSplitMono) {
        if (pendingSplitMono.channel === 'L') {
          setFileL(pendingSplitMono.file);
          setFileR(null);
        } else {
          setFileR(pendingSplitMono.file);
          setFileL(null);
        }
      }
      setErrorMessage(null);
    }
  }, [isOpen, pendingSplitMono]);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDualFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length >= 2) {
      const pair = findSplitStereoPair(fileArray);
      if (pair) {
        setFileL(pair.fileL);
        setFileR(pair.fileR);
        return;
      }

      // If exactly 2 files, assign first to L and second to R unless recognized
      const info0 = analyzeSplitStereoFilename(fileArray[0].name);
      const info1 = analyzeSplitStereoFilename(fileArray[1].name);

      if (info0.channel === 'R' || info1.channel === 'L') {
        setFileL(fileArray[1]);
        setFileR(fileArray[0]);
      } else {
        setFileL(fileArray[0]);
        setFileR(fileArray[1]);
      }
      return;
    }

    // Only 1 file provided
    const single = fileArray[0];
    const info = analyzeSplitStereoFilename(single.name);
    if (info.channel === 'R') {
      setFileR(single);
    } else if (info.channel === 'L') {
      setFileL(single);
    } else {
      // Default to filling whatever is empty, or L
      if (!fileL) setFileL(single);
      else setFileR(single);
    }
  };

  const handleSwapChannels = () => {
    const tempL = fileL;
    setFileL(fileR);
    setFileR(tempL);
  };

  const handleConfirmMerge = () => {
    if (!fileL || !fileR) {
      setErrorMessage('Por favor selecione ambos os canais L (Esquerdo) e R (Direito) para prosseguir.');
      return;
    }
    onMerge(fileL, fileR);
    onClose();
  };

  const expectedPartnerName =
    pendingSplitMono?.expectedPartnerFilename ||
    (fileL ? analyzeSplitStereoFilename(fileL.name).expectedPartnerFilename : null) ||
    (fileR ? analyzeSplitStereoFilename(fileR.name).expectedPartnerFilename : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl bg-[#0d1322] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#101728]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-inner">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 id="split-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                Unir Canais Split-Mono Pro Tools (.L e .R)
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  ESTÉREO 2 CANAIS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fusão de arquivos separados (.L.wav e .R.wav) em um áudio Estéreo real com preservação nativa de bits e kHz.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Quick notice if an active channel is already waiting */}
          {expectedPartnerName && (!fileL || !fileR) && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed">
                <span className="font-bold text-amber-300">Canal detectado!</span> Para completar a imagem estéreo real, adicione o canal complementar esperado:{' '}
                <strong className="font-mono text-cyan-300">{expectedPartnerName}</strong>.
              </div>
            </div>
          )}

          {/* Drag & Drop Unified Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) handleDualFiles(e.dataTransfer.files);
            }}
            onClick={() => dualFileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-cyan-500/50 bg-[#12192c]/60 hover:bg-[#12192c]'
            }`}
          >
            <UploadCloud className="w-7 h-7 text-cyan-400 mb-2" />
            <p className="text-sm font-semibold text-white">
              Arraste os DOIS arquivos (.L e .R) juntos aqui
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou clique para selecionar ambos os arquivos na sua pasta do Pro Tools
            </p>
            <input
              ref={dualFileInputRef}
              type="file"
              multiple
              accept="audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3"
              onChange={(e) => e.target.files && handleDualFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Hidden inputs for single channel pickers */}
          <input
            ref={fileInputLRef}
            type="file"
            accept="audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFileL(e.target.files[0]);
                setErrorMessage(null);
              }
            }}
            className="hidden"
          />
          <input
            ref={fileInputRRef}
            type="file"
            accept="audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFileR(e.target.files[0]);
                setErrorMessage(null);
              }
            }}
            className="hidden"
          />

          {/* Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Left Channel Slot */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all min-h-[140px] ${
                fileL
                  ? 'bg-cyan-950/20 border-cyan-500/60 shadow-xs'
                  : 'bg-[#12192c] border-dashed border-slate-700 hover:border-cyan-400/60 cursor-pointer'
              }`}
              onClick={() => !fileL && fileInputLRef.current?.click()}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    CANAL L (ESQUERDO)
                  </span>
                  {fileL && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileL(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remover arquivo do canal L"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {fileL ? (
                  <div className="flex items-start gap-2.5 mt-2">
                    <FileAudio className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate max-w-[200px]" title={fileL.name}>
                        {fileL.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatFileSize(fileL.size)} · Canal 1
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4 text-slate-400">
                    <UploadCloud className="w-6 h-6 text-cyan-400/80 mb-1" />
                    <span className="text-xs font-medium text-cyan-200">Selecionar Canal .L</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">ex: Audio 1_01.L.wav</span>
                  </div>
                )}
              </div>

              {fileL && (
                <div className="pt-2 mt-2 border-t border-cyan-500/20 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Canal L Pronto
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputLRef.current?.click();
                    }}
                    className="text-cyan-400 hover:underline"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex sm:flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleSwapChannels}
                disabled={!fileL && !fileR}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
                title="Inverter Canais (Trocar L ⇄ R)"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Right Channel Slot */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all min-h-[140px] ${
                fileR
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-xs'
                  : 'bg-[#12192c] border-dashed border-slate-700 hover:border-amber-400/60 cursor-pointer'
              }`}
              onClick={() => !fileR && fileInputRRef.current?.click()}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    CANAL R (DIREITO)
                  </span>
                  {fileR && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileR(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remover arquivo do canal R"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {fileR ? (
                  <div className="flex items-start gap-2.5 mt-2">
                    <FileAudio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate max-w-[200px]" title={fileR.name}>
                        {fileR.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatFileSize(fileR.size)} · Canal 2
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4 text-slate-400">
                    <UploadCloud className="w-6 h-6 text-amber-400/80 mb-1" />
                    <span className="text-xs font-medium text-amber-200">Selecionar Canal .R</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">ex: Audio 1_01.R.wav</span>
                  </div>
                )}
              </div>

              {fileR && (
                <div className="pt-2 mt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Canal R Pronto
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRRef.current?.click();
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Technical Info Box */}
          <div className="p-3.5 rounded-xl bg-[#090e1a] border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-slate-300 font-semibold">
                Alinhamento Amostra-a-Amostra com Taxa Nativa Preservada
              </p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Os dois canais são montados em uma matriz estéreo interleaved de 2 canais com zero desvio de fase.
                A taxa de amostragem original (44.1, 48, 88.2, 96 ou 192 kHz) e profundidade de bits (16, 24 ou 32-bit float) são 100% mantidas para o processo de masterização analógica.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-[#101728] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmMerge}
            disabled={!fileL || !fileR}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
          >
            <GitFork className="w-4 h-4" />
            <span>Unir Canais e Iniciar Masterização</span>
          </button>
        </div>
      </div>
    </div>
  );
}
