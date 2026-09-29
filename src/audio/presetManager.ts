import { HumanizerSettings } from '../types/audio';
import { TapeAzimuthSettings } from './tapeAzimuthEngine';

export interface UserPreset {
  id: string;
  name: string;
  category: 'user' | 'factory';
  description?: string;
  createdDate: string;
  settings: HumanizerSettings;
  azimuthSettings?: TapeAzimuthSettings;
}

const STORAGE_KEY = 'auratune_custom_presets_v1';

export const FACTORY_PRESETS: UserPreset[] = [
  {
    id: 'factory_tape_1_4_vintage',
    name: 'Digitalização Fita 1/4" (Anos 50-70)',
    category: 'factory',
    description: 'Calibrado para fitas analógicas de rolo: atenua chiado residual e aspereza mecânica, adiciona corpo low-mid e abre os agudos com ar aveludado.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 45,
      notchFrequencyHz: 3200,
      notchBandwidthQ: 2.2,
      tapeWarmth: 55,
      tubeHarmonics: 40,
      lowMidBody: 2.2,
      transientPunch: 65,
      attackDeSmear: 55,
      timingJitterMs: 4,
      flutterWowRate: 15,
      airExciterGain: 65,
      airCutoffHz: 14000,
      stereoCorrelationFix: 80,
      monoBassCutoffHz: 120,
      acousticRoomSpread: 35,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 40,
      lowEndWeight: 70,
      transientSpeed: 'transparent',
      autoMatchLoudness: true,
    },
    azimuthSettings: {
      enabled: true,
      azimuthDelaySamples: 0,
      balanceDb: 0,
      invertPhaseL: false,
      invertPhaseR: false,
      listenInMono: false,
      autoAlignOnLoad: true,
    },
  },
  {
    id: 'factory_tape_1_4_modern',
    name: 'Master Fita Rolo 1/4" (Anos 80-2000)',
    category: 'factory',
    description: 'Equilíbrio tonal cristalino para fitas Ampex/3M/Quantegy: dinâmica preservada, graves coesos e imagem estéreo definida.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 40,
      notchFrequencyHz: 3600,
      notchBandwidthQ: 2.5,
      tapeWarmth: 40,
      tubeHarmonics: 30,
      lowMidBody: 1.4,
      transientPunch: 70,
      attackDeSmear: 60,
      timingJitterMs: 2,
      flutterWowRate: 10,
      airExciterGain: 70,
      airCutoffHz: 15500,
      stereoCorrelationFix: 75,
      monoBassCutoffHz: 130,
      acousticRoomSpread: 45,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 50,
      lowEndWeight: 75,
      transientSpeed: 'punchy',
      autoMatchLoudness: true,
    },
    azimuthSettings: {
      enabled: true,
      azimuthDelaySamples: 0,
      balanceDb: 0,
      invertPhaseL: false,
      invertPhaseR: false,
      listenInMono: false,
      autoAlignOnLoad: true,
    },
  },
  {
    id: 'factory_mastering_cristalino',
    name: 'Mastering Cristalino & Audiófilo',
    category: 'factory',
    description: 'Som transparente, arejado e sem coloração excessiva, perfeito para MPB, jazz, violão clássico e orquestras.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 55,
      notchFrequencyHz: 3400,
      notchBandwidthQ: 2.5,
      tapeWarmth: 35,
      tubeHarmonics: 30,
      lowMidBody: 1.2,
      transientPunch: 60,
      attackDeSmear: 50,
      timingJitterMs: 0,
      flutterWowRate: 0,
      airExciterGain: 65,
      airCutoffHz: 14500,
      stereoCorrelationFix: 70,
      monoBassCutoffHz: 140,
      acousticRoomSpread: 45,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 45,
      lowEndWeight: 70,
      transientSpeed: 'transparent',
      autoMatchLoudness: true,
    },
  },
  {
    id: 'factory_punch_analog',
    name: 'Punch Analógico & Dinâmica',
    category: 'factory',
    description: 'Graves encorpados e transientes destacados para rock, indie, pop e baterias acústicas.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 45,
      notchFrequencyHz: 3200,
      notchBandwidthQ: 2.2,
      tapeWarmth: 75,
      tubeHarmonics: 60,
      lowMidBody: 2.6,
      transientPunch: 85,
      attackDeSmear: 65,
      timingJitterMs: 8,
      flutterWowRate: 25,
      airExciterGain: 55,
      airCutoffHz: 15000,
      stereoCorrelationFix: 65,
      monoBassCutoffHz: 150,
      acousticRoomSpread: 40,
      outputGainDb: 0.5,
      limitlessEnabled: true,
      targetLufs: -12.0,
      targetCeilingDb: -0.8,
      clipperDrive: 65,
      lowEndWeight: 80,
      transientSpeed: 'punchy',
      autoMatchLoudness: true,
    },
  },
  {
    id: 'factory_vocal_shine',
    name: 'Voz Brilhante & Ar',
    category: 'factory',
    description: 'Realça médios-altos e agudos sedosos em vocais e solistas sem gerar sibilância.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 80,
      notchFrequencyHz: 3400,
      notchBandwidthQ: 3.2,
      tapeWarmth: 40,
      tubeHarmonics: 35,
      lowMidBody: 1.0,
      transientPunch: 50,
      attackDeSmear: 55,
      timingJitterMs: 4,
      flutterWowRate: 15,
      airExciterGain: 80,
      airCutoffHz: 14000,
      stereoCorrelationFix: 75,
      monoBassCutoffHz: 130,
      acousticRoomSpread: 55,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 50,
      lowEndWeight: 70,
      transientSpeed: 'smooth',
      autoMatchLoudness: true,
    },
  },
  {
    id: 'factory_streaming_ready',
    name: 'Padrão Streaming (-14.0 LUFS / -1.0 dBTP)',
    category: 'factory',
    description: 'Calibrado rigorosamente para conformidade EBU R128 / AES TD1004 (Spotify, Apple Music, YouTube, Tidal).',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 50,
      notchFrequencyHz: 3400,
      notchBandwidthQ: 2.5,
      tapeWarmth: 45,
      tubeHarmonics: 35,
      lowMidBody: 1.2,
      transientPunch: 60,
      attackDeSmear: 50,
      timingJitterMs: 0,
      flutterWowRate: 0,
      airExciterGain: 60,
      airCutoffHz: 15000,
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
    },
  },
];

export function getSavedUserPresets(): UserPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Safe ignore corrupted storage
  }
  return [];
}

export function getAllPresets(): UserPreset[] {
  return [...FACTORY_PRESETS, ...getSavedUserPresets()];
}

export function saveUserPreset(
  name: string,
  settings: HumanizerSettings,
  azimuthSettings?: TapeAzimuthSettings,
  description?: string
): UserPreset {
  const currentList = getSavedUserPresets();
  const newPreset: UserPreset = {
    id: `user_preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'Meu Preset Customizado',
    category: 'user',
    description: description || 'Preset personalizado pelo usuário',
    createdDate: new Date().toISOString().split('T')[0],
    settings: { ...settings },
    azimuthSettings: azimuthSettings ? { ...azimuthSettings } : undefined,
  };

  const updated = [newPreset, ...currentList.filter(p => p.name.toLowerCase() !== newPreset.name.toLowerCase())];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newPreset;
}

export function deleteUserPreset(id: string): void {
  const currentList = getSavedUserPresets();
  const updated = currentList.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function exportPresetsAsJson(): void {
  const userPresets = getSavedUserPresets();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userPresets, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `AuraTune_User_Presets_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function importPresetsFromJson(file: File): Promise<number> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Arquivo de presets inválido');
  }

  const currentList = getSavedUserPresets();
  const existingIds = new Set(currentList.map(p => p.id));
  const newItems: UserPreset[] = [];

  for (const item of parsed) {
    if (item.name && item.settings) {
      if (!existingIds.has(item.id)) {
        newItems.push({
          ...item,
          id: item.id || `imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'user',
        });
      }
    }
  }

  const updated = [...newItems, ...currentList];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newItems.length;
}
