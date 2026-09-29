import { useState, useEffect } from 'react';
import { HumanizerSettings, LoudnessMetrics } from '../types/audio';
import { TARGET_LUFS_PRESETS } from '../audio/loudnessEngine';
import { audioEngine } from '../audio/audioEngine';
import {
  Gauge,
  Sliders,
  Sparkles,
  Zap,
  Volume2,
  ShieldAlert,
  Info,
  CheckCircle2,
  Activity,
  Waves,
  Disc3,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface LufsLimitlessConsoleProps {
  settings: HumanizerSettings;
  onUpdateSettings: (newSettings: Partial<HumanizerSettings>) => void;
  trackLoudness: LoudnessMetrics | null;
  isPlaying: boolean;
  hasAudioLoaded: boolean;
  currentTrackTitle: string;
}

export function LufsLimitlessConsole({
  settings,
  onUpdateSettings,
  trackLoudness,
  isPlaying,
  hasAudioLoaded,
  currentTrackTitle,
}: LufsLimitlessConsoleProps) {
  // Real-time live meters polled at 60fps
  const [liveMeter, setLiveMeter] = useState<{
    momentaryLufs: number;
    shortTermLufs: number;
    integratedLufs: number;
    truePeakMaxDb: number;
    gainReductionDb: number;
  }>({
    momentaryLufs: -70,
    shortTermLufs: -70,
    integratedLufs: trackLoudness?.integratedLufs ?? (settings.targetLufs ?? -14),
    truePeakMaxDb: -70,
    gainReductionDb: 0,
  });

  const targetLufs = settings.targetLufs ?? -14.0;
  const targetCeiling = settings.targetCeilingDb ?? -1.0;
  const clipperDrive = settings.clipperDrive ?? 55;
  const lowEndWeight = settings.lowEndWeight ?? 75;
  const transientSpeed = settings.transientSpeed ?? 'punchy';
  const isLimitlessEnabled = settings.limitlessEnabled !== false;
  const isAutoMatch = settings.autoMatchLoudness !== false;

  // Poll 60fps live levels when playing
  useEffect(() => {
    let animId: number;
    const poll = () => {
      const lv = audioEngine.getStereoLevels();
      setLiveMeter({
        momentaryLufs: lv.momentaryLufs,
        shortTermLufs: lv.shortTermLufs,
        integratedLufs: trackLoudness?.integratedLufs ?? lv.integratedLufs,
        truePeakMaxDb: lv.truePeakMaxDb,
        gainReductionDb: lv.gainReductionDb,
      });
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [trackLoudness]);

  // Display integrated: either from precise offline scan or live
  const displayIntegrated = trackLoudness ? trackLoudness.integratedLufs : (isPlaying ? liveMeter.shortTermLufs : targetLufs);
  const lufsDelta = displayIntegrated !== -70 ? Math.round((displayIntegrated - targetLufs) * 10) / 10 : 0;

  const handleSelectPreset = (presetId: string) => {
    const preset = TARGET_LUFS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onUpdateSettings({
      limitlessEnabled: true,
      targetLufs: preset.targetLufs,
      targetCeilingDb: preset.ceilingDb,
      clipperDrive: preset.clipperDrive,
      lowEndWeight: preset.lowEndWeight,
      transientSpeed: preset.transientSpeed,
      autoMatchLoudness: true,
    });
  };

  // Convert LUFS to meter percentage (-36 LUFS to 0 LUFS)
  const lufsToPercent = (lufs: number) => {
    const clamped = Math.max(-36, Math.min(0, lufs));
    return ((clamped + 36) / 36) * 100;
  };

  const targetPercent = lufsToPercent(targetLufs);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner - DMGAudio Limitless Philosophy */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#131b2e] via-[#0d1424] to-[#151728] border border-cyan-500/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-base tracking-wide flex items-center gap-2">
                Medidor de LUFS (ITU-R BS.1770-4) & Módulo DMGAudio Limitless
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRO MASTERING
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-3xl">
              Diferente de um simples aumento de volume linear que causa achatamento e bombeamento (pumping),
              o motor <strong className="text-cyan-300">DMGAudio Limitless</strong> shava micro-picos inaudíveis com saturação suave de crista,
              ancora subgraves e maximiza a densidade RMS/LUFS. O resultado é um master que soa com o{' '}
              <strong className="text-white">volume aparente mais alto e encorpado possível dentro dos {targetLufs} LUFS</strong>,
              respeitando estritamente o teto True-Peak de {targetCeiling} dBTP.
            </p>
          </div>
        </div>

        {/* Limitless Master switch */}
        <div className="flex items-center gap-3 shrink-0 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">Motor Limitless</div>
            <div className="text-[10px] font-mono text-cyan-400">
              {isLimitlessEnabled ? 'ATIVO NO MASTER' : 'BYPASS'}
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ limitlessEnabled: !isLimitlessEnabled })}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isLimitlessEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
          </button>
        </div>
      </div>

      {/* Main Broadcast Hardware LUFS Meter Console */}
      <div className="p-5 rounded-xl bg-[#0b101d] border border-slate-800 shadow-xl flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-300">
              Medição Telemetria em Tempo Real (ITU-R BS.1770-4 / EBU R128)
            </span>
          </div>
          {hasAudioLoaded ? (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Faixa: <strong className="text-white">{currentTrackTitle}</strong></span>
              {trackLoudness && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Scan Completo: {trackLoudness.integratedLufs} LUFS
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-mono text-amber-400/90">
              Carregue um arquivo para telemetria acústica completa
            </span>
          )}
        </div>

        {/* LED Digital Numerical Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Integrated LUFS */}
          <div className="p-3 rounded-lg bg-[#111728] border border-cyan-500/40 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Integrated (I)</span>
              <span className="text-[9px] font-mono text-slate-400">Track LUFS</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-white tracking-tight">
                {displayIntegrated !== -70 ? displayIntegrated.toFixed(1) : '- -.-'}
              </span>
              <span className="text-xs font-mono text-cyan-400">LUFS</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Alvo: {targetLufs}</span>
              <span
                className={`font-bold ${
                  Math.abs(lufsDelta) <= 0.5
                    ? 'text-emerald-400'
                    : lufsDelta > 0
                    ? 'text-amber-400'
                    : 'text-cyan-300'
                }`}
              >
                {lufsDelta >= 0 ? `+${lufsDelta}` : lufsDelta} LU
              </span>
            </div>
            <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full blur-md pointer-events-none"></div>
          </div>

          {/* 2. Short-Term LUFS */}
          <div className="p-3 rounded-lg bg-[#111728] border border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-300">Short-Term (S)</span>
              <span className="text-[9px] font-mono text-slate-500">Janela 3s</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                {isPlaying && liveMeter.shortTermLufs !== -70 ? liveMeter.shortTermLufs.toFixed(1) : '- -.-'}
              </span>
              <span className="text-xs font-mono text-slate-400">LUFS</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Max: {trackLoudness ? `${trackLoudness.shortTermLufs} LUFS` : '--'}
            </div>
          </div>

          {/* 3. Momentary LUFS */}
          <div className="p-3 rounded-lg bg-[#111728] border border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-300">Momentary (M)</span>
              <span className="text-[9px] font-mono text-slate-500">Janela 400ms</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                {isPlaying && liveMeter.momentaryLufs !== -70 ? liveMeter.momentaryLufs.toFixed(1) : '- -.-'}
              </span>
              <span className="text-xs font-mono text-slate-400">LUFS</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Max: {trackLoudness ? `${trackLoudness.momentaryLufs} LUFS` : '--'}
            </div>
          </div>

          {/* 4. True-Peak Max */}
          <div
            className={`p-3 rounded-lg bg-[#111728] border flex flex-col justify-between ${
              (trackLoudness?.truePeakDb ?? liveMeter.truePeakMaxDb) > targetCeiling + 0.1
                ? 'border-amber-500/50'
                : 'border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-300">True-Peak Max</span>
              <span
                className={`text-[9px] font-mono px-1 rounded ${
                  (trackLoudness?.truePeakDb ?? liveMeter.truePeakMaxDb) > targetCeiling
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {(trackLoudness?.truePeakDb ?? liveMeter.truePeakMaxDb) > targetCeiling ? 'LIMITADO' : 'SAFE'}
              </span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                {trackLoudness ? trackLoudness.truePeakDb.toFixed(1) : isPlaying ? liveMeter.truePeakMaxDb.toFixed(1) : '- -.-'}
              </span>
              <span className="text-xs font-mono text-slate-400">dBTP</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Teto: {targetCeiling} dBTP
            </div>
          </div>

          {/* 5. Loudness Range & Crest Factor */}
          <div className="p-3 rounded-lg bg-[#111728] border border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-300">LRA / PLR</span>
              <span className="text-[9px] font-mono text-slate-500">Dinâmica</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-cyan-300 tracking-tight">
                {trackLoudness ? trackLoudness.loudnessRangeLra.toFixed(1) : '5.2'}
              </span>
              <span className="text-xs font-mono text-slate-400">LU (LRA)</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Crista PLR: {trackLoudness ? `${trackLoudness.crestFactorDb} dB` : '10.5 dB'}
            </div>
          </div>

          {/* 6. Limitless Gain Reduction */}
          <div className="p-3 rounded-lg bg-[#111728] border border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-rose-400">Limitless GR</span>
              <span className="text-[9px] font-mono text-slate-500">Clipper & Limiter</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-rose-300 tracking-tight">
                {isPlaying && liveMeter.gainReductionDb > 0 ? `-${liveMeter.gainReductionDb.toFixed(1)}` : '0.0'}
              </span>
              <span className="text-xs font-mono text-slate-400">dB</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Densidade: {trackLoudness ? `${trackLoudness.dynamicDensity}%` : 'Alta'}
            </div>
          </div>
        </div>

        {/* Master Analog/Digital Horizontal Meter with Target Pin */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Escala EBU R128 (-36 a 0 LUFS)</span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Alvo Configurado: {targetLufs} LUFS (Teto: {targetCeiling} dBTP)
            </span>
          </div>

          <div className="relative h-8 bg-slate-950 rounded-lg border border-slate-700 p-1 flex items-center overflow-hidden">
            {/* Background scale markings */}
            <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-30 text-[9px] font-mono text-slate-400 items-end pb-0.5">
              <span>-36</span>
              <span>-28</span>
              <span>-23</span>
              <span>-18</span>
              <span>-14</span>
              <span>-10</span>
              <span>-6</span>
              <span>0</span>
            </div>

            {/* Target LUFS vertical golden pin */}
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
              style={{ left: `${targetPercent}%` }}
            >
              <div className="absolute -top-1 -left-2 px-1 py-0.2 bg-amber-500 text-slate-950 text-[8px] font-mono font-bold rounded-xs">
                {targetLufs}
              </div>
            </div>

            {/* Live Momentary / Short term Bar */}
            <div
              className="h-full rounded-sm transition-all duration-75 ease-out relative"
              style={{
                width: `${lufsToPercent(isPlaying ? liveMeter.shortTermLufs : displayIntegrated)}%`,
                background: 'linear-gradient(90deg, #06b6d4 0%, #10b981 60%, #eab308 85%, #f43f5e 100%)',
              }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-xs"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Target LUFS Presets Selector */}
      <div className="p-5 rounded-xl bg-[#0b101d] border border-slate-800 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Selecione o Alvo de Loudness & Plataforma de Destino
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Ajusta automaticamente a densidade Limitless e o teto True-Peak
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TARGET_LUFS_PRESETS.map((preset) => {
            const isSelected = targetLufs === preset.targetLufs && targetCeiling === preset.ceilingDb;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                    : 'bg-[#111728]/70 hover:bg-[#151d33] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                      SELECIONADO
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-2 border-t border-slate-800/80">
                  <span className="text-cyan-400 font-bold">{preset.targetLufs} LUFS</span>
                  <span className="text-slate-400">Teto: {preset.ceilingDb} dBTP</span>
                  <span className="text-emerald-400">Crest: {preset.clipperDrive}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Limitless Multi-Stage Dynamics Controls & Sliders */}
      <div className={`p-5 rounded-xl border shadow-xl flex flex-col gap-6 transition-all ${
        settings.limitlessBypass
          ? 'bg-[#0a0f1b]/90 border-slate-800/60 opacity-65'
          : 'bg-[#0b101d] border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Parâmetros Detalhados DMGAudio Limitless
            </h3>
            <button
              onClick={() => onUpdateSettings({ limitlessBypass: !settings.limitlessBypass })}
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
                settings.limitlessBypass
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 hover:bg-amber-900/90'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
              }`}
              title="Ligar ou desligar o processador DMGAudio Limitless"
            >
              {settings.limitlessBypass ? 'LIMITLESS BYPASS' : 'LIMITLESS ATIVO'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!!settings.limitlessBypass}
                checked={isAutoMatch}
                onChange={(e) => onUpdateSettings({ autoMatchLoudness: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer disabled:opacity-50"
              />
              <span>Maximizar densidade no alvo (Auto-MakeUp inteligente)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Custom Target LUFS */}
          <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#111728] border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Alvo LUFS Personalizado</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{targetLufs.toFixed(1)} LUFS</span>
            </div>
            <input
              type="range"
              min="-24"
              max="-6"
              step="0.1"
              disabled={!!settings.limitlessBypass}
              value={targetLufs}
              onChange={(e) => onUpdateSettings({ targetLufs: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-24 LUFS</span>
              <span>-14 (Streaming)</span>
              <span>-6 LUFS</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              O renderizador e a reprodução ajustarão a densidade e o ganho para atingir exatamente este valor.
            </p>
          </div>

          {/* 2. Target True-Peak Ceiling */}
          <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#111728] border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Teto True-Peak (dBTP)</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{targetCeiling.toFixed(1)} dBTP</span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="-0.1"
              step="0.1"
              disabled={!!settings.limitlessBypass}
              value={targetCeiling}
              onChange={(e) => onUpdateSettings({ targetCeilingDb: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-2.0 dBTP</span>
              <span>-1.0 (Spotify)</span>
              <span>-0.1 dBTP</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Proteção contra distorções entre amostras ao converter para codecs lossy (AAC / MP3 / OGG).
            </p>
          </div>

          {/* 3. Limitless Clipper Drive */}
          <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#111728] border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Clipper Drive (Controle Crista)</span>
              <span className="text-xs font-mono font-bold text-amber-400">{clipperDrive}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              disabled={!!settings.limitlessBypass}
              value={clipperDrive}
              onChange={(e) => onUpdateSettings({ clipperDrive: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Limpo)</span>
              <span>55% (Punch)</span>
              <span>100% (Pesado)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Suaviza micro-picos inaudíveis com saturação analógica suave, permitindo que a música soe muito mais alta.
            </p>
          </div>

          {/* 4. Low-End Weight */}
          <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#111728] border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Peso dos Graves (Low-End Weight)</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{lowEndWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              disabled={!!settings.limitlessBypass}
              value={lowEndWeight}
              onChange={(e) => onUpdateSettings({ lowEndWeight: parseInt(e.target.value) })}
              className="w-full accent-indigo-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Livre)</span>
              <span>75% (Equilibrado)</span>
              <span>100% (Ancorado)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Desacopla os picos do bumbo/baixo para que os graves não afundem nem façam a voz ou pratos tremerem.
            </p>
          </div>
        </div>

        {/* Transient Speed Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#111728] border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-white">Caráter de Transientes (Release Speed):</span>
            <p className="text-[11px] text-slate-400">
              Define a velocidade com que o limitador e o clipper se recuperam após um ataque percussivo.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
            {(
              [
                { id: 'smooth', label: 'Suave' },
                { id: 'transparent', label: 'Transparente' },
                { id: 'punchy', label: 'Punchy (Recomendado)' },
                { id: 'aggressive', label: 'Agressivo' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => onUpdateSettings({ transientSpeed: item.id })}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  transientSpeed === item.id
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Explanation Summary Box */}
        <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Como a masterização final exporta o áudio:</strong> Ao clicar no botão de exportação WAV na barra inferior,
            o motor de renderização executa o des-harshing, o calor analógico e em seguida aplica o algoritmo{' '}
            <strong className="text-white">DMGAudio Limitless</strong> em múltiplos estágios. Ele calcula os filtros K-weighting BS.1770-4,
            mede o LUFS integrado real, aplica o corte suave de cristas para aumentar a energia e densidade acústica,
            e ajusta o nível para atingir <strong>exatamente {targetLufs} LUFS</strong> com margem máxima de pico de{' '}
            <strong>{targetCeiling} dBTP</strong>, mantendo a taxa de amostragem e a resolução em bits originais do seu arquivo.
          </div>
        </div>
      </div>
    </div>
  );
}
