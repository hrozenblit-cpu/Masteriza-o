import React, { useState, useRef } from 'react';
import {
  Disc,
  ShieldCheck,
  Sliders,
  Gauge,
  Sparkles,
  Waves,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Power,
  Play,
  Pause,
  Download,
  RotateCcw,
  Activity,
  Headphones,
  Info,
  ChevronRight,
  ExternalLink,
  Volume2,
  Flame,
  Wind,
  GitFork,
  History
} from 'lucide-react';
import { TapeAzimuthAnalysis, TapeAzimuthSettings } from '../audio/tapeAzimuthEngine';
import { TapeDropoutAnalysis, TapeDropoutSettings } from '../audio/tapeDropoutEngine';
import { SpectralDenoiseSettings, NoiseAnalysisTelemetry } from '../audio/spectralDenoiseEngine';
import { HumanizerSettings, LoudnessMetrics } from '../types/audio';
import { AudioInputFormat } from '../audio/audioFormatDetector';

interface ModularWorkflowConsoleProps {
  currentTrackTitle: string;
  audioFormat: AudioInputFormat | null;
  trackLoudness: LoudnessMetrics | null;

  // Telemetry & Analysis
  azimuthAnalysis: TapeAzimuthAnalysis | null;
  dropoutAnalysis: TapeDropoutAnalysis | null;
  denoiseTelemetry: NoiseAnalysisTelemetry | null;

  // Settings
  azimuthSettings: TapeAzimuthSettings;
  dropoutSettings: TapeDropoutSettings;
  denoiseSettings: SpectralDenoiseSettings;
  humanizerSettings: HumanizerSettings;

  // Callbacks
  onUpdateAzimuthSettings: (settings: Partial<TapeAzimuthSettings>) => void;
  onUpdateDropoutSettings: (settings: Partial<TapeDropoutSettings>) => void;
  onUpdateDenoiseSettings: (settings: Partial<SpectralDenoiseSettings>) => void;
  onUpdateHumanizerSettings: (settings: Partial<HumanizerSettings>) => void;
  onReconstructDropouts: () => void;
  onApplyTriageRecommendations: () => void;

  // Navigation to deep view
  onNavigateToTab: (tab: 'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer') => void;
  onOpenSplitStereoModal?: () => void;

  // Playback & Export
  isPlaying: boolean;
  onTogglePlay: () => void;
  isCompareOriginal: boolean;
  onToggleAB: () => void;
  onExportMaster: () => void;
  onExportPreMaster: () => void;
  onExportZipPackage: () => void;
  outputBitDepth: number;
  onChangeBitDepth: (depth: 16 | 24) => void;
  isExporting: boolean;
  isExportingPreMaster: boolean;
  currentPresetName?: string;
  onLoadRecallFile?: (file: File) => void;
}

export function ModularWorkflowConsole({
  currentTrackTitle,
  audioFormat,
  trackLoudness,
  azimuthAnalysis,
  dropoutAnalysis,
  denoiseTelemetry,
  azimuthSettings,
  dropoutSettings,
  denoiseSettings,
  humanizerSettings,
  onUpdateAzimuthSettings,
  onUpdateDropoutSettings,
  onUpdateDenoiseSettings,
  onUpdateHumanizerSettings,
  onReconstructDropouts,
  onApplyTriageRecommendations,
  onNavigateToTab,
  onOpenSplitStereoModal,
  isPlaying,
  onTogglePlay,
  isCompareOriginal,
  onToggleAB,
  onExportMaster,
  onExportPreMaster,
  onExportZipPackage,
  outputBitDepth,
  onChangeBitDepth,
  isExporting,
  isExportingPreMaster,
  currentPresetName,
  onLoadRecallFile,
}: ModularWorkflowConsoleProps) {
  const recallInputRef = useRef<HTMLInputElement>(null);
  const [triageApplied, setTriageApplied] = useState(false);

  // Intelligent Material Detection
  const isGhostChannel = azimuthAnalysis?.isGhostChannelDetected ?? false;
  const isSplitStereo = audioFormat?.codec?.includes('Split-Mono') || audioFormat?.codec?.includes('Pro Tools');
  const phaseCorr = azimuthAnalysis ? azimuthAnalysis.phaseCorrelationBefore : 0.85;
  const sideToMidDb = azimuthAnalysis?.sideToMidDb ?? 0;
  const totalDropouts = dropoutAnalysis?.totalDropouts ?? 0;
  const hasDropouts = totalDropouts > 0;
  const hissNoiseFloorDb = denoiseTelemetry?.hissNoiseFloorDb ?? -90;
  const hasHiss = Boolean(
    denoiseTelemetry?.hasNoiseDetected ||
    hissNoiseFloorDb > -75.0 ||
    denoiseTelemetry?.hasHumDetected
  );
  const hasAzimuthOffset = Math.abs(azimuthAnalysis?.azimuthOffsetSamples ?? 0) >= 0.08;
  const hasBalanceOffset = Math.abs(azimuthAnalysis?.levelDiffDb ?? 0) >= 0.35;

  // Genuine acoustic dual-mono (Side energy is negligible: <= -26 dB with 98.5% correlation or <= -32 dB)
  const isAcousticDualMono =
    !isGhostChannel &&
    !isSplitStereo &&
    (azimuthAnalysis?.channelConfiguration === 'dual_mono' ||
      ((dropoutAnalysis?.isAmpexFullTrackCandidate ?? false) && sideToMidDb <= -26.0) ||
      sideToMidDb <= -32.0 ||
      (phaseCorr >= 0.990 && sideToMidDb <= -26.0));

  // Modern clean recording: zero dropouts, clean noise floor, no mechanical azimuth skew
  const isCleanModernRecording =
    !isGhostChannel &&
    !hasDropouts &&
    (dropoutAnalysis?.tapeHealthScore ?? 100) === 100 &&
    !hasHiss &&
    !hasAzimuthOffset;

  const isContemporaryStereo = !isGhostChannel && !isAcousticDualMono && isCleanModernRecording;
  const isContemporaryMono = !isGhostChannel && isAcousticDualMono && isCleanModernRecording;
  const isTapeDualMono = !isGhostChannel && isAcousticDualMono && !isCleanModernRecording;
  const isTapeStereo = !isGhostChannel && !isAcousticDualMono && !isCleanModernRecording;

  // Backward compatibility flag
  const isMonoCandidate = isTapeDualMono;

  // Block master enable states
  const isBlock1Active =
    azimuthSettings.enabled ||
    dropoutSettings.enabled ||
    denoiseSettings.enabled;
  const isBlock2Active =
    !humanizerSettings.deHarshBypass ||
    !humanizerSettings.tapeWarmthBypass ||
    !humanizerSettings.airExciterBypass ||
    (humanizerSettings.orbanHfEnabled && !humanizerSettings.orbanHfBypass);
  const isBlock3Active = !humanizerSettings.limitlessBypass && humanizerSettings.limitlessEnabled !== false;

  const handleToggleBlock1Master = () => {
    const nextState = !isBlock1Active;
    onUpdateAzimuthSettings({ enabled: nextState });
    onUpdateDropoutSettings({ enabled: nextState });
    onUpdateDenoiseSettings({ enabled: nextState });
  };

  const handleToggleBlock2Master = () => {
    const nextState = !isBlock2Active;
    onUpdateHumanizerSettings({
      deHarshBypass: !nextState,
      tapeWarmthBypass: !nextState,
      airExciterBypass: !nextState,
      orbanHfBypass: !nextState,
      orbanHfUserOverrideLock: !nextState,
    });
  };

  const handleToggleBlock3Master = () => {
    const nextState = !isBlock3Active;
    onUpdateHumanizerSettings({
      limitlessBypass: !nextState,
      limitlessEnabled: nextState,
    });
  };

  const handleApplyTriage = () => {
    onApplyTriageRecommendations();
    setTriageApplied(true);
    setTimeout(() => setTriageApplied(false), 5000);
  };

  // Direct Profile: Gravação Atual (Bypass Bloco 1, Ativa Bloco 2 & 3)
  const handleApplyDirectModernMasterProfile = () => {
    onUpdateAzimuthSettings({ enabled: false, azimuthDelaySamples: 0, balanceDb: 0 });
    onUpdateDropoutSettings({ enabled: false, mode: 'stereo_independent' });
    onUpdateDenoiseSettings({ enabled: false });
    onUpdateHumanizerSettings({
      deHarshBypass: true,
      tapeWarmthBypass: false,
      airExciterBypass: false,
      limitlessBypass: false,
      limitlessEnabled: true,
      targetLufs: -14.0,
    });
    setTriageApplied(true);
    setTimeout(() => setTriageApplied(false), 5000);
  };

  // Profile: Restauração Completa de Fita Analógica (Ativa Bloco 1, 2 & 3)
  const handleApplyTapeRestorationProfile = () => {
    const isGhost = azimuthAnalysis?.isGhostChannelDetected;
    onUpdateAzimuthSettings({
      enabled: true,
      azimuthDelaySamples: isGhost ? 0 : (azimuthAnalysis?.azimuthOffsetSamples ?? 0),
      balanceDb: isGhost ? 0.0 : Math.max(-4.5, Math.min(4.5, -(azimuthAnalysis?.levelDiffDb ?? 0))),
      activeChannel: azimuthAnalysis?.activeSignalChannel || 'both',
      ghostChannelHandling: isGhost ? 'clone_active' : 'passthrough',
    });
    onUpdateDropoutSettings({
      enabled: true,
      mode: isAcousticDualMono ? 'mono_wander_graft' : 'stereo_independent',
    });
    onUpdateDenoiseSettings({
      enabled: true,
      reductionDb: denoiseTelemetry?.recommendedReductionDb ?? 4.0,
    });
    setTriageApplied(true);
    setTimeout(() => setTriageApplied(false), 5000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-2">
      {/* =========================================================================
          SMART TRIAGE CARD (Automated Detection & Recommendation)
          ========================================================================= */}
      <div className="rounded-2xl p-5 md:p-6 bg-gradient-to-r from-[#0d1627] via-[#0f1d35] to-[#0c1424] border border-cyan-500/30 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Triagem Inteligente & Classificação de Áudio
                </h2>
                <span
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                    isGhostChannel
                      ? 'bg-blue-950/90 text-blue-300 border-blue-500/50 shadow-inner'
                      : isContemporaryStereo
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : isContemporaryMono
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                      : isTapeDualMono
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                  }`}
                >
                  {isGhostChannel
                    ? 'GRAVAÇÃO ORIGINALMENTE MONO (Canal Fantasma / Ruído Isolado)'
                    : isContemporaryStereo
                    ? 'GRAVAÇÃO ATUAL ESTÉREO (Masterização Direta)'
                    : isContemporaryMono
                    ? 'GRAVAÇÃO ATUAL DUAL-MONO (Masterização Direta)'
                    : isTapeDualMono
                    ? 'MONO EM 2 CANAIS (Fita 1/4" Ampex / Studer)'
                    : 'FITA ESTÉREO ANALÓGICA'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {isGhostChannel
                  ? `Gravação originalmente gravada em mono com áudio útil presente exclusivamente no Canal ${
                      azimuthAnalysis?.activeSignalChannel === 'L' ? 'Esquerdo (E)' : 'Direito (D)'
                    } (${
                      (azimuthAnalysis?.activeSignalChannel === 'L' ? azimuthAnalysis?.rmsDbL : azimuthAnalysis?.rmsDbR)?.toFixed(1)
                    } dBFS). O Canal ${
                      azimuthAnalysis?.ghostChannel === 'right_dead' ? 'Direito (D)' : 'Esquerdo (E)'
                    } contém apenas ruído de fita (hiss) ou vazamento residual (${
                      (azimuthAnalysis?.ghostChannel === 'right_dead' ? azimuthAnalysis?.rmsDbR : azimuthAnalysis?.rmsDbL)?.toFixed(1)
                    } dBFS, diferença de +${Math.abs(azimuthAnalysis?.levelDiffDb ?? 0).toFixed(1)} dB). O sistema reconheceu a natureza mono, rejeitou a injeção cega de ganho no chiado e configurou a duplicação do canal útil em Mono limpo e perfeitamente centrado.`
                  : isContemporaryStereo
                  ? `Mixagem contemporânea em estéreo autêntico sem falhas de fita (Correlação: ${phaseCorr.toFixed(2)}, S/M: ${sideToMidDb.toFixed(1)} dB). Módulos de restauração mecânica mantidos em bypass transparente para focar em EQ refinada, contorno e masterização Limitless (-14 LUFS).`
                  : isContemporaryMono
                  ? `Gravação digital em canais idênticos sem falhas ou degradação de fita. Pronta para equalização de voz/instrumento e masterização direta sem alteração estrutural.`
                  : isTapeDualMono
                  ? 'As trilhas L e R leem a mesma fita analógica transferida em 2 canais. O sistema configurou o alinhamento de azimute e restauração cruzada Studer/Ampex usando o canal mais íntegro.'
                  : `Mixagem estéreo analógica identificada (Correlação: ${phaseCorr.toFixed(2)}). Preservando a abertura espacial original e aplicando restauração com preservação de imagem.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenSplitStereoModal && (
              <button
                type="button"
                onClick={onOpenSplitStereoModal}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                title="Unir múltiplos arquivos mono .L e .R do Pro Tools em Estéreo Real de 2 Canais"
              >
                <GitFork className="w-4 h-4 text-emerald-400" />
                <span>Unir Split Pro Tools (.L + .R)</span>
              </button>
            )}

            {/* Quick Profile Actions */}
            <button
              type="button"
              onClick={handleApplyDirectModernMasterProfile}
              className="px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
              title="Aplica perfil para gravação atual: desliga restauração de fita (Bloco 1) e foca em EQ analógica + Masterização Limitless (-14 LUFS)"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gravação Atual (Master Direto)</span>
            </button>

            {onLoadRecallFile && (
              <>
                <button
                  type="button"
                  onClick={() => recallInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-600/50 transition-all cursor-pointer shadow-sm"
                  title="Carregar arquivo .aurapreset ou .json de Recall de Masterização para restabelecer 100% dos parâmetros no áudio atual"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Carregar Recall (.aurapreset)</span>
                </button>
                <input
                  ref={recallInputRef}
                  type="file"
                  accept=".aurapreset,.json,application/json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onLoadRecallFile(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </>
            )}

            <button
              type="button"
              onClick={handleApplyTriage}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                triageApplied
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{triageApplied ? '✓ Triagem Aplicada!' : '⚡ Aplicar Correções Recomendadas'}</span>
            </button>
          </div>
        </div>

        {/* Triage Diagnostic Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {/* Azimuth & Phase */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Disc className="w-3 h-3 text-amber-400" />
              Azimute & Fase
            </span>
            <span className="text-sm font-mono font-bold text-white mt-1">
              {isGhostChannel
                ? 'Mono (Canal Útil)'
                : hasAzimuthOffset
                ? `${azimuthAnalysis?.azimuthOffsetSamples} samples`
                : 'Fase Alinhada (0 smp)'}
            </span>
            <span
              className={`text-[10px] font-mono mt-1 ${
                isGhostChannel
                  ? 'text-cyan-400 font-semibold'
                  : hasAzimuthOffset
                  ? 'text-amber-400 font-semibold'
                  : 'text-emerald-400'
              }`}
            >
              {isGhostChannel
                ? `✓ Canal ${azimuthAnalysis?.activeSignalChannel} centrado`
                : hasAzimuthOffset
                ? 'Correção recomendada'
                : '✓ 100% em fase'}
            </span>
          </div>

          {/* Balance L/R */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              Balanço L / R
            </span>
            <span className="text-sm font-mono font-bold text-white mt-1">
              {isGhostChannel
                ? '0.0 dB (Protegido)'
                : hasBalanceOffset
                ? `${(azimuthAnalysis?.levelDiffDb ?? 0) > 0 ? '+L' : '+R'} ${Math.abs(azimuthAnalysis?.levelDiffDb ?? 0).toFixed(1)} dB`
                : 'Equilibrado (0.0 dB)'}
            </span>
            <span
              className={`text-[10px] font-mono mt-1 ${
                isGhostChannel
                  ? 'text-blue-300 font-bold'
                  : hasBalanceOffset
                  ? 'text-amber-400 font-semibold'
                  : 'text-emerald-400'
              }`}
            >
              {isGhostChannel
                ? `🛡️ Ganho rejeitado (+${Math.abs(azimuthAnalysis?.levelDiffDb ?? 0).toFixed(1)} dB)`
                : hasBalanceOffset
                ? 'Reequilíbrio calibrado'
                : '✓ Canais simétricos'}
            </span>
          </div>

          {/* Dropouts */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Falhas / Dropouts
            </span>
            <span className="text-sm font-mono font-bold text-white mt-1">
              {dropoutAnalysis?.totalDropouts ?? 0} falhas
            </span>
            <span
              className={`text-[10px] font-mono mt-1 ${
                hasDropouts ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {hasDropouts
                ? `Saúde: ${dropoutAnalysis?.tapeHealthScore ?? 100}%`
                : '✓ Óxido íntegro'}
            </span>
          </div>

          {/* Hiss / Ruído */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Waves className="w-3 h-3 text-purple-400" />
              Ruído / Hiss Fita
            </span>
            <span className="text-sm font-mono font-bold text-white mt-1">
              {denoiseTelemetry ? `${denoiseTelemetry.hissNoiseFloorDb.toFixed(1)} dBFS` : '-60 dBFS'}
            </span>
            <span className="text-[10px] font-mono text-purple-300 mt-1">
              {denoiseTelemetry?.recommendedNoiseProfileType || 'Perfil Estúdio 15 ips'}
            </span>
          </div>

          {/* Nível BS.1770 Atual */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              Loudness Atual
            </span>
            <span className="text-sm font-mono font-bold text-cyan-300 mt-1">
              {trackLoudness ? `${trackLoudness.integratedLufs.toFixed(1)} LUFS` : '---'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              Alvo: {humanizerSettings.targetLufs ?? -14.0} LUFS
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODULAR BLOCKS WORKFLOW PIPELINE
          ========================================================================= */}
      <div className="flex flex-col gap-5">
        {/* =======================================================================
            BLOCO 1: RESTAURAÇÃO & PRESERVAÇÃO DE FITA (PRÉ-MASTER)
            ======================================================================= */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isBlock1Active
              ? 'bg-[#090e1b] border-amber-500/40 shadow-lg'
              : 'bg-[#070a14] border-slate-800/80 opacity-70'
          }`}
        >
          {/* Block 1 Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleBlock1Master}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isBlock1Active
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
                title="Ativar/Desativar todo o Bloco 1 de Restauração de Fita"
              >
                <Power className="w-4 h-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    BLOCO 1
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Restauração Arquivística & Preservação da Fita
                  </h3>
                  {!isBlock1Active && isCleanModernRecording && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                      ✓ Bypass Transparente (Gravação Atual)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {!isBlock1Active && isCleanModernRecording
                    ? 'Módulos em bypass transparente: áudio limpo passa bit-a-bit íntegro para equalização e masterização direta.'
                    : 'Correção de azimute de cabeça, reparo de falhas de óxido e redução de ruído de fita sem alterar a dinâmica.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportPreMaster}
                disabled={isExportingPreMaster || isExporting}
                className="px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/50 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                title="Exporta o arquivo de preservação com Azimute e Dropouts corrigidos, SEM nenhuma equalização ou limiter"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Exportar Pré-Master</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab('azimuth')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pl-2"
              >
                <span>Ajustes Avançados</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Block 1 Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
            {/* Module 1: Azimuth & Phase Alignment */}
            <div className="p-4 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Disc className="w-4 h-4 text-amber-400" />
                  Alinhamento de Azimute & Fase
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={azimuthSettings.enabled}
                    onChange={(e) => onUpdateAzimuthSettings({ enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Alinha o tempo de leitura entre cabeças (delay por sub-amostras) e equilibra o ganho L/R.
              </p>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Canal:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateAzimuthSettings({ channelModeOverride: 'force_dual_mono' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                        azimuthSettings.channelModeOverride === 'force_dual_mono' || (!azimuthSettings.channelModeOverride && isTapeDualMono)
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Forçar Mono Two-Track (2 Trilhas)"
                    >
                      Mono 2T
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateAzimuthSettings({ channelModeOverride: 'force_stereo' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                        azimuthSettings.channelModeOverride === 'force_stereo'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Forçar Estéreo Real"
                    >
                      Estéreo
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateAzimuthSettings({ channelModeOverride: 'auto' })}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                        !azimuthSettings.channelModeOverride || azimuthSettings.channelModeOverride === 'auto'
                          ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-900 text-slate-500 hover:text-white'
                      }`}
                      title="Detecção Automática"
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Delay:</span>
                  <span className="text-amber-300 font-bold">
                    {isGhostChannel
                      ? `Mono (Canal ${azimuthAnalysis?.activeSignalChannel} centrado · Anti-ruído)`
                      : `${azimuthSettings.azimuthDelaySamples} samples (${azimuthSettings.balanceDb > 0 ? `+${azimuthSettings.balanceDb}dB R` : `${azimuthSettings.balanceDb}dB L`})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Module 2: Tape Dropout Reconstruction */}
            <div className="p-4 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Reconstrução de Dropouts
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dropoutSettings.enabled}
                    onChange={(e) => onUpdateDropoutSettings({ enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Elimina falhas microscópicas de fita e óxido desprendido usando enxerto analógico sem cliques.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Falhas:</span>
                  <span className="text-emerald-300 font-bold">
                    {dropoutAnalysis?.totalDropouts ?? 0}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 ml-1">
                    {dropoutSettings.mode === 'ampex_fulltrack_cross'
                      ? 'Mono Studer/Ampex'
                      : dropoutSettings.mode === 'mono_wander_graft'
                      ? 'Estabilizador Mono'
                      : 'Estéreo Indep.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {dropoutSettings.enabled ? (
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Ativo</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateDropoutSettings({ enabled: true });
                        onReconstructDropouts();
                      }}
                      disabled={!dropoutAnalysis || dropoutAnalysis.totalDropouts === 0}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer disabled:opacity-40 font-bold"
                    >
                      Ativar & Corrigir
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Module 3: Spectral Denoise (Tape Hiss Removal) */}
            <div className="p-4 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-purple-400" />
                  Redutor de Hiss NoNoise / RX
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={denoiseSettings.enabled}
                    onChange={(e) => onUpdateDenoiseSettings({ enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-purple-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Atenua o ruído de fundo contínuo de fita com filtragem espectral transparente sem abafar a música.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <span className="text-slate-400">Redução:</span>
                <span className="text-purple-300 font-bold">
                  -{denoiseSettings.reductionDb} dB ({denoiseSettings.noiseProfileType})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            BLOCO 2: EQUALIZAÇÃO & TIMBRE ANALÓGICO (MASTERING CORE)
            ======================================================================= */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isBlock2Active
              ? 'bg-[#090f1d] border-cyan-500/40 shadow-lg'
              : 'bg-[#070a14] border-slate-800/80 opacity-70'
          }`}
        >
          {/* Block 2 Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleBlock2Master}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isBlock2Active
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
                title="Ativar/Desativar todo o Bloco 2 de Equalização e Timbre Analógico"
              >
                <Power className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    BLOCO 2
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Equalização, Contorno & Timbre Analógico
                  </h3>
                  {currentPresetName && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 truncate max-w-[200px]" title={`Preset Ativo: ${currentPresetName}`}>
                      {currentPresetName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Eliminação de aspereza digital (De-Harsh), saturação de fita suave e polimento de agudos Orban Optimod.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('mastering')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Ajustes Finos de EQ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Block 2 Modules Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4">
            {/* Module 1: De-Harsh Notch */}
            <div className="p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">De-Harshing</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!humanizerSettings.deHarshBypass}
                    onChange={(e) => onUpdateHumanizerSettings({ deHarshBypass: !e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-400">
                Remove ressonância metálica aos {humanizerSettings.notchFrequencyHz || 3400} Hz.
              </span>
              <div className="text-[10px] font-mono text-cyan-300 font-bold pt-1 border-t border-slate-800/80">
                Intensidade: {humanizerSettings.deHarshIntensity || 60}%
              </div>
            </div>

            {/* Module 2: Tape Warmth */}
            <div className="p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Calor de Fita
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!humanizerSettings.tapeWarmthBypass}
                    onChange={(e) => onUpdateHumanizerSettings({ tapeWarmthBypass: !e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-400">
                Saturação harmônica de fita e compressão suave de transientes.
              </span>
              <div className="text-[10px] font-mono text-amber-300 font-bold pt-1 border-t border-slate-800/80">
                Saturação: {humanizerSettings.tapeWarmth || 40}%
              </div>
            </div>

            {/* Module 3: Low-Mid Body */}
            <div className="p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Corpo Low-Mid</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!humanizerSettings.tapeWarmthBypass}
                    onChange={(e) => onUpdateHumanizerSettings({ tapeWarmthBypass: !e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-400">
                Presença analógica e peso harmônico em 220 Hz.
              </span>
              <div className="text-[10px] font-mono text-cyan-300 font-bold pt-1 border-t border-slate-800/80">
                Ganho: +{humanizerSettings.lowMidBody || 1.2} dB
              </div>
            </div>

            {/* Module 4: Air Band High Shelf */}
            <div className="p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-300" />
                  Air Band
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!humanizerSettings.airExciterBypass}
                    onChange={(e) => onUpdateHumanizerSettings({ airExciterBypass: !e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-400">
                Abertura sedosa e arejada em {Math.round((humanizerSettings.airCutoffHz || 14500) / 1000)} kHz.
              </span>
              <div className="text-[10px] font-mono text-cyan-300 font-bold pt-1 border-t border-slate-800/80">
                Brilho: {humanizerSettings.airExciterGain || 50}%
              </div>
            </div>

            {/* Module 5: Precision Treble Processor */}
            <div className="p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between gap-2.5 col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Processador Agudos</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={humanizerSettings.orbanHfEnabled !== false && !humanizerSettings.orbanHfBypass}
                    onChange={(e) =>
                      onUpdateHumanizerSettings({
                        orbanHfEnabled: e.target.checked,
                        orbanHfBypass: !e.target.checked,
                        orbanHfUserOverrideLock: true, // Ação manual do usuário
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-400">
                Resposta Flat (Sem FM) & HF Limiter anti-sibilância.
              </span>
              <div className="text-[10px] font-mono text-cyan-300 font-bold pt-1 border-t border-slate-800/80 flex items-center justify-between">
                <span>{humanizerSettings.orbanHfMode === 'smooth_silk' ? 'Sedoso 8700' : humanizerSettings.orbanHfMode === 'tape_restore' ? 'Restauração Fita' : 'Linear Flat'}</span>
                {humanizerSettings.orbanHfBypass && (
                  <span
                    className="text-[9px] text-amber-400 font-semibold"
                    title={
                      humanizerSettings.orbanHfUserOverrideLock
                        ? "Módulo colocado em bypass manual pelo usuário"
                        : "Desabilitado automaticamente pois o áudio não necessita deste processador"
                    }
                  >
                    {humanizerSettings.orbanHfUserOverrideLock ? "🔒 Bypass Manual" : "○ Não Necessário"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            BLOCO 3: NIVELAMENTO & MASTERIZAÇÃO FINAL (LIMITLESS)
            ======================================================================= */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isBlock3Active
              ? 'bg-[#0a1120] border-emerald-500/40 shadow-lg'
              : 'bg-[#070a14] border-slate-800/80 opacity-70'
          }`}
        >
          {/* Block 3 Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleBlock3Master}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isBlock3Active
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
                title="Ativar/Desativar todo o Bloco 3 de Nivelamento e Limitless Maximizer"
              >
                <Power className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    BLOCO 3
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Nivelamento Dinâmico & Masterização Final (Limitless)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Equalização de volume para o padrão desejado (-14 LUFS Streaming) e teto de pico seguro sem distorção.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('lufs')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Radar LUFS & Dinâmica</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Block 3 Controls: Target LUFS Quick Presets */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4">
            {/* Target LUFS Selector */}
            <div className="md:col-span-8 flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Alvo de Intensidade (Target Integrated LUFS):</span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {humanizerSettings.targetLufs ?? -14.0} LUFS
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {[
                  { lufs: -14.0, label: '-14 LUFS', desc: 'Spotify / YouTube' },
                  { lufs: -16.0, label: '-16 LUFS', desc: 'Audiófilo / Apple' },
                  { lufs: -12.0, label: '-12 LUFS', desc: 'CD Moderno' },
                  { lufs: -10.0, label: '-10 LUFS', desc: 'Competitivo Alto' },
                ].map((preset) => (
                  <button
                    key={preset.lufs}
                    type="button"
                    onClick={() => onUpdateHumanizerSettings({ targetLufs: preset.lufs })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      humanizerSettings.targetLufs === preset.lufs
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-[#0f1526] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{preset.label}</div>
                    <div className="text-[10px] text-slate-400">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ceiling & True Peak Guard */}
            <div className="md:col-span-4 p-3.5 rounded-xl bg-[#0f1526] border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Teto de Pico (True Peak):</span>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {humanizerSettings.targetCeilingDb ?? -1.0} dBFS
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mt-2">
                Margem de segurança de 1.0 dBFS para evitar distorção em codecs de streaming (MP3/AAC).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FINAL ACTION BAR & FAST EXPORT
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1220] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xl select-none">
        {/* Left: Transport & Listening Signal */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`py-3 px-5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md min-h-[44px] flex-1 sm:flex-initial ${
              isPlaying
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-slate-950 shrink-0" /> : <Play className="w-4 h-4 fill-cyan-400 shrink-0" />}
            <span>{isPlaying ? 'PAUSAR' : 'REPRODUZIR'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleAB}
            className={`py-3 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border min-h-[44px] flex-1 sm:flex-initial ${
              isCompareOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                : 'bg-[#121929] text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Alterna instantaneamente entre o áudio Masterizado e o Áudio Cru Original"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="truncate">{isCompareOriginal ? 'ÁUDIO CRU (Original)' : 'MASTERIZADO (A/B)'}</span>
          </button>
        </div>

        {/* Right: Master Resolution & Direct Export */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          {/* Bit depth selector */}
          <div className="flex items-center bg-[#101726] border border-slate-800 rounded-xl p-1 text-xs font-mono min-h-[44px] h-[44px]">
            <button
              onClick={() => onChangeBitDepth(16)}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors h-full flex items-center ${
                outputBitDepth === 16 ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="16-bit: Compatibilidade total em 100% dos reprodutores e som automotivo"
            >
              16-bit
            </button>
            <button
              onClick={() => onChangeBitDepth(24)}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors h-full flex items-center ${
                outputBitDepth === 24 ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="24-bit: Master de estúdio audiófilo com máxima resolução"
            >
              24-bit
            </button>
          </div>

          <button
            type="button"
            onClick={onExportMaster}
            disabled={isExporting}
            title="Exportar Master Final WAV com o Preset de Recall (.aurapreset) correspondente salvo junto"
            className="py-3 px-5 sm:px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40 min-h-[44px] flex-1 sm:flex-initial"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="leading-tight text-center">
              {isExporting ? 'Renderizando Master...' : `Exportar Master Final WAV (${outputBitDepth}-bit) + Preset`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
