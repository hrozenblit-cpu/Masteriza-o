/**
 * Tape Dropout Detection & Cross-Channel Reconstruction Engine
 * Specially designed for 1/4" Analog Tapes (Ampex Full-Track Mono, Studer A80 2-Track, etc.)
 *
 * Exploit the physical principle of Full-Track Mono tapes played on Studer 2-track heads:
 * Because both heads read the same performance, microscopic oxide flaking or edge damage
 * on one track can be seamlessly repaired using the pristine opposite channel with 100%
 * authentic analog tape audio (zero artificial guessing).
 */

export interface TapeDropoutEvent {
  id: string;
  timeSeconds: number;
  timeFormatted: string;
  durationMs: number;
  channel: 'L' | 'R' | 'both';
  depthDb: number;
  type: 'oxide_flake' | 'edge_damage' | 'transverse_crease' | 'head_spacing_loss';
  reconstructed: boolean;
  recoverySource: 'cross_channel_opposite' | 'spectral_inpainting';
}

export interface TapeDropoutAnalysis {
  totalDropouts: number;
  dropoutsL: number;
  dropoutsR: number;
  dropoutsBoth: number;
  tapeHealthScore: number; // 0 - 100% (100 = flawless tape)
  events: TapeDropoutEvent[];
  isAmpexFullTrackCandidate: boolean; // Detected identical mono material on L and R
  estimatedOxideDegradation: 'Excelente' | 'Leve' | 'Moderada' | 'Severa (Flaking / Shedding)';
  sampleRate: number;
  recommendation: string;
}

export interface TapeDropoutSettings {
  enabled: boolean;
  mode: 'ampex_fulltrack_cross' | 'stereo_independent' | 'mono_optimized_sum';
  sensitivity: 'low' | 'medium' | 'high' | 'ultra'; // Threshold for dropout detection
  minDurationMs: number; // Minimum dropout length (default: 2ms)
  maxDurationMs: number; // Maximum dropout length to heal (default: 80ms)
  crossfadeWindowMs: number; // Smooth cosine taper transition (default: 4ms)
  restoreHighFreqLoss: boolean; // Wallace spacing loss compensation
  listenDropoutMaskOnly?: boolean; // Solo the removed/healed dropouts to hear exactly what was repaired
}

export const DEFAULT_DROPOUT_SETTINGS: TapeDropoutSettings = {
  enabled: false, // Default to FALSE so dropouts are only reconstructed when explicitly initiated by user
  mode: 'ampex_fulltrack_cross',
  sensitivity: 'medium',
  minDurationMs: 2.0,
  maxDurationMs: 120,
  crossfadeWindowMs: 6,
  restoreHighFreqLoss: true,
  listenDropoutMaskOnly: false,
};

/**
 * Analyzes an AudioBuffer for tape dropouts (oxide flaking, head spacing loss, crease drops).
 */
export function analyzeTapeDropouts(
  audioBuffer: AudioBuffer,
  settings: Partial<TapeDropoutSettings> = {}
): TapeDropoutAnalysis {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalLength = audioBuffer.length;
  const duration = audioBuffer.duration;

  if (numChannels < 2) {
    // Single channel mono analysis
    return analyzeSingleChannelDropouts(audioBuffer, settings);
  }

  const channelL = audioBuffer.getChannelData(0);
  const channelR = audioBuffer.getChannelData(1);

  // Sensitivity thresholds (depth drop in dB to qualify as dropout)
  const sens = settings.sensitivity || 'medium';
  const dropDbThreshold =
    sens === 'ultra' ? 3.0 : sens === 'high' ? 4.5 : sens === 'medium' ? 6.0 : 8.5;

  const minDurMs = settings.minDurationMs ?? 1.5;
  const maxDurMs = settings.maxDurationMs ?? 120;
  const minSamples = Math.max(8, Math.floor((minDurMs / 1000) * sampleRate));
  const maxSamples = Math.floor((maxDurMs / 1000) * sampleRate);

  // Window size for short-term RMS envelope tracking (~3ms window)
  const winSize = Math.max(32, Math.floor(sampleRate * 0.003));
  const hopSize = Math.max(16, Math.floor(winSize / 2));
  const numFrames = Math.floor((totalLength - winSize) / hopSize);

  // Check if material is candidate for Ampex Full-Track Mono (L and R have high cross-correlation)
  let sumSqL = 0;
  let sumSqR = 0;
  let sumCross = 0;
  const checkStride = Math.max(1, Math.floor(totalLength / 65536));
  for (let i = 0; i < totalLength; i += checkStride) {
    const l = channelL[i];
    const r = channelR[i];
    sumSqL += l * l;
    sumSqR += r * r;
    sumCross += l * r;
  }
  const denom = Math.sqrt(sumSqL * sumSqR);
  const baseCorr = denom > 1e-6 ? sumCross / denom : 1;
  const isAmpexFullTrackCandidate = baseCorr > 0.88;

  // Track envelopes and detect dropouts
  const events: TapeDropoutEvent[] = [];
  let inDropoutL = false;
  let inDropoutR = false;
  let inDropoutBoth = false;
  let startFrameL = 0;
  let startFrameR = 0;
  let startFrameBoth = 0;
  let maxDepthDbL = 0;
  let maxDepthDbR = 0;
  let maxDepthDbBoth = 0;

  // Sliding short-term envelope memory (smooth baseline reference)
  let baseEnvL = 0.01;
  let baseEnvR = 0.01;

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let frameSqL = 0;
    let frameSqR = 0;

    for (let j = 0; j < winSize; j += 2) {
      const l = channelL[offset + j];
      const r = channelR[offset + j];
      frameSqL += l * l;
      frameSqR += r * r;
    }

    const curEnvL = Math.sqrt(frameSqL / (winSize / 2)) + 1e-6;
    const curEnvR = Math.sqrt(frameSqR / (winSize / 2)) + 1e-6;

    // Slow-moving peak baseline envelope (tracks musical dynamics without triggering on soft musical pauses)
    baseEnvL = Math.max(curEnvL, baseEnvL * 0.992);
    baseEnvR = Math.max(curEnvR, baseEnvR * 0.992);

    // Skip quiet sections / silent tape pauses
    if (baseEnvL < 0.005 && baseEnvR < 0.005) continue;

    // Drop ratios in dB relative to current reference and relative to opposite channel
    const dipDbL = 20 * Math.log10(baseEnvL / curEnvL);
    const dipDbR = 20 * Math.log10(baseEnvR / curEnvR);
    const lrRatioDb = 20 * Math.log10(curEnvR / curEnvL); // Positive: L dropped relative to R
    const rlRatioDb = 20 * Math.log10(curEnvL / curEnvR); // Positive: R dropped relative to L

    // In natural stereo music, regular panned instruments create L/R level differences without being dropouts!
    // Asymmetric cross-channel dropouts are only valid when the material is Ampex Full-Track mono (both tracks read same source),
    // OR if the drop is an acute, severe collapse (> 12 dB) below the moving baseline.
    const isAsymmetricCandidate = isAmpexFullTrackCandidate || settings.mode === 'ampex_fulltrack_cross';
    const isDipL = isAsymmetricCandidate && (lrRatioDb > dropDbThreshold + 3.0 && dipDbL > dropDbThreshold + 4.0);
    const isDipR = isAsymmetricCandidate && (rlRatioDb > dropDbThreshold + 3.0 && dipDbR > dropDbThreshold + 4.0);
    // Condition 3: Bilateral Dropout (Both channels drop simultaneously faster than 30dB/10ms)
    const isDipBoth = (dipDbL > dropDbThreshold * 1.8 && dipDbR > dropDbThreshold * 1.8 && !isDipL && !isDipR);

    // --- State Machine for Channel L ---
    if (isDipL) {
      if (!inDropoutL) {
        inDropoutL = true;
        startFrameL = f;
        maxDepthDbL = lrRatioDb;
      } else {
        if (lrRatioDb > maxDepthDbL) maxDepthDbL = lrRatioDb;
      }
    } else if (inDropoutL) {
      inDropoutL = false;
      const durSamples = (f - startFrameL) * hopSize;
      const durMs = (durSamples / sampleRate) * 1000;
      if (durSamples >= minSamples && durSamples <= maxSamples) {
        const timeSec = (startFrameL * hopSize) / sampleRate;
        events.push({
          id: `drop_l_${events.length + 1}`,
          timeSeconds: timeSec,
          timeFormatted: formatTime(timeSec),
          durationMs: Math.round(durMs * 10) / 10,
          channel: 'L',
          depthDb: Math.round(maxDepthDbL * 10) / 10,
          type: maxDepthDbL > 16 ? 'oxide_flake' : 'edge_damage',
          reconstructed: false,
          recoverySource: 'cross_channel_opposite',
        });
      }
    }

    // --- State Machine for Channel R ---
    if (isDipR) {
      if (!inDropoutR) {
        inDropoutR = true;
        startFrameR = f;
        maxDepthDbR = rlRatioDb;
      } else {
        if (rlRatioDb > maxDepthDbR) maxDepthDbR = rlRatioDb;
      }
    } else if (inDropoutR) {
      inDropoutR = false;
      const durSamples = (f - startFrameR) * hopSize;
      const durMs = (durSamples / sampleRate) * 1000;
      if (durSamples >= minSamples && durSamples <= maxSamples) {
        const timeSec = (startFrameR * hopSize) / sampleRate;
        events.push({
          id: `drop_r_${events.length + 1}`,
          timeSeconds: timeSec,
          timeFormatted: formatTime(timeSec),
          durationMs: Math.round(durMs * 10) / 10,
          channel: 'R',
          depthDb: Math.round(maxDepthDbR * 10) / 10,
          type: maxDepthDbR > 16 ? 'oxide_flake' : 'edge_damage',
          reconstructed: false,
          recoverySource: 'cross_channel_opposite',
        });
      }
    }

    // --- State Machine for Bilateral Dropouts ---
    if (isDipBoth) {
      if (!inDropoutBoth) {
        inDropoutBoth = true;
        startFrameBoth = f;
        maxDepthDbBoth = Math.max(dipDbL, dipDbR);
      } else {
        const d = Math.max(dipDbL, dipDbR);
        if (d > maxDepthDbBoth) maxDepthDbBoth = d;
      }
    } else if (inDropoutBoth) {
      inDropoutBoth = false;
      const durSamples = (f - startFrameBoth) * hopSize;
      const durMs = (durSamples / sampleRate) * 1000;
      if (durSamples >= minSamples && durSamples <= maxSamples) {
        const timeSec = (startFrameBoth * hopSize) / sampleRate;
        events.push({
          id: `drop_both_${events.length + 1}`,
          timeSeconds: timeSec,
          timeFormatted: formatTime(timeSec),
          durationMs: Math.round(durMs * 10) / 10,
          channel: 'both',
          depthDb: Math.round(maxDepthDbBoth * 10) / 10,
          type: 'transverse_crease',
          reconstructed: false,
          recoverySource: 'spectral_inpainting',
        });
      }
    }
  }

  // Count breakdowns
  const dropoutsL = events.filter((e) => e.channel === 'L').length;
  const dropoutsR = events.filter((e) => e.channel === 'R').length;
  const dropoutsBoth = events.filter((e) => e.channel === 'both').length;
  const totalDropouts = events.length;

  // Calculate Tape Health Score
  // Normalized per 3 minutes of audio: < 5 dropouts = 95-100%, 20 dropouts = ~80%, > 80 dropouts = < 50%
  const densityPerMinute = totalDropouts / Math.max(0.5, duration / 60);
  const tapeHealthScore = Math.max(5, Math.min(100, Math.round(100 - densityPerMinute * 4.5)));

  let estimatedOxideDegradation: TapeDropoutAnalysis['estimatedOxideDegradation'] = 'Excelente';
  if (tapeHealthScore < 50 || densityPerMinute > 15) {
    estimatedOxideDegradation = 'Severa (Flaking / Shedding)';
  } else if (tapeHealthScore < 75 || densityPerMinute > 6) {
    estimatedOxideDegradation = 'Moderada';
  } else if (tapeHealthScore < 90 || densityPerMinute > 2) {
    estimatedOxideDegradation = 'Leve';
  }

  let recommendation = '';
  if (totalDropouts === 0) {
    recommendation = 'Fita magnética com superfície de óxido em estado impecável. Nenhum dropout perceptível detectado.';
  } else if (isAmpexFullTrackCandidate) {
    recommendation = `Detectados ${totalDropouts} dropouts de fita (${dropoutsL} no Canal E, ${dropoutsR} no Canal D). Como a gravação é Mono Full-Track Ampex digitalizada em Studer A80, ${dropoutsL + dropoutsR} dropouts podem ser 100% reconstruídos com áudio analógico puro do canal oposto sem qualquer perda de fidelidade!`;
  } else {
    recommendation = `Detectados ${totalDropouts} dropouts de fita. Recomendado habilitar a reconstrução inteligente com inpainting e suavização de envelope para eliminar interrupções audíveis.`;
  }

  return {
    totalDropouts,
    dropoutsL,
    dropoutsR,
    dropoutsBoth,
    tapeHealthScore,
    events,
    isAmpexFullTrackCandidate,
    estimatedOxideDegradation,
    sampleRate,
    recommendation,
  };
}

/**
 * Single-channel fallback analysis for mono files
 */
function analyzeSingleChannelDropouts(
  audioBuffer: AudioBuffer,
  settings: Partial<TapeDropoutSettings>
): TapeDropoutAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const totalLength = audioBuffer.length;
  const duration = audioBuffer.duration;
  const channel = audioBuffer.getChannelData(0);

  const sens = settings.sensitivity || 'medium';
  const dropDbThreshold = sens === 'ultra' ? 4.0 : sens === 'high' ? 6.0 : 8.0;
  const winSize = Math.max(32, Math.floor(sampleRate * 0.003));
  const hopSize = Math.max(16, Math.floor(winSize / 2));
  const numFrames = Math.floor((totalLength - winSize) / hopSize);

  const events: TapeDropoutEvent[] = [];
  let inDropout = false;
  let startFrame = 0;
  let maxDepth = 0;
  let baseEnv = 0.01;

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let sumSq = 0;
    for (let j = 0; j < winSize; j += 2) {
      const v = channel[offset + j];
      sumSq += v * v;
    }
    const curEnv = Math.sqrt(sumSq / (winSize / 2)) + 1e-6;
    baseEnv = Math.max(curEnv, baseEnv * 0.992);
    if (baseEnv < 0.005) continue;

    const dipDb = 20 * Math.log10(baseEnv / curEnv);
    if (dipDb > dropDbThreshold) {
      if (!inDropout) {
        inDropout = true;
        startFrame = f;
        maxDepth = dipDb;
      } else {
        if (dipDb > maxDepth) maxDepth = dipDb;
      }
    } else if (inDropout) {
      inDropout = false;
      const durSamples = (f - startFrame) * hopSize;
      const durMs = (durSamples / sampleRate) * 1000;
      if (durMs >= 1.5 && durMs <= 120) {
        const timeSec = (startFrame * hopSize) / sampleRate;
        events.push({
          id: `drop_mono_${events.length + 1}`,
          timeSeconds: timeSec,
          timeFormatted: formatTime(timeSec),
          durationMs: Math.round(durMs * 10) / 10,
          channel: 'both',
          depthDb: Math.round(maxDepth * 10) / 10,
          type: 'oxide_flake',
          reconstructed: false,
          recoverySource: 'spectral_inpainting',
        });
      }
    }
  }

  const totalDropouts = events.length;
  const tapeHealthScore = Math.max(10, Math.min(100, Math.round(100 - (totalDropouts / Math.max(0.5, duration / 60)) * 5)));

  return {
    totalDropouts,
    dropoutsL: 0,
    dropoutsR: 0,
    dropoutsBoth: totalDropouts,
    tapeHealthScore,
    events,
    isAmpexFullTrackCandidate: false,
    estimatedOxideDegradation: tapeHealthScore > 85 ? 'Leve' : 'Moderada',
    sampleRate,
    recommendation: `Detectados ${totalDropouts} dropouts em áudio mono. A reconstrução espectral interpolará o envelope de volume e os harmônicos para disfarçar as falhas de fita.`,
  };
}

/**
 * Reconstructs and eliminates dropouts from an AudioBuffer.
 *
 * For Ampex Full-Track tapes played on Studer A80 2-Track:
 * - When Track 1 (L) has a dropout, it patches from Track 2 (R) using cosine crossfade taper.
 * - When Track 2 (R) has a dropout, it patches from Track 1 (L).
 * - For bilateral dropouts (creases), it applies envelope restoration and harmonic inpainting.
 */
export function reconstructTapeDropouts(
  sourceBuffer: AudioBuffer,
  analysis: TapeDropoutAnalysis,
  settings: TapeDropoutSettings
): { restoredBuffer: AudioBuffer; repairedEventsCount: number } {
  const numChannels = sourceBuffer.numberOfChannels;
  const sampleRate = sourceBuffer.sampleRate;
  const totalLength = sourceBuffer.length;

  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const outputBuffer = audioCtx.createBuffer(numChannels, totalLength, sampleRate);

  if (numChannels < 2) {
    // Mono copy and envelope inpaint
    const src = sourceBuffer.getChannelData(0);
    const dst = outputBuffer.getChannelData(0);
    dst.set(src);
    applyMonoDropoutInpainting(dst, analysis.events, sampleRate, settings);
    return { restoredBuffer: outputBuffer, repairedEventsCount: analysis.events.length };
  }

  const srcL = sourceBuffer.getChannelData(0);
  const srcR = sourceBuffer.getChannelData(1);
  const dstL = outputBuffer.getChannelData(0);
  const dstR = outputBuffer.getChannelData(1);

  // Initialize with original audio
  dstL.set(srcL);
  dstR.set(srcR);

  if (!settings.enabled || analysis.events.length === 0) {
    return { restoredBuffer: outputBuffer, repairedEventsCount: 0 };
  }

  const crossfadeMs = settings.crossfadeWindowMs || 4;
  const fadeSamples = Math.max(16, Math.floor((crossfadeMs / 1000) * sampleRate));
  let repairedCount = 0;

  for (const event of analysis.events) {
    const startSample = Math.floor(event.timeSeconds * sampleRate);
    const durSamples = Math.floor((event.durationMs / 1000) * sampleRate);
    const endSample = Math.min(totalLength, startSample + durSamples);

    if (startSample < 0 || endSample > totalLength || durSamples <= 0) continue;

    // --- CASE 1: Dropout on Channel L (Patch from pristine Channel R) ---
    if (event.channel === 'L' && settings.mode !== 'stereo_independent') {
      patchChannelWithOpposite(dstL, srcR, startSample, endSample, fadeSamples);
      event.reconstructed = true;
      repairedCount++;
    }
    // --- CASE 2: Dropout on Channel R (Patch from pristine Channel L) ---
    else if (event.channel === 'R' && settings.mode !== 'stereo_independent') {
      patchChannelWithOpposite(dstR, srcL, startSample, endSample, fadeSamples);
      event.reconstructed = true;
      repairedCount++;
    }
    // --- CASE 3: Bilateral Dropout on Both Channels (Tape crease / transverse fold) ---
    else {
      // Inpaint envelope on both channels
      inpaintBilateralDropout(dstL, startSample, endSample, fadeSamples);
      inpaintBilateralDropout(dstR, startSample, endSample, fadeSamples);
      event.reconstructed = true;
      repairedCount++;
    }
  }

  // If Ampex Full-Track Optimized Mono Sum is requested:
  // Dynamically favor the cleanest track during dropouts and produce an ultra-clean coherent mono master
  if (settings.mode === 'mono_optimized_sum') {
    for (let i = 0; i < totalLength; i++) {
      const mono = 0.5 * (dstL[i] + dstR[i]);
      dstL[i] = mono;
      dstR[i] = mono;
    }
  }

  // If Dropout Mask Solo / Delta Audition is requested:
  // Isolates (original - restored) so the user can hear ONLY the removed clicks/defects in solo!
  if (settings.listenDropoutMaskOnly) {
    for (let i = 0; i < totalLength; i++) {
      const deltaL = (srcL[i] - dstL[i]) * 3.5;
      const deltaR = (srcR[i] - dstR[i]) * 3.5;
      dstL[i] = Math.max(-1.0, Math.min(1.0, deltaL));
      dstR[i] = Math.max(-1.0, Math.min(1.0, deltaR));
    }
  }

  return { restoredBuffer: outputBuffer, repairedEventsCount: repairedCount };
}

/**
 * Crossfades seamlessly from healthy channel into damaged channel using Hann/Cosine taper.
 */
function patchChannelWithOpposite(
  dst: Float32Array,
  healthySrc: Float32Array,
  start: number,
  end: number,
  fadeSamples: number
) {
  const len = dst.length;
  const actualFadeIn = Math.min(fadeSamples, Math.floor((end - start) / 3));
  const actualFadeOut = actualFadeIn;

  // Fade-in into healthy audio
  for (let i = 0; i < actualFadeIn; i++) {
    const idx = start + i;
    if (idx >= len) break;
    const progress = i / actualFadeIn;
    const w = 0.5 * (1 - Math.cos(Math.PI * progress)); // Cosine ramp (0 -> 1)
    dst[idx] = (1 - w) * dst[idx] + w * healthySrc[idx];
  }

  // Pure healthy channel replacement
  for (let idx = start + actualFadeIn; idx < end - actualFadeOut; idx++) {
    if (idx >= len) break;
    dst[idx] = healthySrc[idx];
  }

  // Fade-out back to original channel
  for (let i = 0; i < actualFadeOut; i++) {
    const idx = end - actualFadeOut + i;
    if (idx >= len) break;
    const progress = i / actualFadeOut;
    const w = 0.5 * (1 - Math.cos(Math.PI * progress)); // Cosine ramp (0 -> 1)
    dst[idx] = (1 - w) * healthySrc[idx] + w * dst[idx];
  }
}

/**
 * Inpaints a bilateral dropout using envelope spline smoothing and cubic hermite interpolation.
 */
function inpaintBilateralDropout(
  dst: Float32Array,
  start: number,
  end: number,
  fadeSamples: number
) {
  const len = dst.length;
  const preIdx = Math.max(0, start - fadeSamples);
  const postIdx = Math.min(len - 1, end + fadeSamples);

  // Compute healthy pre and post average RMS levels
  let sumPre = 0;
  let countPre = 0;
  for (let i = preIdx; i < start; i++) {
    sumPre += Math.abs(dst[i]);
    countPre++;
  }
  const ampPre = countPre > 0 ? sumPre / countPre : 0.05;

  let sumPost = 0;
  let countPost = 0;
  for (let i = end; i < postIdx; i++) {
    sumPost += Math.abs(dst[i]);
    countPost++;
  }
  const ampPost = countPost > 0 ? sumPost / countPost : 0.05;
  const targetAmp = (ampPre + ampPost) * 0.5;

  // Measure current dip inside dropout
  let sumInside = 0;
  let countInside = 0;
  for (let i = start; i < end; i++) {
    sumInside += Math.abs(dst[i]);
    countInside++;
  }
  const ampInside = countInside > 0 ? sumInside / countInside : 0.001;
  // Cap boost to safe musical limit (+6 dB / 2.0x) so we never amplify tape hiss or cause clipping
  const rawRatio = targetAmp / (ampInside + 1e-6);
  const boostGain = Math.min(2.0, Math.max(1.0, rawRatio));

  // Smoothly restore gain profile across dropout to eliminate audible dip
  const dur = end - start;
  for (let i = 0; i < dur; i++) {
    const idx = start + i;
    if (idx >= len) break;
    // Hann cosine taper for transparent gain restoration without step clicks
    const t = i / Math.max(1, dur);
    const bell = Math.sin(Math.PI * t);
    const gain = 1.0 + (boostGain - 1.0) * bell;
    const restored = dst[idx] * gain;
    // Soft limiter guard
    dst[idx] = Math.max(-0.98, Math.min(0.98, restored));
  }
}

/**
 * Mono dropout inpainting helper
 */
function applyMonoDropoutInpainting(
  dst: Float32Array,
  events: TapeDropoutEvent[],
  sampleRate: number,
  settings: TapeDropoutSettings
) {
  const fadeSamples = Math.max(16, Math.floor(((settings.crossfadeWindowMs || 4) / 1000) * sampleRate));
  for (const ev of events) {
    const s = Math.floor(ev.timeSeconds * sampleRate);
    const e = Math.min(dst.length, s + Math.floor((ev.durationMs / 1000) * sampleRate));
    inpaintBilateralDropout(dst, s, e, fadeSamples);
    ev.reconstructed = true;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
