import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FolderOpen,
  FolderDown,
  CheckCircle2,
  Clock,
  Play,
  Trash2,
  X,
  Disc,
  Sparkles,
  Sliders,
  AlertCircle,
  FileCheck,
  Check,
  Layers,
  Archive,
  ExternalLink,
  ShieldAlert,
  Bookmark,
  Headphones,
  Edit3,
  History,
  FileCode,
} from 'lucide-react';
import { detectAudioFileFormat, AudioInputFormat } from '../audio/audioFormatDetector';
import { analyzeTapeAzimuth, TapeAzimuthSettings } from '../audio/tapeAzimuthEngine';
import { HumanizerSettings } from '../types/audio';
import {
  autoSaveManager,
  isInsideIframe,
  FolderCheckResult,
  FolderConflictAction
} from '../audio/autoSaveManager';
import { audioEngine } from '../audio/audioEngine';
import { getAllPresets, UserPreset } from '../audio/presetManager';
import { decodeAudioPreservingSampleRate } from '../audio/nativeAudioDecoder';
import {
  generateTrackRecall,
  generateBatchSessionRecall,
  recallToBlob,
  parseRecallFile
} from '../audio/presetRecallManager';
import {
  parseTrackMetadata,
  buildMasterWavFilename,
  buildAzimuthWavFilename,
  buildRecallFilename
} from '../audio/trackNamingHelper';
import { FolderConflictModal } from './FolderConflictModal';

export interface BatchItem {
  id: string;
  file: File;
  title: string;
  // Standardized Studio Naming Metadata: [faixa]_[Música] - [Cantor] - AT_[taxa_bit]_[LUFS]
  trackNumber?: string;
  songTitle?: string;
  artist?: string;
  sizeBytes: number;
  duration?: number;
  format?: AudioInputFormat;
  azimuthOffsetSamples?: number;
  azimuthOffsetUs?: number;
  levelDiffDb?: number;
  status: 'pending' | 'analyzing' | 'ready' | 'processing' | 'done' | 'error';
  progress?: number;
  savedPath?: string;
  errorMessage?: string;
  audioBuffer?: AudioBuffer;
  // Per-track preset & mastering settings
  presetId?: string;
  presetName?: string;
  isCustomized?: boolean;
  customHumanizerSettings?: HumanizerSettings;
  customAzimuthSettings?: TapeAzimuthSettings;
}

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  humanizerSettings: HumanizerSettings;
  tapeAzimuthSettings: TapeAzimuthSettings;
  currentGlobalPresetName?: string;
  queue: BatchItem[];
  setQueue: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  onEditTrackInMastering: (index: number) => void;
  activeEditingIndex?: number | null;
}

export function BatchProcessingModal({
  isOpen,
  onClose,
  humanizerSettings,
  tapeAzimuthSettings,
  currentGlobalPresetName,
  queue,
  setQueue,
  onEditTrackInMastering,
  activeEditingIndex,
}: BatchProcessingModalProps) {
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [batchExportMode, setBatchExportMode] = useState<'master' | 'azimuth_only' | 'both'>('both');
  const [autoAlignPerTape, setAutoAlignPerTape] = useState(true);
  const [subfolderName, setSubfolderName] = useState(autoSaveManager.getSubfolderName());
  const [outputDirName, setOutputDirName] = useState<string>(autoSaveManager.getBaseDirName());
  const [dirSelectMsg, setDirSelectMsg] = useState<string | null>(null);
  const [dirSelectError, setDirSelectError] = useState<string | null>(null);
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);
  const [renderedBatchBlobs, setRenderedBatchBlobs] = useState<Array<{ filename: string; blob: Blob }>>([]);
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [autoZipWhenDirectBlocked, setAutoZipWhenDirectBlocked] = useState(true);
  const [saveRecallPresets, setSaveRecallPresets] = useState(true);
  const [conflictData, setConflictData] = useState<FolderCheckResult | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [selectedTrackForRecall, setSelectedTrackForRecall] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRecallInputRef = useRef<HTMLInputElement>(null);
  const allPresets = getAllPresets();

  if (!isOpen) return null;

  const inIframe = isInsideIframe();

  const handleTrackPresetChange = (itemId: string, presetIdOrName: string) => {
    const selectedPreset = allPresets.find(
      (p) => p.id === presetIdOrName || p.name === presetIdOrName
    );
    if (!selectedPreset) return;

    setQueue((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              presetId: selectedPreset.id,
              presetName: selectedPreset.name,
              customHumanizerSettings: { ...selectedPreset.settings },
              customAzimuthSettings: selectedPreset.azimuthSettings
                ? { ...selectedPreset.azimuthSettings }
                : it.customAzimuthSettings,
              isCustomized: false,
            }
          : it
      )
    );
  };

  // Add multiple files to the queue
  const handleAddFiles = async (files: FileList | File[]) => {
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

      // Automatically parse track number, song title and artist from file name
      const parsedMeta = parseTrackMetadata(file.name, queue.length + i + 1);

      const item: BatchItem = {
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
      };
      newItems.push(item);
    }

    if (newItems.length === 0) return;

    setQueue((prev) => [...prev, ...newItems]);

    // Quick background analysis of audio format and azimuth for newly added files
    const ctx = audioEngine.getAudioContext();
    for (const item of newItems) {
      try {
        setQueue((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'analyzing' } : it))
        );

        const audioBuffer = await decodeAudioPreservingSampleRate(item.file, ctx);
        const detectedFormat = await detectAudioFileFormat(item.file, audioBuffer);
        const azimuthAnalysis = analyzeTapeAzimuth(audioBuffer);

        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'ready',
                  format: detectedFormat,
                  duration: audioBuffer.duration,
                  audioBuffer,
                  azimuthOffsetSamples: azimuthAnalysis.azimuthOffsetSamples,
                  azimuthOffsetUs: azimuthAnalysis.azimuthOffsetUs,
                  levelDiffDb: azimuthAnalysis.levelDiffDb,
                }
              : it
          )
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', errorMessage: 'Erro ao decodificar áudio.' }
              : it
          )
        );
      }
    }
  };

  const handlePickOutputDirectory = async () => {
    setDirSelectError(null);
    setIsIframeBlocked(false);
    autoSaveManager.updateConfig({ subfolderName });
    const result = await autoSaveManager.selectOutputDirectory();
    if (result.success) {
      setOutputDirName(result.dirName);
      setDirSelectMsg(
        `✓ Pasta conectada: "${result.dirName}/${subfolderName}". Os arquivos serão gravados diretamente nessa pasta sem popups!`
      );
      setTimeout(() => setDirSelectMsg(null), 8000);
    } else {
      if (result.isIframeBlocked) {
        setIsIframeBlocked(true);
      }
      if (result.error && !result.error.includes('cancelada')) {
        setDirSelectError(result.error);
      }
    }
  };

  const handleDownloadZip = async () => {
    if (renderedBatchBlobs.length === 0 || isPackagingZip) return;
    setIsPackagingZip(true);
    try {
      const zipBlob = await autoSaveManager.createZipPackage(renderedBatchBlobs, subfolderName);
      const res = await autoSaveManager.saveZipFile(zipBlob, `${subfolderName}.zip`);
      if (res.savedToDiskDirectly) {
        setDirSelectMsg(
          `✓ Arquivo "${res.targetPath}" salvo com sucesso na pasta escolhida no seu computador!`
        );
      } else {
        setDirSelectMsg(
          `✓ Pacote compactado ${subfolderName}.zip gerado com sucesso!`
        );
      }
      setTimeout(() => setDirSelectMsg(null), 8000);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
    } finally {
      setIsPackagingZip(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearQueue = () => {
    if (confirm('Deseja limpar todos os arquivos da fila?')) {
      setQueue([]);
      setRenderedBatchBlobs([]);
    }
  };

  const handleUpdateItemMetadata = (
    id: string,
    field: 'trackNumber' | 'songTitle' | 'artist',
    value: string
  ) => {
    setQueue((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleAutoRenumberQueue = () => {
    setQueue((prev) =>
      prev.map((it, idx) => ({
        ...it,
        trackNumber: String(idx + 1).padStart(2, '0'),
      }))
    );
  };

  const handleTrackRecallUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedTrackForRecall) {
      const file = e.target.files[0];
      const recall = await parseRecallFile(file);
      if (recall) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === selectedTrackForRecall
              ? {
                  ...it,
                  presetId: recall.presetId || 'imported_recall',
                  presetName: `Recall: ${recall.trackTitle || recall.presetName || 'Master Anterior'}`,
                  customHumanizerSettings: { ...recall.humanizerSettings },
                  customAzimuthSettings: { ...recall.azimuthSettings },
                  isCustomized: true,
                }
              : it
          )
        );
        setDirSelectMsg(
          `✓ Recall de master restaurado para "${recall.trackTitle}"! Parâmetros originais reaplicados com sucesso.`
        );
        setTimeout(() => setDirSelectMsg(null), 5000);
      } else {
        alert('Arquivo de recall inválido ou não reconhecido. Certifique-se de escolher um arquivo .aurapreset ou .json gerado pelo AuraTune.');
      }
      e.target.value = '';
      setSelectedTrackForRecall(null);
    }
  };

  const handleResolveConflict = async (action: FolderConflictAction) => {
    setIsConflictModalOpen(false);
    const res = await autoSaveManager.applyFolderConflictResolution(action, subfolderName);
    setSubfolderName(res.finalSubfolderName);
    await executeBatchProcessing(res.finalSubfolderName, res.renameSuffix);
  };

  // Run the batch processing engine across all items
  const handleStartBatch = async () => {
    if (queue.length === 0 || isProcessingBatch) return;

    // Prompt user to pick output directory if not yet connected
    if (!autoSaveManager.hasSelectedDirectory() && autoSaveManager.isFileSystemAccessSupported() && !inIframe) {
      const pickRes = await autoSaveManager.selectOutputDirectory();
      if (pickRes.success) {
        setOutputDirName(pickRes.dirName);
        setDirSelectMsg(
          `✓ Pasta configurada: "${pickRes.dirName}/${subfolderName}". Os arquivos serão salvos diretamente nessa pasta no seu disco!`
        );
      }
    }

    // Smart Folder Conflict Detection: Check if target subfolder already exists with files
    if (autoSaveManager.hasSelectedDirectory()) {
      const conflict = await autoSaveManager.checkSubfolderConflict(subfolderName);
      if (conflict.hasConflict) {
        setConflictData(conflict);
        setIsConflictModalOpen(true);
        return; // Await user selection in FolderConflictModal
      }
    }

    await executeBatchProcessing(subfolderName, '');
  };

  const executeBatchProcessing = async (targetSubfolder: string, fileSuffix: string) => {
    setIsProcessingBatch(true);
    setDirSelectError(null);
    autoSaveManager.updateConfig({
      subfolderName: targetSubfolder,
      enabled: autoSaveManager.hasSelectedDirectory(),
    });

    const ctx = audioEngine.getAudioContext();
    const batchBlobs: Array<{ filename: string; blob: Blob }> = [];
    const directDiskActive = autoSaveManager.hasSelectedDirectory();

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      setCurrentProcessingIndex(i);
      setQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing', progress: 15 } : it))
      );

      try {
        let buffer = item.audioBuffer;
        if (!buffer) {
          buffer = await decodeAudioPreservingSampleRate(item.file, ctx);
          item.audioBuffer = buffer;
        }

        const targetBitDepth = item.format?.bitDepth || 24;
        const targetSampleRate = item.format?.sampleRate || buffer.sampleRate;
        const cleanBaseName = `${item.title.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_')}${fileSuffix}`;

        // Tape Azimuth Calibration per track (use customized or base)
        let trackAzimuth = item.customAzimuthSettings ? { ...item.customAzimuthSettings } : { ...tapeAzimuthSettings };
        if (autoAlignPerTape) {
          const autoAnalysis = analyzeTapeAzimuth(buffer);
          trackAzimuth = {
            ...trackAzimuth,
            enabled: true,
            azimuthDelaySamples: autoAnalysis.azimuthOffsetSamples,
            balanceDb: -autoAnalysis.levelDiffDb,
          };
        }

        // Humanizer & Masterizer settings per track (use customized or base)
        const trackHumanizer = item.customHumanizerSettings || humanizerSettings;

        let lastSavedPath = '';

        // Mode 1: Export Azimuth Corrected Archival Preservation WAV (strict sample rate preservation)
        if (batchExportMode === 'azimuth_only' || batchExportMode === 'both') {
          setQueue((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, progress: 45 } : it))
          );
          const azimuthBlob = await audioEngine.exportAzimuthCorrectedOnlyWav(
            buffer,
            trackAzimuth,
            targetBitDepth,
            targetSampleRate
          );
          const azimuthFileName = buildAzimuthWavFilename({
            trackNumber: item.trackNumber || String(i + 1).padStart(2, '0'),
            songTitle: item.songTitle || item.title.replace(/\.[^/.]+$/, ''),
            artist: item.artist,
            sampleRate: targetSampleRate,
            bitDepth: targetBitDepth,
            suffix: fileSuffix,
          });
          batchBlobs.push({ filename: azimuthFileName, blob: azimuthBlob });

          if (directDiskActive) {
            const saveRes = await autoSaveManager.saveProcessedFile(azimuthBlob, azimuthFileName);
            lastSavedPath = saveRes.targetPath;
          } else if (!autoZipWhenDirectBlocked) {
            autoSaveManager.triggerBrowserDownload(azimuthBlob, azimuthFileName);
            lastSavedPath = `Downloads/${azimuthFileName}`;
          } else {
            lastSavedPath = `${targetSubfolder}/${azimuthFileName} (Pacote ZIP)`;
          }
        }

        // Mode 2: Export Final Master WAV (strict sample rate preservation)
        if (batchExportMode === 'master' || batchExportMode === 'both') {
          setQueue((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, progress: 75 } : it))
          );
          const masterBlob = await audioEngine.exportProcessedAudioWav(
            buffer,
            trackHumanizer,
            targetBitDepth,
            trackAzimuth,
            targetSampleRate
          );
          const masterFileName = buildMasterWavFilename({
            trackNumber: item.trackNumber || String(i + 1).padStart(2, '0'),
            songTitle: item.songTitle || item.title.replace(/\.[^/.]+$/, ''),
            artist: item.artist,
            sampleRate: targetSampleRate,
            bitDepth: targetBitDepth,
            targetLufs: trackHumanizer.targetLufs ?? -14,
            suffix: fileSuffix,
          });
          batchBlobs.push({ filename: masterFileName, blob: masterBlob });

          if (directDiskActive) {
            const saveRes = await autoSaveManager.saveProcessedFile(masterBlob, masterFileName);
            lastSavedPath = saveRes.targetPath;
          } else if (!autoZipWhenDirectBlocked) {
            autoSaveManager.triggerBrowserDownload(masterBlob, masterFileName);
            lastSavedPath = `Downloads/${masterFileName}`;
          } else {
            lastSavedPath = `${targetSubfolder}/${masterFileName} (Pacote ZIP)`;
          }
        }

        // Mode 3: Save Recall Preset (.aurapreset) for this track in the EXACT SAME FOLDER
        if (saveRecallPresets) {
          const trackRecall = generateTrackRecall(
            item.title,
            trackHumanizer,
            trackAzimuth,
            item.format,
            item.presetName || currentGlobalPresetName,
            item.presetId,
            item.isCustomized
          );
          const recallBlob = recallToBlob(trackRecall);
          const recallFileName = buildRecallFilename({
            trackNumber: item.trackNumber || String(i + 1).padStart(2, '0'),
            songTitle: item.songTitle || item.title.replace(/\.[^/.]+$/, ''),
            artist: item.artist,
            sampleRate: targetSampleRate,
            bitDepth: targetBitDepth,
            targetLufs: trackHumanizer.targetLufs ?? -14,
            suffix: fileSuffix,
          });
          batchBlobs.push({ filename: recallFileName, blob: recallBlob });

          if (directDiskActive) {
            await autoSaveManager.saveProcessedFile(recallBlob, recallFileName);
          }
        }

        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'done', progress: 100, savedPath: lastSavedPath } : it
          )
        );
      } catch (err: unknown) {
        console.error('Erro ao processar item do lote:', err);
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMessage: err instanceof Error ? err.message : 'Falha na renderização',
                }
              : it
          )
        );
      }
    }

    // Save Complete Session Recall manifest
    if (saveRecallPresets && batchBlobs.length > 0) {
      const sessionRecall = generateBatchSessionRecall(
        queue,
        targetSubfolder,
        humanizerSettings,
        tapeAzimuthSettings
      );
      const sessionRecallBlob = recallToBlob(sessionRecall);
      const sessionRecallFileName = `${targetSubfolder}_Sessao_Recall.aurapreset`;
      batchBlobs.push({ filename: sessionRecallFileName, blob: sessionRecallBlob });

      if (directDiskActive) {
        await autoSaveManager.saveProcessedFile(sessionRecallBlob, sessionRecallFileName);
      }
    }

    setRenderedBatchBlobs(batchBlobs);

    // Save output files / ZIP package
    if (batchBlobs.length > 0) {
      if (directDiskActive) {
        // Individual WAVs and Presets were saved directly into subfolder on disk. Also write the ZIP archive to chosen directory!
        try {
          const zipBlob = await autoSaveManager.createZipPackage(batchBlobs, targetSubfolder);
          await autoSaveManager.saveZipFile(zipBlob, `${targetSubfolder}.zip`);
          setDirSelectMsg(
            `✓ Lote finalizado! Todos os ${batchBlobs.length} arquivos (WAVs e presets de recall .aurapreset) foram gravados na pasta "${outputDirName}/${targetSubfolder}/" e o pacote "${targetSubfolder}.zip" foi gerado.`
          );
        } catch {
          setDirSelectMsg(
            `✓ Processamento em lote finalizado! Todos os arquivos foram gravados diretamente no seu computador em: "${outputDirName}/${targetSubfolder}/"`
          );
        }
      } else if (autoZipWhenDirectBlocked) {
        setIsPackagingZip(true);
        try {
          const zipBlob = await autoSaveManager.createZipPackage(batchBlobs, targetSubfolder);
          const zipRes = await autoSaveManager.saveZipFile(zipBlob, `${targetSubfolder}.zip`);
          if (zipRes.savedToDiskDirectly) {
            setDirSelectMsg(
              `✓ Processamento concluído! O arquivo "${zipRes.targetPath}" contendo a subpasta com ${batchBlobs.length} itens (áudios e presets) foi salvo diretamente na pasta escolhida no seu computador.`
            );
          } else {
            setDirSelectMsg(
              `✓ Processamento concluído! Arquivo "${targetSubfolder}.zip" gerado com todos os ${batchBlobs.length} áudios e presets organizados na subpasta.`
            );
          }
        } catch (zipErr) {
          console.error('Erro ao criar ZIP:', zipErr);
        } finally {
          setIsPackagingZip(false);
        }
      }
    }

    setIsProcessingBatch(false);
    setCurrentProcessingIndex(-1);
  };

  const completedCount = queue.filter((it) => it.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Processamento em Lote & Auto-Salvamento em Pasta
              </h2>
              <p className="text-xs text-slate-400">
                Digitalize e processe múltiplas fitas 1/4" em fila com calibração automática de azimute e salvamento direto na pasta de sua escolha.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Directory configured banner */}
        {dirSelectMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{dirSelectMsg}</span>
          </div>
        )}

        {/* Directory error / iframe banner */}
        {dirSelectError && (
          <div className="bg-amber-950/80 border-b border-amber-500/40 px-6 py-3 text-xs text-amber-200 flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{dirSelectError}</span>
            </div>
            {(inIframe || isIframeBlocked) && (
              <div className="flex items-center gap-2 pl-6">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir AuraTune em Nova Aba (Permite Pastas do PC)</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Top Config Card: Output Directory & Batch Strategy */}
          <div className="p-4 rounded-xl bg-[#101728] border border-slate-800 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  Pasta de Destino Automática
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Salva os arquivos processados diretamente dentro de uma subpasta criada para identificação.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePickOutputDirectory}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
              >
                <FolderDown className="w-4 h-4" />
                <span>
                  {outputDirName ? `Pasta: ${outputDirName}` : 'Selecionar Pasta no Computador'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
              {/* Subfolder Name */}
              <div className="sm:col-span-5 flex flex-col gap-1">
                <label className="text-[11px] font-mono text-slate-400">
                  Nome da Subpasta Criada:
                </label>
                <input
                  type="text"
                  value={subfolderName}
                  onChange={(e) => setSubfolderName(e.target.value)}
                  placeholder="Ex: Tapes_Processados_AuraTune"
                  className="px-3 py-1.5 rounded-lg bg-[#090e1a] border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Export Mode */}
              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-[11px] font-mono text-slate-400">Arquivos Gerados:</label>
                <select
                  value={batchExportMode}
                  onChange={(e) => setBatchExportMode(e.target.value as 'master' | 'azimuth_only' | 'both')}
                  className="px-3 py-1.5 rounded-lg bg-[#090e1a] border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="both">Ambos (Azimute Puro + Master Final)</option>
                  <option value="azimuth_only">Apenas Azimute Corrigido (Preservação)</option>
                  <option value="master">Apenas Masterização Final Completa</option>
                </select>
              </div>

              {/* Auto-Align per tape switch & Auto-ZIP fallback */}
              <div className="sm:col-span-3 flex flex-col justify-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoAlignPerTape}
                    onChange={(e) => setAutoAlignPerTape(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                  />
                  <span className="text-[11px] text-amber-300 font-semibold">
                    Auto-calibrar azimute por fita
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoZipWhenDirectBlocked}
                    onChange={(e) => setAutoZipWhenDirectBlocked(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                  <span className="text-[11px] text-cyan-300 font-semibold">
                    Gerar .ZIP com subpasta se gravação direta estiver bloqueada
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={saveRecallPresets}
                    onChange={(e) => setSaveRecallPresets(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                  />
                  <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-amber-400" />
                    Salvar presets de recall (.aurapreset) na mesma pasta
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Queue Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Fila de Arquivos ({queue.length})
                </span>
                {completedCount > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {completedCount} de {queue.length} concluídos
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoRenumberQueue}
                    disabled={isProcessingBatch}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Renumerar sequencialmente todas as faixas (01, 02, 03...)"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Renumerar (01, 02...)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingBatch}
                  className="px-3 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Adicionar Mais Arquivos</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.aiff,.aif,.mp4,.mpg4,.mov,.m4v,.webm,.mkv"
                  onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
                  className="hidden"
                />

                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearQueue}
                    disabled={isProcessingBatch}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Limpar toda a fila"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Empty State */}
            {queue.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl bg-[#090d16] flex flex-col items-center justify-center text-center cursor-pointer transition-all"
              >
                <UploadCloud className="w-8 h-8 text-cyan-400/80 mb-2" />
                <h4 className="text-sm font-bold text-white">Nenhum arquivo na fila de lote</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Clique aqui ou arraste múltiplos arquivos de áudio (WAV, MP3, FLAC, M4A, AIFF) para processar digitalizações de fitas em série.
                </p>
              </div>
            ) : (
              /* Item List */
              <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {queue.map((item, index) => {
                  const isCurrent = currentProcessingIndex === index;
                  const itemPreviewName = buildMasterWavFilename({
                    trackNumber: item.trackNumber || String(index + 1).padStart(2, '0'),
                    songTitle: item.songTitle || item.title.replace(/\.[^/.]+$/, ''),
                    artist: item.artist,
                    sampleRate: item.format?.sampleRate || 44100,
                    bitDepth: item.format?.bitDepth || 24,
                    targetLufs: item.customHumanizerSettings?.targetLufs ?? -14,
                  });

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? 'bg-[#121c32] border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
                          : item.status === 'done'
                          ? 'bg-[#0f1726] border-emerald-500/40'
                          : item.status === 'error'
                          ? 'bg-[#19111c] border-rose-500/40'
                          : 'bg-[#0e1424] border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                            item.status === 'done'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'processing'
                              ? 'bg-cyan-500/20 text-cyan-300 animate-spin'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status === 'done' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          {/* Standard Naming inputs row: [faixa]_[Música] - [Cantor] */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-[#080d1a] px-2 py-0.5 rounded border border-slate-700/80">
                              <span className="text-[10px] font-mono text-slate-400">#</span>
                              <input
                                type="text"
                                value={item.trackNumber || String(index + 1).padStart(2, '0')}
                                onChange={(e) => handleUpdateItemMetadata(item.id, 'trackNumber', e.target.value)}
                                disabled={isProcessingBatch}
                                className="w-7 bg-transparent text-xs font-mono font-bold text-amber-300 focus:outline-none"
                                title="Número da faixa (ex: 01, 02...)"
                              />
                            </div>

                            <input
                              type="text"
                              value={item.songTitle || ''}
                              onChange={(e) => handleUpdateItemMetadata(item.id, 'songTitle', e.target.value)}
                              disabled={isProcessingBatch}
                              placeholder="Nome da Música"
                              className="flex-1 min-w-[140px] max-w-[260px] px-2 py-0.5 rounded bg-[#080d1a] border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                              title="Nome da música"
                            />

                            <input
                              type="text"
                              value={item.artist || ''}
                              onChange={(e) => handleUpdateItemMetadata(item.id, 'artist', e.target.value)}
                              disabled={isProcessingBatch}
                              placeholder="Cantor (opcional)"
                              className="flex-1 min-w-[120px] max-w-[200px] px-2 py-0.5 rounded bg-[#080d1a] border border-slate-700/80 text-xs font-medium text-slate-300 focus:outline-none focus:border-cyan-400"
                              title="Nome do cantor / artista se houver"
                            />
                          </div>

                          {/* Live Standard Export Filename Preview */}
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">PADRÃO AT</span>
                            <span className="text-amber-300 font-semibold truncate max-w-[420px] sm:max-w-[560px]">
                              {itemPreviewName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                            {item.format && (
                              <span className="text-cyan-400">
                                {item.format.sampleRate.toLocaleString()} Hz · {item.format.bitDepth}-bit
                              </span>
                            )}
                            {item.azimuthOffsetSamples !== undefined && item.azimuthOffsetUs !== undefined && (
                              <span className="text-amber-300 flex items-center gap-1">
                                <Disc className="w-2.5 h-2.5" />
                                Azimute: {item.azimuthOffsetUs > 0 ? '+' : ''}
                                {item.azimuthOffsetUs.toFixed(1)} µs
                              </span>
                            )}
                            {item.savedPath && (
                              <span className="text-emerald-400 truncate max-w-[200px]">
                                ➔ {item.savedPath}
                              </span>
                            )}
                            {item.errorMessage && (
                              <span className="text-rose-400">{item.errorMessage}</span>
                            )}

                            {/* Preset Selector Dropdown for each track */}
                            <div className="flex items-center gap-1 bg-[#090e1c] px-2 py-0.5 rounded border border-slate-700/80 text-[10px]">
                              <Bookmark className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="text-slate-400 font-mono">Preset:</span>
                              <select
                                value={item.presetId || item.presetName}
                                onChange={(e) => handleTrackPresetChange(item.id, e.target.value)}
                                disabled={isProcessingBatch}
                                className="bg-transparent text-[11px] font-semibold text-cyan-300 focus:outline-none cursor-pointer truncate max-w-[170px]"
                                title="Preset de masterização aplicado a esta faixa"
                              >
                                {allPresets.map((p) => (
                                  <option key={p.id} value={p.id} className="bg-[#0b101d] text-slate-200">
                                    {p.name} {p.category === 'user' ? '(Meu Preset)' : ''}
                                  </option>
                                ))}
                              </select>
                              {item.isCustomized && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold" title="Ajustes manuais feitos nesta faixa">
                                  AJUSTADO
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right actions: Audition / Edit in Masterizer & status badge */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrackForRecall(item.id);
                            trackRecallInputRef.current?.click();
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          title="Carregar arquivo .aurapreset para reaplicar o master exato caso você tenha ajustado a mix desta faixa"
                        >
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          <span>Recall</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onEditTrackInMastering(index);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          title="Ouvir esta faixa no masterizador e verificar se precisa de ajustes diferentes, com botão de retorno para a próxima faixa"
                        >
                          <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ouvir & Editar</span>
                        </button>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            item.status === 'done'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : item.status === 'processing'
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 animate-pulse'
                              : item.status === 'analyzing'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-600/30'
                              : item.status === 'error'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status === 'done'
                            ? 'CONCLUÍDO'
                            : item.status === 'processing'
                            ? `${item.progress ?? 50}%`
                            : item.status === 'analyzing'
                            ? 'ANALISANDO'
                            : item.status === 'error'
                            ? 'ERRO'
                            : 'PENDENTE'}
                        </span>

                        {!isProcessingBatch && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0e1424] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {queue.length > 0 ? (
              <span>
                {completedCount} de {queue.length} faixas processadas
              </span>
            ) : (
              <span>Adicione faixas de fita para iniciar o lote</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {renderedBatchBlobs.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isPackagingZip}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                title={`Baixar todos os ${renderedBatchBlobs.length} arquivos renderizados em um pacote ZIP com a subpasta ${subfolderName}/`}
              >
                <Archive className="w-4 h-4" />
                <span>{isPackagingZip ? 'Compactando...' : `Baixar Pasta (.ZIP)`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartBatch}
              disabled={queue.length === 0 || isProcessingBatch}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isProcessingBatch
                  ? `Processando (${currentProcessingIndex + 1}/${queue.length})...`
                  : 'Iniciar Processamento em Lote'}
              </span>
            </button>
          </div>
        </div>

        {/* Hidden File Input for Track Recall */}
        <input
          ref={trackRecallInputRef}
          type="file"
          accept=".aurapreset,.json,application/json"
          onChange={handleTrackRecallUpload}
          className="hidden"
        />

        {/* Smart Folder Conflict Resolution Modal */}
        <FolderConflictModal
          isOpen={isConflictModalOpen}
          conflictData={conflictData}
          onResolve={handleResolveConflict}
          onCancel={() => setIsConflictModalOpen(false)}
        />
      </div>
    </div>
  );
}
