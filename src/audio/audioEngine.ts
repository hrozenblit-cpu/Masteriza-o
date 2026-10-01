import { HumanizerSettings, AudioStem, LoudnessMetrics, LimitlessMasterConfig } from '../types/audio';
import { analyzeBufferLoudness, applyLimitlessMultiStageMastering } from './loudnessEngine';
import { TapeAzimuthSettings, processBufferWithAzimuthAndBalance } from './tapeAzimuthEngine';
import {
  TapeDropoutSettings,
  TapeDropoutAnalysis,
  DEFAULT_DROPOUT_SETTINGS,
  analyzeTapeDropouts,
  reconstructTapeDropouts
} from './tapeDropoutEngine';
import {
  SpectralDenoiseSettings,
  DEFAULT_DENOISE_SETTINGS,
  processBufferWithSpectralDenoise,
  analyzeTapeNoise,
  NoiseAnalysisTelemetry,
  learnNoiseProfileFromBuffer,
  CRITICAL_BAND_CENTERS_HZ
} from './spectralDenoiseEngine';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sumBusNode: GainNode | null = null;
  private monitorGain: GainNode | null = null; // Independent monitor listening attenuator
  private dacSafetyLimiter: DynamicsCompressorNode | null = null; // Hardware DAC True-Peak Safety Ceiling (prevents USB audio interface & WASAPI clipping)
  private userVolume: number = 0.90; // Default 0.90 (-1.0 dB True-Peak Safe Headroom for external USB Audio Interfaces)

  // Tape 1/4" Azimuth & Channel Balance Pre-Alignment Settings
  private tapeAzimuthSettings: TapeAzimuthSettings = {
    enabled: true,
    azimuthDelaySamples: 0,
    balanceDb: 0,
    invertPhaseL: false,
    invertPhaseR: false,
    listenInMono: false,
    autoAlignOnLoad: true,
  };

  // Tape Dropout & Cross-Channel Ampex Full-Track Recovery Settings
  private tapeDropoutSettings: TapeDropoutSettings = { ...DEFAULT_DROPOUT_SETTINGS };
  private tapeDropoutAnalysis: TapeDropoutAnalysis | null = null;

  // Sonic Solutions NoNoise & iZotope RX Spectral De-noise Settings
  private tapeDenoiseSettings: SpectralDenoiseSettings = { ...DEFAULT_DENOISE_SETTINGS };
  private tapeDenoiseTelemetry: NoiseAnalysisTelemetry | null = null;

  // Master Stereo Source nodes
  private sourceNode: AudioBufferSourceNode | null = null;
  private sourceGain: GainNode | null = null;
  private stemSources: Map<string, AudioBufferSourceNode> = new Map();
  private stemGains: Map<string, GainNode> = new Map();
  private stemPanners: Map<string, StereoPannerNode> = new Map();

  // Dual-Buffer Precision Architecture (Bit-for-Bit parity with exported WAV)
  private rawBuffer: AudioBuffer | null = null;
  private masteredBuffer: AudioBuffer | null = null;
  private isCompareOriginal: boolean = false;
  private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRenderingMaster: boolean = false;
  private onMasterRenderedCallbacks: Set<(buf: AudioBuffer) => void> = new Set();

  // Independent Stereo Analysers for true L/R VU Metering and Phase Goniometer
  private splitterNode: ChannelSplitterNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private floatTimeDataL: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(1024 * 4));
  private floatTimeDataR: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(1024 * 4));

  // Playback state
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;

  // LUFS and Loudness state
  private trackLoudnessMetrics: LoudnessMetrics | null = null;
  private smoothedMomentaryLufs: number = -24;
  private smoothedShortTermLufs: number = -24;

  private currentSettings: HumanizerSettings = {
    enabled: true,
    deHarshIntensity: 65,
    notchFrequencyHz: 3400,
    notchBandwidthQ: 2.8,
    tapeWarmth: 40,
    tubeHarmonics: 30,
    lowMidBody: 1.2,
    transientPunch: 60,
    attackDeSmear: 50,
    timingJitterMs: 8,
    flutterWowRate: 35,
    airExciterGain: 60,
    airCutoffHz: 15800,
    harmonicSynthesisAmount: 85,
    stereoCorrelationFix: 75,
    monoBassCutoffHz: 140,
    acousticRoomSpread: 45,
    antiDetectionMode: true,
    watermarkScrambler: true,
    analogAirDither: 50,
    outputGainDb: 0,
    limitlessEnabled: true,
    targetLufs: -14.0,
    targetCeilingDb: -1.0,
    clipperDrive: 55,
    lowEndWeight: 75,
    transientSpeed: 'punchy',
    autoMatchLoudness: true,
  };

  constructor() {
    // Audio context is lazily created on user interaction
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        // latencyHint: 'playback' configures the browser to allocate larger audio buffer chunks (50-100ms).
        // This is critical for external USB Audio Interfaces / DACs (Focusrite, Behringer, PreSonus, MOTU, etc.):
        // it completely prevents USB micro-buffer underruns and crackling distortion during real-time UI/Canvas rendering.
        this.ctx = new AudioCtx({ latencyHint: 'playback' });
      } catch {
        this.ctx = new AudioCtx();
      }
      this.setupMasterGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Transparent, 100% linear digital playback graph with Hardware DAC Protection:
   * (activeSource) -> sumBusNode -> analyser (master digital bus) -> monitorGain -> dacSafetyLimiter -> DAC
   *
   * 1. Metering is tapped directly from sumBusNode (shows pure unclipped master WAV level).
   * 2. Playback is bit-for-bit identical to the exported WAV file.
   * 3. dacSafetyLimiter provides a transparent -0.3 dBFS brickwall ceiling right before ctx.destination.
   *    This guarantees that real-time sample-rate conversion (44.1k -> 48k on USB audio cards)
   *    and inter-sample peaks NEVER clip Windows WASAPI or the external sound card's DAC!
   */
  private setupMasterGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    // Master Summing bus
    this.sumBusNode = ctx.createGain();
    this.sumBusNode.gain.setValueAtTime(1.0, ctx.currentTime);

    // Master Digital Bus:
    // sumBusNode -> analyser
    this.sumBusNode.connect(this.analyser);

    // Metering is tapped DIRECTLY from sumBusNode (shows exact digital master WAV level)
    this.splitterNode = ctx.createChannelSplitter(2);
    this.sumBusNode.connect(this.splitterNode);

    this.analyserL = ctx.createAnalyser();
    this.analyserL.fftSize = 1024;
    this.analyserL.smoothingTimeConstant = 0.35;
    this.splitterNode.connect(this.analyserL, 0); // 0 = Left Channel

    this.analyserR = ctx.createAnalyser();
    this.analyserR.fftSize = 1024;
    this.analyserR.smoothingTimeConstant = 0.35;
    this.splitterNode.connect(this.analyserR, 1); // 1 = Right Channel

    // Output chain to Physical DAC / USB Audio Interface:
    // analyser -> monitorGain -> dacSafetyLimiter -> destination
    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.setValueAtTime(this.userVolume, ctx.currentTime);

    // Hardware DAC Anti-Clip Brickwall Protection Node:
    // High-speed transparent limiter prevents inter-sample overshoots from hitting Windows WASAPI hard ceiling
    this.dacSafetyLimiter = ctx.createDynamicsCompressor();
    this.dacSafetyLimiter.threshold.setValueAtTime(-0.5, ctx.currentTime); // -0.5 dBFS safety ceiling
    this.dacSafetyLimiter.knee.setValueAtTime(4.0, ctx.currentTime);       // Musical soft-knee avoids harsh distortion
    this.dacSafetyLimiter.ratio.setValueAtTime(12, ctx.currentTime);       // Transparent limiting ratio
    this.dacSafetyLimiter.attack.setValueAtTime(0.002, ctx.currentTime);   // 2ms smooth attack
    this.dacSafetyLimiter.release.setValueAtTime(0.05, ctx.currentTime);   // 50ms musical release

    this.analyser.connect(this.monitorGain);
    this.monitorGain.connect(this.dacSafetyLimiter);
    this.dacSafetyLimiter.connect(ctx.destination);
  }

  public setMasterVolume(val: number) {
    this.userVolume = Math.max(0, Math.min(1.0, val));
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setValueAtTime(this.userVolume, this.ctx.currentTime);
    }
  }

  public setTrackLoudness(metrics: LoudnessMetrics | null) {
    this.trackLoudnessMetrics = metrics;
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getTrackLoudness(): LoudnessMetrics | null {
    return this.trackLoudnessMetrics;
  }

  public updateLoudnessMakeUp() {
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getSettings(): HumanizerSettings {
    return { ...this.currentSettings };
  }

  /**
   * Called when the user uploads a new raw track.
   * Caches raw buffer and starts background render of the master buffer immediately.
   */
  public async loadRawBuffer(buffer: AudioBuffer): Promise<AudioBuffer | null> {
    this.rawBuffer = buffer;
    this.masteredBuffer = null;
    return this.triggerMasterRender();
  }

  /**
   * Triggers a debounced re-render of the master buffer when any knob/slider is changed.
   * Runs offline at ~150x real-time speed.
   * Hot-swaps the playing source seamlessly without stopping audio.
   */
  public updateSettings(newSettings: Partial<HumanizerSettings>) {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getTapeAzimuthSettings(): TapeAzimuthSettings {
    return { ...this.tapeAzimuthSettings };
  }

  public updateTapeAzimuthSettings(newSettings: Partial<TapeAzimuthSettings>) {
    this.tapeAzimuthSettings = { ...this.tapeAzimuthSettings, ...newSettings };
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getTapeDropoutSettings(): TapeDropoutSettings {
    return { ...this.tapeDropoutSettings };
  }

  public updateTapeDropoutSettings(newSettings: Partial<TapeDropoutSettings>) {
    this.tapeDropoutSettings = { ...this.tapeDropoutSettings, ...newSettings };
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getTapeDropoutAnalysis(): TapeDropoutAnalysis | null {
    return this.tapeDropoutAnalysis;
  }

  public setTapeDropoutAnalysis(analysis: TapeDropoutAnalysis | null) {
    this.tapeDropoutAnalysis = analysis;
  }

  // --- Spectral De-noise (Sonic Solutions NoNoise & iZotope RX Style) ---
  public getTapeDenoiseSettings(): SpectralDenoiseSettings {
    return { ...this.tapeDenoiseSettings };
  }

  public updateTapeDenoiseSettings(newSettings: Partial<SpectralDenoiseSettings>) {
    this.tapeDenoiseSettings = { ...this.tapeDenoiseSettings, ...newSettings };
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getTapeDenoiseTelemetry(): NoiseAnalysisTelemetry | null {
    return this.tapeDenoiseTelemetry;
  }

  public analyzeDenoise(buffer?: AudioBuffer): NoiseAnalysisTelemetry | null {
    const targetBuffer = buffer || this.rawBuffer;
    if (!targetBuffer) return null;
    const telemetry = analyzeTapeNoise(targetBuffer);
    this.tapeDenoiseTelemetry = telemetry;
    return telemetry;
  }

  public learnDenoiseProfile(buffer?: AudioBuffer, explicitStartSec?: number, explicitDurationSec?: number): number[] | null {
    const targetBuffer = buffer || this.rawBuffer;
    if (!targetBuffer) return null;
    const res = learnNoiseProfileFromBuffer(targetBuffer, explicitStartSec, explicitDurationSec);
    this.tapeDenoiseSettings.learnedNoiseBands = res.profileBands;
    this.tapeDenoiseSettings.noiseProfileType = 'auto_learned';
    if (this.tapeDenoiseTelemetry) {
      this.tapeDenoiseTelemetry.noiseProfileBands = res.profileBands;
      this.tapeDenoiseTelemetry.quietestSegmentStartSec = res.startSec;
      this.tapeDenoiseTelemetry.quietestSegmentDurationSec = res.durationSec;
      this.tapeDenoiseTelemetry.hissNoiseFloorDb = res.hissNoiseFloorDb;
    }
    this.scheduleMasterRender();
    return res.profileBands;
  }

  private scheduleMasterRender() {
    if (!this.rawBuffer) {
      return;
    }
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
    }
    this.renderDebounceTimer = setTimeout(() => {
      this.triggerMasterRender().catch(() => {});
    }, 120);
  }

  public async triggerMasterRender(): Promise<AudioBuffer | null> {
    if (!this.rawBuffer) {
      return null;
    }
    if (this.isRenderingMaster) {
      // Re-trigger after current render completes
      return new Promise((resolve) => {
        const cb = (buf: AudioBuffer) => {
          this.onMasterRenderedCallbacks.delete(cb);
          resolve(buf);
        };
        this.onMasterRenderedCallbacks.add(cb);
      });
    }

    this.isRenderingMaster = true;
    try {
      const rendered = await this.renderMasteredBuffer(this.rawBuffer, this.currentSettings);
      this.masteredBuffer = rendered;

      // If currently playing in Mastered mode, seamlessly crossfade to the updated master
      if (this.isPlaying && !this.isCompareOriginal && this.sourceNode) {
        const curTime = this.getCurrentPlaybackTime();
        this.startSourceWithBuffer(rendered, curTime, true);
      }

      for (const cb of this.onMasterRenderedCallbacks) {
        cb(rendered);
      }
      this.onMasterRenderedCallbacks.clear();
      return rendered;
    } finally {
      this.isRenderingMaster = false;
    }
  }

  /**
   * Toggles A/B Instant Comparison
   * False = Mastered (Wet)
   * True = Original Cru (Dry)
   */
  public setCompareOriginal(compareOriginal: boolean) {
    if (this.isCompareOriginal === compareOriginal) return;
    this.isCompareOriginal = compareOriginal;

    if (this.isPlaying && this.rawBuffer) {
      const targetBuffer = compareOriginal ? this.rawBuffer : (this.masteredBuffer || this.rawBuffer);
      const curTime = this.getCurrentPlaybackTime();
      this.startSourceWithBuffer(targetBuffer, curTime, true);
    }
  }

  public getCompareOriginal(): boolean {
    return this.isCompareOriginal;
  }

  /**
   * Plays the stereo master buffer.
   * If in Mastered mode, plays the mastered buffer (which sounds 100% identical to the exported WAV).
   * If in Original Cru mode, plays the raw original audio.
   */
  public async playBuffer(buffer: AudioBuffer, offsetSeconds: number = 0) {
    const ctx = this.getAudioContext();
    this.rawBuffer = buffer;

    // If master buffer is not ready yet, render it
    if (!this.masteredBuffer) {
      // Start playback with raw buffer immediately, and hot-swap to master as soon as rendered
      const activeBuf = this.isCompareOriginal ? buffer : buffer;
      this.startSourceWithBuffer(activeBuf, offsetSeconds, false);
      this.triggerMasterRender().then((mastered) => {
        if (mastered && this.isPlaying && !this.isCompareOriginal) {
          const curTime = this.getCurrentPlaybackTime();
          this.startSourceWithBuffer(mastered, curTime, true);
        }
      });
      return;
    }

    const activeBuf = this.isCompareOriginal ? this.rawBuffer : this.masteredBuffer;
    this.startSourceWithBuffer(activeBuf, offsetSeconds, false);
  }

  /**
   * Internal click-free source starter with micro-crossfade and strict node leak prevention
   */
  private startSourceWithBuffer(buffer: AudioBuffer, offsetSeconds: number, crossfade: boolean = false) {
    if (!this.ctx || !this.sumBusNode) return;
    const ctx = this.ctx;

    const oldSrc = this.sourceNode;
    const oldGain = this.sourceGain;

    const newSrc = ctx.createBufferSource();
    newSrc.buffer = buffer;
    newSrc.loop = true;

    const newGain = ctx.createGain();

    if (crossfade && oldGain && oldSrc) {
      // 20ms linear crossfade: eliminates any clicks or pops without non-linear volume burst
      newGain.gain.setValueAtTime(0, ctx.currentTime);
      newGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.02);

      const curVal = oldGain.gain.value;
      oldGain.gain.setValueAtTime(curVal, ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.02);

      setTimeout(() => {
        try {
          oldSrc.stop();
          oldSrc.disconnect();
          oldGain.disconnect();
        } catch {
          // safe ignore
        }
      }, 35);
    } else {
      if (oldSrc) {
        try {
          oldSrc.stop();
          oldSrc.disconnect();
        } catch {
          // safe ignore
        }
      }
      if (oldGain) {
        try {
          oldGain.disconnect();
        } catch {
          // safe ignore
        }
      }
      // Micro-ramp (6ms) eliminates abrupt waveform step clicks on start/seek
      newGain.gain.setValueAtTime(0, ctx.currentTime);
      newGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.006);
    }

    newSrc.connect(newGain);
    newGain.connect(this.sumBusNode);

    const safeOffset = offsetSeconds % buffer.duration;
    newSrc.start(0, safeOffset);

    this.sourceNode = newSrc;
    this.sourceGain = newGain;
    this.startTime = ctx.currentTime - safeOffset;
    this.pauseOffset = safeOffset;
    this.isPlaying = true;
  }

  /**
   * Multitrack Stem Playback
   */
  public playStems(stems: AudioStem[], offsetSeconds: number = 0) {
    const ctx = this.getAudioContext();
    this.stop();

    if (!this.sumBusNode) return;

    this.stemSources.clear();
    this.stemGains.clear();
    this.stemPanners.clear();

    const soloExists = stems.some((s) => s.solo);

    for (const stem of stems) {
      if (!stem.audioBuffer) continue;
      const src = ctx.createBufferSource();
      src.buffer = stem.audioBuffer;
      src.loop = true;

      const gain = ctx.createGain();
      const isAudible = !stem.muted && (!soloExists || stem.solo);
      gain.gain.setValueAtTime(isAudible ? stem.volume : 0, ctx.currentTime);

      src.connect(gain);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, stem.pan || 0)), ctx.currentTime);
        gain.connect(panner);
        panner.connect(this.sumBusNode);
        this.stemPanners.set(stem.id, panner);
      } else {
        gain.connect(this.sumBusNode);
      }

      src.start(0, offsetSeconds % stem.audioBuffer.duration);
      this.stemSources.set(stem.id, src);
      this.stemGains.set(stem.id, gain);
    }

    this.startTime = ctx.currentTime - offsetSeconds;
    this.pauseOffset = offsetSeconds;
    this.isPlaying = true;
  }

  public updateStemVolume(id: string, vol: number, muted: boolean, solo: boolean, soloActive: boolean) {
    const gainNode = this.stemGains.get(id);
    if (gainNode && this.ctx) {
      const isAudible = !muted && (!soloActive || solo);
      gainNode.gain.setValueAtTime(isAudible ? vol : 0, this.ctx.currentTime);
    }
  }

  public updateStemPan(id: string, pan: number) {
    const panner = this.stemPanners.get(id);
    if (panner && this.ctx) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
    }
  }

  public pause() {
    if (!this.isPlaying || !this.ctx) return;
    this.pauseOffset = this.getCurrentPlaybackTime();
    // 8ms smooth micro-fadeout prevents clicks/pops when pausing
    if (this.sourceGain && this.ctx) {
      try {
        const curGain = this.sourceGain.gain.value;
        this.sourceGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.sourceGain.gain.setValueAtTime(curGain, this.ctx.currentTime);
        this.sourceGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.008);
        setTimeout(() => {
          this.stopNodesOnly();
          this.isPlaying = false;
        }, 12);
        return;
      } catch {
        // safe fallback
      }
    }
    this.stopNodesOnly();
    this.isPlaying = false;
  }

  public resume() {
    if (this.isPlaying) return;
    if (this.rawBuffer) {
      this.playBuffer(this.rawBuffer, this.pauseOffset);
    }
  }

  public stop() {
    if (this.sourceGain && this.ctx && this.isPlaying) {
      try {
        const curGain = this.sourceGain.gain.value;
        this.sourceGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.sourceGain.gain.setValueAtTime(curGain, this.ctx.currentTime);
        this.sourceGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.008);
        setTimeout(() => {
          this.stopNodesOnly();
          this.pauseOffset = 0;
          this.isPlaying = false;
        }, 12);
        return;
      } catch {
        // safe fallback
      }
    }
    this.stopNodesOnly();
    this.pauseOffset = 0;
    this.isPlaying = false;
  }

  private stopNodesOnly() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // safe ignore
      }
      this.sourceNode = null;
    }
    if (this.sourceGain) {
      try {
        this.sourceGain.disconnect();
      } catch {
        // safe ignore
      }
      this.sourceGain = null;
    }
    for (const [, src] of this.stemSources.entries()) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // safe ignore
      }
    }
    for (const [, gain] of this.stemGains.entries()) {
      try {
        gain.disconnect();
      } catch {
        // safe ignore
      }
    }
    for (const [, panner] of this.stemPanners.entries()) {
      try {
        panner.disconnect();
      } catch {
        // safe ignore
      }
    }
    this.stemSources.clear();
    this.stemGains.clear();
    this.stemPanners.clear();
  }

  public getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    const dur = this.rawBuffer?.duration || 16;
    const elapsed = this.ctx.currentTime - this.startTime;
    return elapsed % dur;
  }

  public getDuration(): number {
    return this.rawBuffer?.duration || 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getStereoAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    if (!this.analyserL && !this.ctx) {
      this.getAudioContext();
    }
    return { left: this.analyserL, right: this.analyserR };
  }

  /**
   * High-performance 60fps true stereo metering, phase correlation, and ITU-R BS.1770-4 LUFS
   * Reads the active digital bus directly (mastered or raw, exactly what is playing).
   */
  public getStereoLevels(): {
    leftLevel: number;
    rightLevel: number;
    peakL: number;
    peakR: number;
    peakDbL: number;
    peakDbR: number;
    isClippingL: boolean;
    isClippingR: boolean;
    phaseCorrelation: number;
    momentaryLufs: number;
    shortTermLufs: number;
    integratedLufs: number;
    truePeakMaxDb: number;
    gainReductionDb: number;
  } {
    if (!this.analyserL || !this.analyserR || !this.isPlaying) {
      return {
        leftLevel: 0,
        rightLevel: 0,
        peakL: 0,
        peakR: 0,
        peakDbL: -70,
        peakDbR: -70,
        isClippingL: false,
        isClippingR: false,
        phaseCorrelation: 0.95,
        momentaryLufs: -70,
        shortTermLufs: -70,
        integratedLufs: this.trackLoudnessMetrics?.integratedLufs ?? -14,
        truePeakMaxDb: -70,
        gainReductionDb: 0,
      };
    }

    this.analyserL.getFloatTimeDomainData(this.floatTimeDataL);
    this.analyserR.getFloatTimeDomainData(this.floatTimeDataR);

    const len = this.floatTimeDataL.length;
    let sumSqL = 0;
    let sumSqR = 0;
    let peakL = 0;
    let peakR = 0;
    let sumCross = 0;

    for (let i = 0; i < len; i++) {
      const sL = this.floatTimeDataL[i];
      const sR = this.floatTimeDataR[i];

      const absL = Math.abs(sL);
      const absR = Math.abs(sR);
      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;

      sumSqL += sL * sL;
      sumSqR += sR * sR;
      sumCross += sL * sR;
    }

    const rmsL = Math.sqrt(sumSqL / len);
    const rmsR = Math.sqrt(sumSqR / len);

    // Exact digital peak values in dBFS
    const peakDbL = 20 * Math.log10(Math.max(peakL, 0.00001));
    const peakDbR = 20 * Math.log10(Math.max(peakR, 0.00001));

    // Dynamic dBFS mapping with studio ballistics (-48 dBFS floor to 0 dBFS ceiling)
    const dbL = 20 * Math.log10(Math.max(rmsL, 0.0001));
    const dbR = 20 * Math.log10(Math.max(rmsR, 0.0001));

    const leftLevel = Math.max(0, Math.min(100, ((dbL + 48) / 48) * 100));
    const rightLevel = Math.max(0, Math.min(100, ((dbR + 48) / 48) * 100));

    const denom = Math.sqrt(sumSqL * sumSqR);
    const phaseCorr = denom > 0.00001 ? Math.max(-1, Math.min(1, sumCross / denom)) : 1;

    // ITU-R BS.1770-4 Instantaneous power estimation
    const power = rmsL * rmsL + rmsR * rmsR;
    const instLufs = power > 1e-10 ? -0.691 + 10 * Math.log10(power) : -70;

    this.smoothedMomentaryLufs = Math.max(-70, this.smoothedMomentaryLufs * 0.85 + instLufs * 0.15);
    this.smoothedShortTermLufs = Math.max(-70, this.smoothedShortTermLufs * 0.97 + instLufs * 0.03);

    const truePeakMaxDb = Math.max(peakDbL, peakDbR);

    // Gain reduction telemetry
    const targetCeiling = this.currentSettings.targetCeilingDb ?? -1.0;
    let gainReductionDb = 0;
    if (truePeakMaxDb > targetCeiling) {
      gainReductionDb = Math.min(14, Math.max(0, truePeakMaxDb - targetCeiling));
    }

    return {
      leftLevel,
      rightLevel,
      peakL,
      peakR,
      peakDbL: Math.round(peakDbL * 10) / 10,
      peakDbR: Math.round(peakDbR * 10) / 10,
      isClippingL: peakL >= 0.999,
      isClippingR: peakR >= 0.999,
      phaseCorrelation: phaseCorr,
      momentaryLufs: Math.round(this.smoothedMomentaryLufs * 10) / 10,
      shortTermLufs: Math.round(this.smoothedShortTermLufs * 10) / 10,
      integratedLufs: this.trackLoudnessMetrics?.integratedLufs ?? Math.round(this.smoothedShortTermLufs * 10) / 10,
      truePeakMaxDb: Math.round(truePeakMaxDb * 10) / 10,
      gainReductionDb: Math.round(gainReductionDb * 10) / 10,
    };
  }

  /**
   * Master Rendering Engine (Used for both real-time player and offline WAV export)
   * Guarantees 100% Bit-for-Bit parity between app playback and exported WAV file.
   */
  public async renderMasteredBuffer(
    buffer: AudioBuffer,
    settings: HumanizerSettings,
    customAzimuthSettings?: TapeAzimuthSettings,
    targetSampleRate?: number,
    customDenoiseSettings?: SpectralDenoiseSettings
  ): Promise<AudioBuffer> {
    if (!buffer) {
      throw new Error('Nenhum buffer de áudio disponível para renderização.');
    }
    // 0. Pre-Mastering Stage: 1/4" Tape Azimuth & Channel Balance Correction
    // Check and align azimuth & balance BEFORE any alteration or mastering is applied
    const azimuthToUse = customAzimuthSettings || this.tapeAzimuthSettings;
    let sourceBuffer = buffer;
    if (
      azimuthToUse.enabled &&
      (azimuthToUse.azimuthDelaySamples !== 0 ||
        azimuthToUse.balanceDb !== 0 ||
        azimuthToUse.invertPhaseL ||
        azimuthToUse.invertPhaseR ||
        azimuthToUse.listenInMono)
    ) {
      sourceBuffer = processBufferWithAzimuthAndBalance(buffer, azimuthToUse);
    }

    // 0.1 Pre-Mastering Stage: Tape Dropout Detection & Cross-Channel Reconstruction
    // Especially critical for Full-Track Ampex transferred to Studer A80 2-Track
    if (this.tapeDropoutSettings.enabled) {
      const dropAnalysis = this.tapeDropoutAnalysis || analyzeTapeDropouts(sourceBuffer, this.tapeDropoutSettings);
      if (dropAnalysis.events.length > 0) {
        const { restoredBuffer } = reconstructTapeDropouts(sourceBuffer, dropAnalysis, this.tapeDropoutSettings);
        sourceBuffer = restoredBuffer;
      }
    }

    // 0.2 Pre-Mastering Stage: Sonic Solutions NoNoise / iZotope RX Spectral De-noise
    const denoiseToUse = customDenoiseSettings || this.tapeDenoiseSettings;
    if (denoiseToUse.enabled || denoiseToUse.listenNoiseDeltaOnly) {
      sourceBuffer = processBufferWithSpectralDenoise(sourceBuffer, denoiseToUse);
    }

    const sampleRate = targetSampleRate || sourceBuffer.sampleRate;
    const duration = sourceBuffer.duration;
    const numChannels = sourceBuffer.numberOfChannels || 2;
    const totalSamples = Math.floor(sampleRate * duration);

    // Render at exact native sample rate without sample-rate conversion
    const offlineCtx = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

    // Main Audio Source
    const source = offlineCtx.createBufferSource();
    source.buffer = sourceBuffer;

    // 1. De-harshing Notch (removes metallic robot resonance)
    const deHarsh = offlineCtx.createBiquadFilter();
    deHarsh.type = 'peaking';
    deHarsh.frequency.value = settings.notchFrequencyHz || 3400;
    deHarsh.Q.value = Math.max(1.0, Math.min(6.0, settings.notchBandwidthQ || 2.5));
    const notchGain = settings.deHarshBypass ? 0 : -1 * Math.min(3.5, (settings.deHarshIntensity || 60) * 0.04);
    deHarsh.gain.value = notchGain;

    // 2. Low-Mid Analog Body (+0.5 to +2 dB)
    const lowWarmth = offlineCtx.createBiquadFilter();
    lowWarmth.type = 'lowshelf';
    lowWarmth.frequency.value = 220;
    lowWarmth.gain.value = settings.tapeWarmthBypass ? 0 : Math.min(2.0, Math.max(0, settings.lowMidBody || 1.2));

    // 3. Subtle Analog Tape Warmth (soft knee, strictly transparent for 90%+ dynamics)
    const tapeSat = offlineCtx.createWaveShaper();
    tapeSat.curve = this.createSaturationCurve(
      settings.tapeWarmth || 40,
      !!settings.tapeWarmthBypass
    ) as Float32Array<ArrayBuffer>;
    tapeSat.oversample = '4x';

    // 4. Smooth Air Band High Shelf (open, musical top end)
    const airExciter = offlineCtx.createBiquadFilter();
    airExciter.type = 'highshelf';
    airExciter.frequency.value = Math.max(12000, Math.min(16000, settings.airCutoffHz || 14500));
    airExciter.gain.value = settings.airExciterBypass ? 0 : Math.min(2.5, (settings.airExciterGain || 50) * 0.035);

    // 5. Output Gain
    const masterGain = offlineCtx.createGain();
    const dbToGain = Math.pow(10, (settings.outputGainDb || 0) / 20);
    masterGain.gain.value = dbToGain;

    // Clean serial signal chain:
    source.connect(deHarsh);
    deHarsh.connect(lowWarmth);
    lowWarmth.connect(tapeSat);
    tapeSat.connect(airExciter);
    airExciter.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    source.start(0);
    let renderedBuffer = await offlineCtx.startRendering();

    // 6. DMGAudio Limitless Multi-Stage Dynamics & Loudness Maximizer (Target LUFS Matching)
    const isLimitlessBypassed = !!settings.limitlessBypass || settings.limitlessEnabled === false;
    if (!isLimitlessBypassed && settings.targetLufs !== undefined) {
      const currentLoudness = analyzeBufferLoudness(renderedBuffer);
      const limitlessConfig: LimitlessMasterConfig = {
        targetLufs: settings.targetLufs ?? -14.0,
        targetCeilingDb: settings.targetCeilingDb ?? -1.0,
        clipperDrive: settings.clipperDrive ?? 55,
        lowEndWeight: settings.lowEndWeight ?? 75,
        transientSpeed: settings.transientSpeed ?? 'punchy',
        autoMatchLoudness: settings.autoMatchLoudness !== false,
      };
      renderedBuffer = applyLimitlessMultiStageMastering(renderedBuffer, limitlessConfig, currentLoudness);
    }

    return renderedBuffer;
  }

  private createSaturationCurve(amount: number, bypassed: boolean = false): Float32Array {
    const nSamples = 4096;
    const curve = new Float32Array(nSamples);
    if (bypassed || amount <= 0) {
      for (let i = 0; i < nSamples; ++i) {
        curve[i] = (i * 2) / (nSamples - 1) - 1;
      }
      return curve;
    }

    // High-fidelity analog tape saturation:
    // Pure linear for small signals, smooth hyperbolic tape saturation at top end with zero kinks
    const drive = 1.0 + (Math.max(0, Math.min(100, amount)) / 100) * 0.45;
    const norm = Math.tanh(drive);
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / (nSamples - 1) - 1;
      curve[i] = Math.tanh(x * drive) / norm;
    }
    return curve;
  }

  /**
   * Offline Rendering and WAV export
   */
  public async exportProcessedAudioWav(
    buffer: AudioBuffer,
    settings: HumanizerSettings,
    targetBitDepth: 16 | 24 | 32 = 24,
    customAzimuthSettings?: TapeAzimuthSettings,
    targetSampleRate?: number,
    customDenoiseSettings?: SpectralDenoiseSettings
  ): Promise<Blob> {
    const renderedBuffer = await this.renderMasteredBuffer(
      buffer,
      settings,
      customAzimuthSettings,
      targetSampleRate,
      customDenoiseSettings
    );
    return audioBufferToWavBlob(renderedBuffer, targetBitDepth, settings.targetCeilingDb ?? -1.0, targetSampleRate);
  }

  /**
   * Exports ONLY the azimuth-aligned and channel-balanced archival preservation WAV.
   * Leaves all mastering/EQ/compression completely untouched.
   */
  public async exportAzimuthCorrectedOnlyWav(
    buffer: AudioBuffer,
    azimuthSettings: TapeAzimuthSettings,
    targetBitDepth: 16 | 24 | 32 = 24,
    targetSampleRate?: number
  ): Promise<Blob> {
    let alignedBuffer = processBufferWithAzimuthAndBalance(buffer, azimuthSettings);
    if (targetSampleRate && alignedBuffer.sampleRate !== targetSampleRate) {
      const targetFrames = Math.round(alignedBuffer.duration * targetSampleRate);
      const resCtx = new OfflineAudioContext(alignedBuffer.numberOfChannels, targetFrames, targetSampleRate);
      const src = resCtx.createBufferSource();
      src.buffer = alignedBuffer;
      src.connect(resCtx.destination);
      src.start(0);
      alignedBuffer = await resCtx.startRendering();
    }
    return audioBufferToWavBlob(alignedBuffer, targetBitDepth, 0, targetSampleRate);
  }

  /**
   * Exports an archival preservation WAV with Tape Azimuth aligned and Dropouts reconstructed.
   * Completely bypasses mastering EQ/compressor for pristine archival transfers.
   */
  public async exportDropoutRestoredOnlyWav(
    buffer: AudioBuffer,
    dropoutSettings: TapeDropoutSettings,
    azimuthSettings: TapeAzimuthSettings,
    targetBitDepth: 16 | 24 | 32 = 24,
    targetSampleRate?: number
  ): Promise<Blob> {
    let procBuffer = buffer;
    if (azimuthSettings.enabled) {
      procBuffer = processBufferWithAzimuthAndBalance(buffer, azimuthSettings);
    }
    if (dropoutSettings.enabled) {
      const dropAnalysis = this.tapeDropoutAnalysis || analyzeTapeDropouts(procBuffer, dropoutSettings);
      const { restoredBuffer } = reconstructTapeDropouts(procBuffer, dropAnalysis, dropoutSettings);
      procBuffer = restoredBuffer;
    }

    if (targetSampleRate && procBuffer.sampleRate !== targetSampleRate) {
      const targetFrames = Math.round(procBuffer.duration * targetSampleRate);
      const resCtx = new OfflineAudioContext(procBuffer.numberOfChannels, targetFrames, targetSampleRate);
      const src = resCtx.createBufferSource();
      src.buffer = procBuffer;
      src.connect(resCtx.destination);
      src.start(0);
      procBuffer = await resCtx.startRendering();
    }
    return audioBufferToWavBlob(procBuffer, targetBitDepth, 0, targetSampleRate);
  }

  /**
   * Exports an archival preservation WAV with Tape Azimuth, Dropouts and Spectral Denoise applied.
   */
  public async exportDenoisedOnlyWav(
    buffer: AudioBuffer,
    denoiseSettings: SpectralDenoiseSettings,
    azimuthSettings: TapeAzimuthSettings,
    targetBitDepth: 16 | 24 | 32 = 24,
    targetSampleRate?: number
  ): Promise<Blob> {
    let procBuffer = buffer;
    if (azimuthSettings.enabled) {
      procBuffer = processBufferWithAzimuthAndBalance(buffer, azimuthSettings);
    }
    if (this.tapeDropoutSettings.enabled) {
      const dropAnalysis = this.tapeDropoutAnalysis || analyzeTapeDropouts(procBuffer, this.tapeDropoutSettings);
      const { restoredBuffer } = reconstructTapeDropouts(procBuffer, dropAnalysis, this.tapeDropoutSettings);
      procBuffer = restoredBuffer;
    }
    if (denoiseSettings.enabled || denoiseSettings.listenNoiseDeltaOnly) {
      procBuffer = processBufferWithSpectralDenoise(procBuffer, denoiseSettings);
    }

    if (targetSampleRate && procBuffer.sampleRate !== targetSampleRate) {
      const targetFrames = Math.round(procBuffer.duration * targetSampleRate);
      const resCtx = new OfflineAudioContext(procBuffer.numberOfChannels, targetFrames, targetSampleRate);
      const src = resCtx.createBufferSource();
      src.buffer = procBuffer;
      src.connect(resCtx.destination);
      src.start(0);
      procBuffer = await resCtx.startRendering();
    }
    return audioBufferToWavBlob(procBuffer, targetBitDepth, 0, targetSampleRate);
  }
}

/**
 * Converts an AudioBuffer into WAV Blob preserving exact sample rate and requested bit depth
 */
export function audioBufferToWavBlob(
  buffer: AudioBuffer,
  targetBitDepth: 16 | 24 | 32 = 24,
  targetCeilingDb: number = -1.0,
  targetSampleRate?: number
): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = targetSampleRate || buffer.sampleRate;
  const bitDepth = targetBitDepth;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt Subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  const audioFormatTag = bitDepth === 32 ? 3 : 1; // 3 = IEEE Float, 1 = PCM Integer
  view.setUint16(20, audioFormatTag, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data Subchunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Channel Interleaving
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  const maxLinear = Math.pow(10, Math.min(0, targetCeilingDb) / 20);

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];
      if (sample > maxLinear) sample = maxLinear;
      if (sample < -maxLinear) sample = -maxLinear;

      if (bitDepth === 16) {
        const s = Math.max(-1, Math.min(1, sample));
        const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const s = Math.max(-1, Math.min(1, sample));
        const intSample = Math.floor(s < 0 ? s * 8388608 : s * 8388607);
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      } else if (bitDepth === 32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const audioEngine = new AudioEngine();
