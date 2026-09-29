export type AudioPlatform = 'suno' | 'udio' | 'stable_audio' | 'elevenlabs' | 'human_analog';

export interface PlatformScore {
  platform: AudioPlatform;
  name: string;
  probability: number; // 0 to 100
  confidence: 'Alta' | 'Média' | 'Baixa';
  keyFingerprints: string[];
  versionGuess?: string;
}

export interface AcousticArtifact {
  id: string;
  name: string;
  namePt: string;
  score: number; // 0 - 100 (higher = more robotic/artificial)
  severity: 'Crítico' | 'Moderado' | 'Sutil' | 'Orgânico';
  description: string;
  affectedFrequencies: string;
  measuredMetric: string;
}

export interface TimelineArtifactMarker {
  timeSeconds: number;
  timeFormatted: string;
  type: 'corte_freq' | 'fase_incoerente' | 'ressonancia_metalica' | 'transiente_borrado' | 'jitter_quantizado';
  label: string;
  severity: 'alta' | 'media' | 'baixa';
  detail: string;
}

export interface ForensicAnalysisResult {
  overallAiProbability: number; // 0 - 100%
  verdict: 'Altamente Provável IA' | 'Provável IA' | 'Híbrido / Sintetizado' | 'Gravação Humana Autêntica';
  confidenceScore: number;
  dominantPlatform: PlatformScore;
  platformRankings: PlatformScore[];
  artifacts: AcousticArtifact[];
  timelineMarkers: TimelineArtifactMarker[];
  metrics: {
    nyquistCutoffHz: number;
    highFrequencyShelfDb: number;
    phaseCorrelationIndex: number; // -1 to +1
    stereoPhaseDispersion: number; // 0 to 100
    transientSmearIndex: number; // 0 to 100
    vocalResonanceHarshness: number; // 0 to 100
    microTimingRigidity: number; // 0 to 100
    diffusionNoiseFloorDb: number;
    dynamicCrestFactorDb: number;
    durationSeconds: number;
    sampleRate: number;
    channels: number;
  };
  summaryDiagnosis: string;
  timestamp: string;
  filename: string;
}

export interface HumanizerSettings {
  enabled: boolean;
  // Module Bypass switches (individual A/B testing per module)
  deHarshBypass?: boolean;
  tapeWarmthBypass?: boolean;
  transientBypass?: boolean;
  timingJitterBypass?: boolean;
  airExciterBypass?: boolean;
  stereoImageBypass?: boolean;
  limitlessBypass?: boolean;

  // 1. Anti-Metallic De-Harshing
  deHarshIntensity: number; // 0 - 100%
  notchFrequencyHz: number; // 2800 - 6500 Hz
  notchBandwidthQ: number; // 1.0 - 5.0

  // 2. Analog Tape Warmth & Saturation
  tapeWarmth: number; // 0 - 100%
  tubeHarmonics: number; // 0 - 100%
  lowMidBody: number; // -6dB to +6dB

  // 3. Transient Restoration
  transientPunch: number; // 0 - 100%
  attackDeSmear: number; // 0 - 100%

  // 4. Micro-Groove & Human Timing Jitter
  timingJitterMs: number; // 0 - 30ms subtle dynamic modulation
  flutterWowRate: number; // 0 - 100%

  // 5. Air Band Spectral Exciter
  airExciterGain: number; // 0 - 100%
  airCutoffHz: number; // 12000 - 18000 Hz
  harmonicSynthesisAmount?: number;

  // 6. Stereo Naturalizer & Phase Disperser
  stereoCorrelationFix: number; // 0 - 100%
  monoBassCutoffHz: number; // 80 - 250 Hz
  acousticRoomSpread: number; // 0 - 100%

  // Master output & Headroom
  antiDetectionMode?: boolean;
  watermarkScrambler?: boolean;
  analogAirDither?: number;
  outputGainDb: number; // -12dB to +6dB

  // 7. DMGAudio Limitless & Target LUFS Maximizer Engine
  limitlessEnabled?: boolean;
  targetLufs?: number;          // e.g. -14.0 LUFS
  targetCeilingDb?: number;     // e.g. -1.0 dBTP or -0.3 dBTP
  clipperDrive?: number;        // 0 - 100% (shaves inaudible crest peaks smoothly)
  lowEndWeight?: number;        // 0 - 100% (bass anchor decoupling)
  transientSpeed?: 'smooth' | 'transparent' | 'punchy' | 'aggressive';
  autoMatchLoudness?: boolean;  // automatic make-up gain + density optimization for target LUFS
}

export type { LoudnessMetrics, LimitlessMasterConfig } from '../audio/loudnessEngine';



export interface AudioStem {
  id: string;
  name: string;
  type: 'vocals' | 'drums' | 'bass' | 'instruments' | 'fx';
  volume: number; // 0 - 1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  humanizeStrength: number; // 0 - 100%
  audioBuffer: AudioBuffer | null;
  aiProbability: number;
  detectedArtifact: string;
}

export interface AudioDemoTrack {
  id: string;
  title: string;
  artistOrSource: string;
  category: 'suno' | 'udio' | 'stable_audio' | 'human';
  description: string;
  duration: number;
  expectedAiProb: number;
  stemsCount?: number;
}
