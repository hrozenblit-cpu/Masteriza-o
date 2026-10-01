import React, { useState, useEffect } from 'react';
import {
  SpectralDenoiseSettings,
  NoiseAnalysisTelemetry,
  DEFAULT_DENOISE_SETTINGS,
  CRITICAL_BAND_CENTERS_HZ,
  getStandardTapeNoiseProfile,
} from '../audio/spectralDenoiseEngine';
import {
  Waves,
  Sparkles,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Headphones,
  RotateCcw,
  Zap,
  Activity,
  Download,
  Info,
  Layers,
  Radio,
  Volume2
} from 'lucide-react';

interface TapeDenoiseConsoleProps {
  telemetry: NoiseAnalysisTelemetry | null;
  settings: SpectralDenoiseSettings;
  onUpdateSettings: (newSettings: Partial<SpectralDenoiseSettings>) => void;
  onLearnNoiseProfile: () => void;
  onLearnNoiseProfileAtPlayhead?: () => void;
  onApplyDenoise: () => void;
  onTogglePlay?: () => void;
  onPlayFrom?: (timeSeconds: number) => void;
  isCompareOriginal?: boolean;
  onToggleCompareOriginal?: () => void;
  playbackTime: number;
  duration: number;
  isPlaying: boolean;
  hasAudioLoaded: boolean;
  currentTrackTitle: string;
  onExportDenoisedWav?: () => void;
  isProcessing?: boolean;
}

export function TapeDenoiseConsole({
  telemetry,
  settings,
  onUpdateSettings,
  onLearnNoiseProfile,
  onLearnNoiseProfileAtPlayhead,
  onApplyDenoise,
  onTogglePlay,
  onPlayFrom,
  isCompareOriginal = false,
  onToggleCompareOriginal,
  playbackTime,
  duration,
  isPlaying,
  hasAudioLoaded,
  currentTrackTitle,
  onExportDenoisedWav,
  isProcessing = false,
}: TapeDenoiseConsoleProps) {
  const [showExplanation, setShowExplanation] = useState(true);

  const formatMinSec = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get active profile curve to draw in spectrum
  const activeBands =
    settings.noiseProfileType === 'auto_learned' && settings.learnedNoiseBands && settings.learnedNoiseBands.length > 0
      ? settings.learnedNoiseBands
      : getStandardTapeNoiseProfile(settings.noiseProfileType);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Sonic Solutions NoNoise & iZotope RX Heritage */}
      {showExplanation && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1527] via-[#0f1e38] to-[#0c1527] border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5 border border-cyan-500/40">
              <Waves className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Redutor de Ruído Espectral — Padrão Sonic Solutions NoNoise & iZotope RX
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  SUBTRAÇÃO MULTI-BANDA SEM CHIRPING
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                Inspirado no lendário sistema <strong>Sonic Solutions NoNoise (1988)</strong> e <strong>iZotope RX Spectral De-noise</strong>, o AuraTune emprega subtração espectral por bandas críticas psicoacústicas (Escala Bark). Ele captura a impressão digital do <em>hiss</em> da fita no trecho mais silencioso e atenua seletivamente o ruído contínuo, <strong>blindando os transientes musicais, a respiração vocal e o corpo harmônico natural</strong>, eliminando o indesejável efeito de "água borbulhante" (*musical noise*).
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

      {/* Real-time Audition Bar: Play/Pause, A/B Toggle and Delta Solo */}
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

          {telemetry?.quietestSegmentStartSec !== undefined && (
            <button
              type="button"
              onClick={() => onPlayFrom && onPlayFrom(telemetry.quietestSegmentStartSec)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-[#162035] border border-slate-700 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
              title="Pular para o trecho silencioso de onde o ruído de fita foi capturado"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Ouvir Trecho do Ruído ({formatMinSec(telemetry.quietestSegmentStartSec)})</span>
            </button>
          )}
        </div>

        {/* Audition Mode: Original vs Denoised vs Delta Noise Solo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase hidden md:inline">Modo de Audição:</span>

          <button
            type="button"
            onClick={() => {
              if (settings.listenNoiseDeltaOnly) onUpdateSettings({ listenNoiseDeltaOnly: false });
              if (!isCompareOriginal && onToggleCompareOriginal) onToggleCompareOriginal();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompareOriginal && !settings.listenNoiseDeltaOnly
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Ouvir o áudio original cru com o hiss de fita completo para comparação"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>ORIGINAL (Com Ruído)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (settings.listenNoiseDeltaOnly) onUpdateSettings({ listenNoiseDeltaOnly: false });
              if (isCompareOriginal && onToggleCompareOriginal) onToggleCompareOriginal();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              !isCompareOriginal && !settings.listenNoiseDeltaOnly
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="Ouvir o áudio com a redução espectral de ruído aplicada"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>DENOISED (Ruído Reduzido)</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ listenNoiseDeltaOnly: !settings.listenNoiseDeltaOnly })}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.listenNoiseDeltaOnly
                ? 'bg-purple-500/30 text-purple-200 border border-purple-500/80 ring-1 ring-purple-500/40 shadow-xs animate-pulse'
                : 'bg-[#101524] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
            title="THE RX / NoNoise FEATURE: Ouça exclusivamente o ruído e hiss que estão sendo extraídos. Se ouvir vocais ou instrumentos aqui, reduza o limiar!"
          >
            <Headphones className="w-3.5 h-3.5 text-purple-400" />
            <span>🎧 MÁSCARA DELTA (Ouvir Ruído Removido)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Spectrum & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Multi-Band Noise Profile Display & Telemetry (6 cols) */}
        <div className="lg:col-span-6 bg-[#090d16] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">
                Curva de Impressão Digital do Ruído (20 Hz - 22 kHz)
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              64 Bandas Críticas Bark
            </span>
          </div>

          {/* Visual Frequency Response Curve Canvas (Simulated RTA Noise Floor) */}
          <div className="relative h-44 w-full bg-[#050811] rounded-lg border border-slate-800/90 p-2 flex flex-col justify-between overflow-hidden select-none">
            {/* Grid frequency lines */}
            <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
              <div className="border-r border-slate-600 h-full text-[9px] font-mono text-slate-500 pt-1">100Hz</div>
              <div className="border-r border-slate-600 h-full text-[9px] font-mono text-slate-500 pt-1">1kHz</div>
              <div className="border-r border-slate-600 h-full text-[9px] font-mono text-slate-500 pt-1">5kHz</div>
              <div className="border-r border-slate-600 h-full text-[9px] font-mono text-slate-500 pt-1">10kHz</div>
              <div className="border-r border-slate-600 h-full text-[9px] font-mono text-slate-500 pt-1">20kHz</div>
            </div>

            {/* dB level lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-30 text-[8px] font-mono text-slate-400 pl-1">
              <span>-30 dB</span>
              <span>-50 dB</span>
              <span>-70 dB (Hiss)</span>
              <span>-90 dB</span>
            </div>

            {/* SVG Curve of Noise Profile */}
            <div className="absolute inset-0 flex items-end px-3 pb-3 pt-6">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Attenuation Shaded Area (Red/Purple) */}
                <path
                  d={`M 0,100 ${activeBands
                    .map((db, idx) => {
                      const x = (idx / (activeBands.length - 1)) * 100;
                      // Map -96dB to -30dB into 100 to 0
                      const y = Math.max(0, Math.min(100, ((-db - 30) / 66) * 100));
                      return `L ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')} L 100,100 Z`}
                  className="fill-purple-500/20 stroke-none"
                />

                {/* Noise Fingerprint Curve (Amber line) */}
                <path
                  d={`M 0,${Math.max(0, Math.min(100, ((-activeBands[0] - 30) / 66) * 100))} ${activeBands
                    .map((db, idx) => {
                      const x = (idx / (activeBands.length - 1)) * 100;
                      const y = Math.max(0, Math.min(100, ((-db - 30) / 66) * 100));
                      return `L ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}`}
                  className="stroke-amber-400 stroke-2 fill-none drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                />
              </svg>
            </div>

            {/* Bottom Spectrum Legend */}
            <div className="z-10 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-[#070b16]/80 px-2 py-0.5 rounded">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
                Perfil do Ruído de Fita
              </span>
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="w-2 h-2 bg-purple-500/40 rounded-sm" />
                Zona de Atenuação (-{settings.reductionDb.toFixed(1)} dB)
              </span>
            </div>
          </div>

          {/* Noise Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Piso de Hiss</span>
              <span className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                {telemetry ? `${telemetry.hissNoiseFloorDb.toFixed(1)} dBFS` : '-64.0 dBFS'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5">Ruído de altas freq.</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Relação Sinal/Ruído</span>
              <span className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                {telemetry ? `${telemetry.estimatedSnrDb.toFixed(1)} dB` : '42.0 dB'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5">SNR Dinâmico</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#101728] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Redução Sugerida</span>
              <span className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                {telemetry ? `${telemetry.recommendedReductionDb.toFixed(1)} dB` : '8.5 dB'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5">Zero artefatos</span>
            </div>
          </div>

          {/* Learn Noise Profile Buttons & Segment Telemetry */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={onLearnNoiseProfile}
                disabled={!hasAudioLoaded || isProcessing}
                className="flex-1 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-amber-400/25 to-yellow-500/25 hover:from-amber-500/35 hover:to-yellow-500/35 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Localiza o trecho mais silencioso da fita (descartando silêncio digital inicial) e mede a impressão digital de ruído"
              >
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>⚡ Auto-Aprender Fita</span>
              </button>

              {onLearnNoiseProfileAtPlayhead && (
                <button
                  type="button"
                  onClick={onLearnNoiseProfileAtPlayhead}
                  disabled={!hasAudioLoaded || isProcessing}
                  className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-[#121a2c] hover:bg-[#18233b] border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="Captura a impressão digital de ruído exatamente no ponto em que o cursor de reprodução está parado"
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>🎯 Capturar no Cursor ({formatMinSec(playbackTime)})</span>
                </button>
              )}
            </div>

            {telemetry && (
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
                <span>Trecho medido da fita: <strong className="text-amber-300">{formatMinSec(telemetry.quietestSegmentStartSec)}</strong> ({Math.round(telemetry.quietestSegmentDurationSec * 1000)}ms)</span>
                <span className="text-cyan-400">{telemetry.noiseTypeDetected}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: De-noise Settings & Profiles (6 cols) */}
        <div className="lg:col-span-6 bg-[#090d16] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Controles de Atenuação Espectral
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/40 bg-slate-900"
              />
              <span className="text-[11px] font-mono text-emerald-300 font-bold">Módulo Ativo</span>
            </label>
          </div>

          {/* Noise Profile Preset Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">
              Impressão Digital de Ruído da Fita
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'studio_master_15ips' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  settings.noiseProfileType === 'studio_master_15ips'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Master Estúdio 15 ips</span>
                <span className="text-[9px] text-slate-400 leading-tight">Studer A80 / Ampex 456</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'tape_hiss_type1' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  settings.noiseProfileType === 'tape_hiss_type1'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Fita Ferro / Tipo I</span>
                <span className="text-[9px] text-slate-400 leading-tight">Hiss clássico 3k-14k</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'tape_hiss_type2' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  settings.noiseProfileType === 'tape_hiss_type2'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Cromo / Metal Tipo II</span>
                <span className="text-[9px] text-slate-400 leading-tight">Piso plano e suave</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'hum_60hz' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  settings.noiseProfileType === 'hum_60hz'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Ronco AC 60 Hz</span>
                <span className="text-[9px] text-slate-400 leading-tight">Harmônicos 120/180/240Hz</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'hum_50hz' })}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  settings.noiseProfileType === 'hum_50hz'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Ronco AC 50 Hz</span>
                <span className="text-[9px] text-slate-400 leading-tight">Harmônicos 100/150/200Hz</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ noiseProfileType: 'auto_learned' })}
                disabled={!settings.learnedNoiseBands}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer disabled:opacity-40 ${
                  settings.noiseProfileType === 'auto_learned'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                    : 'bg-[#101524] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-bold">Perfil Capturado</span>
                <span className="text-[9px] text-slate-400 leading-tight">
                  {settings.learnedNoiseBands ? 'Impressão da sua fita' : 'Requer clicar em Aprender'}
                </span>
              </button>
            </div>
          </div>

          {/* Precision Sliders */}
          <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
            {/* Reduction Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Redução de Ruído (Noise Reduction):</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {settings.reductionDb.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={settings.reductionDb}
                onChange={(e) => onUpdateSettings({ reductionDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 dB (Desligado)</span>
                <span className="text-emerald-400 font-bold">6 - 12 dB (Audiófilo Transparente)</span>
                <span>24 dB (Máximo)</span>
              </div>
            </div>

            {/* Threshold Offset */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Sensibilidade do Limiar (Threshold):</span>
                <span className="text-amber-300 font-bold">
                  {settings.thresholdOffsetDb > 0 ? '+' : ''}
                  {settings.thresholdOffsetDb.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={settings.thresholdOffsetDb}
                onChange={(e) => onUpdateSettings({ thresholdOffsetDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-10 dB (Conservador)</span>
                <span>0.0 dB (Padrão)</span>
                <span>+10 dB (Agressivo)</span>
              </div>
            </div>

            {/* Temporal Smoothing */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Suavização Temporal (Anti-Musical Noise):</span>
                <span className="text-purple-300 font-bold">{settings.smoothingMs} ms</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                step="5"
                value={settings.smoothingMs}
                onChange={(e) => onUpdateSettings({ smoothingMs: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>15 ms (Rápido)</span>
                <span className="text-purple-300 font-bold">35 ms (Recomendado)</span>
                <span>80 ms (Suave)</span>
              </div>
            </div>
          </div>

          {/* Action Row: Export WAV and Apply button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            {onExportDenoisedWav && (
              <button
                type="button"
                onClick={onExportDenoisedWav}
                disabled={!hasAudioLoaded}
                className="px-3 py-2 rounded-lg bg-[#121929] hover:bg-[#18233a] border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar WAV Denoised</span>
              </button>
            )}

            <button
              type="button"
              onClick={onApplyDenoise}
              disabled={!hasAudioLoaded || isProcessing}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Processando Redução...' : '⚡ Aplicar Denoise na Masterização'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
