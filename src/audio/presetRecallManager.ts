import { HumanizerSettings } from '../types/audio';
import { TapeAzimuthSettings } from './tapeAzimuthEngine';
import { AudioInputFormat } from './audioFormatDetector';
import { BatchItem } from '../components/BatchProcessingModal';

export interface TrackMasterRecall {
  version: '1.0';
  app: 'AuraTune Studio Mastering';
  exportDate: string;
  trackTitle: string;
  presetId?: string;
  presetName?: string;
  isCustomized?: boolean;
  humanizerSettings: HumanizerSettings;
  azimuthSettings: TapeAzimuthSettings;
  audioFormat?: {
    sampleRate: number;
    bitDepth: number;
    channels: number;
    codec?: string;
  };
  notes?: string;
}

export interface BatchSessionRecall {
  version: '1.0';
  app: 'AuraTune Studio Mastering';
  exportDate: string;
  sessionName: string;
  totalTracks: number;
  tracks: TrackMasterRecall[];
}

/**
 * Generates structured recall data for an individual audio track
 */
export function generateTrackRecall(
  trackTitle: string,
  settings: HumanizerSettings,
  azimuthSettings: TapeAzimuthSettings,
  audioFormat?: AudioInputFormat,
  presetName?: string,
  presetId?: string,
  isCustomized?: boolean
): TrackMasterRecall {
  return {
    version: '1.0',
    app: 'AuraTune Studio Mastering',
    exportDate: new Date().toISOString(),
    trackTitle,
    presetId,
    presetName: presetName || 'Personalizado',
    isCustomized: !!isCustomized,
    humanizerSettings: { ...settings },
    azimuthSettings: { ...azimuthSettings },
    audioFormat: audioFormat
      ? {
          sampleRate: audioFormat.sampleRate,
          bitDepth: audioFormat.bitDepth,
          channels: audioFormat.channels,
          codec: audioFormat.codec,
        }
      : undefined,
    notes: 'Arquivo de recall de masterização AuraTune. Permite reaplicar todos os parâmetros de master, azimute e limitador a uma nova mixagem.',
  };
}

/**
 * Generates structured recall for a complete batch mastering session
 */
export function generateBatchSessionRecall(
  items: BatchItem[],
  sessionName: string,
  globalSettings: HumanizerSettings,
  globalAzimuth: TapeAzimuthSettings
): BatchSessionRecall {
  const tracks: TrackMasterRecall[] = items.map((item) =>
    generateTrackRecall(
      item.title,
      item.customHumanizerSettings || globalSettings,
      item.customAzimuthSettings || globalAzimuth,
      item.format,
      item.presetName,
      item.presetId,
      item.isCustomized
    )
  );

  return {
    version: '1.0',
    app: 'AuraTune Studio Mastering',
    exportDate: new Date().toISOString(),
    sessionName,
    totalTracks: tracks.length,
    tracks,
  };
}

/**
 * Converts recall object into a Blob (.aurapreset / .json)
 */
export function recallToBlob(recall: TrackMasterRecall | BatchSessionRecall): Blob {
  const json = JSON.stringify(recall, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Parses and validates an uploaded recall preset file (.aurapreset or .json)
 */
export async function parseRecallFile(file: File): Promise<TrackMasterRecall | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate if it's a single track recall
    if (data && (data.humanizerSettings || data.settings)) {
      const humanizerSettings: HumanizerSettings = data.humanizerSettings || data.settings;
      const azimuthSettings: TapeAzimuthSettings = data.azimuthSettings || {
        enabled: true,
        azimuthDelaySamples: 0,
        balanceDb: 0,
        invertPhaseL: false,
        invertPhaseR: false,
        listenInMono: false,
        autoAlignOnLoad: true,
      };

      return {
        version: '1.0',
        app: 'AuraTune Studio Mastering',
        exportDate: data.exportDate || new Date().toISOString(),
        trackTitle: data.trackTitle || file.name.replace(/\.(aurapreset|json)$/i, ''),
        presetId: data.presetId,
        presetName: data.presetName || data.name || 'Recall Importado',
        isCustomized: data.isCustomized,
        humanizerSettings,
        azimuthSettings,
        audioFormat: data.audioFormat,
        notes: data.notes,
      };
    }

    // Or if it's a batch session recall with tracks array, return the first track or handle
    if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
      return data.tracks[0];
    }
  } catch (err) {
    console.error('Falha ao decodificar arquivo de recall:', err);
  }
  return null;
}
