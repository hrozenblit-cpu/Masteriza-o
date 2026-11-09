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
    id: 'factory_trap_bass',
    name: 'Trap & Bass (-8 LUFS)',
    category: 'factory',
    description: 'Mastering de alta energia comercial: graves e subs com punch explosivo, sub-bass 808 firme e vocal principal 100% preservado e nítido sem afundamento.',
    createdDate: '2026-11-09',
    settings: {
      enabled: true,
      deHarshIntensity: 15,          // De-harsh sutil: protege médios e corpo da voz principal
      notchFrequencyHz: 4200,        // Frequência fora do corpo do vocal lead
      notchBandwidthQ: 4.0,
      tapeWarmth: 48,
      tubeHarmonics: 38,
      lowMidBody: 1.8,
      transientPunch: 95,            // Máximo ataque para bumbo (kick) e caixa (snare)
      attackDeSmear: 75,
      timingJitterMs: 0,
      flutterWowRate: 0,
      airExciterGain: 40,
      airCutoffHz: 15000,
      stereoCorrelationFix: 80,
      monoBassCutoffHz: 90,          // Subgrave e 808 centralizados em mono (90 Hz) para punch máximo
      acousticRoomSpread: 35,
      outputGainDb: 0.5,
      limitlessEnabled: true,
      targetLufs: -8.0,
      targetCeilingDb: -0.2,
      clipperDrive: 78,
      lowEndWeight: 92,
      transientSpeed: 'punchy',
      autoMatchLoudness: true,
      orbanHfEnabled: true,
      orbanHfMode: 'modern_air',
      orbanHfAmount: 40,
      orbanHfAutoBrillianceDb: 0.5,
      orbanHfHighShelfGainDb: 0.5,
      orbanHfThresholdDb: -3.5,
      orbanHfCrossoverHz: 6500,
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

export interface PresetAnalysisContext {
  isDarkTape?: boolean;
  hasDropouts?: boolean;
  hasAzimuthError?: boolean;
  isDualMono?: boolean;
  hasHumDetected?: boolean;
  hasRumbleDetected?: boolean;
  hissNoiseFloorDb?: number;
  integratedLufs?: number;
  dynamicCrestFactorDb?: number;
  durationSeconds?: number;
  transientSmearIndex?: number;
  stereoCorrelationIndex?: number;
  nyquistCutoffHz?: number;
  vocalHarshness?: number;
  titleOrFilename?: string;
}

export interface RecommendedPresetResult extends UserPreset {
  selectionReason: string;
  categoryTag: string;
}

/**
 * Intelligent Preset Selector based on Spectral Forensics, Acoustic Dynamics & Genre Context
 * Selects and tailors the ideal mastering preset for the identified source material.
 */
export function getPresetForAudioAnalysis(
  analysis: ForensicAnalysisResult | null | undefined,
  context?: PresetAnalysisContext
): RecommendedPresetResult {
  const all = getAllPresets();

  const domName = (analysis?.dominantPlatform?.name || '').toLowerCase();
  const fileName = (context?.titleOrFilename || analysis?.filename || '').toLowerCase();
  const crest = context?.dynamicCrestFactorDb ?? analysis?.metrics?.dynamicCrestFactorDb ?? 14.0;
  const duration = context?.durationSeconds ?? analysis?.metrics?.durationSeconds ?? 180;
  const hissDb = context?.hissNoiseFloorDb ?? -75.0;

  // 1. Live DVD & Concert / Palco ao Vivo
  // Checked first to prevent live recordings from ever being misclassified as AI!
  const hasLiveKeywords =
    fileName.includes('dvd') ||
    fileName.includes('vivo') ||
    fileName.includes('live') ||
    fileName.includes('show') ||
    fileName.includes('concerto') ||
    fileName.includes('turne') ||
    fileName.includes('tour') ||
    fileName.includes('ensaio') ||
    fileName.includes('plateia') ||
    fileName.includes('palco') ||
    fileName.includes('festival') ||
    fileName.includes('carnaval') ||
    fileName.includes('frevo') ||
    fileName.includes('recife') ||
    fileName.includes('olinda') ||
    fileName.includes('teatro') ||
    fileName.includes('maracatu') ||
    domName.includes('dvd') ||
    domName.includes('vivo') ||
    domName.includes('live') ||
    domName.includes('show');

  const hasLiveAcousticSignature =
    (duration > 240 && crest >= 13.5 && (context?.hasRumbleDetected || Boolean(context?.hasHumDetected))) ||
    (crest >= 15.0 && (analysis?.metrics?.stereoPhaseDispersion ?? 0) > 35 && (analysis?.metrics?.microTimingRigidity ?? 0) < 30);

  if (hasLiveKeywords || hasLiveAcousticSignature) {
    const livePreset = all.find((p) => p.id === 'factory_live_dvd_analog') || FACTORY_PRESETS[7] || FACTORY_PRESETS[1];
    return {
      ...livePreset,
      categoryTag: 'DVD & Show Ao Vivo',
      selectionReason: `Show/DVD ao vivo detectado: dinâmica de palco preservada (Crest Factor ${crest.toFixed(1)} dB), mantendo impacto de bateria e ambiência de platéia sem filtros notch invasivos.`,
    };
  }

  // 2. Analog Tape Transfers & Vintage Recordings (Fitas de Rolo 1/4", Cassetes, Vinil)
  const isAnalogTape =
    analysis?.dominantPlatform?.platform === 'human_analog' ||
    Boolean(context?.hasDropouts || context?.hasAzimuthError || context?.isDarkTape || context?.isDualMono || context?.hasHumDetected || hissDb > -68.0);

  if (isAnalogTape) {
    if (context?.isDarkTape || context?.hasDropouts || hissDb > -58.0) {
      const vintagePreset = all.find((p) => p.id === 'factory_tape_1_4_vintage') || FACTORY_PRESETS[0];
      return {
        ...vintagePreset,
        categoryTag: 'Fita Vintage 50-70s',
        selectionReason: `Fita analógica histórica detectada: atenuação de agudos e piso de óxido (${hissDb.toFixed(1)} dBFS), aplicando equalização sedosa Orban e calor analógico.`,
      };
    } else {
      const modernPreset = all.find((p) => p.id === 'factory_tape_1_4_modern') || FACTORY_PRESETS[1];
      return {
        ...modernPreset,
        categoryTag: 'Fita Estúdio 15/30 ips',
        selectionReason: `Masterização em Fita de Estúdio 15/30 ips (Studer/Ampex): resposta estéreo aberta, corpo harmônico suave (+1.4 dB) e transientes analógicos cristalinos.`,
      };
    }
  }

  // 3. High-Energy Rhythmic & Percussive Punch (Rock, Pop, Funk, Frevo, Bateria)
  const hasPunchKeywords =
    fileName.includes('samba') ||
    fileName.includes('rock') ||
    fileName.includes('funk') ||
    fileName.includes('bateria') ||
    fileName.includes('ritmo') ||
    fileName.includes('punch') ||
    fileName.includes('groove') ||
    fileName.includes('percussao') ||
    fileName.includes('forro') ||
    fileName.includes('axe') ||
    fileName.includes('drum');

  if (hasPunchKeywords || crest >= 15.5) {
    const punchPreset = all.find((p) => p.id === 'factory_punch_analog') || FACTORY_PRESETS[3];
    return {
      ...punchPreset,
      categoryTag: 'Punch & Ritmo Dinâmico',
      selectionReason: `Ritmo com alta energia percussiva (Crest Factor ${crest.toFixed(1)} dB): adiciona corpo nos graves (+2.6 dB) e transientes velozes para impacto sonoro firme.`,
    };
  }

  // 4. Acoustic Vocal / MPB / Voice & Instrument (Voz e Violão, MPB, Acústico)
  const hasVocalKeywords =
    fileName.includes('voz') ||
    fileName.includes('violao') ||
    fileName.includes('acustico') ||
    fileName.includes('acoustic') ||
    fileName.includes('vocal') ||
    fileName.includes('mpb') ||
    fileName.includes('bossa') ||
    fileName.includes('serenata') ||
    fileName.includes('canto') ||
    fileName.includes('cantor') ||
    fileName.includes('cantora') ||
    fileName.includes('solo') ||
    fileName.includes('cancao');

  if (hasVocalKeywords || (crest >= 12.0 && (analysis?.metrics?.vocalResonanceHarshness ?? 0) < 40 && !context?.isDarkTape)) {
    const vocalPreset = all.find((p) => p.id === 'factory_vocal_shine') || FACTORY_PRESETS[4];
    return {
      ...vocalPreset,
      categoryTag: 'Voz & Acústico MPB',
      selectionReason: `Gravação acústica e foco vocal detectados: abre ar sedoso em 14 kHz sem sibilância, destacando a respiração vocal e o calor dos instrumentos acústicos.`,
    };
  }

  // 5. AI Generative Music (Suno, Udio) — Verified Generative Synthesis
  const isSuno = analysis?.dominantPlatform?.platform === 'suno';
  const isUdio = analysis?.dominantPlatform?.platform === 'udio';
  const isAi = (analysis?.overallAiProbability ?? 0) >= 65 && (isSuno || isUdio) && (analysis?.metrics?.microTimingRigidity ?? 0) > 35;

  if (isAi) {
    const aiRescuePreset = all.find((p) => p.id === 'factory_ai_rescue') || FACTORY_PRESETS[6];
    const tailoredNotch = isUdio ? 4200 : 3400;
    const tailoredDeHarsh = isUdio ? 80 : (analysis?.metrics?.nyquistCutoffHz && analysis.metrics.nyquistCutoffHz <= 16500 ? 75 : 65);
    const tailoredAirCutoff = isUdio ? 17000 : 15500;

    return {
      ...aiRescuePreset,
      categoryTag: 'Resgate de IA',
      selectionReason: `Música sintetizada por IA detectada (${isUdio ? 'Udio AI' : 'Suno AI'}): aplicando notch cirúrgico em ${tailoredNotch} Hz para eliminar formantes metálicos.`,
      settings: {
        ...aiRescuePreset.settings,
        notchFrequencyHz: tailoredNotch,
        deHarshIntensity: tailoredDeHarsh,
        airCutoffHz: tailoredAirCutoff,
      },
    };
  }

  // 6. Streaming Ready Compliance (EBU R128 / Spotify / YouTube)
  const lufs = context?.integratedLufs ?? -18.0;
  if (lufs >= -15.5 && lufs <= -11.0 && crest <= 12.5) {
    const streamPreset = all.find((p) => p.id === 'factory_streaming_ready') || FACTORY_PRESETS[5];
    return {
      ...streamPreset,
      categoryTag: 'Padrão Streaming',
      selectionReason: `Áudio digital moderno comercial: calibrado rigorosamente para conformidade EBU R128 / Streaming (-14.0 LUFS e -1.0 dB True-Peak).`,
    };
  }

  // 7. Pure Audiophile / Acoustic Studio Master (Default High-Fidelity Master)
  const audiophilePreset = all.find((p) => p.id === 'factory_mastering_cristalino') || FACTORY_PRESETS[2];
  return {
    ...audiophilePreset,
    categoryTag: 'Mastering Cristalino',
    selectionReason: `Mastering audiófilo transparente: equilíbrio tonal aberto sem coloração excessiva, preservando a fidelidade original da mixagem.`,
  };
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
