import React, { useState, useEffect } from 'react';
import {
  TapeDropoutAnalysis,
  TapeDropoutSettings,
  TapeDropoutEvent,
  reconstructTapeDropouts
} from '../audio/tapeDropoutEngine';
import {
  Disc,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Repeat,
  Headphones,
  RotateCcw,
  Sliders,
  Activity,
  Layers,
  HelpCircle,
  Download,
  Info
} from 'lucide-react';

interface TapeDropoutConsoleProps {
  analysis: TapeDropoutAnalysis | null;
  settings: TapeDropoutSettings;
  onUpdateSettings: (newSettings: Partial<TapeDropoutSettings>) => void;
  onReconstruct: () => void;
  onSeek: (timeSeconds: number) => void;
  onPlayFrom?: (timeSeconds: number) => void;
  onTogglePlay?: () => void;
  isCompareOriginal?: boolean;
  onToggleCompareOriginal?: () => void;
  playbackTime: number;
  duration: number;
  isPlaying: boolean;
  hasAudioLoaded: boolean;
  currentTrackTitle: string;
  onExportRestoredWav?: () => void;
  isRestoring?: boolean;
}

export function TapeDropoutConsole({
  analysis,
  settings,
  onUpdateSettings,
  onReconstruct,
  onSeek,
  onPlayFrom,
  onTogglePlay,
  isCompareOriginal = false,
  onToggleCompareOriginal,
  playbackTime,
  duration,
  isPlaying,
  hasAudioLoaded,
  currentTrackTitle,
  onExportRestoredWav,
  isRestoring = false
}: TapeDropoutConsoleProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<'all' | 'L' | 'R' | 'both'>('all');
  const [showExplanation, setShowExplanation] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [loopRange, setLoopRange] = useState<[number, number] | null>(null);

  const filteredEvents = (analysis?.events || []).filter((e) => {
    if (filterChannel === 'all') return true;
    return e.channel === filterChannel;
  });

  const formatMinSec = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAuditionEvent = (ev: TapeDropoutEvent) => {
    setSelectedEventId(ev.id);
    const startSec = Math.max(0, ev.timeSeconds - 0.5);
    const endSec = Math.min(duration || 9999, ev.timeSeconds + 1.5);
    setLoopRange([startSec, endSec]);
    if (onPlayFrom) {
      onPlayFrom(startSec);
    } else {
      onSeek(startSec);
    }
  };

  const handleToggleLoop = () => {
    if (!selectedEventId && analysis?.events && analysis.events.length > 0) {
      handleAuditionEvent(analysis.events[0]);
      setIsLooping(true);
      return;
    }
    setIsLooping((prev) => !prev);
  };

  // Loop around selected dropout region
  useEffect(() => {
    if (!isLooping || !loopRange || !isPlaying) return;
    const [start, end] = loopRange;
    if (playbackTime >= end || playbackTime < start - 0.2) {
      if (onPlayFrom) {
        onPlayFrom(start);
      } else {
        onSeek(start);
      }
    }
  }, [playbackTime, isLooping, loopRange, isPlaying, onPlayFrom, onSeek]);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Educational Explanation of Ampex Full-Track -> Studer A80 Recovery */}
      {showExplanation && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1527] via-[#0f1d38] to-[#0c1527] border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5 border border-cyan-500/40">
              <Disc className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Digitalização de Fita Mono Full-Track Ampex em Studer A80 (2 Pistas)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  RECONSTRUÇÃO 100% ANALÓGICA
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                Como a fita foi originalmente gravada em gravador <strong>Mono Full-Track Ampex</strong> (ocupando toda a largura de 1/4"), as duas cabeças do <strong>Studer A80 (Trilha 1 e Trilha 2)</strong> leem o mesmo sinal musical. Quando um <em>dropout</em> (desprendimento de óxido ou dobra na borda da fita) afeta um canal, o outro canal quase sempre possui o sinal <strong>intacto e preservado</strong>. O AuraTune detecta e enxerta o áudio autêntico do canal limpo com transição cruzada transparente!
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowExplanation(false)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Dedicated Dropout Audition & Real-Time A/B Monitor Control Bar */}
      <div className="p-3.5 rounded-xl bg-[#0b101c] border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!hasAudioLoaded}
            className={`p-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-sm'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 hover:bg-cyan-500/30 shadow-sm'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-emerald-400" /> : <Play className="w-4 h-4 fill-cyan-400" />}
            <span>{isPlaying ? 'PAUSAR' : 'REPRODUZIR'}</span>
          </button>

          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Tempo de Reprodução</span>
            <span className="text-xs font-mono font-bold text-white">
              {formatMinSec(playbackTime)} <span className="text-slate-500">/</span> {formatMinSec(duration)}
            </span>
          </div>

          {selectedEventId && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
                Dropout: {analysis?.events.find(e => e.id === selectedEventId)?.timeFormatted}
              </span>
              <button
                type="button"
                onClick={handleToggleLoop}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLooping
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/70 shadow-xs'
                    : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
                title="Repetir em loop contínuo o trecho de 2 segundos ao redor da falha"
              >
                <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-amber-400 animate-spin-slow' : ''}`} />
                <span>{isLooping ? 'Loop Ativo (2s)' : 'Loop Dropout (2s)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Audition Mode: Original vs Restored vs Delta Solo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase hidden md:inline">Audição A/B:</span>

          <button
            type="button"
            onClick={() => {
              if (settings.listenDropoutMaskOnly) onUpdateSettings({ listenDropoutMaskOnly: false });
              if (!isCompareOriginal && onToggleCompareOriginal) onToggleCompareOriginal();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompareOriginal && !settings.listenDropoutMaskOnly
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Ouvir o áudio original com a falha audível para comparação"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>ORIGINAL (Com Falha)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (settings.listenDropoutMaskOnly) onUpdateSettings({ listenDropoutMaskOnly: false });
              if (isCompareOriginal && onToggleCompareOriginal) onToggleCompareOriginal();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              !isCompareOriginal && !settings.listenDropoutMaskOnly
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Ouvir o áudio tratado com o dropout corrigido"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>RECONSTRUÍDO (Corrigido)</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ listenDropoutMaskOnly: !settings.listenDropoutMaskOnly })}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.listenDropoutMaskOnly
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/70 ring-1 ring-purple-500/30'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Ouvir exclusivamente a falha/defeito removido em solo absoluto (Delta / Máscara)"
          >
            <Headphones className="w-3.5 h-3.5 text-purple-400" />
            <span>🎧 MÁSCARA DELTA (Solo Falha)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Telemetry & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Telemetry & Health (5 cols) */}
        <div className="lg:col-span-5 bg-[#090d16] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Saúde do Óxido & Telemetria de Dropouts
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              {analysis?.sampleRate ? `${(analysis.sampleRate / 1000).toFixed(1)} kHz Nativo` : '---'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Total de Dropouts
              </span>
              <span className="text-2xl font-mono font-bold text-white mt-0.5">
                {analysis?.totalDropouts ?? 0}
              </span>
              <span className="text-[10px] text-amber-300 font-mono mt-0.5">
                {analysis?.totalDropouts ? 'Interrupções detectadas' : 'Fita íntegra'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Saúde do Óxido
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-300 mt-0.5">
                {analysis?.tapeHealthScore ?? 100}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {analysis?.estimatedOxideDegradation || 'Excelente'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Falhas Canal L (Trk 1)
              </span>
              <span className="text-lg font-mono font-bold text-cyan-300 mt-0.5">
                {analysis?.dropoutsL ?? 0}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                ✓ Reparados via Canal D
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Falhas Canal R (Trk 2)
              </span>
              <span className="text-lg font-mono font-bold text-cyan-300 mt-0.5">
                {analysis?.dropoutsR ?? 0}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                ✓ Reparados via Canal E
              </span>
            </div>
          </div>

          {/* Bilateral / Crease count */}
          <div className="p-3 rounded-lg bg-[#0e1424] border border-slate-800/90 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Dropouts Bilaterais (Ambos os canais):</span>
            <span className="text-amber-300 font-bold">
              {analysis?.dropoutsBoth ?? 0} (Inpainting Espectral)
            </span>
          </div>

          {/* Technical Diagnosis */}
          <div className="p-3 rounded-lg bg-[#121929] border border-slate-800 flex flex-col gap-1.5 text-xs">
            <span className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Diagnóstico do Estado da Fita
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {analysis?.recommendation || 'Carregue uma faixa para analisar a integridade do óxido e detectar dropouts.'}
            </p>
          </div>

          {/* Action Button: Auto-Reconstruct All Dropouts */}
          <button
            onClick={onReconstruct}
            disabled={!hasAudioLoaded || isRestoring}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isRestoring
                ? 'Reconstruindo Dropouts em Andamento...'
                : '⚡ Reconstruir & Corrigir Todos os Dropouts da Fita'}
            </span>
          </button>
        </div>

        {/* Right Column: Engine Parameters & Mode (7 cols) */}
        <div className="lg:col-span-7 bg-[#090d16] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Parâmetros do Reconstrutor de Fita Studer / Ampex
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/40 bg-slate-900"
              />
              <span className="text-[11px] font-mono text-emerald-300">Módulo Ativo</span>
            </label>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              Modo de Operação de Fita
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateSettings({ mode: 'ampex_fulltrack_cross' })}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  settings.mode === 'ampex_fulltrack_cross'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Ampex Full-Track (Cruzado)</span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Enxerta áudio 100% puro do canal oposto (Studer A80).
                </span>
              </button>

              <button
                onClick={() => onUpdateSettings({ mode: 'mono_optimized_sum' })}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  settings.mode === 'mono_optimized_sum'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Soma Mono Anti-Dropout</span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Evita o canal com falha e gera master mono limpo.
                </span>
              </button>

              <button
                onClick={() => onUpdateSettings({ mode: 'stereo_independent' })}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  settings.mode === 'stereo_independent'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold">Estéreo Independente</span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Inpainting espectral para fitas estéreo nativas.
                </span>
              </button>
            </div>
          </div>

          {/* Sliders and Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sensitivity */}
            <div className="space-y-1.5 bg-[#101524] p-3 rounded-lg border border-slate-800">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Sensibilidade de Detecção</span>
                <span className="text-[10px] font-mono text-cyan-300 uppercase font-semibold">
                  {settings.sensitivity}
                </span>
              </label>
              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono pt-1">
                {(['low', 'medium', 'high', 'ultra'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateSettings({ sensitivity: s })}
                    className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                      settings.sensitivity === s
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-[#090d16] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s === 'low' ? 'Baixa' : s === 'medium' ? 'Média' : s === 'high' ? 'Alta' : 'Ultra'}
                  </button>
                ))}
              </div>
            </div>

            {/* Crossfade Window (ms) */}
            <div className="space-y-1.5 bg-[#101524] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  Janela de Crossfade Suave
                </label>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {settings.crossfadeWindowMs} ms
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={settings.crossfadeWindowMs}
                onChange={(e) => onUpdateSettings({ crossfadeWindowMs: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-[9px] text-slate-500 font-mono block">
                Transição cosseno (Hann taper) sem cliques ou artefatos.
              </span>
            </div>
          </div>

          {/* Additional switches */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.restoreHighFreqLoss}
                onChange={(e) => onUpdateSettings({ restoreHighFreqLoss: e.target.checked })}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
              />
              <span>Compensação de Perda de Alta Frequência (Fórmula de Wallace)</span>
            </label>

            {onExportRestoredWav && (
              <button
                onClick={onExportRestoredWav}
                disabled={!hasAudioLoaded}
                className="px-3 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar WAV Corrigido</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Timeline Strip of Dropouts */}
      <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Linha do Tempo Visual de Dropouts da Fita ({filteredEvents.length} eventos)
            </h4>
          </div>

          {/* Filter by channel */}
          <div className="flex items-center gap-1 bg-[#101726] p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
            <span className="text-slate-500 px-1">Filtrar:</span>
            <button
              onClick={() => setFilterChannel('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterChannel === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Todos ({analysis?.totalDropouts ?? 0})
            </button>
            <button
              onClick={() => setFilterChannel('L')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterChannel === 'L' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Canal E ({analysis?.dropoutsL ?? 0})
            </button>
            <button
              onClick={() => setFilterChannel('R')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterChannel === 'R' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Canal D ({analysis?.dropoutsR ?? 0})
            </button>
            <button
              onClick={() => setFilterChannel('both')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterChannel === 'both' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
              }`}
            >
              Bilateral ({analysis?.dropoutsBoth ?? 0})
            </button>
          </div>
        </div>

        {/* Timeline Bar Canvas Indicator */}
        <div className="relative h-12 w-full bg-[#050811] rounded-lg border border-slate-800/90 overflow-hidden select-none">
          {/* Current Playhead cursor */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              style={{ left: `${Math.min(100, Math.max(0, (playbackTime / duration) * 100))}%` }}
            />
          )}

          {/* Markers for each dropout */}
          {(analysis?.events || []).map((ev) => {
            const leftPct = duration > 0 ? (ev.timeSeconds / duration) * 100 : 0;
            const isSelected = selectedEventId === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => {
                  handleAuditionEvent(ev);
                }}
                className={`absolute top-1 bottom-1 w-2 rounded-sm cursor-pointer transition-all hover:scale-125 z-10 ${
                  isSelected
                    ? 'bg-white ring-2 ring-cyan-400 scale-125 z-30 shadow-lg'
                    : ev.channel === 'L'
                    ? 'bg-rose-500 hover:bg-rose-400'
                    : ev.channel === 'R'
                    ? 'bg-cyan-500 hover:bg-cyan-400'
                    : 'bg-amber-400 hover:bg-amber-300'
                }`}
                style={{ left: `${leftPct}%` }}
                title={`${ev.timeFormatted} (${ev.durationMs}ms, -${ev.depthDb}dB no Canal ${ev.channel}). Clique para ouvir na hora!`}
              />
            );
          })}
        </div>

        {/* Dropout Events List Table */}
        <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-1.5">
          {filteredEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              Nenhum dropout correspondente ao filtro selecionado.
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isSelected = selectedEventId === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    handleAuditionEvent(ev);
                  }}
                  className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#15213b] border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                      : 'bg-[#0b101c] border-slate-800/80 hover:bg-[#101726]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyan-300 font-bold w-20">
                      {ev.timeFormatted}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        ev.channel === 'L'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                          : ev.channel === 'R'
                          ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {ev.channel === 'L'
                        ? 'CANAL E (Trk 1)'
                        : ev.channel === 'R'
                        ? 'CANAL D (Trk 2)'
                        : 'BILATERAL (Ambos)'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Queda: <strong className="text-white">-{ev.depthDb} dB</strong> · Duração: <strong className="text-white">{ev.durationMs} ms</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {ev.channel === 'L'
                        ? 'Copiado de Trk 2'
                        : ev.channel === 'R'
                        ? 'Copiado de Trk 1'
                        : 'Inpainting Hermite'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected && isPlaying && onTogglePlay) {
                          onTogglePlay();
                        } else {
                          handleAuditionEvent(ev);
                        }
                      }}
                      className={`p-1.5 px-3 rounded border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected && isPlaying
                          ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-500/50'
                          : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-800/60 text-cyan-300'
                      }`}
                    >
                      {isSelected && isPlaying ? (
                        <Pause className="w-3 h-3 fill-emerald-300" />
                      ) : (
                        <Play className="w-3 h-3 fill-cyan-400" />
                      )}
                      <span>{isSelected && isPlaying ? 'Pausar' : 'Ouvir'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
