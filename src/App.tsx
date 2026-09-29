import { useState, useEffect, useRef } from 'react';
import { TopNav } from './components/TopNav';
import { AudioUploader } from './components/AudioUploader';
import { SpectrogramCanvas } from './components/SpectrogramCanvas';
import { LissajousScope } from './components/LissajousScope';
import { RadarArtifactChart } from './components/RadarArtifactChart';
import { HumanizerControls } from './components/HumanizerControls';
import { StemMixer } from './components/StemMixer';
import { ForensicReportModal } from './components/ForensicReportModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { LufsLimitlessConsole } from './components/LufsLimitlessConsole';
import { TapeAzimuthConsole } from './components/TapeAzimuthConsole';
import { PresetManagerModal } from './components/PresetManagerModal';
import { BatchProcessingModal, BatchItem } from './components/BatchProcessingModal';
import { BatchAuditionBar } from './components/BatchAuditionBar';
import { FolderSettingsModal } from './components/FolderSettingsModal';
import { audioEngine } from './audio/audioEngine';
import { analyzeAudioForensics } from './audio/analyzer';
import { splitAudioBufferIntoStems } from './audio/stemSplitter';
import { detectAudioFileFormat, AudioInputFormat } from './audio/audioFormatDetector';
import { decodeAudioPreservingSampleRate } from './audio/nativeAudioDecoder';
import { analyzeBufferLoudness } from './audio/loudnessEngine';
import { analyzeTapeAzimuth, TapeAzimuthAnalysis, TapeAzimuthSettings } from './audio/tapeAzimuthEngine';
import { UserPreset, getAllPresets } from './audio/presetManager';
import { autoSaveManager } from './audio/autoSaveManager';
import {
  generateTrackRecall,
  recallToBlob,
  parseRecallFile
} from './audio/presetRecallManager';
import {
  parseTrackMetadata,
  buildMasterWavFilename,
  buildAzimuthWavFilename,
  buildRecallFilename
} from './audio/trackNamingHelper';
import { ForensicAnalysisResult, HumanizerSettings, AudioStem, LoudnessMetrics } from './types/audio';
import { Sparkles, Layers, Cpu, ArrowRight, Activity, CheckCircle2, Gauge, Disc, Bookmark, FolderDown, History } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'azimuth' | 'mastering' | 'lufs' | 'stems' | 'analyzer'>('azimuth');
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
  const [trackNumber, setTrackNumber] = useState<string>('01');
  const [songTitle, setSongTitle] = useState<string>('');
  const [artistName, setArtistName] = useState<string>('');

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompareOriginal, setIsCompareOriginal] = useState(false); // false = Mastered, true = Raw AI
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAzimuth, setIsExportingAzimuth] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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

  // Current Track & Buffer State (Pure User Audio - Zero Artificial Beep Synths)
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Nenhum arquivo carregado');
  const [audioFormat, setAudioFormat] = useState<AudioInputFormat | null>(null);
  const [isStemMode, setIsStemMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trackLoudness, setTrackLoudness] = useState<LoudnessMetrics | null>(null);


  // Audio Buffers
  const masterBufferRef = useRef<AudioBuffer | null>(null);
  const stemsRef = useRef<AudioStem[]>([]);
  const [stems, setStems] = useState<AudioStem[]>([]);

  // Forensic Analysis State
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);

  // Mastering DSP Settings (Calibrated for pristine audiophile quality, zero distortion)
  const [humanizerSettings, setHumanizerSettings] = useState<HumanizerSettings>({
    enabled: true,
    deHarshIntensity: 60,
    notchFrequencyHz: 3400,
    notchBandwidthQ: 2.5,
    tapeWarmth: 45,
    tubeHarmonics: 40,
    lowMidBody: 1.4,
    transientPunch: 60,
    attackDeSmear: 50,
    timingJitterMs: 8,
    flutterWowRate: 30,
    airExciterGain: 55,
    airCutoffHz: 14500,
    stereoCorrelationFix: 70,
    monoBassCutoffHz: 140,
    acousticRoomSpread: 45,
    outputGainDb: 0,
    limitlessEnabled: true,
    targetLufs: -14.0,
    targetCeilingDb: -1.0,
    clipperDrive: 55,
    lowEndWeight: 75,
    transientSpeed: 'punchy',
    autoMatchLoudness: true,
  });

  // Handle User File Upload - Extracts Exact Sample Rate and Bit Depth
  const handleFileUpload = async (file: File) => {
    try {
      setIsAnalyzing(true);
      audioEngine.stop();
      setIsPlaying(false);
      setPlaybackTime(0);
      setIsStemMode(false);

      // Decode audio data preserving exact native sample rate (e.g. 44.1 kHz, 96 kHz)
      const audioBuffer = await decodeAudioPreservingSampleRate(file, audioEngine.getAudioContext());

      // Detect native bit depth and sample rate from input file
      const detectedFormat = await detectAudioFileFormat(file, audioBuffer);
      setAudioFormat(detectedFormat);

      masterBufferRef.current = audioBuffer;
      setCurrentTrackTitle(file.name);
      setDuration(audioBuffer.duration);

      // Parse track metadata for standardized studio naming: [faixa]_[Música] - [Cantor] - AT_[taxa_bit]_[LUFS]
      const parsedMeta = parseTrackMetadata(file.name, 1);
      setTrackNumber(parsedMeta.trackNumber);
      setSongTitle(parsedMeta.songTitle);
      setArtistName(parsedMeta.artist);

      // Preload raw buffer and trigger background master rendering for bit-for-bit preview parity
      audioEngine.loadRawBuffer(audioBuffer);

      // Compute precise full-track ITU-R BS.1770-4 loudness metrics
      const loudness = analyzeBufferLoudness(audioBuffer);
      setTrackLoudness(loudness);
      audioEngine.setTrackLoudness(loudness);

      // Analyze user file
      const analysis = await analyzeAudioForensics(audioBuffer, file.name);
      setAnalysisResult(analysis);

      // 1/4" Analog Tape Azimuth & Inter-Channel Balance Analysis
      const azimuth = analyzeTapeAzimuth(audioBuffer);
      setTapeAzimuthAnalysis(azimuth);

      if (tapeAzimuthSettings.autoAlignOnLoad && (Math.abs(azimuth.azimuthOffsetSamples) > 0.05 || Math.abs(azimuth.levelDiffDb) > 0.2)) {
        const autoAzimuth: TapeAzimuthSettings = {
          ...tapeAzimuthSettings,
          enabled: true,
          azimuthDelaySamples: azimuth.azimuthOffsetSamples,
          balanceDb: -azimuth.levelDiffDb,
        };
        setTapeAzimuthSettings(autoAzimuth);
        audioEngine.updateTapeAzimuthSettings(autoAzimuth);
      }

      // Extract real multitrack frequency stems from user audio buffer for stem mixing
      const userStems = await splitAudioBufferIntoStems(
        audioBuffer,
        analysis.overallAiProbability > 50,
        analysis.dominantPlatform.name
      );
      if (userStems.length > 0) {
        setStems(userStems);
        stemsRef.current = userStems;
      }

      // Auto-tune Masterizer based on detected cutoff and resonance
      if (analysis.metrics.nyquistCutoffHz <= 16500) {
        setHumanizerSettings((prev) => ({
          ...prev,
          deHarshIntensity: 75,
          notchFrequencyHz: 3400,
          airCutoffHz: 16000,
          airExciterGain: 80,
          stereoCorrelationFix: 75,
        }));
      } else if (analysis.dominantPlatform.platform === 'udio') {
        setHumanizerSettings((prev) => ({
          ...prev,
          deHarshIntensity: 80,
          notchFrequencyHz: 4200,
          airCutoffHz: 17000,
          airExciterGain: 50,
          stereoCorrelationFix: 80,
        }));
      }

      setExportNotice(
        `Áudio carregado: ${detectedFormat.sampleRate.toLocaleString()} Hz · ${detectedFormat.bitDepth}-bit (${detectedFormat.codec}). Azimute: ${azimuth.azimuthOffsetUs > 0 ? '+' : ''}${azimuth.azimuthOffsetUs.toFixed(1)} µs | Balanço: ${azimuth.levelDiffDb > 0 ? '+' : ''}${azimuth.levelDiffDb.toFixed(1)} dB.`
      );
      setTimeout(() => setExportNotice(null), 7000);
      setIsAnalyzing(false);
    } catch {
      alert('Erro ao carregar ou decodificar arquivo. Por favor tente outro formato (WAV, MP3, FLAC, M4A, MP4/MPG4, MOV).');
      setIsAnalyzing(false);
    }
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
    const aligned: TapeAzimuthSettings = {
      ...tapeAzimuthSettings,
      enabled: true,
      azimuthDelaySamples: tapeAzimuthAnalysis.azimuthOffsetSamples,
      balanceDb: -tapeAzimuthAnalysis.levelDiffDb,
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
    setExportNotice(
      `✓ Azimute calibrado automaticamente: ${tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs (${tapeAzimuthAnalysis.azimuthOffsetSamples > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetSamples.toFixed(2)} amostras) | Balanço: ${(-tapeAzimuthAnalysis.levelDiffDb).toFixed(1)} dB.`
    );
    setTimeout(() => setExportNotice(null), 6000);
  };

  // Load Custom User / Factory Preset
  const handleLoadPreset = (preset: UserPreset) => {
    setCurrentGlobalPresetName(preset.name);
    setHumanizerSettings(preset.settings);
    audioEngine.updateSettings(preset.settings);

    if (preset.azimuthSettings) {
      setTapeAzimuthSettings(preset.azimuthSettings);
      audioEngine.updateTapeAzimuthSettings(preset.azimuthSettings);
    }

    if (editingBatchIndex !== null) {
      setBatchQueue((prev) =>
        prev.map((it, idx) =>
          idx === editingBatchIndex
            ? {
                ...it,
                presetId: preset.id,
                presetName: preset.name,
                customHumanizerSettings: { ...preset.settings },
                customAzimuthSettings: preset.azimuthSettings
                  ? { ...preset.azimuthSettings }
                  : it.customAzimuthSettings,
                isCustomized: false,
              }
            : it
        )
      );
    }

    setExportNotice(`✓ Preset "${preset.name}" carregado com sucesso!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Batch Track Audition & Navigation Engine
  const handleEditTrackInMastering = async (index: number) => {
    if (index < 0 || index >= batchQueue.length) return;
    const item = batchQueue[index];
    if (!item) return;

    setEditingBatchIndex(index);

    try {
      let buffer = item.audioBuffer;
      if (!buffer) {
        buffer = await decodeAudioPreservingSampleRate(item.file, audioEngine.getAudioContext());
        item.audioBuffer = buffer;
      }

      const detectedFormat = item.format || (await detectAudioFileFormat(item.file, buffer));
      setAudioFormat(detectedFormat);

      masterBufferRef.current = buffer;
      setCurrentTrackTitle(item.title);
      setDuration(buffer.duration);

      audioEngine.loadRawBuffer(buffer);

      const loudness = analyzeBufferLoudness(buffer);
      setTrackLoudness(loudness);
      audioEngine.setTrackLoudness(loudness);

      const analysis = await analyzeAudioForensics(buffer, item.title);
      setAnalysisResult(analysis);

      const azimuth = analyzeTapeAzimuth(buffer);
      setTapeAzimuthAnalysis(azimuth);

      // Restore specific preset or settings for this track
      if (item.customHumanizerSettings) {
        setHumanizerSettings(item.customHumanizerSettings);
        audioEngine.updateSettings(item.customHumanizerSettings);
      }
      if (item.customAzimuthSettings) {
        setTapeAzimuthSettings(item.customAzimuthSettings);
        audioEngine.updateTapeAzimuthSettings(item.customAzimuthSettings);
      }

      // Generate stems asynchronously for multitrack mixer
      splitAudioBufferIntoStems(buffer, analysis.overallAiProbability > 50, analysis.dominantPlatform.name)
        .then((stems) => {
          if (stems.length > 0) {
            setStems(stems);
            stemsRef.current = stems;
          }
        })
        .catch(() => {});

      setActiveTab('mastering');
      setPlaybackTime(0);
      audioEngine.playBuffer(buffer, 0);
      setIsPlaying(true);

      setExportNotice(`🎧 Ouvindo faixa ${index + 1} de ${batchQueue.length}: "${item.title}"`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Erro ao carregar faixa do lote no editor:', err);
    }
  };

  const handleNextBatchTrack = () => {
    if (editingBatchIndex === null) return;

    // Save current adjustments for current track
    setBatchQueue((prev) =>
      prev.map((it, idx) =>
        idx === editingBatchIndex
          ? {
              ...it,
              customHumanizerSettings: { ...humanizerSettings },
              customAzimuthSettings: { ...tapeAzimuthSettings },
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

    // Save current adjustments
    setBatchQueue((prev) =>
      prev.map((it, idx) =>
        idx === editingBatchIndex
          ? {
              ...it,
              customHumanizerSettings: { ...humanizerSettings },
              customAzimuthSettings: { ...tapeAzimuthSettings },
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
                customHumanizerSettings: { ...humanizerSettings },
                customAzimuthSettings: { ...tapeAzimuthSettings },
              }
            : it
        )
      );
    }
    setIsBatchModalOpen(true);
  };

  const handleChangeEditingTrackPreset = (presetIdOrName: string) => {
    if (editingBatchIndex === null) return;
    const allPresets = getAllPresets();
    const selected = allPresets.find((p) => p.id === presetIdOrName || p.name === presetIdOrName);
    if (!selected) return;

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
              isCustomized: false,
            }
          : it
      )
    );
  };

  // Export Azimuth Corrected Archival Preservation WAV
  const handleExportAzimuthOnly = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExportingAzimuth(true);
      const targetBitDepth = audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Renderizando arquivo com azimute e balanço corrigidos em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit WAV puro (pré-master de preservação)...`
      );

      const wavBlob = await audioEngine.exportAzimuthCorrectedOnlyWav(
        masterBufferRef.current,
        tapeAzimuthSettings,
        targetBitDepth,
        targetSampleRate
      );

      const filename = buildAzimuthWavFilename({
        trackNumber,
        songTitle: songTitle || currentTrackTitle.replace(/\.[^/.]+$/, ''),
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
      });

      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename);

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

  // Transport Handlers
  const handlePlayPause = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (isStemMode && stems.length > 0) {
        audioEngine.playStems(stems, playbackTime);
        setIsPlaying(true);
      } else if (masterBufferRef.current) {
        audioEngine.playBuffer(masterBufferRef.current, playbackTime);
        setIsPlaying(true);
      }
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
      if (isStemMode && stems.length > 0) {
        audioEngine.playStems(stems, time);
      } else if (masterBufferRef.current) {
        audioEngine.playBuffer(masterBufferRef.current, time);
      }
    }
  };

  // A/B Comparison Toggle
  const handleToggleAB = () => {
    const nextCompare = !isCompareOriginal;
    setIsCompareOriginal(nextCompare);
    audioEngine.setCompareOriginal(nextCompare);
  };

  // Update Humanizer Settings
  const handleUpdateSettings = (newSettings: Partial<HumanizerSettings>) => {
    setHumanizerSettings((prev) => {
      const updated = { ...prev, ...newSettings };
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
    audioEngine.updateSettings(newSettings);
  };

  // Update Stem Volume / Humanization
  const handleUpdateStem = (stemId: string, updates: Partial<AudioStem>) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, ...updates } : s));
      const soloActive = next.some((s) => s.solo);
      const target = next.find((s) => s.id === stemId);
      if (target) {
        audioEngine.updateStemVolume(stemId, target.volume, target.muted, target.solo, soloActive);
        if (updates.pan !== undefined) {
          audioEngine.updateStemPan(stemId, updates.pan);
        }
      }
      return next;
    });
  };

  const handleSoloStem = (stemId: string) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, solo: !s.solo } : s));
      const soloActive = next.some((s) => s.solo);
      next.forEach((s) => {
        audioEngine.updateStemVolume(s.id, s.volume, s.muted, s.solo, soloActive);
      });
      return next;
    });
  };

  const handleMuteStem = (stemId: string) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === stemId ? { ...s, muted: !s.muted } : s));
      const soloActive = next.some((s) => s.solo);
      next.forEach((s) => {
        audioEngine.updateStemVolume(s.id, s.volume, s.muted, s.solo, soloActive);
      });
      return next;
    });
  };

  // Export Processed WAV with Studio-Grade Headroom & Exact Input Bit Depth/Sample Rate
  const handleExportWav = async () => {
    if (!masterBufferRef.current) return;
    try {
      setIsExporting(true);
      const targetBitDepth = audioFormat?.bitDepth || 24;
      const targetSampleRate = audioFormat?.sampleRate || masterBufferRef.current.sampleRate;
      setExportNotice(
        `Renderizando master em ${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit WAV com alvo de ${humanizerSettings.targetLufs ?? -14.0} LUFS (DMGAudio Limitless)...`
      );

      const wavBlob = await audioEngine.exportProcessedAudioWav(
        masterBufferRef.current,
        humanizerSettings,
        targetBitDepth,
        tapeAzimuthSettings,
        targetSampleRate
      );

      const effectiveTitle = songTitle || currentTrackTitle.replace(/\.[^/.]+$/, '');
      const filename = buildMasterWavFilename({
        trackNumber,
        songTitle: effectiveTitle,
        artist: artistName,
        sampleRate: targetSampleRate,
        bitDepth: targetBitDepth,
        targetLufs: humanizerSettings.targetLufs ?? -14,
      });

      const saveRes = await autoSaveManager.saveProcessedFile(wavBlob, filename);

      // Also save exact mastering recall preset (.aurapreset) in the SAME destination folder
      try {
        const recallData = generateTrackRecall(
          currentTrackTitle,
          humanizerSettings,
          tapeAzimuthSettings,
          audioFormat || undefined,
          currentGlobalPresetName
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
        await autoSaveManager.saveProcessedFile(recallBlob, recallFilename);
      } catch (recallErr) {
        console.warn('Erro ao salvar arquivo de recall:', recallErr);
      }

      setExportNotice(
        `✓ Master WAV e Recall (.aurapreset) exportados com sucesso na mesma pasta: ${saveRes.targetPath} (${targetSampleRate.toLocaleString()} Hz / ${targetBitDepth}-bit)!`
      );
      setTimeout(() => setExportNotice(null), 7000);
    } catch {
      setExportNotice('Erro ao renderizar arquivo master.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectLoadRecall = async (file: File) => {
    try {
      const recall = await parseRecallFile(file);
      if (recall) {
        setHumanizerSettings({ ...recall.humanizerSettings });
        setTapeAzimuthSettings({ ...recall.azimuthSettings });
        audioEngine.updateSettings(recall.humanizerSettings);
        audioEngine.updateTapeAzimuthSettings(recall.azimuthSettings);
        setCurrentGlobalPresetName(recall.presetName || 'Recall de Masterização');
        setExportNotice(
          `✓ Recall de Masterização aplicado com sucesso: "${recall.trackTitle}"! Todos os parâmetros de master foram restabelecidos no áudio atual.`
        );
        setTimeout(() => setExportNotice(null), 6000);
      } else {
        setExportNotice('Arquivo de recall inválido ou corrompido.');
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch {
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
        setActiveTab={setActiveTab}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onOpenBatch={() => setIsBatchModalOpen(true)}
        onOpenFolderSettings={() => setIsFolderModalOpen(true)}
        outputDirectoryName={outputDirName}
        onExport={handleExportWav}
        onExportAzimuthOnly={handleExportAzimuthOnly}
        isHumanizedActive={!isCompareOriginal}
        onToggleAB={handleToggleAB}
        isExporting={isExporting}
        hasAudioLoaded={!!masterBufferRef.current}
        outputBitDepth={audioFormat?.bitDepth || 24}
      />

      {/* Export notification toast */}
      {exportNotice && (
        <div className="fixed top-16 right-4 z-50 p-3 rounded-lg bg-[#111726] border border-cyan-500/40 text-xs font-mono text-cyan-300 shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{exportNotice}</span>
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
          onExitBatchMode={() => setEditingBatchIndex(null)}
          onChangeTrackPreset={handleChangeEditingTrackPreset}
          allPresets={getAllPresets()}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-5 flex flex-col gap-5">
        {/* Source File Ingestion & Format Specs */}
        <AudioUploader
          currentTrackTitle={currentTrackTitle}
          isAnalyzing={isAnalyzing}
          onFileUpload={handleFileUpload}
          onMultipleFilesUpload={() => setIsBatchModalOpen(true)}
          onOpenBatch={() => setIsBatchModalOpen(true)}
          isStemMode={isStemMode}
          setIsStemMode={setIsStemMode}
          audioFormat={audioFormat}
          overallAiProbability={analysisResult?.overallAiProbability}
          detectedPlatformName={analysisResult?.dominantPlatform.name}
          hasAudioLoaded={!!masterBufferRef.current}
          trackNumber={trackNumber}
          onUpdateTrackNumber={setTrackNumber}
          songTitle={songTitle}
          onUpdateSongTitle={setSongTitle}
          artistName={artistName}
          onUpdateArtistName={setArtistName}
          targetLufs={humanizerSettings.targetLufs}
        />

        {/* Real-time DSP Processing & Listening Route Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0b101d] border border-slate-800 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                !masterBufferRef.current
                  ? 'bg-slate-600'
                  : !isCompareOriginal
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              }`}
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                      Azimute: {tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}{tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs
                    </span>
                  )}
                  {analysisResult && (
                    <span className="text-slate-400 font-mono text-[11px]">
                      · {analysisResult.overallAiProbability.toFixed(1)}% IA ({analysisResult.dominantPlatform.name})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">
                  Aguardando arquivo de áudio ou digitalização de fita 1/4" para iniciar.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab('azimuth')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'azimuth'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60'
                  : 'bg-[#111726] text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Disc className="w-3.5 h-3.5 text-amber-400" />
              <span>Azimute 1/4"</span>
            </button>

            <span className="text-slate-500 text-[11px]">|</span>

            <button
              onClick={handleToggleAB}
              disabled={!masterBufferRef.current}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                !isCompareOriginal
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-xs'
              }`}
              title="Clique para alternar o sinal de áudio A/B entre o áudio cru original e o master de estúdio"
            >
              <Sparkles className="w-3.5 h-3.5" />
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
                  {tapeAzimuthAnalysis ? `${tapeAzimuthAnalysis.azimuthOffsetUs > 0 ? '+' : ''}${tapeAzimuthAnalysis.azimuthOffsetUs.toFixed(1)} µs` : '0.0 µs'}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {tapeAzimuthSettings.azimuthDelaySamples !== 0 ? '✓ Alinhado' : 'Checagem pronta'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#111726] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono text-slate-400">Fase Estéreo</span>
                <span className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                  +{analysisResult?.metrics.phaseCorrelationIndex ? analysisResult.metrics.phaseCorrelationIndex.toFixed(2) : '0.85'}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Mono-compatível & Amplo</span>
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

        {/* Tab 3: Stem Separation & Multitrack Mixer */}
        {activeTab === 'stems' && (
          <StemMixer
            stems={stems}
            onUpdateStem={handleUpdateStem}
            onSoloStem={handleSoloStem}
            onMuteStem={handleMuteStem}
            isPlaying={isPlaying}
          />
        )}

        {/* Tab 4: Spectral & RTA Analysis Workstation */}
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
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Diagnóstico Acústico de Precisão & Espectro
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    5 Parâmetros de Áudio Mapeados
                  </span>
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
        outputBitDepth={audioFormat?.bitDepth || 24}
        targetLufs={humanizerSettings.targetLufs ?? -14.0}
        targetCeilingDb={humanizerSettings.targetCeilingDb ?? -1.0}
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
        currentGlobalPresetName={currentGlobalPresetName}
        queue={batchQueue}
        setQueue={setBatchQueue}
        onEditTrackInMastering={handleEditTrackInMastering}
        activeEditingIndex={editingBatchIndex}
      />

      {/* Output Folder & Auto-Save Configuration Modal */}
      <FolderSettingsModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        outputDirName={outputDirName}
        onOutputDirChanged={(name) => setOutputDirName(name)}
      />

    </div>
  );
}
