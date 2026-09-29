import React from 'react';
import { TapeAzimuthAnalysis, TapeAzimuthSettings } from '../audio/tapeAzimuthEngine';
import { Disc, Sparkles, Volume2, ShieldCheck, Download, CheckCircle2, RotateCcw, AlertCircle, ArrowRight, Gauge, Headphones, FolderDown, Compass } from 'lucide-react';

interface TapeAzimuthConsoleProps {
  analysis: TapeAzimuthAnalysis | null;
  settings: TapeAzimuthSettings;
  onUpdateSettings: (newSettings: Partial<TapeAzimuthSettings>) => void;
  onAutoAlign: () => void;
  onExportAzimuthOnly: () => void;
  isExportingAzimuth: boolean;
  hasAudioLoaded: boolean;
  currentTrackTitle: string;
  outputBitDepth?: number;
  outputSampleRate?: number;
  onNavigateToMastering?: () => void;
  onSelectOutputDirectory?: () => void;
  outputDirectoryName?: string;
}

export function TapeAzimuthConsole({
  analysis,
  settings,
  onUpdateSettings,
  onAutoAlign,
  onExportAzimuthOnly,
  isExportingAzimuth,
  hasAudioLoaded,
  currentTrackTitle,
  outputBitDepth = 24,
  outputSampleRate = 44100,
  onNavigateToMastering,
  onSelectOutputDirectory,
  outputDirectoryName,
}: TapeAzimuthConsoleProps) {
  // Convert samples to microseconds dynamically based on sample rate
  const samplesToUs = (samples: number) => {
    return ((samples / outputSampleRate) * 1_000_000).toFixed(1);
  };

  const handleReset = () => {
    onUpdateSettings({
      azimuthDelaySamples: 0,
      balanceDb: 0,
      invertPhaseL: false,
      invertPhaseR: false,
      listenInMono: false,
    });
  };

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 md:p-6 flex flex-col gap-6 shadow-xl">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Disc className="w-5 h-5 text-amber-400" />
              Inspeção de Azimute & Balanço de Cabeçote (Fitas 1/4" 1950-2000)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              PRÉ-MASTER ARCHIVAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Módulo essencial para digitalização de fitas analógicas de rolo. Corrige desvios de tempo (inter-channel delay) entre os canais E/D causados pelo ângulo do cabeçote e equilibra o ganho estéreo <strong>antes de qualquer processamento</strong>, eliminando o cancelamento de agudos por filtro pente em mono.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onSelectOutputDirectory && (
            <button
              onClick={onSelectOutputDirectory}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#141b2e] hover:bg-[#1a233b] border border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Configurar a pasta do seu computador onde os arquivos processados serão salvos na subpasta designada"
            >
              <FolderDown className="w-4 h-4 text-amber-400" />
              <span>
                {outputDirectoryName
                  ? `Pasta: ${outputDirectoryName}`
                  : 'Configurar Pasta de Saída'}
              </span>
            </button>
          )}

          <button
            onClick={onExportAzimuthOnly}
            disabled={!hasAudioLoaded || isExportingAzimuth}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Exporta o áudio WAV preservando exatamente a resolução original (ex: 96k/24bit) com apenas o azimute e balanço alinhados, sem efeitos de masterização."
          >
            <Download className="w-4 h-4" />
            <span>
              {isExportingAzimuth
                ? 'Exportando Arquivo...'
                : 'Salvar Arquivo com Azimute Corrigido (WAV Puro)'}
            </span>
          </button>
        </div>
      </div>

      {/* Auto-save folder status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#090d18] border border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <FolderDown className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-slate-300">
            <span className="font-semibold text-white">Destino de Salvamento: </span>
            {outputDirectoryName ? (
              <span className="text-emerald-300 font-mono font-medium">
                {outputDirectoryName}/Tapes_Processados_AuraTune/ (Gravação direta no disco)
              </span>
            ) : (
              <span className="text-slate-400">
                Pasta local não configurada (arquivos serão salvos por download / opção ZIP)
              </span>
            )}
          </div>
        </div>

        {onSelectOutputDirectory && (
          <button
            onClick={onSelectOutputDirectory}
            className="text-amber-400 hover:text-amber-300 font-semibold underline text-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            {outputDirectoryName ? 'Alterar Pasta' : 'Vincular Pasta no Computador'}
          </button>
        )}
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Real-time Telemetry & Diagnostics (5 cols) */}
        <div className="lg:col-span-5 bg-[#090d16] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-amber-400" />
              Telemetria de Cabeçote & Fase Estéreo
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              {outputSampleRate ? `${(outputSampleRate / 1000).toFixed(1)} kHz` : '44.1 kHz'}
            </span>
          </div>

          {/* Diagnostic Metrics Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Azimuth Delay */}
            <div className="p-3 rounded-lg bg-[#111726] border border-amber-500/30 flex flex-col">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                Desvio de Azimute (ITD)
              </span>
              <span className="text-base font-mono font-bold text-white mt-1">
                {analysis ? `${analysis.azimuthOffsetUs > 0 ? '+' : ''}${analysis.azimuthOffsetUs.toFixed(1)} µs` : '0.0 µs'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                {analysis ? `${analysis.azimuthOffsetSamples > 0 ? '+' : ''}${analysis.azimuthOffsetSamples.toFixed(2)} amostras` : '0.0 amostras'}
              </span>
              <span className="text-[9px] text-amber-300/90 mt-1">
                {analysis?.leadingChannel === 'L'
                  ? '⬅ Canal Esquerdo adiantado'
                  : analysis?.leadingChannel === 'R'
                  ? '➡ Canal Direito adiantado'
                  : '✓ Canais Perfeitamente Alinhados'}
              </span>
            </div>

            {/* Level Balance */}
            <div className="p-3 rounded-lg bg-[#111726] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                Diferença de Nível (L/R)
              </span>
              <span className="text-base font-mono font-bold text-cyan-300 mt-1">
                {analysis ? `${analysis.levelDiffDb > 0 ? '+' : ''}${analysis.levelDiffDb.toFixed(1)} dB` : '0.0 dB'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                L: {analysis?.rmsDbL.toFixed(1) ?? '-20.0'} dB | R: {analysis?.rmsDbR.toFixed(1) ?? '-20.0'} dB
              </span>
              <span className="text-[9px] text-slate-400 mt-1">
                {analysis && Math.abs(analysis.levelDiffDb) > 0.5
                  ? `Compensação recomendada: ${(-analysis.levelDiffDb).toFixed(1)} dB`
                  : '✓ Balanço equilibrado'}
              </span>
            </div>

            {/* Phase Correlation Before vs After */}
            <div className="p-3 rounded-lg bg-[#111726] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                Correlação de Fase
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base font-mono font-bold text-white">
                  +{analysis?.phaseCorrelationBefore.toFixed(2) ?? '0.85'}
                </span>
                {analysis && analysis.phaseCorrelationAfter > analysis.phaseCorrelationBefore && (
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ➔ +{analysis.phaseCorrelationAfter.toFixed(2)}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-emerald-400 mt-1">
                +{analysis?.monoSumGainAfterDb.toFixed(1) ?? '0.0'} dB recuperação em mono
              </span>
            </div>

            {/* Archival Resolution */}
            <div className="p-3 rounded-lg bg-[#111726] border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                Formato de Entrada
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400 mt-1 truncate">
                {outputSampleRate ? `${(outputSampleRate / 1000).toFixed(1)} kHz / ${outputBitDepth}-bit` : 'Carregado'}
              </span>
              <span className="text-[9px] text-slate-400 mt-1">
                Preservação pura sem reamostragem
              </span>
            </div>
          </div>

          {/* Technical Diagnosis Banner */}
          <div className="p-3 rounded-lg bg-[#121929] border border-slate-800 flex flex-col gap-1.5 text-xs">
            <span className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Diagnóstico Acústico de Azimute da Fita
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {analysis?.recommendation || 'Aguardando carregamento de faixa de fita para diagnóstico.'}
            </p>
          </div>

          {/* Quick Auto-Calibration Button */}
          <button
            onClick={onAutoAlign}
            disabled={!hasAudioLoaded}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Auto-Calibrar Azimute & Balanço Automaticamente</span>
          </button>
        </div>

        {/* Right Column: Calibration Controls & Manual Sliders (7 cols) */}
        <div className="lg:col-span-7 bg-[#090d16] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Ajuste Fino de Cabeçote & Alinhamento
              </span>
              <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                />
                <span className="text-[11px] font-mono text-amber-300">Módulo Ativo</span>
              </label>
            </div>

            <button
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Zerar todos os ajustes de azimute e balanço"
            >
              <RotateCcw className="w-3 h-3" />
              Zerar Ajustes
            </button>
          </div>

          {/* Slider 1: Azimuth Delay Offset */}
          <div className="space-y-2 bg-[#101524] p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  Atraso de Azimute (Ajuste Inter-Canal)
                </label>
                <p className="text-[10px] text-slate-400">
                  Desloca a leitura temporal de um canal em relação ao outro com interpolação sub-amostral.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">
                  {settings.azimuthDelaySamples > 0 ? '+' : ''}{settings.azimuthDelaySamples.toFixed(2)} amostras
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {samplesToUs(settings.azimuthDelaySamples)} µs
                </span>
              </div>
            </div>

            <input
              type="range"
              min="-20.0"
              max="20.0"
              step="0.05"
              value={settings.azimuthDelaySamples}
              onChange={(e) => onUpdateSettings({ azimuthDelaySamples: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>⬅ Canal E Adiantado (-20 amostr.)</span>
              <span>0.0 (Neutro)</span>
              <span>Canal D Adiantado (+20 amostr.) ➡</span>
            </div>
          </div>

          {/* Slider 2: Channel Balance Trim */}
          <div className="space-y-2 bg-[#101524] p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  Balanço Estéreo L / R (Compensação de Cabeçote)
                </label>
                <p className="text-[10px] text-slate-400">
                  Ajusta o ganho relativo entre os canais para compensar perda de magnetização ou desgaste do tape.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50">
                {settings.balanceDb > 0 ? '+' : ''}{settings.balanceDb.toFixed(1)} dB
              </span>
            </div>

            <input
              type="range"
              min="-6.0"
              max="6.0"
              step="0.1"
              value={settings.balanceDb}
              onChange={(e) => onUpdateSettings({ balanceDb: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>⬅ Mais Canal E (+6 dB L)</span>
              <span>0.0 dB (Centro)</span>
              <span>Mais Canal D (+6 dB R) ➡</span>
            </div>
          </div>

          {/* Polarities & Listening Mode Switches */}
          <div className="flex flex-col gap-2.5">
            {/* Polarity & 180° Phase Diagnosis Strip */}
            <div className="p-3 rounded-lg bg-[#0e1424] border border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Diagnóstico de Fase & Polaridade 180°:
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  (settings.invertPhaseL !== settings.invertPhaseR)
                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                }`}>
                  {settings.invertPhaseL !== settings.invertPhaseR
                    ? 'L/R EM ANTI-FASE (180° RELATIVO)'
                    : 'L/R EM FASE RELATIVA (0°)'}
                </span>
              </div>

              {/* Physical explanation badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#090e1a] border border-slate-800/80">
                  <span className="text-slate-400 block">Relação Entre Canais (Mono):</span>
                  {settings.invertPhaseL !== settings.invertPhaseR ? (
                    <span className="text-rose-400 font-semibold block mt-0.5">
                      ⚠️ 1 canal invertido: o centro (voz/baixo) se anula completamente ao somar em mono.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold block mt-0.5">
                      ✓ Ambos com mesma fase: ao somar em mono o som não degrada.
                    </span>
                  )}
                </div>

                <div className="p-2 rounded bg-[#090e1a] border border-slate-800/80">
                  <span className="text-slate-400 block">Polaridade Absoluta nos 2 Canais:</span>
                  {analysis?.absolutePolarityState === 'inverted_both_180' ? (
                    <span className="text-amber-300 font-semibold block mt-0.5">
                      ⚠️ Detectado 180° nos 2 canais (Picos negativos/rarefação dominantes).
                    </span>
                  ) : analysis?.absolutePolarityState === 'normal' ? (
                    <span className="text-emerald-400 font-semibold block mt-0.5">
                      ✓ Transientes normais (Compressão acústica positiva nos 2 canais).
                    </span>
                  ) : (
                    <span className="text-slate-300 font-semibold block mt-0.5">
                      Forma de onda simétrica neutra.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inversion Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {/* Listen in Mono */}
              <button
                onClick={() => onUpdateSettings({ listenInMono: !settings.listenInMono })}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  settings.listenInMono
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                    : 'bg-[#121828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Escuta a soma estéreo em mono para verificar se há cancelamento de fase."
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Headphones className="w-3 h-3 text-amber-400" />
                    Ouvir em Mono
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${settings.listenInMono ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.listenInMono ? 'ATIVO' : 'ESTÉREO'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  Verifica cancelamento comb-filter.
                </span>
              </button>

              {/* Invert Phase L */}
              <button
                onClick={() => onUpdateSettings({ invertPhaseL: !settings.invertPhaseL })}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  settings.invertPhaseL
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500/40'
                    : 'bg-[#121828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Inverte a polaridade apenas do Canal Esquerdo (180°)."
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Inverter L (Ø)</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${settings.invertPhaseL ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.invertPhaseL ? '180°' : '0°'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  Inverte polaridade do canal E.
                </span>
              </button>

              {/* Invert Phase R */}
              <button
                onClick={() => onUpdateSettings({ invertPhaseR: !settings.invertPhaseR })}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  settings.invertPhaseR
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500/40'
                    : 'bg-[#121828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Inverte a polaridade apenas do Canal Direito (180°)."
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Inverter R (Ø)</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${settings.invertPhaseR ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.invertPhaseR ? '180°' : '0°'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  Inverte polaridade do canal D.
                </span>
              </button>

              {/* Invert Both L & R (180° Global Absolute Polarity) */}
              <button
                onClick={() => {
                  const bothActive = settings.invertPhaseL && settings.invertPhaseR;
                  onUpdateSettings({ invertPhaseL: !bothActive, invertPhaseR: !bothActive });
                }}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  settings.invertPhaseL && settings.invertPhaseR
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                    : 'bg-[#121828] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Inverte ambos os canais simultaneamente em 180° (Polaridade Absoluta Global). Mantém a coerência estéreo e o mono intactos."
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Inverter Ambos (180°)</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${settings.invertPhaseL && settings.invertPhaseR ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {settings.invertPhaseL && settings.invertPhaseR ? 'AMBOS 180°' : 'NORMAL'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  Inversão absoluta nos 2 canais.
                </span>
              </button>
            </div>
          </div>

          {/* Workflow Footer: Next step options */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                O azimute corrigido será repassado diretamente para a cadeia de masterização final.
              </span>
            </div>

            {onNavigateToMastering && (
              <button
                onClick={onNavigateToMastering}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Prosseguir para Masterização</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
