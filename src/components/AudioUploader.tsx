import React, { useRef } from 'react';
import { UploadCloud, Radio, Disc3, Layers, Info, Sparkles, CheckCircle2, Music2, Cpu, FolderDown, FileText, Tag, User, GitFork, X, Bookmark, RefreshCw } from 'lucide-react';
import { AudioInputFormat } from '../audio/audioFormatDetector';
import { buildMasterWavFilename, stripAudioFileExtension } from '../audio/trackNamingHelper';
import { analyzeSplitStereoFilename, findSplitStereoPair } from '../audio/splitStereoManager';

export interface PendingSplitMonoState {
  file: File;
  channel: 'L' | 'R';
  baseName: string;
  expectedPartnerFilename: string;
}

interface AudioUploaderProps {
  currentTrackTitle: string;
  isAnalyzing: boolean;
  analysisStatus?: string | null;
  onFileUpload: (file: File) => void;
  onMultipleFilesUpload?: (files: FileList) => void;
  onSplitStereoUpload?: (fileL: File, fileR: File) => void;
  pendingSplitMono?: PendingSplitMonoState | null;
  onDismissPendingSplitMono?: () => void;
  onOpenSplitStereoModal?: () => void;
  onOpenBatch?: () => void;
  audioFormat: AudioInputFormat | null;
  overallAiProbability?: number;
  detectedPlatformName?: string;
  hasAudioLoaded: boolean;
  trackNumber?: string;
  onUpdateTrackNumber?: (num: string) => void;
  songTitle?: string;
  onUpdateSongTitle?: (title: string) => void;
  artistName?: string;
  onUpdateArtistName?: (artist: string) => void;
  targetLufs?: number;
  currentPresetName?: string;
  onReanalyze?: () => void;
}

export function AudioUploader({
  currentTrackTitle,
  isAnalyzing,
  analysisStatus,
  onFileUpload,
  onMultipleFilesUpload,
  onSplitStereoUpload,
  pendingSplitMono,
  onDismissPendingSplitMono,
  onOpenSplitStereoModal,
  onOpenBatch,
  audioFormat,
  overallAiProbability,
  detectedPlatformName,
  hasAudioLoaded,
  trackNumber = '',
  onUpdateTrackNumber,
  songTitle = '',
  onUpdateSongTitle,
  artistName = '',
  onUpdateArtistName,
  targetLufs = -14,
  currentPresetName,
  onReanalyze,
}: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const partnerFileInputRef = useRef<HTMLInputElement>(null);
  const splitStereoInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const previewMasterFilename = buildMasterWavFilename({
    trackNumber,
    songTitle: songTitle || stripAudioFileExtension(currentTrackTitle),
    artist: artistName,
    sampleRate: audioFormat?.sampleRate || 44100,
    bitDepth: audioFormat?.bitDepth || 24,
    targetLufs,
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    // Check if 2 or more files contain a Pro Tools .L and .R pair
    if (e.dataTransfer.files.length >= 2) {
      const pair = findSplitStereoPair(e.dataTransfer.files);
      if (pair && onSplitStereoUpload) {
        onSplitStereoUpload(pair.fileL, pair.fileR);
        return;
      }
      if (onMultipleFilesUpload) {
        onMultipleFilesUpload(e.dataTransfer.files);
        return;
      }
    }

    const singleFile = e.dataTransfer.files[0];
    if (pendingSplitMono && onSplitStereoUpload) {
      const info = analyzeSplitStereoFilename(singleFile.name);
      if (info.isSplit && info.channel && info.channel !== pendingSplitMono.channel) {
        const fileL = pendingSplitMono.channel === 'L' ? pendingSplitMono.file : singleFile;
        const fileR = pendingSplitMono.channel === 'R' ? pendingSplitMono.file : singleFile;
        onSplitStereoUpload(fileL, fileR);
        return;
      }
    }

    onFileUpload(singleFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (e.target.files.length >= 2) {
      const pair = findSplitStereoPair(e.target.files);
      if (pair && onSplitStereoUpload) {
        onSplitStereoUpload(pair.fileL, pair.fileR);
        return;
      }
      if (onMultipleFilesUpload) {
        onMultipleFilesUpload(e.target.files);
        return;
      }
    }

    const singleFile = e.target.files[0];
    if (pendingSplitMono && onSplitStereoUpload) {
      const info = analyzeSplitStereoFilename(singleFile.name);
      if (info.isSplit && info.channel && info.channel !== pendingSplitMono.channel) {
        const fileL = pendingSplitMono.channel === 'L' ? pendingSplitMono.file : singleFile;
        const fileR = pendingSplitMono.channel === 'R' ? pendingSplitMono.file : singleFile;
        onSplitStereoUpload(fileL, fileR);
        return;
      }
    }

    onFileUpload(singleFile);
    // Reset file input value so re-uploading or switching files always triggers onChange
    e.target.value = '';
  };

  const handleSplitStereoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (e.target.files.length >= 2 && onSplitStereoUpload) {
      const pair = findSplitStereoPair(e.target.files);
      if (pair) {
        onSplitStereoUpload(pair.fileL, pair.fileR);
      } else {
        const fileA = e.target.files[0];
        const fileB = e.target.files[1];
        const infoA = analyzeSplitStereoFilename(fileA.name);
        const fileL = infoA.channel === 'R' ? fileB : fileA;
        const fileR = infoA.channel === 'R' ? fileA : fileB;
        onSplitStereoUpload(fileL, fileR);
      }
    } else if (e.target.files.length === 1) {
      onFileUpload(e.target.files[0]);
    }
    // reset input
    e.target.value = '';
  };

  const handlePartnerFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !pendingSplitMono || !onSplitStereoUpload) return;
    const companionFile = e.target.files[0];
    const fileL = pendingSplitMono.channel === 'L' ? pendingSplitMono.file : companionFile;
    const fileR = pendingSplitMono.channel === 'R' ? pendingSplitMono.file : companionFile;
    onSplitStereoUpload(fileL, fileR);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`bg-[#0e1320] border rounded-xl p-4 md:p-5 flex flex-col gap-4 shadow-lg relative transition-all ${
        isDragOver ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500/30' : 'border-slate-800'
      }`}
    >
      {/* Visual Drop Overlay when dragging a new track over an already loaded session */}
      {hasAudioLoaded && isDragOver && (
        <div className="absolute inset-0 z-30 rounded-xl bg-[#090e1a]/95 backdrop-blur-sm border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-2 pointer-events-none p-6 text-center">
          <div className="p-3.5 rounded-2xl bg-cyan-400/20 text-cyan-300 shadow-lg">
            <UploadCloud className="w-9 h-9 animate-bounce" />
          </div>
          <h4 className="text-base font-bold text-white">
            Solte o novo arquivo aqui para substituir a música
          </h4>
          <p className="text-xs text-slate-300 max-w-md">
            A sessão anterior será encerrada e o novo áudio será decodificado na taxa nativa e masterizado com seu preset ideal.
          </p>
        </div>
      )}

      {/* Header section with status & mode switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Console de Ingestão de Áudio & Masterização
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            {hasAudioLoaded ? (
              <>
                <span>Arquivo Ativo: <strong className="text-slate-200 font-medium">{currentTrackTitle}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 font-mono font-medium">
                  {audioFormat ? `${audioFormat.sampleRate.toLocaleString()} Hz · ${audioFormat.bitDepth}-bit` : 'Carregado'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-mono text-[11px]">Taxa e Bits Preservados na Exportação</span>
              </>
            ) : (
              <span className="text-slate-400">
                Aguardando áudio do usuário · Zero sons de teste sintéticos · Fidelidade direta
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.aiff,.aif,.mp4,.mpg4,.mov,.m4v,.webm,.mkv"
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={splitStereoInputRef}
        type="file"
        multiple
        accept="audio/*,.wav,.wave,.aif,.aiff,.flac"
        onChange={handleSplitStereoInput}
        className="hidden"
      />
      <input
        ref={partnerFileInputRef}
        type="file"
        accept="audio/*,.wav,.wave,.aif,.aiff,.flac"
        onChange={handlePartnerFileInput}
        className="hidden"
      />

      {/* Prominent Split-Mono Pro Tools Alert Banner */}
      {pendingSplitMono && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-[#1f1508] to-[#0e1424] border-2 border-amber-500/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 text-amber-300 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-inner">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/60">
                  PRO TOOLS DUAL MONO
                </span>
                <h4 className="text-sm font-bold text-white">
                  Arquivo Split-Mono: Canal {pendingSplitMono.channel} ({pendingSplitMono.channel === 'L' ? 'Esquerdo' : 'Direito'})
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Você carregou <strong className="font-mono text-amber-300">{pendingSplitMono.file.name}</strong>, que contém apenas o canal {pendingSplitMono.channel === 'L' ? 'Esquerdo' : 'Direito'}. Para unir os 2 canais em um único áudio Estéreo real, carregue o canal oposto (<strong className="font-mono text-cyan-300">{pendingSplitMono.expectedPartnerFilename}</strong>):
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => partnerFileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Carregar {pendingSplitMono.expectedPartnerFilename} & Unir</span>
            </button>

            {onOpenSplitStereoModal && (
              <button
                type="button"
                onClick={onOpenSplitStereoModal}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Abrir gerenciador visual de canais L e R para conferir ou inverter"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Gerenciador L/R</span>
              </button>
            )}

            {onDismissPendingSplitMono && (
              <button
                type="button"
                onClick={onDismissPendingSplitMono}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar e manter apenas este canal mono"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!hasAudioLoaded ? (
        // State 1: Clean, spacious dropzone when no audio is loaded
        <div
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 p-4 sm:p-6 lg:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.005]'
              : 'border-dashed border-cyan-500/30 hover:border-cyan-400 bg-[#121828]/50 hover:bg-[#141b2e]'
          }`}
        >
          <div className="p-3 sm:p-3.5 rounded-2xl bg-cyan-400/10 text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all mb-2.5 shadow-inner">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                {analysisStatus || 'Carregando e Analisando Áudio/Vídeo...'}
              </span>
            ) : (
              'Arraste sua Música, Fita ou Vídeo MP4 aqui para Masterizar'
            )}
          </h3>

          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Suporta <strong className="text-slate-300">WAV, MP3, FLAC, M4A, AAC, AIFF</strong> e vídeos <strong className="text-cyan-300">MP4, MPG4, MOV, WebM</strong>.
            Compatível com estúdio em alta resolução até <span className="text-amber-300 font-semibold font-mono">192 kHz / 24-bit</span> e 32-bit float, preservando a taxa nativa de entrada sem resampling forçado.
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5 w-full">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md shadow-cyan-500/20 min-h-[44px] flex items-center justify-center cursor-pointer w-full sm:w-auto"
            >
              Selecionar Arquivo (Áudio ou Vídeo MP4)
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenSplitStereoModal) {
                  onOpenSplitStereoModal();
                } else {
                  splitStereoInputRef.current?.click();
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-h-[44px] w-full sm:w-auto"
              title="Selecione os dois arquivos .L e .R do Pro Tools para uni-los em um estéreo de 2 canais"
            >
              <GitFork className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Unir Split Pro Tools (.L e .R)</span>
            </button>

            {onOpenBatch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBatch();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] w-full sm:w-auto cursor-pointer"
              >
                <FolderDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Processar Fitas / Mídias em Lote</span>
              </button>
            )}

            <span className="text-[11px] font-mono text-slate-500 block sm:inline w-full sm:w-auto text-center mt-1 sm:mt-0">
              ou arraste arquivos individuais / em lote aqui
            </span>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-3xl text-left">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>192 kHz / 24-bit Nativo:</strong> Resolução de estúdio master preservada sem conversão destrutiva.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Vídeos MP4 / MPG4:</strong> Extrai o áudio com duração idêntica para sincronia perfeita na pós-produção.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Teto True-Peak & LUFS:</strong> Calibração precisa para YouTube, cinema e streaming.</span>
            </div>
          </div>
        </div>
      ) : (
        // State 2: High-end hardware telemetry card when audio IS loaded
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Active file card (8 cols on XL, 7 cols on LG) */}
          <div className="lg:col-span-7 xl:col-span-8 p-4 rounded-xl bg-[#12192b] border border-cyan-500/40 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-800/60">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                  <Music2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate" title={currentTrackTitle}>
                    {currentTrackTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                      MÚSICA CARREGADA
                    </span>
                    {detectedPlatformName && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${
                          (overallAiProbability ?? 0) > 40
                            ? 'text-amber-300 bg-amber-950/50 border-amber-600/30'
                            : 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40'
                        }`}
                      >
                        {(overallAiProbability ?? 0) > 40
                          ? `${detectedPlatformName} (${overallAiProbability?.toFixed(0)}% IA)`
                          : `${detectedPlatformName}`}
                      </span>
                    )}
                    {currentPresetName && (
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded border text-cyan-300 bg-cyan-950/60 border-cyan-500/40 flex items-center gap-1 font-semibold whitespace-nowrap"
                        title="Preset de masterização selecionado e atuando"
                      >
                        <Bookmark className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Preset: {currentPresetName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons with wrapping and guaranteed visible labels */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSplitStereoModal) {
                      onOpenSplitStereoModal();
                    } else {
                      splitStereoInputRef.current?.click();
                    }
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/50 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Unir dois canais mono (.L e .R) do Pro Tools em estéreo de 2 canais"
                >
                  <GitFork className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unir Split .L/.R</span>
                </button>

                {onReanalyze && (
                  <button
                    type="button"
                    onClick={onReanalyze}
                    disabled={isAnalyzing}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/50 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Recalcular triagem forense com as medições acústicas orgânicas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Reanalisar</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                    fileInputRef.current?.click();
                  }}
                  className="text-xs font-semibold text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
                  title="Carregar outro arquivo de áudio ou fita"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trocar Música</span>
                </button>
              </div>
            </div>

            {/* Input Specs Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
              <div className="p-2 rounded-lg bg-[#0e1422] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Taxa de Amostragem</span>
                <span className="text-xs font-mono font-bold text-cyan-300 mt-0.5">
                  {audioFormat?.sampleRate ? `${(audioFormat.sampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {audioFormat?.sampleRate ? `${audioFormat.sampleRate} Hz` : '44100 Hz'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#0e1422] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Profundidade Bits</span>
                <span className="text-xs font-mono font-bold text-cyan-300 mt-0.5">
                  {audioFormat?.bitDepth ? `${audioFormat.bitDepth}-bit` : '24-bit'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {audioFormat?.bitDepth === 32 ? 'Float 32-bit' : audioFormat?.bitDepth === 24 ? 'Studio Master' : 'PCM Padrão'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#0e1422] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Formato / Codec</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 truncate">
                  {audioFormat?.codec || 'WAV PCM'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {audioFormat?.channels === 1 ? '1 Canal (Mono)' : '2 Canais (Estéreo)'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#0e1422] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Tamanho Arquivo</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                  {audioFormat?.fileSizeBytes ? formatFileSize(audioFormat.fileSizeBytes) : '---'}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">Em Memória</span>
              </div>
            </div>
          </div>

          {/* Export Guarantee Callout (4 cols on XL, 5 cols on LG) */}
          <div className="lg:col-span-5 xl:col-span-4 p-4 rounded-xl bg-[#0f1627] border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 pb-2 border-b border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Fidelidade de Exportação Garantida</span>
            </div>

            <div className="my-2 space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-center justify-between font-mono text-[11px] p-1.5 rounded bg-[#131b2e] border border-slate-800/80">
                <span className="text-slate-400">Taxa de Saída:</span>
                <span className="text-cyan-300 font-bold">
                  {audioFormat?.sampleRate ? `${audioFormat.sampleRate} Hz (Sem Resampling)` : 'Idêntica à Entrada'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] p-1.5 rounded bg-[#131b2e] border border-slate-800/80">
                <span className="text-slate-400">Bits de Saída:</span>
                <span className="text-cyan-300 font-bold">
                  {audioFormat?.bitDepth ? `${audioFormat.bitDepth}-bit WAV (Sem Conversão)` : 'Idêntica à Entrada'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              O masterizador processa em 64-bit float e converte diretamente na taxa e bits originais com teto True-Peak de -0.3 dBFS.
            </p>
          </div>

          {/* Studio AT Standard Export Filename Card (12 cols) */}
          <div className="lg:col-span-12 p-4 rounded-xl bg-[#0f172a]/90 border border-amber-500/30 flex flex-col gap-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Padrão de Nomenclatura de Exportação
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Studio AT
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Gera automaticamente: <code className="text-amber-300 font-mono">[faixa]_[Música] - [Cantor] - AT_[taxa_bit]_[LUFS].wav</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Nº da Faixa:
                </label>
                <input
                  type="text"
                  value={trackNumber}
                  onChange={(e) => onUpdateTrackNumber?.(e.target.value)}
                  placeholder="01"
                  className="px-3 py-1.5 rounded-lg bg-[#090e1a] border border-slate-700 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-6 flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Nome da Música:
                </label>
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => onUpdateSongTitle?.(e.target.value)}
                  placeholder="Nome da Música"
                  className="px-3 py-1.5 rounded-lg bg-[#090e1a] border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Cantor / Artista (opcional):
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => onUpdateArtistName?.(e.target.value)}
                  placeholder="Ex: Tom Jobim (deixe vazio se não houver)"
                  className="px-3 py-1.5 rounded-lg bg-[#090e1a] border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Live Filename Preview */}
            <div className="p-2.5 rounded-lg bg-[#090e1a] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Prévia do arquivo gravado:
              </span>
              <span className="font-mono text-xs font-bold text-amber-300 break-all bg-black/40 px-2.5 py-1 rounded border border-amber-500/20">
                📁 {previewMasterFilename}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
