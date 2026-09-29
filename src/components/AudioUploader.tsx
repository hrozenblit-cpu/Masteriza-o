import React, { useRef } from 'react';
import { UploadCloud, Radio, Disc3, Layers, Info, Sparkles, CheckCircle2, Music2, Cpu, FolderDown, FileText, Tag, User } from 'lucide-react';
import { AudioInputFormat } from '../audio/audioFormatDetector';
import { buildMasterWavFilename } from '../audio/trackNamingHelper';

interface AudioUploaderProps {
  currentTrackTitle: string;
  isAnalyzing: boolean;
  onFileUpload: (file: File) => void;
  onMultipleFilesUpload?: (files: FileList) => void;
  onOpenBatch?: () => void;
  isStemMode: boolean;
  setIsStemMode: (stemMode: boolean) => void;
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
}

export function AudioUploader({
  currentTrackTitle,
  isAnalyzing,
  onFileUpload,
  onMultipleFilesUpload,
  onOpenBatch,
  isStemMode,
  setIsStemMode,
  audioFormat,
  overallAiProbability,
  detectedPlatformName,
  hasAudioLoaded,
  trackNumber = '01',
  onUpdateTrackNumber,
  songTitle = '',
  onUpdateSongTitle,
  artistName = '',
  onUpdateArtistName,
  targetLufs = -14,
}: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const previewMasterFilename = buildMasterWavFilename({
    trackNumber,
    songTitle: songTitle || currentTrackTitle.replace(/\.[^/.]+$/, ''),
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 1 && onMultipleFilesUpload) {
      onMultipleFilesUpload(e.dataTransfer.files);
    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 1 && onMultipleFilesUpload) {
      onMultipleFilesUpload(e.target.files);
    } else if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col gap-4 shadow-lg">
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

        {/* Stem vs Master mode switch */}
        <div className="flex items-center gap-1 bg-[#131a2c] p-1 rounded-lg border border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setIsStemMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              !isStemMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5 text-cyan-400" />
            Masterização Estéreo
          </button>
          <button
            onClick={() => setIsStemMode(true)}
            disabled={!hasAudioLoaded}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isStemMode
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Mixer de Stems
          </button>
        </div>
      </div>

      {/* Main Drag-and-Drop Area & Audio Specs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.aiff,.aif,.mp4,.mpg4,.mov,.m4v,.webm,.mkv"
        onChange={handleFileInput}
        className="hidden"
      />

      {!hasAudioLoaded ? (
        // State 1: Clean, spacious dropzone when no audio is loaded
        <div
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.005]'
              : 'border-dashed border-cyan-500/30 hover:border-cyan-400 bg-[#121828]/50 hover:bg-[#141b2e]'
          }`}
        >
          <div className="p-4 rounded-2xl bg-cyan-400/10 text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all mb-3 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-white tracking-wide">
            {isAnalyzing ? 'Carregando e Analisando Áudio/Vídeo...' : 'Arraste sua Música, Fita ou Vídeo MP4 aqui para Masterizar'}
          </h3>

          <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Suporta <strong className="text-slate-300">WAV, MP3, FLAC, M4A, AAC, AIFF</strong> e vídeos <strong className="text-cyan-300">MP4, MPG4, MOV, WebM</strong>.
            Totalmente compatível com estúdio em alta resolução até <span className="text-amber-300 font-semibold font-mono">192 kHz / 24-bit</span> e 32-bit float, preservando a taxa nativa de entrada sem resampling forçado.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md shadow-cyan-500/20"
            >
              Selecionar Arquivo (Áudio ou Vídeo MP4)
            </button>

            {onOpenBatch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBatch();
                }}
                className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs tracking-tight transition-all flex items-center gap-1.5 shadow-sm"
              >
                <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Processar Fitas / Mídias em Lote</span>
              </button>
            )}

            <span className="text-[11px] font-mono text-slate-500">ou arraste arquivos individuais / em lote aqui</span>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
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
          {/* Active file card (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#12192b] border border-cyan-500/40 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Music2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      MÚSICA CARREGADA
                    </span>
                    {detectedPlatformName && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
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
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 truncate max-w-[340px] sm:max-w-[420px]">
                    {currentTrackTitle}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2.5 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/50 transition-colors shrink-0"
              >
                Trocar Música
              </button>
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

          {/* Export Guarantee Callout (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-[#0f1627] border border-slate-800 flex flex-col justify-between">
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
