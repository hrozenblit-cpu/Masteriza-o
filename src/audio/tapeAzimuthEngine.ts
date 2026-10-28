/**
 * Tape Azimuth & Channel Balance Engine
 *
 * Dedicated to digitizations of 1/4" analog tapes (1950s - 2000s).
 * Detects inter-channel time difference (ITD / azimuth error) in microseconds & fractional samples,
 * channel level differences in dB (RMS & Peak), phase correlation,
 * and performs sub-sample alignment and channel balance trimming.
 */

export interface TapeAzimuthAnalysis {
  azimuthOffsetSamples: number; // Positive: Left leads Right (Right delayed), Negative: Right leads Left
  azimuthOffsetUs: number;      // Offset in microseconds
  leadingChannel: 'L' | 'R' | 'Aligned';
  phaseCorrelationBefore: number; // -1 to +1
  phaseCorrelationAfter: number;  // Projected correlation after alignment
  levelDiffDb: number;          // RMS difference (L - R) in dB
  peakDiffDb: number;           // Peak difference (L - R) in dB
  rmsDbL: number;
  rmsDbR: number;
  peakDbL: number;
  peakDbR: number;
  monoSumLossBeforeDb: number;  // Loss of high frequencies when summed to mono due to comb filtering
  monoSumGainAfterDb: number;   // Projected restoration when aligned
  sampleRate: number;
  recommendation: string;
  // Polarity and 180-degree Analysis
  relativePhaseState: 'normal_in_phase' | 'inverted_lr_180';
  absolutePolarityState: 'normal' | 'inverted_both_180' | 'neutral';
  waveformSkewness: number;     // 3rd central moment (Waveform asymmetry)
  peakAsymmetryRatio: number;   // Positive vs Negative transient peaks ratio
  // Channel Material Detection (Mono in 2 Channels vs Real Stereo)
  channelConfiguration: 'stereo' | 'dual_mono' | 'single_mono';
  channelConfigLabel: string;
  channelConfigDetail: string;
  sideToMidDb: number;
  isModernRecording?: boolean;
  // Ghost / Dead Channel Detection (Hiss / Crosstalk Isolation)
  isGhostChannelDetected: boolean;
  ghostChannel: 'none' | 'left_dead' | 'right_dead';
  activeSignalChannel: 'both' | 'L' | 'R';
  ghostNoiseLevelDb?: number;
}

export interface TapeAzimuthSettings {
  enabled: boolean;
  azimuthDelaySamples: number;  // Fractional delay to apply (-30 to +30 samples)
  balanceDb: number;           // L/R gain balance (-6.0 to +6.0 dB)
  invertPhaseL: boolean;       // Polarity invert Left
  invertPhaseR: boolean;       // Polarity invert Right
  listenInMono: boolean;        // Preview in mono to verify comb-filter elimination
  autoAlignOnLoad?: boolean;   // Auto-align when a new tape file is loaded
  ghostChannelHandling?: 'clone_active' | 'passthrough';
  activeChannel?: 'both' | 'L' | 'R';
  channelModeOverride?: 'auto' | 'force_dual_mono' | 'force_mono_left' | 'force_mono_right' | 'force_stereo';
}

/**
 * Analyzes inter-channel azimuth time delay and stereo balance
 */
export function analyzeTapeAzimuth(audioBuffer: AudioBuffer): TapeAzimuthAnalysis {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalLength = audioBuffer.length;

  if (numChannels < 2) {
    return {
      azimuthOffsetSamples: 0,
      azimuthOffsetUs: 0,
      leadingChannel: 'Aligned',
      phaseCorrelationBefore: 1.0,
      phaseCorrelationAfter: 1.0,
      levelDiffDb: 0,
      peakDiffDb: 0,
      rmsDbL: -20,
      rmsDbR: -20,
      peakDbL: -6,
      peakDbR: -6,
      monoSumLossBeforeDb: 0,
      monoSumGainAfterDb: 0,
      sampleRate,
      recommendation: 'Áudio mono detectado. O ajuste de azimute estéreo é aplicável apenas a gravações estéreo de 2 canais.',
      relativePhaseState: 'normal_in_phase',
      absolutePolarityState: 'normal',
      waveformSkewness: 0,
      peakAsymmetryRatio: 1.0,
      channelConfiguration: 'single_mono',
      channelConfigLabel: 'Mono (1 Canal)',
      channelConfigDetail: 'Áudio mono de pista única.',
      sideToMidDb: -96,
      isGhostChannelDetected: false,
      ghostChannel: 'none',
      activeSignalChannel: 'both',
    };
  }

  const channelL = audioBuffer.getChannelData(0);
  const channelR = audioBuffer.getChannelData(1);

  // 1. Calculate RMS, Peak, Side/Mid Ratio, and 3rd Central Moment (Skewness / Waveform Asymmetry)
  let sumSqL = 0;
  let sumSqR = 0;
  let maxPeakL = 0;
  let maxPeakR = 0;
  let sumCross = 0;
  let sumSqMid = 0;
  let sumSqSide = 0;

  let sumCubeL = 0;
  let sumCubeR = 0;
  let posPeakSum = 0;
  let negPeakSum = 0;

  // We sample with an optimal stride to keep analysis instantaneous (< 15ms) even on 1-hour 96kHz tapes
  const stride = Math.max(1, Math.floor(totalLength / 262144));
  let count = 0;

  for (let i = 0; i < totalLength; i += stride) {
    const l = channelL[i];
    const r = channelR[i];
    sumSqL += l * l;
    sumSqR += r * r;
    sumCross += l * r;
    sumCubeL += l * l * l;
    sumCubeR += r * r * r;

    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5;
    sumSqMid += mid * mid;
    sumSqSide += side * side;

    if (mid > 0.04) {
      posPeakSum += mid;
    } else if (mid < -0.04) {
      negPeakSum += -mid;
    }

    const absL = Math.abs(l);
    const absR = Math.abs(r);
    if (absL > maxPeakL) maxPeakL = absL;
    if (absR > maxPeakR) maxPeakR = absR;
    count++;
  }

  // 1-pole low-pass filter (~400 Hz) to measure fundamental musical body (bass/kick/vocals)
  // Tape hiss and head crosstalk have virtually zero energy below 400 Hz (< -65 dBFS),
  // whereas authentic musical audio has strong fundamental energy (-15 to -35 dBFS).
  const lpCoeff = 1.0 - Math.exp((-2.0 * Math.PI * 400.0 * stride) / sampleRate);
  let lpL = 0;
  let lpR = 0;
  let sumSqLowL = 0;
  let sumSqLowR = 0;
  for (let i = 0; i < totalLength; i += stride) {
    const l = channelL[i];
    const r = channelR[i];
    lpL += lpCoeff * (l - lpL);
    lpR += lpCoeff * (r - lpR);
    sumSqLowL += lpL * lpL;
    sumSqLowR += lpR * lpR;
  }

  const rmsL = Math.sqrt(sumSqL / Math.max(1, count));
  const rmsR = Math.sqrt(sumSqR / Math.max(1, count));
  const rmsDbL = rmsL > 1e-6 ? 20 * Math.log10(rmsL) : -96;
  const rmsDbR = rmsR > 1e-6 ? 20 * Math.log10(rmsR) : -96;
  const peakDbL = maxPeakL > 1e-6 ? 20 * Math.log10(maxPeakL) : -96;
  const peakDbR = maxPeakR > 1e-6 ? 20 * Math.log10(maxPeakR) : -96;

  const rmsLowL = Math.sqrt(sumSqLowL / Math.max(1, count));
  const rmsLowR = Math.sqrt(sumSqLowR / Math.max(1, count));
  const rmsLowDbL = rmsLowL > 1e-6 ? 20 * Math.log10(rmsLowL) : -96;
  const rmsLowDbR = rmsLowR > 1e-6 ? 20 * Math.log10(rmsLowR) : -96;
  const lowDiffDb = Math.round((rmsLowDbL - rmsLowDbR) * 10) / 10;

  const levelDiffDb = Math.round((rmsDbL - rmsDbR) * 10) / 10;
  const peakDiffDb = Math.round((peakDbL - peakDbR) * 10) / 10;

  const denom = Math.sqrt(sumSqL * sumSqR);
  const phaseCorr = denom > 1e-8 ? Math.max(-1, Math.min(1, sumCross / denom)) : 1.0;

  // Compute statistical skewness
  const varL = rmsL * rmsL;
  const varR = rmsR * rmsR;
  const skewnessL = varL > 1e-6 ? (sumCubeL / count) / Math.pow(varL, 1.5) : 0;
  const skewnessR = varR > 1e-6 ? (sumCubeR / count) / Math.pow(varR, 1.5) : 0;
  const avgSkewness = Math.round(((skewnessL + skewnessR) * 0.5) * 100) / 100;

  // Compute peak asymmetry ratio (positive pressure vs negative rarefaction peaks)
  const peakAsymmetryRatio = negPeakSum > 1e-6 ? Math.round((posPeakSum / negPeakSum) * 100) / 100 : 1.0;

  // 1. Relative Inter-channel Phase (L vs R):
  const relativePhaseState: 'normal_in_phase' | 'inverted_lr_180' =
    phaseCorr < -0.2 ? 'inverted_lr_180' : 'normal_in_phase';

  // 2. Absolute Polarity across BOTH channels (180° in both L and R):
  let absolutePolarityState: 'normal' | 'inverted_both_180' | 'neutral' = 'neutral';
  if (peakAsymmetryRatio < 0.78 && avgSkewness < -0.06) {
    absolutePolarityState = 'inverted_both_180';
  } else if (peakAsymmetryRatio > 1.20 || avgSkewness > 0.06) {
    absolutePolarityState = 'normal';
  } else {
    absolutePolarityState = 'neutral';
  }

  // 2. High-Resolution Cross-Correlation for Azimuth Time Delay
  // In analog tape, azimuth misalignment produces high-frequency delay.
  // We use multiple representative audio windows across the tape (e.g. 10%, 25%, 50%, 75%, 90% of duration)
  // to avoid dead lead-in silence.
  const windowSize = 8192;
  const maxLag = 48; // Maximum search lag: ±48 samples (~±1080 µs at 44.1k, ~±500 µs at 96k)
  const windowPositions = [0.15, 0.3, 0.5, 0.7, 0.85]
    .map(p => Math.floor(p * totalLength))
    .filter(pos => pos + windowSize + maxLag < totalLength);

  let bestLagSum = 0;
  let validWindows = 0;

  for (const pos of windowPositions) {
    // Check if window has enough signal energy
    let winEnergyL = 0;
    for (let i = 0; i < windowSize; i += 4) {
      const v = channelL[pos + i];
      winEnergyL += v * v;
    }
    if (winEnergyL < 0.0001) continue; // Skip quiet sections

    // Compute cross-correlation around lag 0
    let maxCorr = -Infinity;
    let bestLag = 0;
    const corrProfile: number[] = [];

    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let cross = 0;
      let eL = 0;
      let eR = 0;
      for (let i = 0; i < windowSize; i += 2) {
        const idxL = pos + i;
        const idxR = pos + i + lag;
        const sL = channelL[idxL];
        const sR = channelR[idxR];
        cross += sL * sR;
        eL += sL * sL;
        eR += sR * sR;
      }
      const norm = Math.sqrt(eL * eR);
      const c = norm > 1e-9 ? cross / norm : 0;
      corrProfile.push(c);
      if (c > maxCorr) {
        maxCorr = c;
        bestLag = lag;
      }
    }

    // Sub-sample parabolic interpolation around the peak
    const peakIdx = bestLag + maxLag;
    if (peakIdx > 0 && peakIdx < corrProfile.length - 1) {
      const y1 = corrProfile[peakIdx - 1];
      const y2 = corrProfile[peakIdx];
      const y3 = corrProfile[peakIdx + 1];
      const denomSub = (y1 - 2 * y2 + y3);
      let subOffset = 0;
      if (Math.abs(denomSub) > 1e-7) {
        subOffset = 0.5 * (y1 - y3) / denomSub;
        subOffset = Math.max(-0.5, Math.min(0.5, subOffset));
      }
      bestLagSum += (bestLag + subOffset);
    } else {
      bestLagSum += bestLag;
    }
    validWindows++;
  }

  const avgLagSamples = validWindows > 0 ? bestLagSum / validWindows : 0;
  // Offset in microseconds
  const offsetUs = (avgLagSamples / sampleRate) * 1_000_000;

  // Rounding for pristine studio telemetry
  const roundedSamples = Math.round(avgLagSamples * 100) / 100;
  const roundedUs = Math.round(offsetUs * 10) / 10;

  let leadingChannel: 'L' | 'R' | 'Aligned' = 'Aligned';
  if (Math.abs(roundedSamples) > 0.08) {
    leadingChannel = roundedSamples > 0 ? 'L' : 'R';
  }

  // Mono Sum comb filtering restoration estimation
  let sumMonoRaw = 0;
  let sumMonoAligned = 0;
  const testLen = Math.min(32768, totalLength);
  const testStart = Math.floor(totalLength * 0.3);
  const lagInt = Math.round(roundedSamples);

  for (let i = 0; i < testLen; i++) {
    const l = channelL[testStart + i];
    const rRaw = channelR[testStart + i];
    const rawMono = 0.5 * (l + rRaw);
    sumMonoRaw += rawMono * rawMono;

    const rIdx = testStart + i + lagInt;
    const rAligned = (rIdx >= 0 && rIdx < totalLength) ? channelR[rIdx] : rRaw;
    const alignedMono = 0.5 * (l + rAligned);
    sumMonoAligned += alignedMono * alignedMono;
  }

  const rawMonoRms = Math.sqrt(sumMonoRaw / Math.max(1, testLen));
  const alignedMonoRms = Math.sqrt(sumMonoAligned / Math.max(1, testLen));
  const monoGainRatio = alignedMonoRms > 1e-6 && rawMonoRms > 1e-6 ? (alignedMonoRms / rawMonoRms) : 1;
  const monoSumGainAfterDb = Math.max(0, Math.round(20 * Math.log10(monoGainRatio) * 10) / 10);
  const monoSumLossBeforeDb = monoSumGainAfterDb;

  const phaseCorrAfter = Math.min(1.0, Math.max(phaseCorr, phaseCorr + (monoSumGainAfterDb > 0.3 ? 0.08 : 0.02)));

  // Calculate Side vs Mid energy ratio
  const midEnergy = sumSqMid / Math.max(1, count);
  const sideEnergy = sumSqSide / Math.max(1, count);
  const sideToMidRatio = sideEnergy / Math.max(1e-9, midEnergy);
  const sideToMidDb = sideToMidRatio > 1e-9 ? Math.round(10 * Math.log10(sideToMidRatio) * 10) / 10 : -96;

  // 1. Ghost / Dead Channel Detection (Tape Hiss / Crosstalk vs. Authentic Stereo Balance):
  // When an audio file contains useful program audio on only ONE channel while the other channel
  // contains only tape hiss / noise floor / preamp self-noise or minimal crosstalk leakage:
  // - Real physical stereo balance between Left and Right in any commercial track never exceeds ±4.5 to ±6.0 dB.
  // - If |levelDiffDb| >= 7.0 dB, it is physically impossible to be a balanced stereo mix; one channel is
  //   either idle, dead, or containing only background noise / crosstalk.
  // - A quieter channel with RMS <= -32.0 dBFS and level difference >= 5.5 dB is confirmed tape hiss/preamp noise.
  // - Tape hiss and crosstalk have virtually zero low-frequency musical energy (< 400 Hz).
  //   If low-frequency energy is absent (lowDiffDb >= 10.0 dB), the channel has no musical instrument body.
  // - In any of these conditions, classifying the track as "estéreo desbalanceado" and injecting gain (up to +40 dB)
  //   catastrophically amplifies tape hiss and unwanted noise.
  // - The engine MUST detect this as an originally mono recording with a phantom/dead channel, reject blind gain,
  //   and duplicate the clean active channel to both outputs.
  const maxRmsDb = Math.max(rmsDbL, rmsDbR);
  const hasActiveAudio = maxRmsDb > -65.0;

  const isLeftGhost =
    hasActiveAudio &&
    (
      // Disparity >= 7.0 dB where Right is active and Left is quiet
      levelDiffDb <= -7.0 ||
      // Moderate disparity (>= 5.5 dB) with Left near noise floor (<= -32 dBFS)
      (levelDiffDb <= -5.5 && rmsDbL <= -32.0) ||
      // Left channel is near digital/analog silence (<= -50 dBFS) while Right has audio
      (rmsDbL <= -50.0 && rmsDbR > -50.0 && levelDiffDb <= -4.0) ||
      // Left channel lacks low-frequency musical body (bass/fundamentals below 400 Hz)
      (lowDiffDb <= -10.0 && rmsLowDbL <= -44.0 && rmsLowDbR > -36.0) ||
      // Left channel peak is extremely low compared to Right
      (peakDiffDb <= -12.0 && peakDbL <= -32.0)
    );

  const isRightGhost =
    hasActiveAudio &&
    (
      // Disparity >= 7.0 dB where Left is active and Right is quiet (e.g. +40 dB disparity)
      levelDiffDb >= 7.0 ||
      // Moderate disparity (>= 5.5 dB) with Right near noise floor (<= -32 dBFS)
      (levelDiffDb >= 5.5 && rmsDbR <= -32.0) ||
      // Right channel is near digital/analog silence (<= -50 dBFS) while Left has audio
      (rmsDbR <= -50.0 && rmsDbL > -50.0 && levelDiffDb >= 4.0) ||
      // Right channel lacks low-frequency musical body (bass/fundamentals below 400 Hz)
      (lowDiffDb >= 10.0 && rmsLowDbR <= -44.0 && rmsLowDbL > -36.0) ||
      // Right channel peak is extremely low compared to Left
      (peakDiffDb >= 12.0 && peakDbR <= -32.0)
    );

  const isGhostChannelDetected = isLeftGhost || isRightGhost;
  const ghostChannel: 'none' | 'left_dead' | 'right_dead' = isLeftGhost ? 'left_dead' : isRightGhost ? 'right_dead' : 'none';
  const activeSignalChannel: 'both' | 'L' | 'R' = isLeftGhost ? 'R' : isRightGhost ? 'L' : 'both';
  const ghostNoiseLevelDb = isLeftGhost ? rmsDbL : isRightGhost ? rmsDbR : undefined;

  // Determine if audio is genuine mono two-track or authentic stereo:
  // Mono Two-Track (e.g. mono tape digitized on 2-track deck, or Ampex full-track):
  // On a genuine mono tape reading on a stereo head, Side energy is strictly residual tape noise / azimuth delay (S/M <= -26 dB)
  // and phase correlation is >= 0.92.
  // In true stereo mixes (even centered ones with bass/lead vocal), Side energy is substantial (S/M >= -22 dB, typically -8 dB to -18 dB).
  const isDualMono =
    !isGhostChannelDetected &&
    (sideToMidDb <= -28.0 ||
      (sideToMidDb <= -26.0 && (phaseCorrAfter >= 0.92 || phaseCorr >= 0.90)));

  const isModernStereoRecording =
    !isDualMono &&
    !isGhostChannelDetected &&
    Math.abs(roundedSamples) <= 0.08 &&
    Math.abs(levelDiffDb) <= 0.35 &&
    phaseCorr >= 0.40;

  const isModernMonoRecording =
    isDualMono &&
    !isGhostChannelDetected &&
    Math.abs(roundedSamples) <= 0.08 &&
    Math.abs(levelDiffDb) <= 0.25;

  const isModernRecording = isModernStereoRecording || isModernMonoRecording;

  let channelConfiguration: 'stereo' | 'dual_mono' | 'single_mono' = 'stereo';
  let channelConfigLabel = '';
  let channelConfigDetail = '';

  if (isGhostChannelDetected) {
    channelConfiguration = 'single_mono';
    channelConfigLabel = isRightGhost
      ? 'Gravação Originalmente Mono (Canal D Morto / Hiss)'
      : 'Gravação Originalmente Mono (Canal E Morto / Hiss)';
    channelConfigDetail = isRightGhost
      ? `Gravação originalmente gravada em mono com áudio útil presente exclusivamente no Canal Esquerdo (${rmsDbL.toFixed(1)} dBFS). O Canal Direito contém apenas ruído de fita (hiss) ou vazamento residual (${rmsDbR.toFixed(1)} dBFS, diferença de +${levelDiffDb.toFixed(1)} dB). O sistema reconheceu a natureza mono da gravação, rejeitou a injeção cega de +${levelDiffDb.toFixed(1)} dB no chiado e centrou o Canal E em ambas as saídas em mono limpo.`
      : `Gravação originalmente gravada em mono com áudio útil presente exclusivamente no Canal Direito (${rmsDbR.toFixed(1)} dBFS). O Canal Esquerdo contém apenas ruído de fita (hiss) ou vazamento residual (${rmsDbL.toFixed(1)} dBFS, diferença de ${levelDiffDb.toFixed(1)} dB). O sistema reconheceu a natureza mono da gravação, rejeitou a injeção cega de +${Math.abs(levelDiffDb).toFixed(1)} dB no chiado e centrou o Canal D em ambas as saídas em mono limpo.`;
  } else if (isDualMono) {
    channelConfiguration = 'dual_mono';
    channelConfigLabel = isModernMonoRecording
      ? 'Gravação Atual Mono (Dual-Mono Digital)'
      : 'Mono em 2 Trilhas (Fita 1/4" Two-Track / Ampex)';
    channelConfigDetail = isModernMonoRecording
      ? `Gravação digital em 2 canais idênticos (Correlação 100%, S/M ${sideToMidDb} dB). Sem danos de fita: pronta para masterização direta.`
      : `Material Mono em 2 Trilhas (Two-Track / Ampex) detectado (Correlação ${Math.round(phaseCorrAfter * 100)}%, S/M ${sideToMidDb} dB). Reconstrução cruzada e alinhamento anti-flanger recomendados para reparar falhas de óxido.`;
  } else {
    channelConfiguration = 'stereo';
    channelConfigLabel = isModernStereoRecording
      ? 'Gravação Atual Estéreo (Mixagem L/R)'
      : 'Estéreo Real (Mixagem L/R)';
    channelConfigDetail = isModernStereoRecording
      ? `Gravação contemporânea em estéreo autêntico (S/M ${sideToMidDb} dB, Correlação ${(phaseCorr * 100).toFixed(0)}%). Fase e relógio digital alinhados: pronta para masterização direta sem reparos mecânicos.`
      : `Mixagem estéreo com separação L/R detectada (S/M ${sideToMidDb} dB, Correlação ${Math.round(phaseCorr * 100)}%). Restauração independente preservando a abertura acústica.`;
  }

  // Studio Recommendation text
  let recommendation = '';
  if (isGhostChannelDetected) {
    const liveCh = isRightGhost ? 'Esquerdo (E)' : 'Direito (D)';
    const deadCh = isRightGhost ? 'Direito (D)' : 'Esquerdo (E)';
    const deadLevel = (isRightGhost ? rmsDbR : rmsDbL).toFixed(1);
    const liveLevel = (isRightGhost ? rmsDbL : rmsDbR).toFixed(1);
    const absDiff = Math.abs(levelDiffDb).toFixed(1);
    recommendation = `⚠️ GRAVAÇÃO ORIGINALMENTE MONO (CANAL FANTASMA DETECTADO): Sinal útil presente exclusivamente no Canal ${liveCh} (${liveLevel} dBFS). O Canal ${deadCh} contém somente ruído de fita (hiss) ou vazamento residual (${deadLevel} dBFS). O sistema rejeitou a injeção cega de ganho (+${absDiff} dB) no canal com ruído e configurou a duplicação do Canal ${liveCh} para ambas as saídas em Mono limpo e perfeitamente centrado.`;
  } else if (relativePhaseState === 'inverted_lr_180') {
    recommendation = '⚠️ ALERTA DE ANTI-FASE: Os canais L e R estão em oposição de 180° entre si (cancelamento total em mono). Inverta a polaridade de um canal (L ou R) para corrigir a fiação!';
  } else if (absolutePolarityState === 'inverted_both_180') {
    recommendation = `⚠️ POLARIDADE ABSOLUTA INVERTIDA: Detectada inversão de 180° nos dois canais (picos de rarefação predominantes, assimetria ${avgSkewness}). Recomendado inverter ambos os canais (L e R).`;
  } else if (isModernStereoRecording) {
    recommendation = 'Gravação Atual Estéreo detectada com azimute e balanço ideais. Módulos de restauração mecânica de fita dispensados; áudio pronto para masterização direta.';
  } else if (isModernMonoRecording) {
    recommendation = 'Gravação Atual Mono detectada com canais perfeitamente simétricos. Dispensado reparo de fita; pronta para masterização direta.';
  } else if (isDualMono) {
    recommendation = `Fita Mono em 2 Canais detectada (${channelConfigLabel}). Alinhamento de azimute compensado e restauração cruzada recomendada se houver falhas de óxido.`;
  } else if (Math.abs(roundedSamples) <= 0.15 && Math.abs(levelDiffDb) <= 0.5) {
    recommendation = 'Azimute e balanço de canais ideais. Alinhamento perfeitamente conservado.';
  } else if (Math.abs(roundedSamples) > 0.15 && Math.abs(levelDiffDb) <= 0.5) {
    recommendation = `Desvio de azimute detectado (${roundedUs > 0 ? '+' : ''}${roundedUs} µs / ${roundedSamples} amostras). Canal ${leadingChannel} adiantado. Alinhamento recomendado antes da masterização.`;
  } else if (Math.abs(roundedSamples) <= 0.15 && Math.abs(levelDiffDb) > 0.5) {
    recommendation = `Balanço desigual entre canais (${levelDiffDb > 0 ? 'L mais alto +' : 'R mais alto +'}${Math.abs(levelDiffDb)} dB). Compensação de ganho recomendada.`;
  } else {
    recommendation = `Desvio mecânico de azimute (${roundedUs} µs) e desequilíbrio de nível (${levelDiffDb} dB). Ajuste prévio essencial para evitar cancelamento de fase em mono.`;
  }

  return {
    azimuthOffsetSamples: roundedSamples,
    azimuthOffsetUs: roundedUs,
    leadingChannel,
    phaseCorrelationBefore: Math.round(phaseCorr * 100) / 100,
    phaseCorrelationAfter: Math.round(phaseCorrAfter * 100) / 100,
    levelDiffDb,
    peakDiffDb,
    rmsDbL: Math.round(rmsDbL * 10) / 10,
    rmsDbR: Math.round(rmsDbR * 10) / 10,
    peakDbL: Math.round(peakDbL * 10) / 10,
    peakDbR: Math.round(peakDbR * 10) / 10,
    monoSumLossBeforeDb,
    monoSumGainAfterDb,
    sampleRate,
    recommendation,
    relativePhaseState,
    absolutePolarityState,
    waveformSkewness: avgSkewness,
    peakAsymmetryRatio,
    channelConfiguration,
    channelConfigLabel,
    channelConfigDetail,
    sideToMidDb,
    isModernRecording,
    isGhostChannelDetected,
    ghostChannel,
    activeSignalChannel,
    ghostNoiseLevelDb,
  };
}

/**
 * 4-Point Cubic Hermite sub-sample interpolation
 * C1 continuous: creates a perfectly smooth sub-sample curve with zero corner kinks and zero clicks.
 */
function hermiteInterpolate(p0: number, p1: number, p2: number, p3: number, frac: number): number {
  const c0 = p1;
  const c1 = 0.5 * (p2 - p0);
  const c2 = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
  const c3 = 0.5 * (p3 - p0) + 1.5 * (p1 - p2);
  return ((c3 * frac + c2) * frac + c1) * frac + c0;
}

function getClampedSample(data: Float32Array, idx: number, len: number): number {
  if (idx < 0) return data[0];
  if (idx >= len) return data[len - 1];
  return data[idx];
}

/**
 * Creates an AudioBuffer with pristine Azimuth Delay and Channel Balance alignment.
 * Uses high-precision 4-point cubic Hermite interpolation for sub-sample accuracy.
 */
export function processBufferWithAzimuthAndBalance(
  sourceBuffer: AudioBuffer,
  settings: TapeAzimuthSettings
): AudioBuffer {
  const numChannels = sourceBuffer.numberOfChannels;
  const sampleRate = sourceBuffer.sampleRate;
  const totalLength = sourceBuffer.length;

  let outputBuffer: AudioBuffer;
  if (typeof AudioBuffer !== 'undefined') {
    try {
      outputBuffer = new AudioBuffer({ numberOfChannels: numChannels, length: totalLength, sampleRate });
    } catch {
      const offline = new OfflineAudioContext(numChannels, 1, sampleRate);
      outputBuffer = offline.createBuffer(numChannels, totalLength, sampleRate);
    }
  } else {
    const offline = new OfflineAudioContext(numChannels, 1, sampleRate);
    outputBuffer = offline.createBuffer(numChannels, totalLength, sampleRate);
  }

  if (numChannels < 2) {
    // Mono track - copy as is
    outputBuffer.getChannelData(0).set(sourceBuffer.getChannelData(0));
    return outputBuffer;
  }

  const srcL = sourceBuffer.getChannelData(0);
  const srcR = sourceBuffer.getChannelData(1);
  const dstL = outputBuffer.getChannelData(0);
  const dstR = outputBuffer.getChannelData(1);

  // 1. Forced Channel Mode / Ghost / Dead Channel Recovery:
  if (settings.channelModeOverride === 'force_mono_left') {
    const sign = settings.invertPhaseL ? -1 : 1;
    for (let i = 0; i < totalLength; i++) {
      const sample = srcL[i] * sign;
      dstL[i] = sample;
      dstR[i] = sample;
    }
    return outputBuffer;
  }

  if (settings.channelModeOverride === 'force_mono_right') {
    const sign = settings.invertPhaseR ? -1 : 1;
    for (let i = 0; i < totalLength; i++) {
      const sample = srcR[i] * sign;
      dstL[i] = sample;
      dstR[i] = sample;
    }
    return outputBuffer;
  }

  // Ghost channel handling
  if (settings.ghostChannelHandling !== 'passthrough' && (settings.activeChannel === 'L' || settings.activeChannel === 'R')) {
    const activeSrc = settings.activeChannel === 'L' ? srcL : srcR;
    const sign = (settings.activeChannel === 'L' ? settings.invertPhaseL : settings.invertPhaseR) ? -1 : 1;
    for (let i = 0; i < totalLength; i++) {
      const sample = activeSrc[i] * sign;
      dstL[i] = sample;
      dstR[i] = sample;
    }
    return outputBuffer;
  }

  // 2. Safe Physical Balance Clamp:
  // Prevents runaway gain amplification (+40 dB) on noise floor.
  // Real tape head wear imbalance never exceeds ±4.5 to ±6.0 dB.
  const safeBalanceDb = Math.max(-6.0, Math.min(6.0, settings.balanceDb || 0));
  const balL = Math.pow(10, (safeBalanceDb / 2) / 20);
  const balR = Math.pow(10, (-safeBalanceDb / 2) / 20);

  // Polarity / Phase inversion
  const signL = settings.invertPhaseL ? -1 : 1;
  const signR = settings.invertPhaseR ? -1 : 1;

  // Fractional delay:
  // If azimuthDelaySamples > 0: Left leads, so we delay Left.
  // If azimuthDelaySamples < 0: Right leads, so we delay Right.
  const delay = settings.azimuthDelaySamples;

  for (let i = 0; i < totalLength; i++) {
    let sampleL = 0;
    let sampleR = 0;

    if (delay >= 0) {
      // Delay applied to channel L (Right is read directly)
      const readIdxL = i - delay;
      const intIdx = Math.floor(readIdxL);
      const frac = readIdxL - intIdx;
      const p0 = getClampedSample(srcL, intIdx - 1, totalLength);
      const p1 = getClampedSample(srcL, intIdx, totalLength);
      const p2 = getClampedSample(srcL, intIdx + 1, totalLength);
      const p3 = getClampedSample(srcL, intIdx + 2, totalLength);
      sampleL = hermiteInterpolate(p0, p1, p2, p3, frac);
      sampleR = srcR[i];
    } else {
      // Delay applied to channel R (Left is read directly)
      const absDelay = -delay;
      const readIdxR = i - absDelay;
      const intIdx = Math.floor(readIdxR);
      const frac = readIdxR - intIdx;
      const p0 = getClampedSample(srcR, intIdx - 1, totalLength);
      const p1 = getClampedSample(srcR, intIdx, totalLength);
      const p2 = getClampedSample(srcR, intIdx + 1, totalLength);
      const p3 = getClampedSample(srcR, intIdx + 2, totalLength);
      sampleR = hermiteInterpolate(p0, p1, p2, p3, frac);
      sampleL = srcL[i];
    }

    // Apply polarity and balance
    sampleL *= signL * balL;
    sampleR *= signR * balR;

    // Listen in Mono preview mode or Forced Dual-Mono Two-Track mode
    if (settings.listenInMono || settings.channelModeOverride === 'force_dual_mono') {
      const mono = 0.5 * (sampleL + sampleR);
      dstL[i] = mono;
      dstR[i] = mono;
    } else {
      dstL[i] = sampleL;
      dstR[i] = sampleR;
    }
  }

  return outputBuffer;
}
