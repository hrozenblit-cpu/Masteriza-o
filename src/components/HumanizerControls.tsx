import { HumanizerSettings, LoudnessMetrics } from '../types/audio';
import { Sparkles, Sliders, Waves, Wind, Volume2, RotateCcw, ShieldCheck, Flame, Disc, Radio, Mic, Zap, Gauge, ArrowRight, Bookmark } from 'lucide-react';

interface HumanizerControlsProps {
  settings: HumanizerSettings;
  onUpdateSettings: (newSettings: Partial<HumanizerSettings>) => void;
  isCompareOriginal: boolean;
  onToggleCompareOriginal: () => void;
  onNavigateToLufs?: () => void;
  onNavigateToAzimuth?: () => void;
  onOpenPresets?: () => void;
  trackLoudness?: LoudnessMetrics | null;
}

export function HumanizerControls({
  settings,
  onUpdateSettings,
  isCompareOriginal,
  onToggleCompareOriginal,
  onNavigateToLufs,
  onNavigateToAzimuth,
  onOpenPresets,
  trackLoudness,
}: HumanizerControlsProps) {

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'mastering_cristalino':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 55,
          notchFrequencyHz: 3400,
          notchBandwidthQ: 2.5,
          tapeWarmth: 40,
          tubeHarmonics: 35,
          lowMidBody: 1.2,
          transientPunch: 60,
          attackDeSmear: 50,
          timingJitterMs: 6,
          flutterWowRate: 20,
          airExciterGain: 65,
          airCutoffHz: 14500,
          stereoCorrelationFix: 70,
          monoBassCutoffHz: 140,
          acousticRoomSpread: 45,
          outputGainDb: 0,
        });
        break;

      case 'punch_analog':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 45,
          notchFrequencyHz: 3200,
          notchBandwidthQ: 2.2,
          tapeWarmth: 75,
          tubeHarmonics: 60,
          lowMidBody: 2.8,
          transientPunch: 85,
          attackDeSmear: 65,
          timingJitterMs: 12,
          flutterWowRate: 35,
          airExciterGain: 55,
          airCutoffHz: 15000,
          stereoCorrelationFix: 65,
          monoBassCutoffHz: 150,
          acousticRoomSpread: 40,
          outputGainDb: 0.5,
        });
        break;

      case 'club_bass':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 50,
          notchFrequencyHz: 3600,
          notchBandwidthQ: 2.8,
          tapeWarmth: 65,
          tubeHarmonics: 50,
          lowMidBody: 2.2,
          transientPunch: 90,
          attackDeSmear: 70,
          timingJitterMs: 8,
          flutterWowRate: 20,
          airExciterGain: 75,
          airCutoffHz: 15500,
          stereoCorrelationFix: 85,
          monoBassCutoffHz: 160,
          acousticRoomSpread: 50,
          outputGainDb: 0.5,
        });
        break;

      case 'vocal_shine':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 80,
          notchFrequencyHz: 3400,
          notchBandwidthQ: 3.2,
          tapeWarmth: 45,
          tubeHarmonics: 40,
          lowMidBody: 1.0,
          transientPunch: 50,
          attackDeSmear: 55,
          timingJitterMs: 8,
          flutterWowRate: 25,
          airExciterGain: 80,
          airCutoffHz: 14000,
          stereoCorrelationFix: 75,
          monoBassCutoffHz: 130,
          acousticRoomSpread: 55,
          outputGainDb: 0,
        });
        break;

      case 'vintage_tape':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 40,
          notchFrequencyHz: 3000,
          notchBandwidthQ: 2.0,
          tapeWarmth: 85,
          tubeHarmonics: 70,
          lowMidBody: 3.2,
          transientPunch: 55,
          attackDeSmear: 40,
          timingJitterMs: 18,
          flutterWowRate: 55,
          airExciterGain: 40,
          airCutoffHz: 14000,
          stereoCorrelationFix: 60,
          monoBassCutoffHz: 130,
          acousticRoomSpread: 35,
          outputGainDb: 0,
        });
        break;

      case 'ai_rescue':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 75,
          notchFrequencyHz: 3400,
          notchBandwidthQ: 3.0,
          tapeWarmth: 60,
          tubeHarmonics: 45,
          lowMidBody: 1.8,
          transientPunch: 75,
          attackDeSmear: 65,
          timingJitterMs: 10,
          flutterWowRate: 35,
          airExciterGain: 70,
          airCutoffHz: 15000,
          stereoCorrelationFix: 80,
          monoBassCutoffHz: 150,
          acousticRoomSpread: 50,
          outputGainDb: 0,
        });
        break;

      case 'reset':
        onUpdateSettings({
          enabled: true,
          deHarshIntensity: 50,
          notchFrequencyHz: 3400,
          notchBandwidthQ: 2.5,
          tapeWarmth: 40,
          tubeHarmonics: 30,
          lowMidBody: 1.0,
          transientPunch: 50,
          attackDeSmear: 45,
          timingJitterMs: 6,
          flutterWowRate: 20,
          airExciterGain: 50,
          airCutoffHz: 15000,
          stereoCorrelationFix: 65,
          monoBassCutoffHz: 140,
          acousticRoomSpread: 40,
          outputGainDb: 0,
        });
        break;
    }
  };

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 md:p-6 flex flex-col gap-6">
      {/* Header bar with presets and A/B switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Console de Masterização & Otimizador de Som
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              DSP 64-BIT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transforme faixas cruas, gravações caseiras ou áudio de IA em um som encorpado, nítido e com volume comercial pronto para streaming.
          </p>
        </div>

        {/* Real-time A/B test toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleCompareOriginal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border shadow-sm ${
              !isCompareOriginal
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 ring-1 ring-amber-500/30'
            }`}
            title="Alternar instantaneamente entre o áudio com masterização e o áudio cru original sem efeitos"
          >
            <span className={`w-2 h-2 rounded-full ${!isCompareOriginal ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {!isCompareOriginal ? '✨ A: Som Masterizado' : '⚠️ B: Original Cru'}
          </button>
        </div>
      </div>

      {/* Preset Bar with Quick Styles */}
      <div className="flex flex-col gap-2 bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Perfis de Masterização & Fita:
          </span>

          <div className="flex items-center gap-2">
            {onOpenPresets && (
              <button
                type="button"
                onClick={onOpenPresets}
                className="text-[11px] font-semibold text-cyan-300 hover:text-white px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bookmark className="w-3 h-3 text-cyan-400" />
                <span>Salvar / Gerenciar Presets</span>
              </button>
            )}

            {onNavigateToAzimuth && (
              <button
                type="button"
                onClick={onNavigateToAzimuth}
                className="text-[11px] font-semibold text-amber-300 hover:text-white px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Disc className="w-3 h-3 text-amber-400" />
                <span>Azimute Tape 1/4"</span>
              </button>
            )}

            <button
              onClick={() => applyPreset('reset')}
              title="Restaurar parâmetros padrão"
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Padrão
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {/* Preset 1: Cristalino */}
          <button
            onClick={() => applyPreset('mastering_cristalino')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              💎 Cristalino
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Pop, Acústico, MPB
            </span>
          </button>

          {/* Preset 2: Punch & Calor */}
          <button
            onClick={() => applyPreset('punch_analog')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-slate-700/80 hover:border-amber-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Punch & Fita
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Rock, Indie, Bandas
            </span>
          </button>

          {/* Preset 3: Clube & Bass */}
          <button
            onClick={() => applyPreset('club_bass')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-slate-700/80 hover:border-emerald-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
              <Disc className="w-3 h-3" />
              Clube & Bass
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Trap, EDM, Funk
            </span>
          </button>

          {/* Preset 4: Vocal Shine */}
          <button
            onClick={() => applyPreset('vocal_shine')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-slate-700/80 hover:border-sky-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Vocal Shine
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Remove som de lata
            </span>
          </button>

          {/* Preset 5: Vintage Tape */}
          <button
            onClick={() => applyPreset('vintage_tape')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-slate-700/80 hover:border-rose-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
              <Radio className="w-3 h-3" />
              Vintage Tape
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Calor rico de fita/vinil
            </span>
          </button>

          {/* Preset 6: Otimizador IA */}
          <button
            onClick={() => applyPreset('ai_rescue')}
            className="px-3 py-2 text-left rounded-lg bg-[#12192c] hover:bg-[#18233f] border border-purple-500/30 hover:border-purple-400/60 transition-all flex flex-col gap-0.5 group"
          >
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Otimizador IA
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
              Salva Suno / Udio
            </span>
          </button>
        </div>
      </div>

      {/* Grid of 6 Studio Mastering Processors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. De-Harshing Cirúrgico & Limpeza (Clarity) */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.deHarshBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              1. Limpeza Cirúrgica (De-Harsh)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ deHarshBypass: !settings.deHarshBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.deHarshBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente o De-Harshing"
              >
                {settings.deHarshBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.deHarshBypass ? 'text-slate-500 line-through' : 'text-amber-400'}`}>
                {settings.deHarshIntensity}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Elimina ressonâncias estridentes, som de caixa metálica e aspereza nos médios-agudos.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Intensidade de Atenuação</span>
              <span className="text-amber-300 font-semibold">
                {settings.deHarshBypass ? '0.0 dB (Bypassed)' : `-${(settings.deHarshIntensity * 0.08).toFixed(1)} dB`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.deHarshBypass}
              value={settings.deHarshIntensity}
              onChange={(e) => onUpdateSettings({ deHarshIntensity: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Frequência Alvo</span>
              <span className="text-white font-semibold">{settings.notchFrequencyHz} Hz</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={2800}
                max={5500}
                step={50}
                disabled={!!settings.deHarshBypass}
                value={settings.notchFrequencyHz}
                onChange={(e) => onUpdateSettings({ notchFrequencyHz: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
              />
            </div>
            {/* Quick target buttons */}
            <div className="flex items-center gap-1 pt-1">
              {[
                { label: '3.4k (Lata Suno)', hz: 3400 },
                { label: '4.2k (Sibilância)', hz: 4200 },
                { label: '2.9k (Médio Áspero)', hz: 2900 },
              ].map((b) => (
                <button
                  key={b.hz}
                  onClick={() => onUpdateSettings({ notchFrequencyHz: b.hz })}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                    settings.notchFrequencyHz === b.hz
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Saturação Analógica & Calor de Fita (Warmth & Body) */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.tapeWarmthBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-rose-400" />
              2. Calor Analógico & Saturação
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ tapeWarmthBypass: !settings.tapeWarmthBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.tapeWarmthBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente o Calor de Fita"
              >
                {settings.tapeWarmthBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.tapeWarmthBypass ? 'text-slate-500 line-through' : 'text-rose-400'}`}>
                {settings.tapeWarmth}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Saturação de fita analógica suave para colar a mixagem e encorpar os médios-graves.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Drive de Fita (Saturação Suave)</span>
              <span className="text-rose-300 font-semibold">{settings.tapeWarmthBypass ? 'Linear (Off)' : `${settings.tapeWarmth}%`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.tapeWarmthBypass}
              value={settings.tapeWarmth}
              onChange={(e) => onUpdateSettings({ tapeWarmth: Number(e.target.value) })}
              className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Corpo em Médios-Graves (220 Hz)</span>
              <span className="text-white font-semibold">
                {settings.tapeWarmthBypass ? '0.0 dB (Off)' : `+${settings.lowMidBody.toFixed(1)} dB`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={0.2}
              disabled={!!settings.tapeWarmthBypass}
              value={settings.lowMidBody}
              onChange={(e) => onUpdateSettings({ lowMidBody: Number(e.target.value) })}
              className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
          </div>
        </div>

        {/* 3. Punch Dinâmico & Transientes (Punch & Attack) */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.transientBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              3. Punch Dinâmico & Transientes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ transientBypass: !settings.transientBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.transientBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente o Punch Dinâmico"
              >
                {settings.transientBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.transientBypass ? 'text-slate-500 line-through' : 'text-cyan-400'}`}>
                {settings.transientPunch}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Restaura o impacto de ataque de bumbos, caixas e violões, limpando transientes borrados.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Ataque & Impacto de Bateria</span>
              <span className="text-cyan-300 font-semibold">{settings.transientBypass ? 'Bypass' : `${settings.transientPunch}%`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.transientBypass}
              value={settings.transientPunch}
              onChange={(e) => onUpdateSettings({ transientPunch: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Nitidez de Transientes (De-Smear)</span>
              <span className="text-white font-semibold">{settings.transientBypass ? 'Bypass' : `${settings.attackDeSmear}%`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.transientBypass}
              value={settings.attackDeSmear}
              onChange={(e) => onUpdateSettings({ attackDeSmear: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
          </div>
        </div>

        {/* 4. Micro-Dinâmica Orgânica (Groove & Feel) */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.timingJitterBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              4. Dinâmica Orgânica & Respiração
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ timingJitterBypass: !settings.timingJitterBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.timingJitterBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente a Dinâmica Orgânica"
              >
                {settings.timingJitterBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.timingJitterBypass ? 'text-slate-500 line-through' : 'text-emerald-400'}`}>
                {settings.timingJitterMs} ms
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Variação orgânica sutil para fazer a música respirar com sensação humana de palco real.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Flutuação Orgânica de Dinâmica</span>
              <span className="text-emerald-300 font-semibold">{settings.timingJitterBypass ? '0 ms (Off)' : `${settings.timingJitterMs} ms`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              disabled={!!settings.timingJitterBypass}
              value={settings.timingJitterMs}
              onChange={(e) => onUpdateSettings({ timingJitterMs: Number(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Movimento Analógico (Wow/Flutter)</span>
              <span className="text-white font-semibold">{settings.timingJitterBypass ? '0% (Off)' : `${settings.flutterWowRate}%`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.timingJitterBypass}
              value={settings.flutterWowRate}
              onChange={(e) => onUpdateSettings({ flutterWowRate: Number(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
          </div>
        </div>

        {/* 5. Abertura Aérea & Brilho Sedoso (Air Band) */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.airExciterBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              5. Abertura Aérea & Brilho Sedoso
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ airExciterBypass: !settings.airExciterBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.airExciterBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente a Abertura Aérea"
              >
                {settings.airExciterBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.airExciterBypass ? 'text-slate-500 line-through' : 'text-sky-400'}`}>
                {settings.airExciterGain}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            High-shelf cristalino para abrir os agudos de pratos e vocais com elegância de estúdio.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Ganho de Brilho Aéreo</span>
              <span className="text-sky-300 font-semibold">
                {settings.airExciterBypass ? '0.0 dB (Off)' : `+${(settings.airExciterGain * 0.04).toFixed(1)} dB`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.airExciterBypass}
              value={settings.airExciterGain}
              onChange={(e) => onUpdateSettings({ airExciterGain: Number(e.target.value) })}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Frequência Inicial do Ar</span>
              <span className="text-white font-semibold">{settings.airCutoffHz} Hz</span>
            </div>
            <input
              type="range"
              min={12000}
              max={17000}
              step={100}
              disabled={!!settings.airExciterBypass}
              value={settings.airCutoffHz}
              onChange={(e) => onUpdateSettings({ airCutoffHz: Number(e.target.value) })}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
          </div>
        </div>

        {/* 6. Imagem Estéreo & Sub-Bass Mono */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
            settings.stereoImageBypass
              ? 'bg-[#0f1422]/60 border-slate-800/60 opacity-60'
              : 'bg-[#111726] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              6. Imagem Estéreo & Mono Bass
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateSettings({ stereoImageBypass: !settings.stereoImageBypass })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  settings.stereoImageBypass
                    ? 'bg-amber-950/70 text-amber-300/90 border-amber-600/50 hover:bg-amber-900/80'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
                title="Ligar/Desligar individualmente a Imagem Estéreo & Mono Bass"
              >
                {settings.stereoImageBypass ? 'BYPASS' : 'ATIVO'}
              </button>
              <span className={`text-[11px] font-mono font-bold ${settings.stereoImageBypass ? 'text-slate-500 line-through' : 'text-indigo-400'}`}>
                {settings.stereoCorrelationFix}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Centraliza os sub-graves em mono (evita cancelamento em caixas/fones) e expande os lados.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Abertura Estéreo & Presença</span>
              <span className="text-indigo-300 font-semibold">{settings.stereoImageBypass ? 'Bypass' : `${settings.stereoCorrelationFix}%`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!!settings.stereoImageBypass}
              value={settings.stereoCorrelationFix}
              onChange={(e) => onUpdateSettings({ stereoCorrelationFix: Number(e.target.value) })}
              className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>Sub-Bass em Mono (Abaixo de)</span>
              <span className="text-white font-semibold">{settings.monoBassCutoffHz} Hz</span>
            </div>
            <input
              type="range"
              min={80}
              max={200}
              disabled={!!settings.stereoImageBypass}
              value={settings.monoBassCutoffHz}
              onChange={(e) => onUpdateSettings({ monoBassCutoffHz: Number(e.target.value) })}
              className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
          </div>
        </div>

        {/* 7. Proteção de Masterização, Medição de LUFS & DMGAudio Limitless */}
        <div
          className={`border rounded-lg p-5 flex flex-col justify-between gap-4 md:col-span-2 lg:col-span-3 transition-all ${
            settings.limitlessBypass
              ? 'bg-[#0c121e]/80 border-slate-800/80 opacity-70'
              : 'bg-[#111726] border-cyan-500/40 bg-gradient-to-r from-[#0b1220] via-[#10172c] to-[#0c1424] shadow-lg'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">
                    7. Master Limiter & Módulo DMGAudio Limitless
                  </span>
                  <button
                    onClick={() => onUpdateSettings({ limitlessBypass: !settings.limitlessBypass })}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                      settings.limitlessBypass
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 hover:bg-amber-900/90'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                    }`}
                    title="Ligar/Desligar individualmente o Limitless Master Limiter"
                  >
                    {settings.limitlessBypass ? 'BYPASS' : 'ATIVO'}
                  </button>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    TARGET LUFS MATCHING
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Maximiza o volume perceptual no alvo desejado ({settings.targetLufs ?? -14.0} LUFS) através de saturação suave de crista sem distorção, com teto True-Peak de {settings.targetCeilingDb ?? -1.0} dBTP.
                </p>
              </div>
            </div>

            {onNavigateToLufs && (
              <button
                onClick={onNavigateToLufs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                <span>Abrir Console Completo LUFS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Target LUFS */}
            <div className="bg-[#0b101d] rounded-lg p-3.5 border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-semibold">Alvo de Loudness</span>
                <span className="text-cyan-400 font-bold">{(settings.targetLufs ?? -14.0).toFixed(1)} LUFS</span>
              </div>
              <input
                type="range"
                min={-24}
                max={-6}
                step={0.5}
                disabled={!!settings.limitlessBypass}
                value={settings.targetLufs ?? -14.0}
                onChange={(e) => onUpdateSettings({ targetLufs: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-24 (Dinâmico)</span>
                <span>-14 (Streaming)</span>
                <span>-6 (Club)</span>
              </div>
            </div>

            {/* True-Peak Ceiling */}
            <div className="bg-[#0b101d] rounded-lg p-3.5 border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-semibold">Teto True-Peak</span>
                <span className="text-emerald-400 font-bold">{(settings.targetCeilingDb ?? -1.0).toFixed(1)} dBTP</span>
              </div>
              <input
                type="range"
                min={-2.0}
                max={-0.1}
                step={0.1}
                disabled={!!settings.limitlessBypass}
                value={settings.targetCeilingDb ?? -1.0}
                onChange={(e) => onUpdateSettings({ targetCeilingDb: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-2.0 dBTP</span>
                <span>-1.0 (Spotify Safe)</span>
                <span>-0.1 dBTP</span>
              </div>
            </div>

            {/* Limitless Clipper Drive */}
            <div className="bg-[#0b101d] rounded-lg p-3.5 border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-semibold">Clipper Drive (Crista)</span>
                <span className="text-amber-400 font-bold">{settings.clipperDrive ?? 55}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={!!settings.limitlessBypass}
                value={settings.clipperDrive ?? 55}
                onChange={(e) => onUpdateSettings({ clipperDrive: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0% (Limpo)</span>
                <span>55% (Punchy)</span>
                <span>100% (Hot)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

