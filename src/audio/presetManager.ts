import { HumanizerSettings, ForensicAnalysisResult } from '../types/audio';
import { TapeAzimuthSettings } from './tapeAzimuthEngine';
import { TapeDropoutSettings } from './tapeDropoutEngine';
import { SpectralDenoiseSettings } from './spectralDenoiseEngine';

export interface UserPreset {
  id: string;
  name: string;
  category: 'user' | 'factory';
  description?: string;
  createdDate: string;
  settings: HumanizerSettings;
  azimuthSettings?: TapeAzimuthSettings;
  dropoutSettings?: TapeDropoutSettings;
  denoiseSettings?: SpectralDenoiseSettings;
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
      orbanHfEnabled: true,
      orbanHfMode: 'tape_restore',
      orbanHfAmount: 70,
      orbanHfAutoBrillianceDb: 2.5, // Restauração suave para fitas abafadas
      orbanHfHighShelfGainDb: 2.5,
      orbanHfThresholdDb: -4.5,
      orbanHfCrossoverHz: 4800,
      orbanHfSpeed: 'smooth',
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
      airExciterGain: 40,
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
      orbanHfEnabled: true,
      orbanHfMode: 'broadcast_optimod',
      orbanHfAmount: 50,
      orbanHfAutoBrillianceDb: 0.0, // 0 dB Flat
      orbanHfHighShelfGainDb: 0.0,
      orbanHfThresholdDb: -6.0,
      orbanHfCrossoverHz: 6000,
      orbanHfSpeed: 'fast',
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
      airExciterGain: 40,
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
      orbanHfEnabled: true,
      orbanHfMode: 'broadcast_optimod',
      orbanHfAmount: 50,
      orbanHfAutoBrillianceDb: 0.0, // 0 dB Flat
      orbanHfHighShelfGainDb: 0.0,
      orbanHfThresholdDb: -6.0,
      orbanHfCrossoverHz: 6000,
      orbanHfSpeed: 'fast',
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
      airExciterGain: 40,
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
      orbanHfEnabled: true,
      orbanHfMode: 'smooth_silk',
      orbanHfAmount: 55,
      orbanHfAutoBrillianceDb: 0.0, // 0 dB Flat
      orbanHfHighShelfGainDb: 0.0,
      orbanHfThresholdDb: -6.5,
      orbanHfCrossoverHz: 5500,
      orbanHfSpeed: 'medium',
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
      airExciterGain: 40,
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
      orbanHfEnabled: true,
      orbanHfMode: 'smooth_silk',
      orbanHfAmount: 65,
      orbanHfAutoBrillianceDb: -1.0, // Atenua estridência
      orbanHfHighShelfGainDb: -1.0,
      orbanHfThresholdDb: -7.0,
      orbanHfCrossoverHz: 5800,
      orbanHfSpeed: 'fast',
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
      airExciterGain: 35,
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
      orbanHfEnabled: true,
      orbanHfMode: 'broadcast_optimod',
      orbanHfAmount: 50,
      orbanHfAutoBrillianceDb: 0.0, // 0 dB Flat
      orbanHfHighShelfGainDb: 0.0,
      orbanHfThresholdDb: -6.0,
      orbanHfCrossoverHz: 6000,
      orbanHfSpeed: 'fast',
    },
  },
  {
    id: 'factory_ai_rescue',
    name: 'Resgate de IA (De-Harsh & Ar)',
    category: 'factory',
    description: 'Calibrado especificamente para faixas geradas por IA (Suno, Udio): remove aspereza metálica e sibilância (notch dinâmico), amplia ar estéreo e injeta dinâmica e calor de fita.',
    createdDate: '2026-09-27',
    settings: {
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
      airExciterGain: 45,
      airCutoffHz: 15000,
      stereoCorrelationFix: 80,
      monoBassCutoffHz: 150,
      acousticRoomSpread: 50,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 55,
      lowEndWeight: 75,
      transientSpeed: 'punchy',
      autoMatchLoudness: true,
      orbanHfEnabled: true,
      orbanHfMode: 'smooth_silk',
      orbanHfAmount: 60,
      orbanHfAutoBrillianceDb: -0.5,
      orbanHfHighShelfGainDb: -0.5,
      orbanHfThresholdDb: -6.5,
      orbanHfCrossoverHz: 5500,
      orbanHfSpeed: 'fast',
    },
  },
  {
    id: 'factory_live_dvd_analog',
    name: 'DVD Ao Vivo & Master Analógico',
    category: 'factory',
    description: 'Calibrado para DVDs de shows ao vivo e gravações analógicas: preserva a energia da plateia, dinâmicas de palco, impacto de bateria e equilíbrio tonal cristalino sem notch filters ou de-harsh agressivo.',
    createdDate: '2026-09-27',
    settings: {
      enabled: true,
      deHarshIntensity: 25,
      notchFrequencyHz: 3400,
      notchBandwidthQ: 2.0,
      tapeWarmth: 35,
      tubeHarmonics: 25,
      lowMidBody: 1.2,
      transientPunch: 75,
      attackDeSmear: 50,
      timingJitterMs: 0,
      flutterWowRate: 0,
      airExciterGain: 35,
      airCutoffHz: 15500,
      stereoCorrelationFix: 60,
      monoBassCutoffHz: 120,
      acousticRoomSpread: 50,
      outputGainDb: 0,
      limitlessEnabled: true,
      targetLufs: -14.0,
      targetCeilingDb: -1.0,
      clipperDrive: 50,
      lowEndWeight: 75,
      transientSpeed: 'punchy',
      autoMatchLoudness: true,
      orbanHfEnabled: true,
      orbanHfMode: 'broadcast_optimod',
      orbanHfAmount: 45,
      orbanHfAutoBrillianceDb: 0.0,
      orbanHfHighShelfGainDb: 0.0,
      orbanHfThresholdDb: -6.0,
      orbanHfCrossoverHz: 6000,
      orbanHfSpeed: 'fast',
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
];

/**
 * Intelligent Preset Selector based on Spectral Forensics & Audio Characteristics
 * Selects and tailors the ideal mastering preset for the identified source material.
 */
export function getPresetForAudioAnalysis(
  analysis: ForensicAnalysisResult | null | undefined,
  context?: {
    isDarkTape?: boolean;
    hasDropouts?: boolean;
    hasAzimuthError?: boolean;
    isDualMono?: boolean;
  }
): UserPreset {
  const all = getAllPresets();

  // 1. AI Generative Music (Suno, Udio, Diffusion artifacts) - Requires verified AI score >= 55%
  const isSuno = analysis?.dominantPlatform?.platform === 'suno';
  const isUdio = analysis?.dominantPlatform?.platform === 'udio';
  const isAi = (analysis?.overallAiProbability ?? 0) >= 55 && (isSuno || isUdio);

  if (isAi) {
    const aiRescuePreset = all.find((p) => p.id === 'factory_ai_rescue') || FACTORY_PRESETS[6];
    // Fine-tune notch frequency according to the specific platform identified
    const tailoredNotch = isUdio ? 4200 : 3400;
    const tailoredDeHarsh = isUdio ? 80 : (analysis?.metrics?.nyquistCutoffHz && analysis.metrics.nyquistCutoffHz <= 16500 ? 75 : 65);
    const tailoredAirCutoff = isUdio ? 17000 : 15500;

    return {
      ...aiRescuePreset,
      settings: {
        ...aiRescuePreset.settings,
        notchFrequencyHz: tailoredNotch,
        deHarshIntensity: tailoredDeHarsh,
        airCutoffHz: tailoredAirCutoff,
      },
    };
  }

  // 2. Live DVD & Concert Recordings
  const domName = analysis?.dominantPlatform?.name?.toLowerCase() || '';
  const fileName = analysis?.filename?.toLowerCase() || '';
  const isLiveOrDvd =
    domName.includes('dvd') ||
    domName.includes('vivo') ||
    domName.includes('live') ||
    domName.includes('show') ||
    domName.includes('concerto') ||
    fileName.includes('dvd') ||
    fileName.includes('live') ||
    fileName.includes('vivo') ||
    fileName.includes('show');

  if (isLiveOrDvd) {
    const livePreset = all.find((p) => p.id === 'factory_live_dvd_analog') || FACTORY_PRESETS[7] || FACTORY_PRESETS[1];
    return livePreset;
  }

  // 3. Analog Tape Transfers & Vintage Recordings
  const isAnalog =
    analysis?.dominantPlatform?.platform === 'human_analog' ||
    Boolean(context?.hasDropouts || context?.hasAzimuthError || context?.isDarkTape || context?.isDualMono);

  if (isAnalog) {
    if (context?.isDarkTape || context?.hasDropouts) {
      // Vintage tape (50s-70s) needing low-mid body and high-frequency opening
      const vintagePreset = all.find((p) => p.id === 'factory_tape_1_4_vintage') || FACTORY_PRESETS[0];
      return vintagePreset;
    } else {
      // Modern 1/4" tape (80s-2000s)
      const modernPreset = all.find((p) => p.id === 'factory_tape_1_4_modern') || FACTORY_PRESETS[1];
      return modernPreset;
    }
  }

  // 4. Clean Acoustic / Modern Digital Master
  const audiophilePreset = all.find((p) => p.id === 'factory_mastering_cristalino') || FACTORY_PRESETS[2];
  return audiophilePreset;
}

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
  description?: string,
  dropoutSettings?: TapeDropoutSettings,
  denoiseSettings?: SpectralDenoiseSettings
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
    dropoutSettings: dropoutSettings ? { ...dropoutSettings } : undefined,
    denoiseSettings: denoiseSettings ? { ...denoiseSettings } : undefined,
  };

  const updated = [newPreset, ...currentList.filter(p => p.name.toLowerCase() !== newPreset.name.toLowerCase())];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newPreset;
}

export function deleteUserPreset(id: string, name?: string): void {
  const currentList = getSavedUserPresets();
  const updated = currentList.filter(p => {
    if (p.id === id) return false;
    if (name && p.name.trim().toLowerCase() === name.trim().toLowerCase()) return false;
    return true;
  });
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
