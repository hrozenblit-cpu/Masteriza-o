/**
 * Orban Optimod Treble Processor — Intelligent Dynamic Treble Equalizer & HF Limiter
 *
 * Modeled after the legendary broadcast & mastering architecture designed by Bob Orban
 * (Optimod 8100/8200/8500/8600/8700 & Audicy HF Limiter):
 *
 * 1. Automatic Dynamic Brilliance (Auto-Brilliance EQ):
 *    Continuously detects spectral balance between mid-frequencies and high-frequencies.
 *    If a recording is dull, dark, or muffled (worn analog tape, cassette degradation, or dull mix),
 *    it automatically applies adaptive high-frequency gain to restore silk, presence, and air.
 *    Crucially, as soon as bright instruments (open hi-hat, crash, brass) hit, it automatically backs off.
 *
 * 2. High-Frequency Limiter & De-Esser / Anti-Harshness:
 *    Protects against piercing sibilance ("S", "T", "Ch"), metallic harshness, and tape screech.
 *    Applies ultrafast, program-dependent dynamic attenuation to the high band without dulling
 *    the rest of the musical spectrum.
 *
 * 3. 4th-Order Linkwitz-Riley Crossover (LR-4):
 *    24 dB/oct phase-aligned crossover ensures zero phase comb filtering and perfectly flat
 *    summation across the 20 Hz - 22 kHz audible spectrum when bypass is active.
 */

export interface OrbanTrebleSettings {
  enabled: boolean;
  bypass?: boolean;
  userOverrideLock?: boolean; // Trava de bypass manual definida pelo usuário (prioridade sobre presets/perfis)
  mode: 'broadcast_optimod' | 'tape_restore' | 'smooth_silk' | 'modern_air';
  amount: number;            // 0 - 100% (Intensidade geral de atuação)
  autoBrillianceDb: number;  // -12 a +12 dB (Filtro High Shelf: 0 dB = Flat, <0 dB = atenuação/taming, >0 dB = restauração)
  highShelfGainDb?: number;   // -12 a +12 dB (Alias explícito para ganho High Shelf)
  harmonicAirExciter?: number; // 0 - 100% (Exciter harmônico controlado de ar acústico)
  thresholdDb: number;       // -18 to 0 dB (Teto do HF Limiter contra estridência/sibilância)
  crossoverHz: number;       // 3500 - 10000 Hz (Frequência de crossover da banda de agudos)
  speed: 'smooth' | 'medium' | 'fast'; // Balística de ataque e recuperação
}

export interface OrbanTrebleTelemetry {
  averageGainDb: number;        // Ganho dinâmico médio (+dB boost / -dB limiting)
  maxBoostDb: number;           // Ganho máximo de restauração aplicado
  maxLimitingDb: number;        // Atenuação máxima de estridência aplicada
  spectralBalanceRatioDb: number; // Relação de balanço agudos / médios em dB
  isDarkTape: boolean;          // Verdadeiro apenas se a fita for genuinamente abafada
  isHarshRecording: boolean;    // Verdadeiro se apresentar sibilância ou excesso de agudos
  needsProcessing: boolean;     // Verdadeiro se o áudio detectado necessita deste processador
  statusSummary: string;        // Resumo do diagnóstico em português
  recommendedMode: OrbanTrebleSettings['mode'];
  recommendedThresholdDb: number;
  recommendedBrillianceDb: number;
  recommendedCrossoverHz: number;
  recommendedSpeed: 'smooth' | 'medium' | 'fast';
}

export const DEFAULT_ORBAN_SETTINGS: OrbanTrebleSettings = {
  enabled: true,
  bypass: false,
  userOverrideLock: false,
  mode: 'smooth_silk',
  amount: 50,
  autoBrillianceDb: 0.0, // 0 dB FLAT: Resposta de entrada perfeitamente plana (sem pré-ênfase fixa de FM)
  highShelfGainDb: 0.0,
  harmonicAirExciter: 0,
  thresholdDb: -6.5,
  crossoverHz: 5800,
  speed: 'fast',
};

export interface OrbanPresetDefinition {
  id: OrbanTrebleSettings['mode'];
  name: string;
  subtitle: string;
  description: string;
  settings: Partial<OrbanTrebleSettings>;
}

export const ORBAN_PRESETS: OrbanPresetDefinition[] = [
  {
    id: 'broadcast_optimod',
    name: 'Mastering Linear (Flat)',
    subtitle: 'Resposta de Entrada 100% Plana (0.0 dB)',
    description: 'Circuito com resposta de entrada plana e neutra. Preserva o balanço original de produções modernas com teto dinâmico de proteção contra estridência.',
    settings: {
      mode: 'broadcast_optimod',
      amount: 50,
      autoBrillianceDb: 0.0, // Flat 0 dB
      highShelfGainDb: 0.0,
      thresholdDb: -6.0,
      crossoverHz: 6000,
      speed: 'fast',
    },
  },
  {
    id: 'tape_restore',
    name: 'Restauração Dinâmica de Fita',
    subtitle: 'High Shelf Suave para Fitas Abafadas (+4.0 dB)',
    description: 'Compensa atenuação mecânica em fitas cassete e de rolo desgastadas através de High Shelf dinâmico suave, abrindo presença e clareza acústica.',
    settings: {
      mode: 'tape_restore',
      amount: 75,
      autoBrillianceDb: 4.0,
      highShelfGainDb: 4.0,
      thresholdDb: -4.5,
      crossoverHz: 4800,
      speed: 'smooth',
    },
  },
  {
    id: 'smooth_silk',
    name: 'Audiófilo Sedoso 8700',
    subtitle: 'Controle Anti-Sibilância & Taming de Agudos (-3.0 dB)',
    description: 'Atenua frequências ásperas, agudos estridentes e sibilâncias vocais cortantes em produções modernas sem coloração fixa nem perda de dinâmica.',
    settings: {
      mode: 'smooth_silk',
      amount: 70,
      autoBrillianceDb: -3.0, // Atenua estridência com clareza audível
      highShelfGainDb: -3.0,
      thresholdDb: -7.5,
      crossoverHz: 5500,
      speed: 'fast',
    },
  },
  {
    id: 'modern_air',
    name: 'Modern Air & Exciter Harmônico',
    subtitle: 'Presença Cristalina Controlada (+2.5 dB)',
    description: 'Abertura de ar ultra-alta (> 7.5 kHz) com exciter harmônico controlado de 2ª ordem, mantendo a resposta plana nas frequências médias-altas.',
    settings: {
      mode: 'modern_air',
      amount: 65,
      autoBrillianceDb: 2.5,
      highShelfGainDb: 2.5,
      harmonicAirExciter: 60,
      thresholdDb: -4.5,
      crossoverHz: 7500,
      speed: 'medium',
    },
  },
];

/**
 * Calculates biquad filter coefficients for 2nd order Butterworth (LP and HP)
 */
function getButterworth2Coeffs(
  fc: number,
  sampleRate: number,
  type: 'lp' | 'hp'
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = (2 * Math.PI * Math.min(fc, sampleRate * 0.45)) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  // Q = 1 / sqrt(2) for 2nd order Butterworth: alpha = sin(w0) / (2 * (1/sqrt(2))) = sin(w0) / sqrt(2)
  const alpha = sinw0 / Math.SQRT2;

  const a0 = 1 + alpha;
  const a1 = (-2 * cosw0) / a0;
  const a2 = (1 - alpha) / a0;

  if (type === 'lp') {
    const b0 = (1 - cosw0) / (2 * a0);
    const b1 = (1 - cosw0) / a0;
    const b2 = (1 - cosw0) / (2 * a0);
    return { b0, b1, b2, a1, a2 };
  } else {
    const b0 = (1 + cosw0) / (2 * a0);
    const b1 = (-(1 + cosw0)) / a0;
    const b2 = (1 + cosw0) / (2 * a0);
    return { b0, b1, b2, a1, a2 };
  }
}

/**
 * Applies a 4th-order Linkwitz-Riley crossover (cascaded two 2nd-order Butterworth filters)
 */
function applyLR4Crossover(
  input: Float32Array,
  lowOut: Float32Array,
  highOut: Float32Array,
  crossoverHz: number,
  sampleRate: number
): void {
  const len = input.length;
  const lp = getButterworth2Coeffs(crossoverHz, sampleRate, 'lp');
  const hp = getButterworth2Coeffs(crossoverHz, sampleRate, 'hp');

  // Stage 1 low-pass & high-pass
  const lp1 = new Float32Array(len);
  const hp1 = new Float32Array(len);

  let lx1 = 0, lx2 = 0, ly1 = 0, ly2 = 0;
  let hx1 = 0, hx2 = 0, hy1 = 0, hy2 = 0;

  for (let i = 0; i < len; i++) {
    const x = input[i];

    // LP Stage 1
    const lpy = lp.b0 * x + lp.b1 * lx1 + lp.b2 * lx2 - lp.a1 * ly1 - lp.a2 * ly2;
    lx2 = lx1; lx1 = x;
    ly2 = ly1; ly1 = lpy;
    lp1[i] = lpy;

    // HP Stage 1
    const hpy = hp.b0 * x + hp.b1 * hx1 + hp.b2 * hx2 - hp.a1 * hy1 - hp.a2 * hy2;
    hx2 = hx1; hx1 = x;
    hy2 = hy1; hy1 = hpy;
    hp1[i] = hpy;
  }

  // Stage 2 low-pass & high-pass (cascaded for 24 dB/oct slope and exact zero-phase LR-4)
  lx1 = 0; lx2 = 0; ly1 = 0; ly2 = 0;
  hx1 = 0; hx2 = 0; hy1 = 0; hy2 = 0;

  for (let i = 0; i < len; i++) {
    const lx = lp1[i];
    const lpy = lp.b0 * lx + lp.b1 * lx1 + lp.b2 * lx2 - lp.a1 * ly1 - lp.a2 * ly2;
    lx2 = lx1; lx1 = lx;
    ly2 = ly1; ly1 = lpy;
    lowOut[i] = lpy;

    const hx = hp1[i];
    const hpy = hp.b0 * hx + hp.b1 * hx1 + hp.b2 * hx2 - hp.a1 * hy1 - hp.a2 * hy2;
    hx2 = hx1; hx1 = hx;
    hy2 = hy1; hy1 = hpy;
    highOut[i] = hpy;
  }
}

/**
 * Analyzes audio buffer to assess treble balance, tape dullness, and sibilance/harshness
 */
export function analyzeBufferTreble(audioBuffer: AudioBuffer): OrbanTrebleTelemetry {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const len = channelData.length;

  const testCrossover = 5000;
  const lowBand = new Float32Array(len);
  const highBand = new Float32Array(len);

  // Subsample analysis if track is longer than 60s for instant computation
  const stride = len > sampleRate * 60 ? Math.floor(len / (sampleRate * 45)) : 1;
  let sumMidSq = 0;
  let sumTrebleSq = 0;
  let peakTreble = 0;
  let harshEventsCount = 0;
  let count = 0;

  applyLR4Crossover(channelData, lowBand, highBand, testCrossover, sampleRate);

  for (let i = 0; i < len; i += stride) {
    const l = lowBand[i];
    const h = highBand[i];
    const absH = Math.abs(h);

    sumMidSq += l * l;
    sumTrebleSq += h * h;
    if (absH > peakTreble) peakTreble = absH;
    // Count truly extreme piercing spikes above 0.70 (-3 dBFS in the isolated high band)
    if (absH > 0.70) harshEventsCount++;
    count++;
  }

  const rmsMid = Math.sqrt(sumMidSq / Math.max(1, count));
  const rmsTreble = Math.sqrt(sumTrebleSq / Math.max(1, count));
  const balanceRatioDb = Math.round((20 * Math.log10((rmsTreble + 1e-6) / (rmsMid + 1e-6))) * 10) / 10;

  // Physical Spectral Balance Thresholds (> 5 kHz compared to mid/low band < 5 kHz):
  // - Balanced reference (Pink Noise slope / natural commercial master): ~ -6.0 dB to -12.0 dB
  // - Muffled/Dark tape (high-frequency mechanical loss on worn cassette/tape): balanceRatioDb < -14.0 dB
  // - Truly Harsh/Sibilant recording: excess high-end energy > -4.8 dB
  //   or sustained piercing sibilant peaks (> 18% of samples with harsh spikes > 0.70 and balance > -6.0 dB)
  const isDarkTape = balanceRatioDb < -13.5;
  const isHarshRecording = balanceRatioDb > -4.8 || (balanceRatioDb > -6.0 && harshEventsCount > count * 0.16);

  let recommendedMode: OrbanTrebleSettings['mode'] = 'broadcast_optimod';
  let recommendedThresholdDb = -6.0;
  let recommendedBrillianceDb = 0.0; // 100% Flat 0 dB default
  let recommendedCrossoverHz = 6000;
  let recommendedSpeed: 'smooth' | 'medium' | 'fast' = 'fast';
  let statusSummary = `Balanço tonal natural equilibrado (${balanceRatioDb} dB). Resposta Linear Plana (Flat, 0.0 dB) mantida para máxima fidelidade.`;

  if (isDarkTape) {
    recommendedMode = 'tape_restore';
    recommendedThresholdDb = -4.5;
    recommendedBrillianceDb = Math.min(6.0, Math.max(2.5, Math.abs(balanceRatioDb + 13.5) * 0.7));
    recommendedCrossoverHz = 4800;
    recommendedSpeed = 'smooth';
    statusSummary = `Fita abafada com perda de agudos (${balanceRatioDb} dB). Restauração dinâmica de agudos ativa (+${recommendedBrillianceDb.toFixed(1)} dB).`;
  } else if (isHarshRecording) {
    recommendedMode = 'smooth_silk';
    recommendedThresholdDb = peakTreble > 0.75 ? -7.5 : -6.5;
    recommendedBrillianceDb = Math.max(-5.0, Math.min(-2.5, (balanceRatioDb + 4.8) * -1.5 - 2.5)); // High Shelf atenuador para gravações estridentes
    recommendedCrossoverHz = 5500;
    recommendedSpeed = 'fast';
    statusSummary = `Gravação com agudos estridentes/sibilância (${balanceRatioDb} dB). High Shelf atenuador (${recommendedBrillianceDb.toFixed(1)} dB) e limitador de agudos ativos.`;
  }

  const needsProcessing = isDarkTape || isHarshRecording || Math.abs(recommendedBrillianceDb) >= 0.5;

  return {
    averageGainDb: isDarkTape ? recommendedBrillianceDb : isHarshRecording ? recommendedBrillianceDb : 0.0,
    maxBoostDb: isDarkTape ? 5.0 : 0.0,
    maxLimitingDb: isHarshRecording ? -4.5 : -2.0,
    spectralBalanceRatioDb: balanceRatioDb,
    isDarkTape,
    isHarshRecording,
    needsProcessing,
    statusSummary,
    recommendedMode,
    recommendedThresholdDb,
    recommendedBrillianceDb: Math.round(recommendedBrillianceDb * 10) / 10,
    recommendedCrossoverHz,
    recommendedSpeed,
  };
}

function createAudioBufferSafe(numChannels: number, length: number, sampleRate: number): AudioBuffer {
  if (typeof AudioBuffer !== 'undefined') {
    try {
      return new AudioBuffer({ numberOfChannels: numChannels, length, sampleRate });
    } catch {
      // fallback
    }
  }
  const offline = new OfflineAudioContext(numChannels, 1, sampleRate);
  return offline.createBuffer(numChannels, length, sampleRate);
}

/**
 * Master Processing: Applies the Precision Treble Processor & HF Limiter
 *
 * Operates with 100% Flat input response without any FM broadcast pre-emphasis curve.
 * Uses dynamic High Shelf filter (-12 dB to +12 dB), controlled harmonic air exciter,
 * and ultrafast anti-sibilance HF Limiter.
 */
export function processBufferWithOrbanTreble(
  sourceBuffer: AudioBuffer,
  settings: OrbanTrebleSettings
): AudioBuffer {
  const numChannels = sourceBuffer.numberOfChannels;
  const sampleRate = sourceBuffer.sampleRate;
  const totalLength = sourceBuffer.length;

  const outputBuffer = createAudioBufferSafe(numChannels, totalLength, sampleRate);

  if (!settings.enabled || settings.bypass) {
    for (let c = 0; c < numChannels; c++) {
      outputBuffer.getChannelData(c).set(sourceBuffer.getChannelData(c));
    }
    return outputBuffer;
  }

  const crossoverHz = Math.max(3500, Math.min(10000, settings.crossoverHz || 5800));
  const amountFactor = Math.max(0, Math.min(100, settings.amount)) / 100;

  // 1. High Shelf gain: strictly Flat (0.0 dB) baseline without fixed FM pre-emphasis
  // User-adjustable from -12.0 dB (taming harshness) to +12.0 dB (restoring dull tapes)
  const rawShelfGainDb = settings.highShelfGainDb !== undefined
    ? settings.highShelfGainDb
    : (settings.autoBrillianceDb ?? 0.0);
  const userShelfGainDb = Math.max(-12, Math.min(12, rawShelfGainDb));

  const thresholdDb = settings.thresholdDb ?? -6.5;
  const thresholdLinear = Math.pow(10, thresholdDb / 20);

  // Ballistics (Attack / Release times)
  let attMs = 2.0;
  let relMs = 50.0;
  if (settings.speed === 'fast') {
    attMs = 1.0;
    relMs = 30.0;
  } else if (settings.speed === 'smooth') {
    attMs = 5.0;
    relMs = 100.0;
  }

  // Frame size for block envelope evaluation (~2.5ms = 110 samples at 44.1k)
  const blockSize = Math.max(64, Math.floor(sampleRate * 0.0025));
  const attCoeff = Math.exp(-blockSize / (sampleRate * (attMs / 1000)));
  const relCoeff = Math.exp(-blockSize / (sampleRate * (relMs / 1000)));

  // Controlled harmonic air exciter (subtle acoustic air)
  const exciterAmount = (settings.mode === 'modern_air' ? 0.20 : ((settings.harmonicAirExciter || 0) / 100) * 0.25) * amountFactor;

  for (let c = 0; c < numChannels; c++) {
    const src = sourceBuffer.getChannelData(c);
    const dst = outputBuffer.getChannelData(c);

    const lowBand = new Float32Array(totalLength);
    const highBand = new Float32Array(totalLength);

    // Phase-aligned 4th-order Linkwitz-Riley crossover (zero phase error, 100% flat summation)
    applyLR4Crossover(src, lowBand, highBand, crossoverHz, sampleRate);

    let currentGainLinear = 1.0;
    const numBlocks = Math.ceil(totalLength / blockSize);

    for (let b = 0; b < numBlocks; b++) {
      const start = b * blockSize;
      const end = Math.min(totalLength, start + blockSize);
      const count = end - start;

      let sumMidSq = 0;
      let sumHighSq = 0;
      let peakHigh = 0;

      for (let i = start; i < end; i++) {
        const lv = lowBand[i];
        const hv = highBand[i];
        const absH = Math.abs(hv);

        sumMidSq += lv * lv;
        sumHighSq += hv * hv;
        if (absH > peakHigh) peakHigh = absH;
      }

      const rmsMid = Math.sqrt(sumMidSq / Math.max(1, count));
      const rmsHigh = Math.sqrt(sumHighSq / Math.max(1, count));

      // 1. High Shelf Equalizer: directly applies the user/preset shelf gain (0 dB = flat, <0 dB = cut, >0 dB = boost)
      let dynamicShelfDb = userShelfGainDb;

      // In tape restoration mode with positive boost, gently back off only during genuinely loud bright cymbal/brass peaks (> -4.5 dB)
      if (settings.mode === 'tape_restore' && userShelfGainDb > 0) {
        const currentRatioDb = 20 * Math.log10((rmsHigh + 1e-6) / (rmsMid + 1e-6));
        if (currentRatioDb > -4.5) {
          const backoff = Math.min(1.0, (currentRatioDb + 4.5) / 4.0);
          dynamicShelfDb = dynamicShelfDb * (1.0 - backoff * 0.5);
        }
      }

      // 2. High-Frequency Limiter & De-Esser:
      // Operates strictly on peaks exceeding threshold, protecting against piercing sibilance
      let targetLimitDb = 0;
      if (peakHigh > thresholdLinear) {
        const peakDb = 20 * Math.log10(peakHigh);
        const overshootDb = peakDb - thresholdDb;
        targetLimitDb = -Math.min(14, overshootDb * (0.85 + 0.35 * amountFactor));
      }

      // Net Treble Gain: 0 dB Flat when userShelfGainDb is 0 and no limiter overshoot
      const netGainDb = dynamicShelfDb + targetLimitDb;
      const targetGainLinear = Math.pow(10, netGainDb / 20);

      const coeff = targetGainLinear < currentGainLinear ? attCoeff : relCoeff;
      const nextGainLinear = targetGainLinear + (currentGainLinear - targetGainLinear) * coeff;

      const gainStep = (nextGainLinear - currentGainLinear) / count;
      let g = currentGainLinear;

      for (let i = start; i < end; i++) {
        let shapedH = highBand[i] * g;

        // Controlled harmonic exciter (subtle acoustic air)
        if (exciterAmount > 0 && Math.abs(shapedH) > 0.05) {
          const h2 = shapedH * Math.abs(shapedH);
          shapedH = shapedH + (h2 - shapedH * 0.1) * exciterAmount;
        }

        // Soft saturation clipper above 0.95
        if (shapedH > 0.95) {
          shapedH = 0.95 + 0.05 * Math.tanh((shapedH - 0.95) / 0.05);
        } else if (shapedH < -0.95) {
          shapedH = -0.95 + 0.05 * Math.tanh((shapedH + 0.95) / 0.05);
        }

        // Recombine with untouched low/mid band
        dst[i] = lowBand[i] + shapedH;
        g += gainStep;
      }

      currentGainLinear = nextGainLinear;
    }
  }

  return outputBuffer;
}
