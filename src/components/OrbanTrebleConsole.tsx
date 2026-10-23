import React, { useState } from 'react';
import { Radio, Zap, ShieldCheck, Sparkles, Sliders, Volume2, Info, CheckCircle2, RotateCcw, Activity, Disc, Flame } from 'lucide-react';
import { HumanizerSettings } from '../types/audio';
import { OrbanTrebleTelemetry, ORBAN_PRESETS } from '../audio/orbanTrebleEngine';

interface OrbanTrebleConsoleProps {
  settings: HumanizerSettings;
  onUpdateSettings: (newSettings: Partial<HumanizerSettings>) => void;
  telemetry?: OrbanTrebleTelemetry | null;
  onAutoCalibrate?: () => void;
  hasAudioLoaded?: boolean;
}

export function OrbanTrebleConsole({
  settings,
  onUpdateSettings,
  telemetry,
  onAutoCalibrate,
  hasAudioLoaded = true,
}: OrbanTrebleConsoleProps) {
  const [calibratedToast, setCalibratedToast] = useState<string | null>(null);

  const isBypassed = !!settings.orbanHfBypass || settings.orbanHfEnabled === false;
  const isLocked = Boolean(settings.orbanHfUserOverrideLock);
  const currentMode = settings.orbanHfMode || 'broadcast_optimod';
  const amount = settings.orbanHfAmount ?? 50;
  const autoBrillianceDb = settings.orbanHfAutoBrillianceDb ?? 0.0;
  const thresholdDb = settings.orbanHfThresholdDb ?? -6.5;
  const crossoverHz = settings.orbanHfCrossoverHz ?? 5800;
  const speed = settings.orbanHfSpeed || 'fast';

  const handleToggleBypass = () => {
    const nextBypass = !isBypassed;
    onUpdateSettings({
      orbanHfEnabled: !nextBypass,
      orbanHfBypass: nextBypass,
      orbanHfUserOverrideLock: true, // Ação manual do usuário
    });
  };

  const handleModeSelect = (modeId: typeof currentMode) => {
    const preset = ORBAN_PRESETS.find((p) => p.id === modeId);
    if (preset && preset.settings) {
      onUpdateSettings({
        orbanHfEnabled: true,
        orbanHfBypass: false,
        orbanHfUserOverrideLock: false,
        orbanHfMode: modeId,
        orbanHfAmount: preset.settings.amount ?? amount,
        orbanHfAutoBrillianceDb: preset.settings.autoBrillianceDb ?? autoBrillianceDb,
        orbanHfHighShelfGainDb: preset.settings.autoBrillianceDb ?? autoBrillianceDb,
        orbanHfThresholdDb: preset.settings.thresholdDb ?? thresholdDb,
        orbanHfCrossoverHz: preset.settings.crossoverHz ?? crossoverHz,
        orbanHfSpeed: preset.settings.speed ?? speed,
      });
    } else {
      onUpdateSettings({
        orbanHfEnabled: true,
        orbanHfBypass: false,
        orbanHfUserOverrideLock: false,
        orbanHfMode: modeId,
      });
    }
  };

  const handleTriggerAutoCalibrate = () => {
    if (onAutoCalibrate) {
      onAutoCalibrate();
      const statusText = telemetry
        ? telemetry.isDarkTape
          ? `✓ Fita Abafada calibrada com Restauração (+${telemetry.recommendedBrillianceDb.toFixed(1)} dB)!`
          : telemetry.isHarshRecording
          ? `✓ Agudos Estridentes calibrados com Atenuação (-3.0 dB) e Limitador HF ativo!`
          : `✓ Balanço Tonal Natural calibrado com Resposta Flat (0.0 dB) e teto de proteção ativo!`
        : '✓ Auto-calibração concluída! Filtros calibrados com precisão.';
      setCalibratedToast(statusText);
      setTimeout(() => setCalibratedToast(null), 5000);
    }
  };

  const handleResetToStandard = () => {
    onUpdateSettings({
      orbanHfEnabled: true,
      orbanHfBypass: false,
      orbanHfUserOverrideLock: false,
      orbanHfMode: 'smooth_silk',
      orbanHfAmount: 70,
      orbanHfAutoBrillianceDb: -3.0,
      orbanHfHighShelfGainDb: -3.0,
      orbanHfThresholdDb: -7.5,
      orbanHfCrossoverHz: 5500,
      orbanHfSpeed: 'fast',
    });
  };

  return (
    <div
      className={`border rounded-xl p-5 flex flex-col justify-between gap-5 transition-all md:col-span-2 lg:col-span-3 shadow-xl ${
        isBypassed
          ? 'bg-[#0a0f1d]/75 border-slate-800/80 opacity-75'
          : 'bg-gradient-to-r from-[#091122] via-[#0d172e] to-[#0a1224] border-cyan-500/40 shadow-cyan-950/20'
      }`}
    >
      {/* 1. Header Bar: Identity, Flat Response, Mode Selector & Bypass */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-500/10 shrink-0">
            <Radio className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Processador Inteligente de Agudos & Limitador HF
              </span>
              <button
                type="button"
                onClick={handleToggleBypass}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                  isBypassed
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 hover:bg-amber-900/90 shadow-xs'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-xs'
                }`}
                title={
                  isBypassed
                    ? isLocked
                      ? 'Módulo em BYPASS manual pelo usuário (User Override Lock ativo).'
                      : 'Módulo desabilitado automaticamente pois o áudio não necessita deste processador. Clique para ativar manualmente.'
                    : 'Processador de agudos ativo na masterização. Clique para colocar em Bypass manual.'
                }
              >
                {isBypassed ? (isLocked ? '🔒 BYPASS (MANUAL)' : '○ BYPASS (NÃO NECESSÁRIO)') : '✓ ATIVO'}
              </button>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                RESPOSTA FLAT · SEM PRÉ-ÊNFASE FM
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/50">
                HIGH SHELF [-12dB a +12dB]
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Circuito de masterização digital de alta precisão com resposta de entrada 100% plana (Flat). Sem curvas analógicas fixas de pré-ênfase de radiodifusão FM (50µs/75µs). Incorpora filtro High Shelf ajustável (-12 dB a +12 dB) e limitador de agudos ultrarrápido anti-sibilância.
            </p>
          </div>
        </div>

        {/* Action Buttons: Auto-Calibrate and Reset */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={handleTriggerAutoCalibrate}
            disabled={!hasAudioLoaded}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
              hasAudioLoaded
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/50 hover:scale-[1.02] shadow-cyan-900/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
            title="Analisa o balanço espectral de agudos da fita carregada e calibra automaticamente o ganho e o teto do limitador"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>⚡ Auto-Calibrar com base na Gravação</span>
          </button>

          <button
            type="button"
            onClick={handleResetToStandard}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Restaurar padrão Audiófilo Sedoso 8700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {calibratedToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 px-4 py-2 rounded-lg text-xs font-medium text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{calibratedToast}</span>
        </div>
      )}

      {/* 2. Broadcast Profile Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {ORBAN_PRESETS.map((preset) => {
          const isSelected = currentMode === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleModeSelect(preset.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400/80 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/30'
                  : 'bg-[#0d1424]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#10192e] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {preset.name}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] text-cyan-400/80 font-mono font-medium">
                {preset.subtitle}
              </span>
              <p className="text-[10px] text-slate-400 leading-tight line-clamp-2 mt-0.5">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Live Spectral Treble Analysis Telemetry & Diagnostic Rack Readout */}
      <div className="bg-[#0b101e] rounded-lg border border-slate-800 p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Diagnóstico Automático:
            </span>
            {telemetry ? (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
                  telemetry.isDarkTape
                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    : telemetry.isHarshRecording
                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {telemetry.isDarkTape
                  ? '📼 Fita Abafada (Perda de Agudos)'
                  : telemetry.isHarshRecording
                  ? '⚠️ Agudos Estridentes / Sibilantes'
                  : '✓ Balanço Tonal Natural'}
              </span>
            ) : (
              <span className="text-slate-500 text-[11px] font-mono italic">
                {hasAudioLoaded ? 'Pronto para análise' : 'Aguardando áudio'}
              </span>
            )}
          </div>

          {telemetry && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
              <span className="text-slate-400">Balanço Treble/Mid:</span>
              <span className="text-cyan-300 font-bold">{telemetry.spectralBalanceRatioDb} dB</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Ação Recomendada:</span>
              <span className="text-amber-300 font-semibold">{telemetry.recommendedMode}</span>
            </div>
          )}
        </div>

        {/* LED Style Dynamic Meters */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Auto-Brilliance:</span>
            <span className={`font-bold ${isBypassed ? 'text-slate-500' : 'text-emerald-400'}`}>
              +{autoBrillianceDb.toFixed(1)} dB
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">HF Limiter:</span>
            <span className={`font-bold ${isBypassed ? 'text-slate-500' : 'text-amber-400'}`}>
              {thresholdDb.toFixed(1)} dB
            </span>
          </div>
        </div>
      </div>

      {/* 4. Fine-Tuning Interactive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Knob 1: Intensidade do Processador (Amount) */}
        <div className="bg-[#0b101e] rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" />
              Intensidade Geral
            </span>
            <span className="text-cyan-400 font-bold">{amount}%</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Grau de atuação global da compensação dinâmica de agudos e do limitador.
          </p>
          <input
            type="range"
            min={0}
            max={100}
            disabled={isBypassed}
            value={amount}
            onChange={(e) => onUpdateSettings({ orbanHfAmount: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0% (Off)</span>
            <span>70% (Optimod)</span>
            <span>100% (Máx)</span>
          </div>
        </div>

        {/* Knob 2: Dynamic High Shelf Filter (-12 dB to +12 dB) */}
        <div className="bg-[#0b101e] rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Filtro High Shelf
            </span>
            <span
              className={`font-bold ${
                autoBrillianceDb === 0
                  ? 'text-cyan-300'
                  : autoBrillianceDb > 0
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {autoBrillianceDb > 0
                ? `+${autoBrillianceDb.toFixed(1)} dB`
                : `${autoBrillianceDb.toFixed(1)} dB`}
              {autoBrillianceDb === 0 ? ' (Flat)' : ''}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Resposta plana em 0 dB. Atenua estridência (&lt; 0 dB) ou restaura fitas abafadas (&gt; 0 dB). Sem curva FM.
          </p>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.5}
            disabled={isBypassed}
            value={autoBrillianceDb}
            onChange={(e) =>
              onUpdateSettings({
                orbanHfAutoBrillianceDb: Number(e.target.value),
                orbanHfHighShelfGainDb: Number(e.target.value),
              })
            }
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-12 dB (Taming)</span>
            <span className="text-cyan-400 font-semibold">0 dB (Flat)</span>
            <span>+12 dB (Boost)</span>
          </div>
        </div>

        {/* Knob 3: HF Limiter / De-Esser Ceiling */}
        <div className="bg-[#0b101e] rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Teto HF Limiter
            </span>
            <span className="text-amber-400 font-bold">{thresholdDb.toFixed(1)} dB</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Teto de proteção ultrarrápido contra sibilâncias ("S", "T", "Ch") e pratos estridentes.
          </p>
          <input
            type="range"
            min={-18}
            max={0}
            step={0.5}
            disabled={isBypassed}
            value={thresholdDb}
            onChange={(e) => onUpdateSettings({ orbanHfThresholdDb: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-18 dB (Forte)</span>
            <span>-4.5 dB (Seguro)</span>
            <span>0 dB (Desligado)</span>
          </div>
        </div>

        {/* Knob 4: Crossover Frequency & Speed Ballistics */}
        <div className="bg-[#0b101e] rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3 text-sky-400" />
              Crossover & Balística
            </span>
            <span className="text-sky-400 font-bold">{crossoverHz} Hz</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min={3500}
              max={8000}
              step={100}
              disabled={isBypassed}
              value={crossoverHz}
              onChange={(e) => onUpdateSettings({ orbanHfCrossoverHz: Number(e.target.value) })}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>3.5 kHz</span>
              <span>5.2 kHz (Broadcast)</span>
              <span>8.0 kHz</span>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">Velocidade:</span>
            <div className="flex gap-1">
              {(['smooth', 'medium', 'fast'] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onUpdateSettings({ orbanHfSpeed: spd })}
                  disabled={isBypassed}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    speed === spd
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd === 'smooth' ? 'Suave' : spd === 'medium' ? 'Média' : 'Rápida'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
