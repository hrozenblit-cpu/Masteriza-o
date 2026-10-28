import { useState, useEffect, useRef } from 'react';
import { TopNav } from './components/TopNav';
import { AudioUploader } from './components/AudioUploader';
import { SpectrogramCanvas } from './components/SpectrogramCanvas';
import { LissajousScope } from './components/LissajousScope';
import { RadarArtifactChart } from './components/RadarArtifactChart';
import { HumanizerControls } from './components/HumanizerControls';
import { ForensicReportModal } from './components/ForensicReportModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { LufsLimitlessConsole } from './components/LufsLimitlessConsole';
import { TapeAzimuthConsole } from './components/TapeAzimuthConsole';
import { TapeDropoutConsole } from './components/TapeDropoutConsole';
import { PresetManagerModal } from './components/PresetManagerModal';
import { BatchProcessingModal, BatchItem } from './components/BatchProcessingModal';
import { BatchAuditionBar } from './components/BatchAuditionBar';
import { FolderSettingsModal } from './components/FolderSettingsModal';
import { audioEngine } from './audio/audioEngine';
import { analyzeAudioForensics } from './audio/analyzer';
import { detectAudioFileFormat, AudioInputFormat } from './audio/audioFormatDetector';
import { decodeAudioPreservingSampleRate } from './audio/nativeAudioDecoder';
import { analyzeBufferLoudness } from './audio/loudnessEngine';
import { analyzeTapeAzimuth, TapeAzimuthAnalysis, TapeAzimuthSettings } from './audio/tapeAzimuthEngine';
import {
  analyzeTapeDropouts,
  reconstructTapeDropouts,
  TapeDropoutAnalysis,
  TapeDropoutSettings,
  TapeDropoutMode,
  DEFAULT_DROPOUT_SETTINGS
} from './audio/tapeDropoutEngine';
import { UserPreset, getAllPresets, getPresetForAudioAnalysis } from './audio/presetManager';
import { autoSaveManager, SUBFOLDER_RECOVERED, SUBFOLDER_MASTERED } from './audio/autoSaveManager';
import {
  generateTrackRecall,
  recallToBlob,
  parseRecallFile
} from './audio/presetRecallManager';
import {
  parseTrackMetadata,
  stripAudioFileExtension,
  buildMasterWavFilename,
  buildAzimuthWavFilename,
  buildDropoutWavFilename,
  buildPreMasterWavFilename,
  buildRecallFilename
} from './audio/trackNamingHelper';
import { ForensicAnalysisResult, HumanizerSettings, LoudnessMetrics } from './types/audio';
import { TapeDenoiseConsole } from './components/TapeDenoiseConsole';
import { ModularWorkflowConsole } from './components/ModularWorkflowConsole';
import { SpectralDenoiseSettings, DEFAULT_DENOISE_SETTINGS, NoiseAnalysisTelemetry } from './audio/spectralDenoiseEngine';
import { OrbanTrebleTelemetry } from './audio/orbanTrebleEngine';
import {
  analyzeSplitStereoFilename,
  findSplitStereoPair,
  mergeMonoBuffersToStereo
} from './audio/splitStereoManager';
import { PendingSplitMonoState } from './components/AudioUploader';
import { SplitStereoModal } from './components/SplitStereoModal';
import { Sparkles, Layers, Cpu, ArrowRight, Activity, CheckCircle2, Gauge, Disc, Bookmark, FolderDown, History, ShieldCheck, Waves, AlertTriangle, X, GitFork, RefreshCw } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer'>('modular');
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [pendingSplitMono, setPendingSplitMono] = useState<PendingSplitMonoState | null>(null);
  const [isSplitStereoModalOpen, setIsSplitStereoModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [outputDirName, setOutputDirName] = useState<string>(autoSaveManager.getBaseDirName());

  // Batch Processing & Audition State
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [editingBatchIndex, setEditingBatchIndex] = useState<number | null>(null);
  const [currentGlobalPresetName, setCurrentGlobalPresetName] = useState<string>('Digitalização Fita 1/4" (Anos 50-70)');

  // Track Standard Naming Metadata State ([Faixa]_[Música] - [Cantor] - AT_[Taxa_Bit]_[LUFS])
  const [trackNumber, setTrackNumber] = useState<string>('');
  const [songTitle, setSongTitle] = useState<string>('');
  const [artistName, setArtistName] = useState<string>('');

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompareOriginal, setIsCompareOriginal] = useState(false); // false = Mastered, true = Raw AI
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAzimuth, setIsExportingAzimuth] = useState(false);
  const [isExportingDropout, setIsExportingDropout] = useState(false);
  const [isExportingDenoised, setIsExportingDenoised] = useState(false);
  const [isExportingPreMaster, setIsExportingPreMaster] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportBitDepth, setExportBitDepth] = useState<16 | 24 | 32>(24);
  const [isRestoringDropout, setIsRestoringDropout] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [appErrorNotice, setAppErrorNotice] = useState<string | null>(null);

  // 1/4" Tape Azimuth & Channel Balance State
  const [tapeAzimuthAnalysis, setTapeAzimuthAnalysis] = useState<TapeAzimuthAnalysis | null>(null);
  const [tapeAzimuthSettings, setTapeAzimuthSettings] = useState<TapeAzimuthSettings>({
    enabled: true,
    azimuthDelaySamples: 0,
    balanceDb: 0,
    invertPhaseL: false,
    invertPhaseR: false,
    listenInMono: false,
    autoAlignOnLoad: true,
  });

  // Tape Dropout & Cross-Channel Ampex Full-Track Restoration State
  const [tapeDropoutAnalysis, setTapeDropoutAnalysis] = useState<TapeDropoutAnalysis | null>(null);
  const [tapeDropoutSettings, setTapeDropoutSettings] = useState<TapeDropoutSettings>(DEFAULT_DROPOUT_SETTINGS);

  // Spectral Denoise (Sonic Solutions NoNoise & iZotope RX Style)
  const [tapeDenoiseTelemetry, setTapeDenoiseTelemetry] = useState<NoiseAnalysisTelemetry | null>(null);
  const [tapeDenoiseSettings, setTapeDenoiseSettings] = useState<SpectralDenoiseSettings>(DEFAULT_DENOISE_SETTINGS);

  // Orban Optimod Treble Processor State
  const [orbanTelemetry, setOrbanTelemetry] = useState<OrbanTrebleTelemetry | null>(null);

  // Current Track & Buffer State (Pure User Audio - Zero Artificial Beep Synths)
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Nenhum arquivo carregado');
  const [audioFormat, setAudioFormat] = useState<AudioInputFormat | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trackLoudness, setTrackLoudness] = useState<LoudnessMetrics | null>(null);

  // Audio Buffers
  const rawBufferRef = useRef<AudioBuffer | null>(null);
  const masterBufferRef = useRef<AudioBuffer | null>(null);

  // Forensic Analysis State
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);

  // Mastering DSP Settings (Calibrated for pristine audiophile quality, zero distortion)
  const [humanizerSettings, setHumanizerSettings] = useState<HumanizerSettings>({
    enabled: true,
    deHarshIntensity: 0,
    notchFrequencyHz: 3400,
    notchBandwidthQ: 2.5,
    tapeWarmth: 0,
    tubeHarmonics: 0,
    lowMidBody: 0,
    transientPunch: 0,
    attackDeSmear: 0,
    timingJitterMs: 0,
    flutterWowRate: 0,
    airExciterGain: 0,
    airCutoffHz: 14500,
    stereoCorrelationFix: 0,
    monoBassCutoffHz: 0,
    acousticRoomSpread: 0,
    outputGainDb: 0,
    limitlessEnabled: true,
    targetLufs: -14.0,
    targetCeilingDb: -1.0,
    clipperDrive: 0,
    lowEndWeight: 0,
    transientSpeed: 'punchy',
    orbanHfEnabled: true,
    orbanHfBypass: false,
    orbanHfUserOverrideLock: false,
    orbanHfMode: 'smooth_silk',
    orbanHfAmount: 50,
    orbanHfAutoBrillianceDb: 0.0,
    orbanHfHighShelfGainDb: 0.0,
    orbanHfThresholdDb: -6.0,
    orbanHfCrossoverHz: 6000,
    orbanHfSpeed: 'medium',
  });

  // Unified Audio Ingestion Pipeline for Single-File or Merged Pro Tools Split-Stereo
  const runAudioIngestionPipeline = async (
    audioBuffer: AudioBuffer,
    displayName: string,
    detectedFormat: AudioInputFormat
  ) => {
    // Reset batch audition mode and A/B comparison so this new track is loaded cleanly
    setEditingBatchIndex(null);
    setIsCompareOriginal(false);
    audioEngine.stop(true);
    setIsPlaying(false);
    setPlaybackTime(0);
    rawBufferRef.current = audioBuffer;
    masterBufferRef.current = audioBuffer;
    audioEngine.resetTrack(audioBuffer, audioBuffer);
    setCurrentTrackTitle(displayName);
    setDuration(audioBuffer.duration);

    // Parse track metadata for standardized studio naming: [faixa]_[Música] - [Cantor] - AT_[taxa_bit]_[LUFS]
    const parsedMeta = parseTrackMetadata(displayName);
    setTrackNumber(parsedMeta.trackNumber);
    setSongTitle(parsedMeta.songTitle);
    setArtistName(parsedMeta.artist);

    // Compute precise full-track ITU-R BS.1770-4 loudness metrics
    setAnalysisStatus('Medindo loudness BS.1770 e dinâmica...');
    await new Promise((r) => setTimeout(r, 10));
    const loudness = analyzeBufferLoudness(audioBuffer);
    setTrackLoudness(loudness);
    audioEngine.setTrackLoudness(loudness);

    // Analyze user file forensics
    setAnalysisStatus('Realizando triagem forense espectral...');
    await new Promise((r) => setTimeout(r, 10));
    const analysis = await analyzeAudioForensics(audioBuffer, displayName);
    setAnalysisResult(analysis);

    // 1/4" Analog Tape Azimuth & Inter-Channel Balance Analysis
    setAnalysisStatus('Analisando correlação estéreo vs mono e azimute...');
    await new Promise((r) => setTimeout(r, 10));
    const azimuth = analyzeTapeAzimuth(audioBuffer);
    setTapeAzimuthAnalysis(azimuth);

    // 1/4" Tape Dropout Analysis (Ampex Full-Track Mono digitized on Studer A80 2-Track)
    setAnalysisStatus('Varrendo falhas de fita e dropouts...');
    await new Promise((r) => setTimeout(r, 10));
    const dropouts = analyzeTapeDropouts(audioBuffer, tapeDropoutSettings);
    setTapeDropoutAnalysis(dropouts);
    audioEngine.setTapeDropoutAnalysis(dropouts);

    // Intelligent Material Detection: Real Stereo vs Mono in 2 Channels vs Modern Clean Recording
    const isDualMono =
      azimuth.channelConfiguration === 'dual_mono' ||
      (dropouts.isAmpexFullTrackCandidate && azimuth.sideToMidDb <= -26.0);

    const hasDropouts = dropouts.totalDropouts > 0;
    const hasAzimuthLag = Math.abs(azimuth.azimuthOffsetSamples) >= 0.1 || Math.abs(azimuth.levelDiffDb) >= 0.35;

    // 1/4" Tape Noise Profile Analysis (Sonic Solutions NoNoise & iZotope RX Spectral De-noise)
    setAnalysisStatus('Avaliando perfil de ruído e hiss...');
    await new Promise((r) => setTimeout(r, 10));
    const denoiseAnalysis = audioEngine.analyzeDenoise(audioBuffer);
    setTapeDenoiseTelemetry(denoiseAnalysis);

    const hasTapeHiss = Boolean(
      denoiseAnalysis?.hasNoiseDetected ||
      (denoiseAnalysis?.hissNoiseFloorDb ?? -90) > -75.0 ||
      denoiseAnalysis?.hasHumDetected
    );
    const isCleanModern = !hasDropouts && !hasTapeHiss && !hasAzimuthLag && dropouts.tapeHealthScore === 100;

    const isWanderOrDefect =
      isDualMono &&
      (dropouts.isSevereWanderDetected ||
        dropouts.channelComparison?.isSevereWanderDetected ||
        hasDropouts);

    const safeDropoutMode: TapeDropoutMode = isDualMono && !isCleanModern
      ? (tapeDropoutSettings.mode === 'mono_wander_graft' || isWanderOrDefect ? 'mono_wander_graft' : 'ampex_fulltrack_cross')
      : 'stereo_independent';

    const safeDropoutSettings: TapeDropoutSettings = {
      ...tapeDropoutSettings,
      enabled: hasDropouts || (!isCleanModern && isDualMono && isWanderOrDefect),
      mode: !isDualMono ? 'stereo_independent' : safeDropoutMode,
    };
    setTapeDropoutSettings(safeDropoutSettings);
    audioEngine.updateTapeDropoutSettings(safeDropoutSettings);

    if (denoiseAnalysis) {
      const autoDenoise: SpectralDenoiseSettings = {
        ...tapeDenoiseSettings,
        enabled: hasTapeHiss && !isCleanModern,
        noiseProfileType: denoiseAnalysis.recommendedNoiseProfileType,
        humNotchFilter: denoiseAnalysis.recommendedHumNotch,
        reductionDb: denoiseAnalysis.recommendedReductionDb,
        learnedNoiseBands: denoiseAnalysis.noiseProfileBands,
      };
      setTapeDenoiseSettings(autoDenoise);
      audioEngine.updateTapeDenoiseSettings(autoDenoise);
    }


    // Orban Optimod Treble Analysis & Calibration (Defaults to Audiófilo Sedoso 8700 at -6.5 dB)
    setAnalysisStatus('Calibrando equalização Orban e masterização...');
    await new Promise((r) => setTimeout(r, 10));
    const orbanAnalysis = audioEngine.getOrbanTrebleTelemetry(audioBuffer);
    setOrbanTelemetry(orbanAnalysis);

    // 1. Identificação inteligente do Preset correspondente à fonte analisada (IA, Fita Vintage, Fita Moderna, etc.)
    const recommendedPreset = getPresetForAudioAnalysis(analysis, {
      isDarkTape: orbanAnalysis?.isDarkTape,
      hasDropouts,
      hasAzimuthError: hasAzimuthLag,
      isDualMono,
    });
    setCurrentGlobalPresetName(recommendedPreset.name);

    // Detecta se o áudio presente necessita do processador de agudos (fita abafada, estridência/sibilância ou ajuste de brilho)
    const audioNeedsTreble = Boolean(
      orbanAnalysis?.needsProcessing ||
      orbanAnalysis?.isDarkTape ||
      orbanAnalysis?.isHarshRecording ||
      Math.abs(orbanAnalysis?.recommendedBrillianceDb ?? 0) >= 0.5
    );

    // Trava manual do usuário: só é respeitada se o usuário tiver explicitamente acionado o botão/trava de bypass
    const userExplicitlyDisabled = Boolean(humanizerSettings.orbanHfUserOverrideLock && (humanizerSettings.orbanHfBypass || !humanizerSettings.orbanHfEnabled));
    const userExplicitlyEnabled = Boolean(humanizerSettings.orbanHfUserOverrideLock && !humanizerSettings.orbanHfBypass && humanizerSettings.orbanHfEnabled);

    const shouldEnableOrban = userExplicitlyEnabled
      ? true
      : userExplicitlyDisabled
      ? false
      : audioNeedsTreble;

    // Constrói os parâmetros com base no Preset identificado + calibração de agudos
    const settingsToApply: HumanizerSettings = {
      ...recommendedPreset.settings,
      orbanHfEnabled: shouldEnableOrban,
      orbanHfBypass: !shouldEnableOrban,
      orbanHfUserOverrideLock: humanizerSettings.orbanHfUserOverrideLock ?? false,
      orbanHfMode: orbanAnalysis?.recommendedMode || recommendedPreset.settings.orbanHfMode || 'smooth_silk',
      orbanHfAmount: orbanAnalysis?.isDarkTape ? 65 : (recommendedPreset.settings.orbanHfAmount || 50),
      orbanHfAutoBrillianceDb: orbanAnalysis?.recommendedBrillianceDb ?? recommendedPreset.settings.orbanHfAutoBrillianceDb,
      orbanHfHighShelfGainDb: orbanAnalysis?.recommendedBrillianceDb ?? recommendedPreset.settings.orbanHfHighShelfGainDb,
      orbanHfThresholdDb: orbanAnalysis?.recommendedThresholdDb ?? recommendedPreset.settings.orbanHfThresholdDb,
      orbanHfCrossoverHz: orbanAnalysis?.recommendedCrossoverHz ?? recommendedPreset.settings.orbanHfCrossoverHz,
      orbanHfSpeed: orbanAnalysis?.recommendedSpeed ?? recommendedPreset.settings.orbanHfSpeed,
    };

    setHumanizerSettings(settingsToApply);
    audioEngine.updateSettings(settingsToApply);

    if (tapeAzimuthSettings.autoAlignOnLoad) {
      const isGhost = azimuth.isGhostChannelDetected;
      // Never amplify a dead/hiss channel! Safe balance is 0.0 for ghost channels and clamped to [-4.5, +4.5] dB for authentic stereo.
      const safeBalance = isGhost ? 0.0 : Math.max(-4.5, Math.min(4.5, -azimuth.levelDiffDb));
      const autoAzimuth: TapeAzimuthSettings = {
        ...tapeAzimuthSettings,
        ...(recommendedPreset.azimuthSettings || {}),
        enabled: true,
        azimuthDelaySamples: isGhost ? 0 : azimuth.azimuthOffsetSamples,
        balanceDb: safeBalance,
        activeChannel: azimuth.activeSignalChannel || 'both',
        ghostChannelHandling: isGhost ? 'clone_active' : 'passthrough',
      };
      setTapeAzimuthSettings(autoAzimuth);
      audioEngine.updateTapeAzimuthSettings(autoAzimuth);
    }

    // Preload buffer: For tracks > 5 min, use instantaneous zero-delay real-time DSP
    const isLongTrack = audioBuffer.duration > 300;
    if (isLongTrack) {
      setAnalysisStatus(`Ativando DSP em tempo real instantâneo para áudio longo (${Math.round(audioBuffer.duration / 60)} min)...`);
      audioEngine.resetTrack(audioBuffer, audioBuffer);
      audioEngine.updateSettings(settingsToApply);
      masterBufferRef.current = audioBuffer;
    } else {
      setAnalysisStatus(`Renderizando áudio master com preset "${recommendedPreset.name}"...`);
      await audioEngine.loadRawBuffer(audioBuffer).then((rendered) => {
        if (rendered) {
          masterBufferRef.current = rendered;
        }
      });
    }

    const dropoutNotice = dropouts.totalDropouts > 0
      ? ` | Dropouts: ${dropouts.totalDropouts} (${dropouts.isAmpexFullTrackCandidate ? 'Ampex Full-Track detectada' : `${dropouts.tapeHealthScore}% saúde`})`
      : ' | Fita sem dropouts';

    const isPreviouslyMastered = /(- AT_|_AT_|_Master_|PreMaster)/i.test(displayName);
    const masterWarning = isPreviouslyMastered
      ? ' ⚠️ [Aviso: Arquivo com identificação de processamento anterior detectado. Para evitar aplicação dupla de efeitos/presets, utilize o arquivo cru original ou o Pré-Master Restaurado.]'
      : '';

    const azimuthNotice = azimuth.isGhostChannelDetected
      ? `Canal Fantasma: Canal ${azimuth.activeSignalChannel} Útil (Centrado em Mono Limpo · Ganho cego de +${Math.abs(azimuth.levelDiffDb).toFixed(1)} dB rejeitado)`
      : `Azimute: ${azimuth.azimuthOffsetUs > 0 ? '+' : ''}${azimuth.azimuthOffsetUs.toFixed(1)} µs | Balanço: ${azimuth.levelDiffDb > 0 ? '+' : ''}${azimuth.levelDiffDb.toFixed(1)} dB`;

    setExportNotice(
      `Áudio carregado: ${detectedFormat.sampleRate.toLocaleString()} Hz · ${detectedFormat.bitDepth}-bit (${detectedFormat.codec}). Preset "${recommendedPreset.name}" selecionado e atuando na masterização. ${azimuthNotice}${dropoutNotice}.${masterWarning}`
    );
    setTimeout(() => setExportNotice(null), isPreviouslyMastered ? 10000 : 7000);
  };

  // Pro Tools Split Stereo (.L and .R) Merging Handler
  const handleSplitStereoUpload = async (fileA: File, fileB: File) => {
    try {
      setIsAnalyzing(true);
      // Immediately stop and wipe current track so previous audio never plays or bleeds
      audioEngine.wipeCurrentTrack();
      masterBufferRef.current = null;
      rawBufferRef.current = null;
      setEditingBatchIndex(null);
      setIsCompareOriginal(false);
      setIsPlaying(false);
      setPlaybackTime(0);
      setDuration(0);
      setAnalysisResult(null);
      setTapeDropoutAnalysis(null);
      setTapeAzimuthAnalysis(null);
      setTapeDenoiseTelemetry(null);
      setOrbanTelemetry(null);

      const infoA = analyzeSplitStereoFilename(fileA.name);
      const infoB = analyzeSplitStereoFilename(fileB.name);

      let fileL = fileA;
      let fileR = fileB;

      if (infoA.channel === 'L' || infoB.channel === 'R') {
        fileL = infoA.channel === 'L' ? fileA : fileB;
        fileR = infoA.channel === 'L' ? fileB : fileA;
      } else if (infoA.channel === 'R' || infoB.channel === 'L') {
        fileL = infoA.channel === 'R' ? fileB : fileA;
        fileR = infoA.channel === 'R' ? fileA : fileB;
      }

      setAnalysisStatus(`Decodificando Canal L (${fileL.name})...`);
      await new Promise((r) => setTimeout(r, 10));
      const bufferL = await decodeAudioPreservingSampleRate(fileL, audioEngine.getAudioContext());

      setAnalysisStatus(`Decodificando Canal R (${fileR.name})...`);
      await new Promise((r) => setTimeout(r, 10));
      const bufferR = await decodeAudioPreservingSampleRate(fileR, audioEngine.getAudioContext());

      setAnalysisStatus('Unindo canais .L e .R em estéreo analógico de 2 canais...');
      await new Promise((r) => setTimeout(r, 10));
      const stereoBuffer = mergeMonoBuffersToStereo(bufferL, bufferR, audioEngine.getAudioContext());

      setAnalysisStatus('Detectando taxa e profundidade de bits...');
      await new Promise((r) => setTimeout(r, 10));
      const detectedFormat = await detectAudioFileFormat(fileL, stereoBuffer);
      detectedFormat.channels = 2;
      detectedFormat.codec = `Pro Tools Split-Mono (2x Mono → Estéreo ${detectedFormat.bitDepth}-bit PCM)`;
      detectedFormat.fileSizeBytes = fileL.size + fileR.size;
      setAudioFormat(detectedFormat);
      setExportBitDepth(detectedFormat.bitDepth === 16 ? 16 : 24);

      setPendingSplitMono(null);

      const baseTrackName =
        infoA.baseName ||
        infoB.baseName ||
        fileL.name.replace(/[\._\-\s(]*(l|r|left|right)[\._\-\s)]*(\.[^.]*)?$/i, '');
      const trackTitle = `${baseTrackName} (Estéreo L+R)`;

      await runAudioIngestionPipeline(stereoBuffer, trackTitle, detectedFormat);

      setExportNotice(
        `✓ Arquivos Pro Tools .L e .R unidos com sucesso em Estéreo de 2 canais (${detectedFormat.sampleRate.toLocaleString()} Hz · ${detectedFormat.bitDepth}-bit)!`
      );
      setTimeout(() => setExportNotice(null), 7000);
    } catch (err) {
      console.error('Erro ao unir arquivos Split Stereo do Pro Tools:', err);
      setAppErrorNotice('Erro ao unir os arquivos .L e .R em estéreo.');
      setTimeout(() => setAppErrorNotice(null), 7000);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus(null);
    }
  };

  // Handle User File Upload - Extracts Exact Sample Rate and Bit Depth
  const handleFileUpload = async (file: File) => {
    try {
      setIsAnalyzing(true);
      // Immediately stop and wipe current track so previous song never remains or plays
      audioEngine.wipeCurrentTrack();
      masterBufferRef.current = null;
      rawBufferRef.current = null;
      setEditingBatchIndex(null);
      setIsCompareOriginal(false);
      setIsPlaying(false);
      setPlaybackTime(0);
      setDuration(0);
      setCurrentTrackTitle(file.name);
      setAnalysisResult(null);
      setTapeDropoutAnalysis(null);
      setTapeAzimuthAnalysis(null);
      setTapeDenoiseTelemetry(null);
      setOrbanTelemetry(null);

      // Check if there is already a split mono channel waiting and this file is the partner:
      if (pendingSplitMono) {
        const pair = findSplitStereoPair([pendingSplitMono.file, file]);
        if (pair) {
          await handleSplitStereoUpload(pair.fileL, pair.fileR);
          return;
        }
        const info = analyzeSplitStereoFilename(file.name);
        if (info.isSplit && info.channel && info.channel !== pendingSplitMono.channel) {
          const fileL = pendingSplitMono.channel === 'L' ? pendingSplitMono.file : file;
          const fileR = pendingSplitMono.channel === 'R' ? pendingSplitMono.file : file;
          await handleSplitStereoUpload(fileL, fileR);
          return;
        }
      }

      setAnalysisStatus('Decodificando áudio na taxa nativa...');
      await new Promise((r) => setTimeout(r, 10));
      const audioBuffer = await decodeAudioPreservingSampleRate(file, audioEngine.getAudioContext());

      setAnalysisStatus('Detectando taxa e profundidade de bits...');
      await new Promise((r) => setTimeout(r, 10));
      const detectedFormat = await detectAudioFileFormat(file, audioBuffer);
      setAudioFormat(detectedFormat);
      setExportBitDepth(detectedFormat.bitDepth === 16 ? 16 : 24);

      // Check if this single file is half of a Pro Tools split-mono pair (.L or .R)
      const splitInfo = analyzeSplitStereoFilename(file.name);
      if (splitInfo.isSplit && splitInfo.channel && splitInfo.expectedPartnerFilename) {
        setPendingSplitMono({
          file,
          channel: splitInfo.channel,
          baseName: splitInfo.baseName || file.name,
          expectedPartnerFilename: splitInfo.expectedPartnerFilename,
        });
      } else {
        setPendingSplitMono(null);
      }

      await runAudioIngestionPipeline(audioBuffer, file.name, detectedFormat);
    } catch {
      setAppErrorNotice('Erro ao carregar ou decodificar arquivo. Por favor tente outro formato (WAV, MP3, FLAC, M4A, MP4/MPG4, MOV).');
      setTimeout(() => setAppErrorNotice(null), 7000);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus(null);
    }
  };

  const handleReanalyzeForensics = async () => {
    const activeBuf = rawBufferRef.current || masterBufferRef.current;
    if (!activeBuf) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Reanalisando triagem forense com novo modelo acústico...');
    try {
      const analysis = await analyzeAudioForensics(activeBuf, currentTrackTitle);
      setAnalysisResult(analysis);

      // Intelligent Preset Selection: route to factory_live_dvd_analog or appropriate preset
      const suggestedPreset = getPresetForAudioAnalysis(analysis);
      if (suggestedPreset && !humanizerSettings.orbanHfUserOverrideLock) {
        setCurrentGlobalPresetName(suggestedPreset.name);
        setHumanizerSettings(suggestedPreset.settings);
        audioEngine.updateSettings(suggestedPreset.settings);
        if (suggestedPreset.azimuthSettings) {
          setTapeAzimuthSettings(suggestedPreset.azimuthSettings);
          audioEngine.updateTapeAzimuthSettings(suggestedPreset.azimuthSettings);
        }
      }

      setExportNotice(
        `✓ Diagnóstico atualizado: ${analysis.dominantPlatform.name} (${analysis.overallAiProbability.toFixed(1)}% IA) - ${analysis.verdict}!`
      );
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err) {
      console.error(err);
      setAppErrorNotice('Erro ao reanalisar o áudio.');
      setTimeout(() => setAppErrorNotice(null), 5000);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus(null);
    }
  };

  const handleMultipleFilesUpload = async (files: FileList) => {
    if (files.length >= 2) {
      const pair = findSplitStereoPair(files);
      if (pair) {
        await handleSplitStereoUpload(pair.fileL, pair.fileR);
        return;
      }
    }
    // Populate batch queue with dropped or selected multiple files for a new clean batch session
    setBatchQueue((prev) => {
      const allDone = prev.length > 0 && prev.every((it) => it.status === 'done');
      const baseQueue = allDone ? [] : prev;
      const newItems: BatchItem[] = [];
      const defaultPresetName = currentGlobalPresetName || 'Digitalização Fita 1/4" (Anos 50-70)';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (
          !file.type.includes('audio') &&
          !file.type.includes('video') &&
          !file.name.match(/\.(wav|mp3|flac|m4a|aac|ogg|aiff|aif|mp4|mpg4|mov|m4v|webm|mkv)$/i)
        ) {
          continue;
        }
        const parsedMeta = parseTrackMetadata(file.name, baseQueue.length + i + 1);
        newItems.push({
          id: `batch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          file,
          title: file.name,
          trackNumber: parsedMeta.trackNumber,
          songTitle: parsedMeta.songTitle,
          artist: parsedMeta.artist,
          sizeBytes: file.size,
          status: 'pending',
          presetName: defaultPresetName,
          customHumanizerSettings: { ...humanizerSettings },
          customAzimuthSettings: { ...tapeAzimuthSettings },
          isCustomized: false,
        });
      }
      return [...baseQueue, ...newItems];
    });
    setEditingBatchIndex(null);
    setIsBatchModalOpen(true);
  };

  // Azimuth Handlers
  const handleUpdateAzimuthSettings = (newSettings: Partial<TapeAzimuthSettings>) => {
    setTapeAzimuthSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customAzimuthSettings: updated, isCustomized: true }
              : it
          )
        );
      }
      return updated;
    });
    audioEngine.updateTapeAzimuthSettings(newSettings);
  };

  const handleAutoAlignAzimuth = () => {
    if (!tapeAzimuthAnalysis) return;
    const isGhost = tapeAzimuthAnalysis.isGhostChannelDetected;
    const safeBalance = isGhost ? 0.0 : Math.max(-4.5, Math.min(4.5, -tapeAzimuthAnalysis.levelDiffDb));
    const aligned: TapeAzimuthSettings = {
      ...tapeAzimuthSettings,
      enabled: true,
      azimuthDelaySamples: isGhost ? 0 : tapeAzimuthAnalysis.azimuthOffsetSamples,
      balanceDb: safeBalance,
      activeChannel: tapeAzimuthAnalysis.activeSignalChannel || 'both',
      ghostChannelHandling: isGhost ? 'clone_active' : 'passthrough',
    };
    setTapeAzimuthSettings(aligned);
    audioEngine.updateTapeAzimuthSettings(aligned);
    if (editingBatchIndex !== null) {
      setBatchQueue((q) =>
        q.map((it, idx) =>
          idx === editingBatchIndex
            ? { ...it, customAzimuthSettings: aligned, isCustomized: true }
            : it
        )
      );
    }
    const noticeText = isGhost
      ? `✓ Canal Fantasma identificado! Canal ${tapeAzimuthAnalysis.activeSignalChannel} duplicado em Mono limpo; amplificação cega de +${Math.abs(tapeAzimuthAnalysis.levelDiffDb).toFixed(1)} dB rejeitada.`
      : `✓ Azimute calibrado automaticamente: ${tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs | Balanço: ${safeBalance.toFixed(1)} dB.`;
    setExportNotice(noticeText);
    setTimeout(() => setExportNotice(null), 6000);
  };

  // Load Custom User / Factory Preset
  const handleLoadPreset = (preset: UserPreset) => {
    setCurrentGlobalPresetName(preset.name);

    const isRecall = preset.id.startsWith('recall_') || preset.name.toLowerCase().includes('recall');
    // Trava de bypass manual do usuário: só é preservada para presets normais de fábrica se o usuário travou. Para recalls, restaura 100% dos parâmetros salvos!
    const isExplicitlyLocked = !isRecall && Boolean(humanizerSettings.orbanHfUserOverrideLock);

    const settingsToApply: HumanizerSettings = {
      ...preset.settings,
      ...(isExplicitlyLocked
        ? {
            orbanHfBypass: humanizerSettings.orbanHfBypass,
            orbanHfEnabled: humanizerSettings.orbanHfEnabled,
            orbanHfUserOverrideLock: true,
          }
        : {
            orbanHfUserOverrideLock: false,
          }),
    };

    setHumanizerSettings(settingsToApply);
    audioEngine.updateSettings(settingsToApply);

    if (preset.azimuthSettings) {
      setTapeAzimuthSettings(preset.azimuthSettings);
      audioEngine.updateTapeAzimuthSettings(preset.azimuthSettings);
    }

    if (preset.dropoutSettings) {
      setTapeDropoutSettings(preset.dropoutSettings);
      audioEngine.updateTapeDropoutSettings(preset.dropoutSettings);
    }

    if (preset.denoiseSettings) {
      setTapeDenoiseSettings(preset.denoiseSettings);
      audioEngine.updateTapeDenoiseSettings(preset.denoiseSettings);
    }

    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? {
                ...it,
                presetId: preset.id,
                presetName: preset.name,
                customHumanizerSettings: { ...settingsToApply },
                customAzimuthSettings: preset.azimuthSettings
                  ? { ...preset.azimuthSettings }
                  : it.customAzimuthSettings,
                customDropoutSettings: preset.dropoutSettings || it.customDropoutSettings,
                customDenoiseSettings: preset.denoiseSettings || it.customDenoiseSettings,
                isCustomized: true,
              }
            : it
        )
      );
    }

    // Garante que o áudio master seja re-renderizado para faixas curtas
    const targetBuf = rawBufferRef.current || masterBufferRef.current;
    if (targetBuf && targetBuf.duration <= 300) {
      audioEngine.triggerMasterRender().then((rendered) => {
        if (rendered) {
          masterBufferRef.current = rendered;
        }
      });
    }
    // E SEMPRE atualiza os nós DSP em tempo real para resposta instantânea na reprodução
    audioEngine.updateRealtimeDspNodes();

    const lufsVal = settingsToApply.targetLufs ? `${settingsToApply.targetLufs.toFixed(1)} LUFS` : '-14.0 LUFS';
    setExportNotice(
      isRecall
        ? `✓ ${preset.name} CARREGADO E ATUANDO NA MASTER! [Alvo: ${lufsVal} | De-Harsh: ${settingsToApply.deHarshIntensity}% | Warmth: ${settingsToApply.tapeWarmth}%]`
        : `✓ Preset "${preset.name}" carregado e atuando na masterização! [Alvo: ${lufsVal}]`
    );
    setTimeout(() => setExportNotice(null), 5000);
  };

  // Batch Track Audition & Navigation Engine
  const handleEditTrackInMastering = async (index: number, directItem?: BatchItem) => {
    if (index < 0) return;
    const item = directItem || batchQueue[index];
    if (!item) return;

    setEditingBatchIndex(index);

    try {
      // 1. Immediately wipe and stop previous audio so track never leaks
      audioEngine.wipeCurrentTrack();
      rawBufferRef.current = null;
      masterBufferRef.current = null;
      setIsPlaying(false);
      setPlaybackTime(0);

      let buffer = item.audioBuffer;
      if (!buffer) {
        buffer = await decodeAudioPreservingSampleRate(item.file, audioEngine.getAudioContext());
        item.audioBuffer = buffer;
      }

      const detectedFormat = item.format || (await detectAudioFileFormat(item.file, buffer));
      setAudioFormat(detectedFormat);

      rawBufferRef.current = buffer;
      masterBufferRef.current = buffer;
      audioEngine.resetTrack(buffer, buffer);

      // Sincronização do padrão de nomenclatura e nome da música herdado da lista do lote
      const parsedMeta = parseTrackMetadata(item.file?.name || item.title);
      const effectiveTrackNumber =
        item.trackNumber !== undefined && item.trackNumber.trim() !== ''
          ? item.trackNumber.trim()
          : (parsedMeta.trackNumber || '');

      const effectiveSongTitle =
        item.songTitle !== undefined && item.songTitle.trim() !== ''
          ? item.songTitle.trim()
          : (parsedMeta.songTitle || stripAudioFileExtension(item.title));

      const effectiveArtist =
        item.artist !== undefined && item.artist.trim() !== ''
          ? item.artist.trim()
          : (parsedMeta.artist || '');

      setTrackNumber(effectiveTrackNumber);
      setSongTitle(effectiveSongTitle);
      setArtistName(effectiveArtist);
      setCurrentTrackTitle(effectiveSongTitle);
      setDuration(buffer.duration);

      const loudness = analyzeBufferLoudness(buffer);
      setTrackLoudness(loudness);
      audioEngine.setTrackLoudness(loudness);

      const analysis = await analyzeAudioForensics(buffer, item.title);
      setAnalysisResult(analysis);

      const azimuth = analyzeTapeAzimuth(buffer);
      setTapeAzimuthAnalysis(azimuth);

      // Restore specific preset or settings for this track
      const trackPresetName = item.presetName || 'Digitalização Fita 1/4" (Anos 50-70)';
      setCurrentGlobalPresetName(trackPresetName);

      if (item.customHumanizerSettings) {
        setHumanizerSettings(item.customHumanizerSettings);
        audioEngine.updateSettings(item.customHumanizerSettings);
      }
      if (item.customAzimuthSettings) {
        setTapeAzimuthSettings(item.customAzimuthSettings);
        audioEngine.updateTapeAzimuthSettings(item.customAzimuthSettings);
      }

      // Intelligent Material Detection: Real Stereo vs Mono in 2 Channels (Exact parity with individual mode)
      const isDualMono =
        item.isDualMono !== undefined
          ? item.isDualMono
          : (azimuth.channelConfiguration === 'dual_mono' ||
             (item.isAmpexCandidate && azimuth.sideToMidDb <= -26.0));

      const dropouts = analyzeTapeDropouts(buffer, item.customDropoutSettings || tapeDropoutSettings);
      const hasDropouts = dropouts.totalDropouts > 0;
      const isCleanModern = !hasDropouts && Math.abs(azimuth.azimuthOffsetSamples) < 0.1 && dropouts.tapeHealthScore === 100;

      const isWanderOrDefect =
        isDualMono &&
        (dropouts.isSevereWanderDetected ||
          dropouts.channelComparison?.isSevereWanderDetected ||
          hasDropouts);

      const safeDropoutMode: TapeDropoutMode = isDualMono && !isCleanModern
        ? (item.customDropoutSettings?.mode || (tapeDropoutSettings.mode === 'mono_wander_graft' || isWanderOrDefect ? 'mono_wander_graft' : 'ampex_fulltrack_cross'))
        : (item.customDropoutSettings?.mode || 'stereo_independent');

      const baseSettings = item.customDropoutSettings ? { ...tapeDropoutSettings, ...item.customDropoutSettings } : tapeDropoutSettings;
      const isEnabled: boolean =
        typeof item.customDropoutSettings?.enabled === 'boolean'
          ? item.customDropoutSettings.enabled
          : Boolean(hasDropouts || (!isCleanModern && isDualMono && isWanderOrDefect));
      const effectiveMode: TapeDropoutMode = item.customDropoutSettings?.mode || (isCleanModern ? 'stereo_independent' : safeDropoutMode);
      const trackDropoutSettings: TapeDropoutSettings = {
        ...baseSettings,
        enabled: isEnabled,
        mode: effectiveMode,
      };
      setTapeDropoutSettings(trackDropoutSettings);
      audioEngine.updateTapeDropoutSettings(trackDropoutSettings);

      // Pre-reconstruct dropouts immediately if detected so first play is 100% clean and pristine
      let preRestoredBuffer = buffer;
      let initialDropoutAnalysis = dropouts;

      if (hasDropouts) {
        const { restoredBuffer, repairedEventsCount } = reconstructTapeDropouts(
          buffer,
          dropouts,
          trackDropoutSettings
        );
        if (restoredBuffer) {
          preRestoredBuffer = restoredBuffer;
          rawBufferRef.current = restoredBuffer;
          const markedEvents = dropouts.events.map((ev) => ({
            ...ev,
            reconstructed: true,
          }));
          initialDropoutAnalysis = {
            ...dropouts,
            events: markedEvents,
            tapeHealthScore: 100,
            estimatedOxideDegradation: 'Excelente',
            recommendation: `✓ Todos os ${repairedEventsCount} dropouts foram pré-reconstruídos automaticamente! Áudio 100% íntegro e sem estalos.`,
          };
        }
      }
      setTapeDropoutAnalysis(initialDropoutAnalysis);
      audioEngine.setTapeDropoutAnalysis(initialDropoutAnalysis);

      // Restore custom denoise or calibrate with telemetry
      const denoiseAnalysis = audioEngine.analyzeDenoise(preRestoredBuffer);
      setTapeDenoiseTelemetry(denoiseAnalysis);
      const trackDenoiseSettings: SpectralDenoiseSettings = item.customDenoiseSettings || {
        ...tapeDenoiseSettings,
        enabled: true,
        noiseProfileType: denoiseAnalysis?.recommendedNoiseProfileType || 'studio_master_15ips',
        humNotchFilter: denoiseAnalysis?.recommendedHumNotch || 'none',
        reductionDb: denoiseAnalysis?.recommendedReductionDb || 8.0,
        learnedNoiseBands: denoiseAnalysis?.noiseProfileBands,
      };
      setTapeDenoiseSettings(trackDenoiseSettings);
      audioEngine.updateTapeDenoiseSettings(trackDenoiseSettings);

      const orbanAnalysis = audioEngine.getOrbanTrebleTelemetry(preRestoredBuffer);
      setOrbanTelemetry(orbanAnalysis);

      // Preload buffer: For long files (> 5 min), use real-time WebAudio DSP immediately
      const isLongTrack = buffer.duration > 300;
      if (isLongTrack) {
        audioEngine.resetTrack(preRestoredBuffer, buffer);
        masterBufferRef.current = preRestoredBuffer;
      } else {
        await (hasDropouts
          ? audioEngine.loadDropoutRestoredBuffer(preRestoredBuffer, initialDropoutAnalysis, buffer)
          : audioEngine.loadRawBuffer(buffer)
        ).then((rendered) => {
          if (rendered) {
            masterBufferRef.current = rendered;
          }
        });
      }

      setActiveTab('mastering');
      setPlaybackTime(0);
      audioEngine.play(0);
      setIsPlaying(true);

      setExportNotice(`🎧 Ouvindo faixa ${index + 1} de ${batchQueue.length}: "${effectiveSongTitle || item.title}"`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Erro ao carregar faixa do lote no editor:', err);
    }
  };

  // Sincronização bidirecional em tempo real do Padrão de Nomenclatura com a Fila do Lote
  const handleUpdateTrackNumber = (newTrackNum: string) => {
    setTrackNumber(newTrackNum);
    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? { ...it, trackNumber: newTrackNum }
            : it
        )
      );
    }
  };

  const handleUpdateSongTitle = (newTitle: string) => {
    setSongTitle(newTitle);
    setCurrentTrackTitle(newTitle || (editingBatchIndex !== null && batchQueue[editingBatchIndex] ? batchQueue[editingBatchIndex].title : ''));
    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? { ...it, songTitle: newTitle }
            : it
        )
      );
    }
  };

  const handleUpdateArtistName = (newArtist: string) => {
    setArtistName(newArtist);
    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? { ...it, artist: newArtist }
            : it
        )
      );
    }
  };

  const handleNextBatchTrack = () => {
    if (editingBatchIndex === null) return;

    // Save current adjustments and updated metadata for current track
    setBatchQueue((prev) =>
      prev.map((it, idx) =>
        idx === editingBatchIndex
          ? {
              ...it,
              trackNumber: trackNumber || it.trackNumber,
              songTitle: songTitle || it.songTitle,
              artist: artistName || it.artist,
              customHumanizerSettings: { ...humanizerSettings },
              customAzimuthSettings: { ...tapeAzimuthSettings },
              customDropoutSettings: { ...tapeDropoutSettings },
              customDenoiseSettings: { ...tapeDenoiseSettings },
            }
          : it
      )
    );

    if (editingBatchIndex < batchQueue.length - 1) {
      handleEditTrackInMastering(editingBatchIndex + 1);
    } else {
      // Last track reached: return to batch modal
      setIsBatchModalOpen(true);
      setExportNotice('✓ Todas as faixas do lote foram inspecionadas! Fila pronta para processamento.');
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  const handlePrevBatchTrack = () => {
    if (editingBatchIndex === null || editingBatchIndex <= 0) return;

    // Save current adjustments and metadata
    setBatchQueue((prev) =>
      prev.map((it, idx) =>
        idx === editingBatchIndex
          ? {
              ...it,
              trackNumber: trackNumber || it.trackNumber,
              songTitle: songTitle || it.songTitle,
              artist: artistName || it.artist,
              customHumanizerSettings: { ...humanizerSettings },
              customAzimuthSettings: { ...tapeAzimuthSettings },
              customDropoutSettings: { ...tapeDropoutSettings },
              customDenoiseSettings: { ...tapeDenoiseSettings },
            }
          : it
      )
    );

    handleEditTrackInMastering(editingBatchIndex - 1);
  };

  const handleReturnToBatchModal = () => {
    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? {
                ...it,
                trackNumber: trackNumber || it.trackNumber,
                songTitle: songTitle || it.songTitle,
                artist: artistName || it.artist,
                customHumanizerSettings: { ...humanizerSettings },
                customAzimuthSettings: { ...tapeAzimuthSettings },
                customDropoutSettings: { ...tapeDropoutSettings },
                customDenoiseSettings: { ...tapeDenoiseSettings },
              }
            : it
        )
      );
    }
    setIsBatchModalOpen(true);
  };

  const handleExitBatchMode = () => {
    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? {
                ...it,
                trackNumber: trackNumber || it.trackNumber,
                songTitle: songTitle || it.songTitle,
                artist: artistName || it.artist,
                customHumanizerSettings: { ...humanizerSettings },
                customAzimuthSettings: { ...tapeAzimuthSettings },
                customDropoutSettings: { ...tapeDropoutSettings },
                customDenoiseSettings: { ...tapeDenoiseSettings },
              }
            : it
        )
      );
      setEditingBatchIndex(null);
    }
  };

  const handleChangeEditingTrackPreset = (presetIdOrName: string) => {
    if (editingBatchIndex === null) return;
    const allPresets = getAllPresets();
    const selected = allPresets.find((p) => p.id === presetIdOrName || p.name === presetIdOrName);
    if (!selected) return;

    setCurrentGlobalPresetName(selected.name);
    setHumanizerSettings(selected.settings);
    audioEngine.updateSettings(selected.settings);

    if (selected.azimuthSettings) {
      setTapeAzimuthSettings(selected.azimuthSettings);
      audioEngine.updateTapeAzimuthSettings(selected.azimuthSettings);
    }

    setBatchQueue((prev) =>
      prev.map((it, idx) =>
        idx === editingBatchIndex
          ? {
              ...it,
              presetId: selected.id,
              presetName: selected.name,
              customHumanizerSettings: { ...selected.settings },
              customAzimuthSettings: selected.azimuthSettings
                ? { ...selected.azimuthSettings }
                : it.customAzimuthSettings,
              isCustomized: true,
            }
          : it
      )
    );

    audioEngine.triggerMasterRender().then((rendered) => {
      if (rendered) {
        masterBufferRef.current = rendered;
      }
    });
  };

  // Export Azimuth Corrected Archival Preservation WAV
  const handleExportAzimuthOnly = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExportingAzimuth(true);
      const targetBitDepth = exportBitDepth || audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Renderizando arquivo com azimute e balanço corrigidos em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit WAV puro (pré-master de preservação)...`
      );

      const wavBlob = await audioEngine.exportAzimuthCorrectedOnlyWav(
        rawBufferRef.current || masterBufferRef.current,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate
      );

      const filename = buildAzimuthWavFilename({
        trackNumber,
        songTitle: songTitle || stripAudioFileExtension(currentTrackTitle),
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
      });

      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename, {
        subfolder: SUBFOLDER_RECOVERED,
      });

      setExportNotice(
        `✓ Arquivo com Azimute & Balanço corrigidos salvo: ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit)!`
      );
      setTimeout(() => setExportNotice(null), 7000);
    } catch {
      setExportNotice('Erro ao exportar arquivo com azimute corrigido.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExportingAzimuth(false);
    }
  };

  // Tape Dropout Handlers
  const handleUpdateDropoutSettings = (newSettings: Partial<TapeDropoutSettings>) => {
    // If switching to mono_wander_graft or ampex_fulltrack_cross, ensure enabled is turned on if not explicitly specified
    const settingsWithActivation = { ...newSettings };
    if (
      (newSettings.mode === 'mono_wander_graft' || newSettings.mode === 'ampex_fulltrack_cross') &&
      newSettings.enabled === undefined &&
      !tapeDropoutSettings.enabled
    ) {
      settingsWithActivation.enabled = true;
    }

    setTapeDropoutSettings((prev) => {
      const updated = { ...prev, ...settingsWithActivation };
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDropoutSettings: updated, isCustomized: true }
              : it
          )
        );
      }
      return updated;
    });
    audioEngine.updateTapeDropoutSettings(settingsWithActivation);
    const activeBuf = rawBufferRef.current || masterBufferRef.current;
    if (activeBuf) {
      if (
        newSettings.sensitivity !== undefined ||
        newSettings.minDurationMs !== undefined ||
        newSettings.maxDurationMs !== undefined ||
        !tapeDropoutAnalysis
      ) {
        const reanalyzed = analyzeTapeDropouts(activeBuf, { ...tapeDropoutSettings, ...settingsWithActivation });
        setTapeDropoutAnalysis(reanalyzed);
        audioEngine.setTapeDropoutAnalysis(reanalyzed);
      }
    }
    // Instantly trigger re-render if dropout switch, mode, primary channel, pattern threshold, audition delta, or Wallace loss was toggled
    if (
      settingsWithActivation.enabled !== undefined ||
      settingsWithActivation.listenDropoutMaskOnly !== undefined ||
      settingsWithActivation.mode !== undefined ||
      settingsWithActivation.primaryChannel !== undefined ||
      settingsWithActivation.patternMatchThreshold !== undefined ||
      settingsWithActivation.restoreHighFreqLoss !== undefined ||
      settingsWithActivation.crossfadeWindowMs !== undefined ||
      settingsWithActivation.monoCompatibilityPhaseLock !== undefined
    ) {
      audioEngine.triggerMasterRender().then((buf) => {
        if (buf) {
          masterBufferRef.current = buf;
        }
      });
    }
  };

  const handleReconstructDropouts = async () => {
    if (!masterBufferRef.current) return;
    setIsRestoringDropout(true);
    try {
      const activeSettings: TapeDropoutSettings = {
        ...tapeDropoutSettings,
        enabled: true,
      };
      setTapeDropoutSettings(activeSettings);
      audioEngine.updateTapeDropoutSettings(activeSettings);
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDropoutSettings: activeSettings, isCustomized: true }
              : it
          )
        );
      }

      const baseBuffer = rawBufferRef.current || masterBufferRef.current;
      const currentAnalysis =
        tapeDropoutAnalysis && tapeDropoutAnalysis.events.length > 0
          ? tapeDropoutAnalysis
          : analyzeTapeDropouts(baseBuffer, activeSettings);

      const { restoredBuffer, repairedEventsCount } = reconstructTapeDropouts(
        baseBuffer,
        currentAnalysis,
        activeSettings
      );

      if (restoredBuffer) {
        rawBufferRef.current = restoredBuffer;

        // Keep events in analysis with reconstructed: true so user can audition / inspect each repair
        const markedEvents = currentAnalysis.events.map((ev) => ({
          ...ev,
          reconstructed: true,
        }));
        const repairedAnalysis: TapeDropoutAnalysis = {
          ...currentAnalysis,
          events: markedEvents,
          tapeHealthScore: 100,
          estimatedOxideDegradation: 'Excelente',
          recommendation: `✓ Todos os ${markedEvents.length} dropouts foram reconstruídos com precisão analógica total! Áudio 100% íntegro.`,
        };
        setTapeDropoutAnalysis(repairedAnalysis);
        audioEngine.setTapeDropoutAnalysis(repairedAnalysis);

        // Load the restored buffer cleanly into the audio engine and render the master in one quick step
        const reRendered = await audioEngine.loadDropoutRestoredBuffer(restoredBuffer, repairedAnalysis);
        if (reRendered) {
          masterBufferRef.current = reRendered;
        }
      }

      setExportNotice(
        `✓ ${repairedEventsCount} dropouts de fita reconstruídos com precisão analógica total (+16 dB max)! Saúde da fita restaurada: 100%.`
      );
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err) {
      console.error(err);
      setAppErrorNotice('Erro ao reconstruir dropouts da fita.');
      setTimeout(() => setAppErrorNotice(null), 6000);
    } finally {
      setIsRestoringDropout(false);
    }
  };

  // Intelligent Automated Triage Application: Pre-configures all blocks based on analysis
  const handleApplyTriageRecommendations = async () => {
    if (!rawBufferRef.current && !masterBufferRef.current) return;
    try {
      // Diagnostic checks for tape damage vs modern clean audio
      const hasDropouts = (tapeDropoutAnalysis?.totalDropouts ?? 0) > 0;
      const hasTapeHiss = Boolean(
        tapeDenoiseTelemetry?.hasNoiseDetected ||
        (tapeDenoiseTelemetry?.hissNoiseFloorDb ?? -90) > -75.0 ||
        tapeDenoiseTelemetry?.hasHumDetected
      );
      const hasAzimuthError =
        Math.abs(tapeAzimuthAnalysis?.azimuthOffsetSamples ?? 0) >= 0.1 ||
        Math.abs(tapeAzimuthAnalysis?.levelDiffDb ?? 0) >= 0.35;
      const isCleanModernRecording =
        !hasDropouts &&
        !hasTapeHiss &&
        !hasAzimuthError &&
        (tapeDropoutAnalysis?.tapeHealthScore ?? 100) === 100;

      // 1. Azimuth & Balance:
      if (tapeAzimuthAnalysis) {
        const isGhost = tapeAzimuthAnalysis.isGhostChannelDetected;
        const safeBalance = isGhost
          ? 0.0
          : hasAzimuthError
          ? Math.max(-4.5, Math.min(4.5, -tapeAzimuthAnalysis.levelDiffDb))
          : 0;
        const autoAzimuth: TapeAzimuthSettings = {
          ...tapeAzimuthSettings,
          enabled: isGhost || (hasAzimuthError && !isCleanModernRecording),
          azimuthDelaySamples: isGhost ? 0 : (hasAzimuthError ? tapeAzimuthAnalysis.azimuthOffsetSamples : 0),
          balanceDb: safeBalance,
          invertPhaseL: isGhost ? false : tapeAzimuthAnalysis.phaseCorrelationBefore < 0,
          activeChannel: tapeAzimuthAnalysis.activeSignalChannel || 'both',
          ghostChannelHandling: isGhost ? 'clone_active' : 'passthrough',
        };
        setTapeAzimuthSettings(autoAzimuth);
        audioEngine.updateTapeAzimuthSettings(autoAzimuth);
      }

      // 2. Material Detection & Dropout Mode:
      const isDualMonoCandidate =
        tapeAzimuthAnalysis?.channelConfiguration === 'dual_mono' ||
        ((tapeDropoutAnalysis?.isAmpexFullTrackCandidate ?? false) && (tapeAzimuthAnalysis?.sideToMidDb ?? 0) <= -26.0);

      const isWanderOrDefect =
        isDualMonoCandidate &&
        ((tapeDropoutAnalysis?.isSevereWanderDetected ?? false) ||
          (tapeDropoutAnalysis?.channelComparison?.isSevereWanderDetected ?? false) ||
          hasDropouts);

      const autoDropoutMode: TapeDropoutMode = isDualMonoCandidate && !isCleanModernRecording
        ? (tapeDropoutSettings.mode === 'mono_wander_graft' || isWanderOrDefect ? 'mono_wander_graft' : 'ampex_fulltrack_cross')
        : 'stereo_independent';

      const autoDropout: TapeDropoutSettings = {
        ...tapeDropoutSettings,
        enabled: hasDropouts || (!isCleanModernRecording && isWanderOrDefect),
        mode: isCleanModernRecording ? 'stereo_independent' : autoDropoutMode,
      };
      setTapeDropoutSettings(autoDropout);
      audioEngine.updateTapeDropoutSettings(autoDropout);

      // 3. Spectral Denoise:
      if (tapeDenoiseTelemetry) {
        const autoDenoise: SpectralDenoiseSettings = {
          ...tapeDenoiseSettings,
          enabled: hasTapeHiss && !isCleanModernRecording,
          reductionDb: tapeDenoiseTelemetry.recommendedReductionDb,
          noiseProfileType: tapeDenoiseTelemetry.recommendedNoiseProfileType,
          humNotchFilter: tapeDenoiseTelemetry.recommendedHumNotch,
          learnedNoiseBands: tapeDenoiseTelemetry.noiseProfileBands,
        };
        setTapeDenoiseSettings(autoDenoise);
        audioEngine.updateTapeDenoiseSettings(autoDenoise);
      }

      // 4. Equalization & Timbre (Treble Processor, Tape Warmth, De-Harsh):
      setHumanizerSettings((prev) => {
        const audioNeedsTreble = Boolean(
          orbanTelemetry?.needsProcessing ||
          orbanTelemetry?.isDarkTape ||
          orbanTelemetry?.isHarshRecording ||
          Math.abs(orbanTelemetry?.recommendedBrillianceDb ?? 0) >= 0.5
        );
        const userExplicitlyDisabled = Boolean(prev.orbanHfUserOverrideLock && (prev.orbanHfBypass || !prev.orbanHfEnabled));
        const userExplicitlyEnabled = Boolean(prev.orbanHfUserOverrideLock && !prev.orbanHfBypass && prev.orbanHfEnabled);

        const shouldEnable = userExplicitlyEnabled
          ? true
          : userExplicitlyDisabled
          ? false
          : audioNeedsTreble;

        const updated: HumanizerSettings = {
          ...prev,
          enabled: true,
          deHarshBypass: isCleanModernRecording ? true : false,
          tapeWarmthBypass: false,
          airExciterBypass: false,
          orbanHfEnabled: shouldEnable,
          orbanHfBypass: !shouldEnable,
          orbanHfUserOverrideLock: prev.orbanHfUserOverrideLock ?? false,
          orbanHfMode: orbanTelemetry?.recommendedMode || prev.orbanHfMode || 'smooth_silk',
          orbanHfAutoBrillianceDb: orbanTelemetry?.recommendedBrillianceDb ?? prev.orbanHfAutoBrillianceDb,
          orbanHfHighShelfGainDb: orbanTelemetry?.recommendedBrillianceDb ?? prev.orbanHfHighShelfGainDb,
          orbanHfThresholdDb: orbanTelemetry?.recommendedThresholdDb ?? prev.orbanHfThresholdDb,
          orbanHfCrossoverHz: orbanTelemetry?.recommendedCrossoverHz ?? prev.orbanHfCrossoverHz,
          orbanHfSpeed: orbanTelemetry?.recommendedSpeed ?? prev.orbanHfSpeed,
          limitlessBypass: false,
          limitlessEnabled: true,
          targetLufs: -14.0,
        };
        audioEngine.updateSettings(updated);
        return updated;
      });

      // 5. If dropouts exist, reconstruct them
      if (tapeDropoutAnalysis && tapeDropoutAnalysis.totalDropouts > 0) {
        await handleReconstructDropouts();
      } else {
        const reRendered = await audioEngine.triggerMasterRender();
        if (reRendered) {
          masterBufferRef.current = reRendered;
        }
      }

      const triageNotice = isCleanModernRecording
        ? '✓ Triagem Inteligente: Gravação Atual identificada! Módulos de restauração de fita mantidos em Bypass transparente. Masterização Direta configurada para -14 LUFS.'
        : `✓ Triagem Inteligente aplicada com sucesso! Restauração, EQ analógica e nivelamento configurados para ${isDualMonoCandidate ? 'Mono em 2 Canais (Studer/Ampex Cross)' : 'Estéreo Real (Independente)'}.`;
      setExportNotice(triageNotice);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      console.error(err);
      setAppErrorNotice('Erro ao aplicar recomendações da triagem.');
      setTimeout(() => setAppErrorNotice(null), 5000);
    }
  };

  // Export Pre-Master Restored Archival WAV (Azimuth + Dropouts corrected, WITHOUT final mastering)
  const handleExportPreMasterOnly = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExportingPreMaster(true);
      // Immediately verify/restore directory permission while user click gesture is active
      await autoSaveManager.ensureDirectoryAccess();
      const targetBitDepth = exportBitDepth || audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Renderizando Pré-Master de Preservação em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit WAV (Azimute + Dropouts corrigidos, sem masterização final)...`
      );

      const preMasterBlob = await audioEngine.exportDropoutRestoredOnlyWav(
        rawBufferRef.current || masterBufferRef.current,
        tapeDropoutSettings,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate,
        tapeDenoiseSettings
      );

      const effectiveTitle = songTitle || stripAudioFileExtension(currentTrackTitle);
      const filename = buildPreMasterWavFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
      });

      const saveRes = await autoSaveManager.saveProcessedFile(preMasterBlob, filename, {
        subfolder: SUBFOLDER_RECOVERED,
      });

      setExportNotice(
        `✓ Pré-Master Restaurado salvo com sucesso: ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit, azimute e dropouts corrigidos, headroom e dinâmica pura sem masterização)!`
      );
      setTimeout(() => setExportNotice(null), 8000);
    } catch (err) {
      console.error(err);
      setExportNotice('Erro ao exportar Pré-Master Restaurado.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPreMaster(false);
    }
  };

  const handleExportDropoutRestoredWav = async () => {
    if (!masterBufferRef.current) return;
    setIsExportingDropout(true);
    try {
      // Immediately verify/restore directory permission while user click gesture is active
      await autoSaveManager.ensureDirectoryAccess();
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      const targetBitDepth = exportBitDepth || audioFormat?.bitDepth || 24;

      const wavBlob = await audioEngine.exportDropoutRestoredOnlyWav(
        rawBufferRef.current || masterBufferRef.current,
        tapeDropoutSettings,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate,
        tapeDenoiseSettings
      );

      const filename = buildPreMasterWavFilename({
        trackNumber,
        songTitle: songTitle || stripAudioFileExtension(currentTrackTitle),
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
      });

      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename, {
        subfolder: SUBFOLDER_RECOVERED,
      });

      setExportNotice(
        `✓ Arquivo preservado gravado com sucesso: ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit, dropouts e azimute reparados sem masterização)!`
      );
      setTimeout(() => setExportNotice(null), 8000);
    } catch (err) {
      console.error(err);
      setAppErrorNotice('Erro ao exportar arquivo de preservação com dropouts reconstruídos.');
      setTimeout(() => setAppErrorNotice(null), 6000);
    } finally {
      setIsExportingDropout(false);
    }
  };

  // Spectral Denoise Handlers (Sonic Solutions NoNoise & iZotope RX Style)
  const handleUpdateDenoiseSettings = (newSettings: Partial<SpectralDenoiseSettings>) => {
    setTapeDenoiseSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDenoiseSettings: updated, isCustomized: true }
              : it
          )
        );
      }
      return updated;
    });
    audioEngine.updateTapeDenoiseSettings(newSettings);
  };

  const handleLearnNoiseProfile = () => {
    const rawBuffer = rawBufferRef.current || masterBufferRef.current;
    if (!rawBuffer) return;
    const learnedBands = audioEngine.learnDenoiseProfile(rawBuffer);
    if (learnedBands) {
      const telemetry = audioEngine.getTapeDenoiseTelemetry();
      const updatedSettings: SpectralDenoiseSettings = {
        ...tapeDenoiseSettings,
        enabled: true,
        noiseProfileType: 'auto_learned',
        learnedNoiseBands: learnedBands,
        humNotchFilter: telemetry?.recommendedHumNotch || tapeDenoiseSettings.humNotchFilter,
        reductionDb: telemetry?.recommendedReductionDb || tapeDenoiseSettings.reductionDb,
      };
      setTapeDenoiseSettings(updatedSettings);
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDenoiseSettings: updatedSettings, isCustomized: true }
              : it
          )
        );
      }
      setTapeDenoiseTelemetry(telemetry);
      setExportNotice('✓ Perfil de ruído da fita (ronco e sopro) capturado e redução ativada na masterização!');
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  const handleLearnNoiseProfileAtTail = () => {
    const rawBuffer = rawBufferRef.current || masterBufferRef.current;
    if (!rawBuffer) return;
    const tailDuration = Math.min(1.5, Math.max(0.4, rawBuffer.duration * 0.05));
    const startSec = Math.max(0, rawBuffer.duration - tailDuration - 0.1);
    const learnedBands = audioEngine.learnDenoiseProfile(rawBuffer, startSec, tailDuration);
    if (learnedBands) {
      const telemetry = audioEngine.getTapeDenoiseTelemetry();
      const updatedSettings: SpectralDenoiseSettings = {
        ...tapeDenoiseSettings,
        enabled: true,
        noiseProfileType: 'auto_learned',
        learnedNoiseBands: learnedBands,
        humNotchFilter: telemetry?.recommendedHumNotch || tapeDenoiseSettings.humNotchFilter,
        reductionDb: telemetry?.recommendedReductionDb || tapeDenoiseSettings.reductionDb,
      };
      setTapeDenoiseSettings(updatedSettings);
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDenoiseSettings: updatedSettings, isCustomized: true }
              : it
          )
        );
      }
      setTapeDenoiseTelemetry(telemetry);
      setExportNotice(`✓ Perfil de ruído (ronco e sopro) capturado no final da música (${startSec.toFixed(1)}s) e redução ativada!`);
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  const handleLearnNoiseProfileAtPlayhead = () => {
    const rawBuffer = rawBufferRef.current || masterBufferRef.current;
    if (!rawBuffer) return;
    const startSec = Math.max(0, playbackTime - 0.2);
    const learnedBands = audioEngine.learnDenoiseProfile(rawBuffer, startSec, 0.4);
    if (learnedBands) {
      const telemetry = audioEngine.getTapeDenoiseTelemetry();
      const updatedSettings: SpectralDenoiseSettings = {
        ...tapeDenoiseSettings,
        enabled: true,
        noiseProfileType: 'auto_learned',
        learnedNoiseBands: learnedBands,
        humNotchFilter: telemetry?.recommendedHumNotch || tapeDenoiseSettings.humNotchFilter,
        reductionDb: telemetry?.recommendedReductionDb || tapeDenoiseSettings.reductionDb,
      };
      setTapeDenoiseSettings(updatedSettings);
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customDenoiseSettings: updatedSettings, isCustomized: true }
              : it
          )
        );
      }
      setTapeDenoiseTelemetry(telemetry);
      setExportNotice(`✓ Perfil de ruído capturado no cursor (${startSec.toFixed(1)}s) e redução ativada!`);
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  const handleApplyDenoise = () => {
    handleUpdateDenoiseSettings({ enabled: true });
    setExportNotice('⚡ Redutor de ruído espectral NoNoise / RX ativado na cadeia de masterização!');
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportDenoisedWav = async () => {
    if (!masterBufferRef.current) return;
    setIsExportingDenoised(true);
    try {
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      const targetBitDepth = audioFormat?.bitDepth || 24;
      const wavBlob = await audioEngine.exportDenoisedOnlyWav(
        rawBufferRef.current || masterBufferRef.current,
        tapeDenoiseSettings,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate
      );
      const cleanSong = songTitle || stripAudioFileExtension(currentTrackTitle);
      const numPrefix = trackNumber?.trim() ? `${trackNumber.trim().padStart(2, '0')}_` : '';
      const filename = `${numPrefix}${cleanSong}${artistName ? ` - ${artistName}` : ''} - AT_Denoised_${targetSampleRate}Hz_${targetBitDepth}bit.wav`;
      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename, {
        subfolder: SUBFOLDER_RECOVERED,
      });
      setExportNotice(
        `✓ Arquivo com Denoise gravado com sucesso: ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit)!`
      );
      setTimeout(() => setExportNotice(null), 8000);
    } catch (err) {
      console.error(err);
      setAppErrorNotice('Erro ao exportar arquivo com denoise.');
      setTimeout(() => setAppErrorNotice(null), 6000);
    } finally {
      setIsExportingDenoised(false);
    }
  };

  // Synchronize masterBufferRef whenever audioEngine finishes background master rendering
  useEffect(() => {
    const unsub = audioEngine.onMasterRendered((rendered) => {
      masterBufferRef.current = rendered;
    });
    return unsub;
  }, []);

  // Playback Loop for UI Cursor update
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      intervalId = setInterval(() => {
        const t = audioEngine.getCurrentPlaybackTime();
        setPlaybackTime(t);
      }, 50);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying]);

  // Tab switching with continuous master audio
  const handleTabChange = (newTab: 'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  };

  // Transport Handlers - Always plays the pristine Master Buffer with analog tape mastering
  const handlePlayPause = () => {
    if (!masterBufferRef.current && !rawBufferRef.current && !audioEngine.getRawBuffer()) {
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play(playbackTime);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleSeek = (time: number) => {
    setPlaybackTime(time);
    if (isPlaying) {
      audioEngine.play(time);
    }
  };

  const handlePlayFrom = (time: number) => {
    setPlaybackTime(time);
    audioEngine.play(time);
    setIsPlaying(true);
  };

  // A/B Comparison Toggle
  const handleToggleAB = () => {
    const nextCompare = !isCompareOriginal;
    setIsCompareOriginal(nextCompare);
    audioEngine.setCompareOriginal(nextCompare);
  };

  // Update Humanizer Settings
  const handleUpdateSettings = (newSettings: Partial<HumanizerSettings>) => {
    let effectiveSettingsToPass: Partial<HumanizerSettings> = { ...newSettings };
    setHumanizerSettings((prev) => {
      // User Override Lock for Treble Processor:
      // If the module was manually put in bypass, maintain that bypass unless the user
      // explicitly updates the module settings (auto-calibrate, preset click, bypass toggle, or shelf knob)
      let effectiveNew = { ...newSettings };
      const updated = { ...prev, ...effectiveNew };
      effectiveSettingsToPass = updated;
      if (editingBatchIndex !== null) {
        setBatchQueue((q) =>
          q.map((it, idx) =>
            idx === editingBatchIndex
              ? { ...it, customHumanizerSettings: updated, isCustomized: true }
              : it
          )
        );
      }
      return updated;
    });
    audioEngine.updateSettings(effectiveSettingsToPass);
  };

  // Auto-Calibrate Treble Engine based on loaded recording physics
  const handleAutoCalibrateOrban = () => {
    const targetBuffer = rawBufferRef.current || masterBufferRef.current;
    if (!targetBuffer) return;
    const tel = audioEngine.getOrbanTrebleTelemetry(targetBuffer);
    if (!tel) return;
    setOrbanTelemetry(tel);

    const newMode = tel.recommendedMode;
    const autoBrilliance = tel.recommendedBrillianceDb;
    const threshold = tel.recommendedThresholdDb;
    const crossoverHz = tel.recommendedCrossoverHz;
    const speed = tel.recommendedSpeed;
    const amount = tel.isDarkTape ? 75 : tel.isHarshRecording ? 70 : 50;

    // Explicit user action: auto-calibration immediately enables and un-bypasses the processor so changes are heard live!
    handleUpdateSettings({
      orbanHfEnabled: true,
      orbanHfBypass: false,
      orbanHfUserOverrideLock: false,
      orbanHfMode: newMode,
      orbanHfAmount: Math.round(amount),
      orbanHfAutoBrillianceDb: Math.round(autoBrilliance * 10) / 10,
      orbanHfHighShelfGainDb: Math.round(autoBrilliance * 10) / 10,
      orbanHfThresholdDb: Math.round(threshold * 10) / 10,
      orbanHfCrossoverHz: crossoverHz,
      orbanHfSpeed: speed,
    });
    const gainLabel = autoBrilliance > 0 ? `+${autoBrilliance.toFixed(1)} dB` : `${autoBrilliance.toFixed(1)} dB`;
    setExportNotice(
      `✓ Processador de Agudos calibrado e ativo (${gainLabel} / Limiar: ${threshold.toFixed(1)} dB)! ${tel.statusSummary}`
    );
    setTimeout(() => setExportNotice(null), 6000);
  };

  // Export Processed WAV with Studio-Grade Headroom & Exact Input Bit Depth/Sample Rate
  // When saved to connected folder, saves Master, Pré-Master, and Recall.
  // When downloaded via browser, downloads Master WAV cleanly without multiple download collisions.
  const handleExportWav = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExporting(true);
      // Immediately verify/restore directory permission while user click gesture is active
      await autoSaveManager.ensureDirectoryAccess();
      const targetBitDepth = exportBitDepth || audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Renderizando Master Final em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit WAV (${humanizerSettings.targetLufs ?? -14.0} LUFS)...`
      );

      const effectiveTitle = songTitle || stripAudioFileExtension(currentTrackTitle);

      // 1. Master Final WAV (com Limitless, Orban, warmth, etc.)
      const wavBlob = await audioEngine.exportProcessedAudioWav(
        rawBufferRef.current || masterBufferRef.current,
        humanizerSettings,
        targetBitDepth,
        tapeAzimuthSettings,
        targetSampleRate,
        tapeDenoiseSettings,
        tapeDropoutSettings
      );
      const filename = buildMasterWavFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
        targetLufs: humanizerSettings.targetLufs ?? -14,
      });
      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename, {
        subfolder: SUBFOLDER_MASTERED,
      });

      // 2. Preset de Recall (.aurapreset) correspondente aos parâmetros exatos desta Master
      const recallData = generateTrackRecall(
        effectiveTitle,
        humanizerSettings,
        tapeAzimuthSettings,
        audioFormat || undefined,
        currentGlobalPresetName,
        undefined,
        undefined,
        tapeDropoutSettings,
        tapeDenoiseSettings
      );
      const recallBlob = recallToBlob(recallData);
      const recallFilename = buildRecallFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
        targetLufs: humanizerSettings.targetLufs ?? -14,
      });

      // Se salvando diretamente na pasta vinculada no disco do usuário:
      if (saveRes.savedToDiskDirectly) {
        // Grava o preset de recall na subpasta [-LUFS] junto com a Master
        await autoSaveManager.saveProcessedFile(recallBlob, recallFilename, {
          subfolder: SUBFOLDER_MASTERED,
        });

        // Também grava o Pré-Master na subpasta [Recuperados]
        try {
          const preMasterBlob = await audioEngine.exportDropoutRestoredOnlyWav(
            rawBufferRef.current || masterBufferRef.current,
            tapeDropoutSettings,
            tapeAzimuthSettings,
            targetBitDepth,
            targetSampleRate,
            tapeDenoiseSettings
          );
          const preMasterFilename = buildPreMasterWavFilename({
            trackNumber,
            songTitle: effectiveTitle,
            artist: artistName,
            sampleRate: targetSampleRate,
            bitDepth: targetBitDepth,
          });
          await autoSaveManager.saveProcessedFile(preMasterBlob, preMasterFilename, {
            subfolder: SUBFOLDER_RECOVERED,
          });

          setExportNotice(
            `✓ Arquivos organizados automaticamente: Master WAV e Recall em "${SUBFOLDER_MASTERED}" e Pré-Master em "${SUBFOLDER_RECOVERED}"! Destino: ${saveRes.targetPath}`
          );
        } catch {
          setExportNotice(
            `✓ Master WAV e Preset de Recall (.aurapreset) gravados em "${SUBFOLDER_MASTERED}": ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit)!`
          );
        }
      } else {
        // Modo download no navegador: o Master WAV foi baixado. Dispara imediatamente o download do Preset (.aurapreset)
        setTimeout(() => {
          autoSaveManager.triggerBrowserDownload(recallBlob, recallFilename);
        }, 350);

        setExportNotice(
          `✓ Master WAV e Preset de Recall (.aurapreset) baixados com sucesso (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit)!`
        );
      }
      setTimeout(() => setExportNotice(null), 8000);
    } catch (err) {
      console.error(err);
      setExportNotice('Erro ao renderizar arquivo master.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Complete Bundle as a single clean ZIP archive (Master WAV + Pré-Master WAV + Recall .aurapreset)
  const handleExportZipPackage = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExportingZip(true);
      // Immediately verify/restore directory permission while user click gesture is active
      await autoSaveManager.ensureDirectoryAccess();
      const targetBitDepth = exportBitDepth || audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Gerando Pacote ZIP completo (Master + Pré-Master + Recall) em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit...`
      );

      const effectiveTitle = songTitle || stripAudioFileExtension(currentTrackTitle);

      // 1. Master Final WAV
      const wavBlob = await audioEngine.exportProcessedAudioWav(
        rawBufferRef.current || masterBufferRef.current,
        humanizerSettings,
        targetBitDepth,
        tapeAzimuthSettings,
        targetSampleRate,
        tapeDenoiseSettings,
        tapeDropoutSettings
      );
      const masterFilename = buildMasterWavFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
        targetLufs: humanizerSettings.targetLufs ?? -14,
      });

      // 2. Pré-Master Restaurado WAV
      const preMasterBlob = await audioEngine.exportDropoutRestoredOnlyWav(
        rawBufferRef.current || masterBufferRef.current,
        tapeDropoutSettings,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate,
        tapeDenoiseSettings
      );
      const preMasterFilename = buildPreMasterWavFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
      });

      // 3. Exact mastering recall preset (.aurapreset)
      const recallData = generateTrackRecall(
        currentTrackTitle,
        humanizerSettings,
        tapeAzimuthSettings,
        audioFormat || undefined,
        currentGlobalPresetName,
        undefined,
        undefined,
        tapeDropoutSettings,
        tapeDenoiseSettings
      );
      const recallBlob = recallToBlob(recallData);
      const recallFilename = buildRecallFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
        targetLufs: humanizerSettings.targetLufs ?? -14,
      });

      const zipBlob = await autoSaveManager.createZipPackage([
        { filename: masterFilename, blob: wavBlob, subfolder: SUBFOLDER_MASTERED },
        { filename: preMasterFilename, blob: preMasterBlob, subfolder: SUBFOLDER_RECOVERED },
        { filename: recallFilename, blob: recallBlob, subfolder: SUBFOLDER_MASTERED },
      ]);

      const zipNumPrefix = trackNumber?.trim() ? `${trackNumber.trim().padStart(2, '0')}_` : '';
      const zipName = `${zipNumPrefix}${effectiveTitle}_Pacote_Completo.zip`;
      const saveRes = await autoSaveManager.saveZipFile(zipBlob, zipName);

      setExportNotice(
        `✓ Pacote ZIP completo gerado com sucesso: ${saveRes.targetPath} (contém Master WAV, Pré-Master e Recall)!`
      );
      setTimeout(() => setExportNotice(null), 8000);
    } catch (err) {
      console.error(err);
      setExportNotice('Erro ao gerar pacote ZIP completo.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDirectLoadRecall = async (file: File) => {
    try {
      const recall = await parseRecallFile(file);
      if (recall) {
        // 1. Restaura Equalização, De-Harsh, Warmth, Orban HF e Limitless
        const restoredHumanizer: HumanizerSettings = {
          ...recall.humanizerSettings,
          // Garante que travas manuais de bypass não impeçam a aplicação exata do recall
          orbanHfUserOverrideLock: false,
        };
        setHumanizerSettings(restoredHumanizer);
        audioEngine.updateSettings(restoredHumanizer);

        // 2. Restaura alinhamento de azimute
        if (recall.azimuthSettings) {
          setTapeAzimuthSettings(recall.azimuthSettings);
          audioEngine.updateTapeAzimuthSettings(recall.azimuthSettings);
        }

        // 3. Restaura configurações de dropouts de fita
        if (recall.dropoutSettings) {
          setTapeDropoutSettings(recall.dropoutSettings);
          audioEngine.updateTapeDropoutSettings(recall.dropoutSettings);
        }

        // 4. Restaura redutor de ruído espectral
        if (recall.denoiseSettings) {
          setTapeDenoiseSettings(recall.denoiseSettings);
          audioEngine.updateTapeDenoiseSettings(recall.denoiseSettings);
        }

        const presetDisplayName = `Recall: ${recall.trackTitle || recall.presetName || 'Master Anterior'}`;
        setCurrentGlobalPresetName(presetDisplayName);

        // 5. Se estivermos navegando/editando uma faixa da fila de lote, atualiza as configurações personalizadas dela
        if (editingBatchIndex !== null) {
          setBatchQueue((prev) =>
            prev.map((it, idx) =>
              idx === editingBatchIndex
                ? {
                    ...it,
                    presetId: recall.presetId || 'imported_recall',
                    presetName: presetDisplayName,
                    customHumanizerSettings: { ...restoredHumanizer },
                    customAzimuthSettings: recall.azimuthSettings
                      ? { ...recall.azimuthSettings }
                      : it.customAzimuthSettings,
                    customDropoutSettings: recall.dropoutSettings || it.customDropoutSettings,
                    customDenoiseSettings: recall.denoiseSettings || it.customDenoiseSettings,
                    isCustomized: true,
                  }
                : it
            )
          );
        }

        // 6. Atualização do motor de áudio (Renderização master para faixas curtas + Nós DSP em tempo real)
        const targetBuf = rawBufferRef.current || masterBufferRef.current;
        if (targetBuf && targetBuf.duration <= 300) {
          audioEngine.triggerMasterRender().then((rendered) => {
            if (rendered) {
              masterBufferRef.current = rendered;
            }
          });
        }
        // SEMPRE atualiza os nós DSP em tempo real para escuta imediata
        audioEngine.updateRealtimeDspNodes();

        const lufsVal = restoredHumanizer.targetLufs ? `${restoredHumanizer.targetLufs.toFixed(1)} LUFS` : '-14.0 LUFS';
        const azVal = recall.azimuthSettings?.azimuthDelaySamples ? `${recall.azimuthSettings.azimuthDelaySamples} smp` : '0 smp';
        setExportNotice(
          `✓ Recall de Masterização "${recall.trackTitle}" ATIVADO E ATUANDO NO ÁUDIO! [Alvo: ${lufsVal} | De-Harsh: ${restoredHumanizer.deHarshIntensity}% | Warmth: ${restoredHumanizer.tapeWarmth}% | Azimute: ${azVal}]. Todos os controles foram sincronizados.`
        );
        setTimeout(() => setExportNotice(null), 7000);
      } else {
        setExportNotice('Arquivo de recall inválido ou não reconhecido. Use arquivos .aurapreset ou .json gerados pelo AuraTune.');
        setTimeout(() => setExportNotice(null), 5000);
      }
    } catch (err) {
      console.error('Falha ao processar arquivo de recall:', err);
      setExportNotice('Falha ao processar arquivo de recall.');
      setTimeout(() => setExportNotice(null), 4000);
    }
  };


  const isAiDetected = (analysisResult?.overallAiProbability || 0) > 50;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col pb-28">
      {/* Top Bar following contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onOpenBatch={() => setIsBatchModalOpen(true)}
        onOpenFolderSettings={() => setIsFolderModalOpen(true)}
        onOpenSplitStereoModal={() => setIsSplitStereoModalOpen(true)}
        outputDirectoryName={outputDirName}
        onExport={handleExportWav}
        onExportAzimuthOnly={handleExportAzimuthOnly}
        onExportPreMaster={handleExportPreMasterOnly}
        onExportZipPackage={handleExportZipPackage}
        onChangeBitDepth={(depth) => setExportBitDepth(depth)}
        isHumanizedActive={!isCompareOriginal}
        onToggleAB={handleToggleAB}
        isExporting={isExporting}
        isExportingPreMaster={isExportingPreMaster}
        isExportingZip={isExportingZip}
        hasAudioLoaded={!!masterBufferRef.current}
        outputBitDepth={exportBitDepth}
        onLoadRecallFile={handleDirectLoadRecall}
      />

      {/* Export notification toast */}
      {exportNotice && (
        <div className="fixed top-16 right-4 z-50 p-3 rounded-lg bg-[#111726] border border-cyan-500/40 text-xs font-mono text-cyan-300 shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Error notification toast */}
      {appErrorNotice && (
        <div className="fixed top-16 right-4 z-50 p-3 rounded-lg bg-rose-950/95 border border-rose-500/60 text-xs font-mono text-rose-200 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in max-w-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{appErrorNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppErrorNotice(null)}
            className="text-rose-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Batch Audition & Track Navigation Bar */}
      {editingBatchIndex !== null && batchQueue[editingBatchIndex] && (
        <BatchAuditionBar
          currentIndex={editingBatchIndex}
          totalTracks={batchQueue.length}
          currentTrack={batchQueue[editingBatchIndex]}
          onNextTrack={handleNextBatchTrack}
          onPrevTrack={handlePrevBatchTrack}
          onReturnToBatchModal={handleReturnToBatchModal}
          onExitBatchMode={handleExitBatchMode}
          onChangeTrackPreset={handleChangeEditingTrackPreset}
          allPresets={getAllPresets()}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5 pb-44 sm:pb-36">
        {/* Source File Ingestion & Format Specs */}
        <AudioUploader
          currentTrackTitle={currentTrackTitle}
          isAnalyzing={isAnalyzing}
          onFileUpload={handleFileUpload}
          onMultipleFilesUpload={handleMultipleFilesUpload}
          onSplitStereoUpload={handleSplitStereoUpload}
          pendingSplitMono={pendingSplitMono}
          onDismissPendingSplitMono={() => setPendingSplitMono(null)}
          onOpenSplitStereoModal={() => setIsSplitStereoModalOpen(true)}
          onOpenBatch={() => setIsBatchModalOpen(true)}
          audioFormat={audioFormat}
          overallAiProbability={analysisResult?.overallAiProbability}
          detectedPlatformName={analysisResult?.dominantPlatform.name}
          hasAudioLoaded={!!masterBufferRef.current}
          trackNumber={trackNumber}
          onUpdateTrackNumber={handleUpdateTrackNumber}
          songTitle={songTitle}
          onUpdateSongTitle={handleUpdateSongTitle}
          artistName={artistName}
          onUpdateArtistName={handleUpdateArtistName}
          targetLufs={humanizerSettings.targetLufs}
          analysisStatus={analysisStatus}
          currentPresetName={currentGlobalPresetName}
          onReanalyze={handleReanalyzeForensics}
        />

        {/* Real-time DSP Processing & Listening Route Status Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-[#0b101d] border border-slate-800 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${
                !masterBufferRef.current
                  ? 'bg-slate-600'
                  : !isCompareOriginal
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              }`}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              {masterBufferRef.current ? (
                <>
                  <span className="text-slate-200 font-semibold">
                    Música Ativa:{' '}
                    <span className="text-white font-mono">{currentTrackTitle}</span>
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    ({audioFormat ? `${audioFormat.sampleRate.toLocaleString()} Hz · ${audioFormat.bitDepth}-bit` : 'Carregado'})
                  </span>
                  {tapeAzimuthAnalysis && (
                    <span className="text-amber-300 font-mono text-[11px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-700/40">
                      {tapeAzimuthAnalysis.isGhostChannelDetected
                        ? `Mono: Canal ${tapeAzimuthAnalysis.activeSignalChannel} Útil`
                        : `Azimute: ${tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs`}
                    </span>
                  )}
                  {analysisResult && (
                    <span className="text-slate-400 font-mono text-[11px] inline-flex items-center gap-1.5">
                      <span className={analysisResult.overallAiProbability > 40 ? 'text-amber-400' : 'text-emerald-400 font-semibold'}>
                        · {analysisResult.overallAiProbability.toFixed(1)}% IA ({analysisResult.dominantPlatform.name})
                      </span>
                      <button
                        type="button"
                        onClick={handleReanalyzeForensics}
                        disabled={isAnalyzing}
                        className="ml-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-sans cursor-pointer flex items-center gap-0.5"
                        title="Recalcular triagem acústica com o novo classificador orgânico"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        <span>[Reanalisar]</span>
                      </button>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-300 leading-relaxed">
                  Aguardando arquivo de áudio ou digitalização de fita 1/4" para iniciar.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 w-full lg:w-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('modular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activeTab === 'modular'
                  ? 'bg-gradient-to-r from-amber-500/25 via-cyan-500/25 to-blue-500/25 text-white border border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-[#111726] text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="Fluxo Modular Inteligente: Triagem Automática, Restauração de Fita, Equalização e Masterização em Blocos"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>⚡ Fluxo Modular</span>
            </button>

            <button
              onClick={() => setActiveTab('azimuth')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activeTab === 'azimuth'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60'
                  : 'bg-[#111726] text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Azimute 1/4"</span>
            </button>

            <button
              onClick={() => setActiveTab('dropouts')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activeTab === 'dropouts'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60'
                  : 'bg-[#111726] text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="Detecção e correção de dropouts de fita analógica (Ampex Mono Full-Track em Studer A80)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Dropouts</span>
              {tapeDropoutAnalysis && tapeDropoutAnalysis.totalDropouts > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-bold">
                  {tapeDropoutAnalysis.totalDropouts}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('denoise')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activeTab === 'denoise'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/60'
                  : 'bg-[#111726] text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="Redutor de Ruído Espectral NoNoise / RX (Hiss, Ronco e Subtração Multi-Banda)"
            >
              <Waves className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Denoise</span>
              {tapeDenoiseTelemetry && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300 font-bold">
                  {tapeDenoiseTelemetry.hissNoiseFloorDb.toFixed(0)}dB
                </span>
              )}
            </button>

            <span className="text-slate-600 text-[11px] hidden sm:inline">|</span>

            <button
              onClick={handleToggleAB}
              disabled={!masterBufferRef.current}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap min-h-[38px] disabled:opacity-40 disabled:cursor-not-allowed ${
                !isCompareOriginal
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-xs'
              }`}
              title="Clique para alternar o sinal de áudio A/B entre o áudio cru original e o master de estúdio"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {!isCompareOriginal
                  ? '✨ MASTER TRATADO'
                  : '⚠️ ORIGINAL CRU'}
              </span>
            </button>
          </div>
        </div>

        {/* Real-time Spectrogram & Studio Telemetry Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Spectrogram Canvas (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <SpectrogramCanvas
              isPlaying={isPlaying}
              playbackTime={playbackTime}
              duration={duration}
              nyquistCutoffHz={analysisResult?.metrics.nyquistCutoffHz || 22050}
              onSeek={handleSeek}
              isAiDetected={isAiDetected}
              detectedPlatformName={analysisResult?.dominantPlatform.name || 'IA'}
            />
          </div>

          {/* Studio Audio Telemetry Card (4 cols) */}
          <div className="lg:col-span-4 bg-[#0e1320] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Telemetria de Som & Tonalidade
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                MASTERING ATIVO
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 my-2.5">
              <div className="p-2.5 rounded-lg bg-[#111726] border border-cyan-500/30 flex flex-col">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">Loudness (LUFS)</span>
                <span className="text-sm font-mono font-bold text-white mt-0.5">
                  {trackLoudness ? `${trackLoudness.integratedLufs.toFixed(1)} LUFS` : `${(humanizerSettings.targetLufs ?? -14.0).toFixed(1)} LUFS`}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  Alvo: {(humanizerSettings.targetLufs ?? -14.0).toFixed(1)} LUFS
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#111726] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Teto True-Peak</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                  {(humanizerSettings.targetCeilingDb ?? -1.0).toFixed(1)} dBTP
                </span>
                <span className="text-[9px] text-emerald-400 mt-0.5">Limitless Ativo</span>
              </div>

              {/* Tape Azimuth Indicator */}
              <div
                onClick={() => setActiveTab('azimuth')}
                className="p-2.5 rounded-lg bg-[#111726] border border-amber-500/30 hover:border-amber-400 flex flex-col cursor-pointer transition-colors"
                title="Clique para ir à aba de alinhamento de azimute"
              >
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase flex items-center gap-1">
                  <Disc className="w-2.5 h-2.5" />
                  Azimute 1/4"
                </span>
                <span className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                  {tapeAzimuthAnalysis
                    ? tapeAzimuthAnalysis.isGhostChannelDetected
                      ? `Mono (${tapeAzimuthAnalysis.activeSignalChannel})`
                      : `${tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs`
                    : '0.0 µs'}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {tapeAzimuthAnalysis?.isGhostChannelDetected
                    ? '✓ Canal útil centrado'
                    : tapeAzimuthSettings.azimuthDelaySamples !== 0
                    ? '✓ Alinhado'
                    : 'Checagem pronta'}
                </span>
              </div>

              {/* Tape Dropouts & Oxide Health Indicator */}
              <div
                onClick={() => setActiveTab('dropouts')}
                className="p-2.5 rounded-lg bg-[#111726] border border-emerald-500/30 hover:border-emerald-400 flex flex-col cursor-pointer transition-colors"
                title="Clique para ir à aba de restauração e diagnóstico de dropouts de fita"
              >
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Dropouts
                </span>
                <span className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                  {tapeDropoutAnalysis ? `${tapeDropoutAnalysis.tapeHealthScore}% Íntegra` : '100%'}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 truncate">
                  {tapeDropoutAnalysis && tapeDropoutAnalysis.totalDropouts > 0
                    ? `${tapeDropoutAnalysis.totalDropouts} falhas`
                    : 'Fita sem falhas'}
                </span>
              </div>

              {/* Spectral Denoise Indicator */}
              <div
                onClick={() => setActiveTab('denoise')}
                className="p-2.5 rounded-lg bg-[#111726] border border-purple-500/30 hover:border-purple-400 flex flex-col cursor-pointer transition-colors"
                title="Clique para abrir o redutor de ruído espectral NoNoise / RX"
              >
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase flex items-center gap-1">
                  <Waves className="w-2.5 h-2.5" />
                  Denoise NoNoise
                </span>
                <span className="text-sm font-mono font-bold text-purple-300 mt-0.5">
                  {tapeDenoiseTelemetry ? `${tapeDenoiseTelemetry.hissNoiseFloorDb.toFixed(1)} dBFS` : '-64.0 dBFS'}
                </span>
                <span className={`text-[9px] mt-0.5 truncate font-semibold ${tapeDenoiseSettings.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {tapeDenoiseSettings.enabled ? `✓ Ativo (-${tapeDenoiseSettings.reductionDb}dB)` : '○ Bypass (Desativado)'}
                </span>
              </div>
            </div>

            {/* AI Source Footprint Indicator */}
            <div className="p-2.5 rounded-lg bg-[#121929] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Perfil da Fonte de Áudio
                </span>
                <span className="text-xs font-bold text-amber-300">
                  {analysisResult?.dominantPlatform.name || 'Áudio Customizado'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {analysisResult ? `${analysisResult.overallAiProbability.toFixed(0)}% IA` : '0% IA'}
              </span>
            </div>

            {/* Quick Action to open full mastering technical report */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="mt-2.5 w-full py-2 px-3 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Relatório Técnico de Masterização</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Tab Modular: Fluxo Modular Inteligente & Triagem Automática */}
        {activeTab === 'modular' && (
          <ModularWorkflowConsole
            currentTrackTitle={currentTrackTitle}
            audioFormat={audioFormat}
            trackLoudness={trackLoudness}
            azimuthAnalysis={tapeAzimuthAnalysis}
            dropoutAnalysis={tapeDropoutAnalysis}
            denoiseTelemetry={tapeDenoiseTelemetry}
            azimuthSettings={tapeAzimuthSettings}
            dropoutSettings={tapeDropoutSettings}
            denoiseSettings={tapeDenoiseSettings}
            humanizerSettings={humanizerSettings}
            onUpdateAzimuthSettings={handleUpdateAzimuthSettings}
            onUpdateDropoutSettings={handleUpdateDropoutSettings}
            onUpdateDenoiseSettings={handleUpdateDenoiseSettings}
            onUpdateHumanizerSettings={handleUpdateSettings}
            onReconstructDropouts={handleReconstructDropouts}
            onApplyTriageRecommendations={handleApplyTriageRecommendations}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenSplitStereoModal={() => setIsSplitStereoModalOpen(true)}
            isPlaying={isPlaying}
            onTogglePlay={handlePlayPause}
            isCompareOriginal={isCompareOriginal}
            onToggleAB={handleToggleAB}
            onExportMaster={handleExportWav}
            onExportPreMaster={handleExportPreMasterOnly}
            onExportZipPackage={handleExportZipPackage}
            outputBitDepth={exportBitDepth}
            onChangeBitDepth={(depth) => setExportBitDepth(depth)}
            isExporting={isExporting}
            isExportingPreMaster={isExportingPreMaster}
            currentPresetName={currentGlobalPresetName}
            onLoadRecallFile={handleDirectLoadRecall}
          />
        )}

        {/* Tab 0: 1/4" Tape Azimuth & Channel Balance Workstation */}
        {activeTab === 'azimuth' && (
          <TapeAzimuthConsole
            analysis={tapeAzimuthAnalysis}
            settings={tapeAzimuthSettings}
            onUpdateSettings={handleUpdateAzimuthSettings}
            onAutoAlign={handleAutoAlignAzimuth}
            onExportAzimuthOnly={handleExportAzimuthOnly}
            isExportingAzimuth={isExportingAzimuth}
            hasAudioLoaded={!!masterBufferRef.current}
            currentTrackTitle={currentTrackTitle}
            outputBitDepth={audioFormat?.bitDepth || 24}
            outputSampleRate={audioFormat?.sampleRate || 44100}
            onNavigateToMastering={() => setActiveTab('mastering')}
            onSelectOutputDirectory={() => setIsFolderModalOpen(true)}
            outputDirectoryName={outputDirName}
          />
        )}

        {/* Tab 0.1: Tape Dropout Detection & Cross-Channel Reconstruction Workstation */}
        {activeTab === 'dropouts' && (
          <TapeDropoutConsole
            analysis={tapeDropoutAnalysis}
            azimuthAnalysis={tapeAzimuthAnalysis}
            settings={tapeDropoutSettings}
            onUpdateSettings={handleUpdateDropoutSettings}
            onReconstruct={handleReconstructDropouts}
            onSeek={handleSeek}
            onPlayFrom={handlePlayFrom}
            onTogglePlay={handlePlayPause}
            isCompareOriginal={isCompareOriginal}
            onToggleCompareOriginal={handleToggleAB}
            playbackTime={playbackTime}
            duration={duration}
            isPlaying={isPlaying}
            hasAudioLoaded={!!masterBufferRef.current}
            currentTrackTitle={currentTrackTitle}
            onExportRestoredWav={handleExportDropoutRestoredWav}
            isRestoring={isRestoringDropout}
            isMonoPreview={tapeAzimuthSettings.listenInMono}
            onToggleMonoPreview={() => handleUpdateAzimuthSettings({ listenInMono: !tapeAzimuthSettings.listenInMono })}
          />
        )}

        {/* Tab 0.2: Spectral Denoise (Sonic Solutions NoNoise & iZotope RX Style) */}
        {activeTab === 'denoise' && (
          <TapeDenoiseConsole
            telemetry={tapeDenoiseTelemetry}
            settings={tapeDenoiseSettings}
            onUpdateSettings={handleUpdateDenoiseSettings}
            onLearnNoiseProfile={handleLearnNoiseProfile}
            onLearnNoiseProfileAtPlayhead={handleLearnNoiseProfileAtPlayhead}
            onLearnNoiseProfileAtTail={handleLearnNoiseProfileAtTail}
            onApplyDenoise={handleApplyDenoise}
            onTogglePlay={handlePlayPause}
            onPlayFrom={handlePlayFrom}
            isCompareOriginal={isCompareOriginal}
            onToggleCompareOriginal={handleToggleAB}
            playbackTime={playbackTime}
            duration={duration}
            isPlaying={isPlaying}
            hasAudioLoaded={!!masterBufferRef.current}
            currentTrackTitle={currentTrackTitle}
            onExportDenoisedWav={handleExportDenoisedWav}
            isProcessing={isExportingDenoised}
          />
        )}

        {/* Tab 1: Studio Mastering & Sound Enhancer Console */}
        {activeTab === 'mastering' && (
          <HumanizerControls
            settings={humanizerSettings}
            onUpdateSettings={handleUpdateSettings}
            isCompareOriginal={isCompareOriginal}
            onToggleCompareOriginal={handleToggleAB}
            onNavigateToLufs={() => setActiveTab('lufs')}
            onNavigateToAzimuth={() => setActiveTab('azimuth')}
            onOpenPresets={() => setIsPresetModalOpen(true)}
            trackLoudness={trackLoudness}
            orbanTelemetry={orbanTelemetry}
            onAutoCalibrateOrban={handleAutoCalibrateOrban}
            hasAudioLoaded={!!masterBufferRef.current}
            onSelectPresetName={(name) => setCurrentGlobalPresetName(name)}
            currentPresetName={currentGlobalPresetName}
          />
        )}

        {/* Tab 2: LUFS Meter & DMGAudio Limitless Console */}
        {activeTab === 'lufs' && (
          <LufsLimitlessConsole
            settings={humanizerSettings}
            onUpdateSettings={handleUpdateSettings}
            trackLoudness={trackLoudness}
            isPlaying={isPlaying}
            hasAudioLoaded={!!masterBufferRef.current}
            currentTrackTitle={currentTrackTitle}
          />
        )}

        {/* Tab 6: Spectral & RTA Analysis Workstation */}
        {activeTab === 'analyzer' && (

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Multiaxial Radar Chart */}
              <RadarArtifactChart
                artifacts={analysisResult?.artifacts || []}
                overallAiProb={analysisResult?.overallAiProbability || 0}
              />

              {/* Goniometer & Phase Scope */}
              <LissajousScope
                isPlaying={isPlaying}
                phaseCorrelation={analysisResult?.metrics.phaseCorrelationIndex || 0.8}
              />
            </div>

            {/* Acoustic Matrix & Artifacts Inspection */}
            {analysisResult && (
              <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Diagnóstico Acústico de Precisão & Espectro
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      5 Parâmetros de Áudio Mapeados
                    </span>
                    <button
                      type="button"
                      onClick={handleReanalyzeForensics}
                      disabled={isAnalyzing}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      title="Recalcular classificação com as regras acústicas orgânicas"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>Atualizar Diagnóstico</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {analysisResult.artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="p-3.5 rounded-lg bg-[#111726] border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {art.namePt}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            art.severity === 'Crítico'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : art.severity === 'Moderado'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {art.severity}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {art.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span>Faixa: {art.affectedFrequencies}</span>
                        <span className="text-slate-300 font-semibold">{art.measuredMetric}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Forensic Report Modal */}
      <ForensicReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        report={analysisResult}
        onSeek={handleSeek}
      />

      {/* Fixed Bottom Audio Transport Bar */}
      <AudioPlayerBar
        isPlaying={isPlaying}
        playbackTime={playbackTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        isHumanizedActive={!isCompareOriginal}
        onToggleAB={handleToggleAB}
        onExport={handleExportWav}
        isExporting={isExporting}
        detectedPlatformName={analysisResult?.dominantPlatform.name}
        hasAudioLoaded={!!masterBufferRef.current}
        outputSampleRate={audioFormat?.sampleRate || 44100}
        outputBitDepth={exportBitDepth}
        targetLufs={humanizerSettings.targetLufs ?? -14.0}
        targetCeilingDb={humanizerSettings.targetCeilingDb ?? -1.0}
        currentPresetName={currentGlobalPresetName}
      />

      {/* Preset Manager Modal (User custom presets + Factory profiles) */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentSettings={humanizerSettings}
        currentAzimuthSettings={tapeAzimuthSettings}
        onLoadPreset={handleLoadPreset}
      />

      {/* Batch Processing & Auto-Save Modal */}
      <BatchProcessingModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        humanizerSettings={humanizerSettings}
        tapeAzimuthSettings={tapeAzimuthSettings}
        tapeDropoutSettings={tapeDropoutSettings}
        currentGlobalPresetName={currentGlobalPresetName}
        queue={batchQueue}
        setQueue={setBatchQueue}
        onEditTrackInMastering={handleEditTrackInMastering}
        activeEditingIndex={editingBatchIndex}
        exportBitDepth={exportBitDepth}
      />

      {/* Output Folder & Auto-Save Configuration Modal */}
      <FolderSettingsModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        outputDirName={outputDirName}
        onOutputDirChanged={(name) => setOutputDirName(name)}
      />

      {/* Pro Tools Split Stereo (.L and .R) Modal */}
      <SplitStereoModal
        isOpen={isSplitStereoModalOpen}
        onClose={() => setIsSplitStereoModalOpen(false)}
        onMerge={handleSplitStereoUpload}
        pendingSplitMono={pendingSplitMono}
        currentTrackTitle={currentTrackTitle}
      />

    </div>
  );
}
