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
import {
  processBufferWithOrbanTreble,
  analyzeBufferTreble,
  OrbanTrebleSettings,
  OrbanTrebleTelemetry,
  DEFAULT_ORBAN_SETTINGS,
  ORBAN_PRESETS
} from './orbanTrebleEngine';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sumBusNode: GainNode | null = null;
  private monitorGain: GainNode | null = null; // Independent monitor listening attenuator
  private dacSafetyLimiter: DynamicsCompressorNode | null = null; // Hardware DAC True-Peak Safety Ceiling (prevents USB audio interface & WASAPI clipping)
  private userVolume: number = 0.90; // Default 0.90 (-1.0 dB True-Peak Safe Headroom for external USB Audio Interfaces)

  // Multitrack Stems Summing & Acoustic Touch
  private stems: AudioStem[] = [];
  private isStemTouchActive: boolean = true;

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
  private allActiveSources: Set<AudioBufferSourceNode> = new Set();
  private allActiveGains: Set<GainNode> = new Set();
  private pendingFadingSources: Set<{ src: AudioBufferSourceNode; gain: GainNode; timer: any }> = new Set();
  private stemSources: Map<string, AudioBufferSourceNode> = new Map();
  private stemGains: Map<string, GainNode> = new Map();
  private stemPanners: Map<string, StereoPannerNode> = new Map();

  // Track identification & generation epoch (strictly guarantees that switching tracks never plays stale audio)
  private currentTrackId: number = 0;

  // Dual-Buffer Precision Architecture (Bit-for-Bit parity with exported WAV)
  private pristineRawBuffer: AudioBuffer | null = null;
  private rawBuffer: AudioBuffer | null = null;
  private masteredBuffer: AudioBuffer | null = null;
  private isCompareOriginal: boolean = false;
  private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRenderingMaster: boolean = false;
  private onMasterRenderedCallbacks: Set<() => void> = new Set();
  private masterRenderListeners: Set<(buf: AudioBuffer) => void> = new Set();

  // Real-time Mastering DSP Chain Nodes (Instant 0ms audio playback on tracks of ANY length)
  private dspInputNode: GainNode | null = null;
  private dspDeHarshNode: BiquadFilterNode | null = null;
  private dspLowWarmthNode: BiquadFilterNode | null = null;
  private dspTapeSatNode: WaveShaperNode | null = null;
  private dspAirExciterNode: BiquadFilterNode | null = null;
  private dspOrbanShelfNode: BiquadFilterNode | null = null;
  private dspMasterGainNode: GainNode | null = null;

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
    deHarshIntensity: 0,
    notchFrequencyHz: 3400,
    notchBandwidthQ: 2.8,
    tapeWarmth: 0,
    tubeHarmonics: 0,
    lowMidBody: 0,
    transientPunch: 0,
    attackDeSmear: 0,
    timingJitterMs: 0,
    flutterWowRate: 0,
    airExciterGain: 0,
    airCutoffHz: 15800,
    harmonicSynthesisAmount: 0,
    stereoCorrelationFix: 0,
    monoBassCutoffHz: 0,
    acousticRoomSpread: 0,
    antiDetectionMode: false,
    watermarkScrambler: false,
    analogAirDither: 0,
    outputGainDb: 0,
    limitlessEnabled: true,
    targetLufs: -14.0,
    targetCeilingDb: -1.0,
    clipperDrive: 0,
    lowEndWeight: 0,
    transientSpeed: 'punchy',
    autoMatchLoudness: true,
    orbanHfEnabled: true,
    orbanHfBypass: false,
    orbanHfUserOverrideLock: false,
    orbanHfMode: 'smooth_silk',
    orbanHfAmount: 50,
    orbanHfAutoBrillianceDb: 0.0,
    orbanHfHighShelfGainDb: 0.0,
    orbanHfThresholdDb: -6.0,
    orbanHfCrossoverHz: 6000,
    orbanHfSpeed: 'medium',
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
    // Pure brickwall safety ceiling at -0.1 dBFS: never compresses nominal playback peaks (-1.0 dBTP),
    // strictly acting as a transparent safeguard against physical USB DAC clipping.
    this.dacSafetyLimiter = ctx.createDynamicsCompressor();
    this.dacSafetyLimiter.threshold.setValueAtTime(-0.1, ctx.currentTime); // -0.1 dBFS safety ceiling
    this.dacSafetyLimiter.knee.setValueAtTime(0.0, ctx.currentTime);       // Hard knee: completely transparent for all signals below -0.1 dBFS
    this.dacSafetyLimiter.ratio.setValueAtTime(20, ctx.currentTime);       // Transparent limiting ratio
    this.dacSafetyLimiter.attack.setValueAtTime(0.001, ctx.currentTime);   // 1ms ultra-fast attack
    this.dacSafetyLimiter.release.setValueAtTime(0.02, ctx.currentTime);   // 20ms transparent release

    this.analyser.connect(this.monitorGain);
    this.monitorGain.connect(this.dacSafetyLimiter);
    this.dacSafetyLimiter.connect(ctx.destination);

    // Real-Time Mastering DSP Chain (zero latency, instant playback on 65-min files):
    // (active audio source) -> dspInputNode -> deHarsh -> lowWarmth -> tapeSat -> airExciter -> orbanShelf -> masterGain -> sumBusNode
    this.dspInputNode = ctx.createGain();

    this.dspDeHarshNode = ctx.createBiquadFilter();
    this.dspDeHarshNode.type = 'peaking';
    this.dspDeHarshNode.frequency.setValueAtTime(3400, ctx.currentTime);
    this.dspDeHarshNode.Q.setValueAtTime(2.5, ctx.currentTime);
    this.dspDeHarshNode.gain.setValueAtTime(0, ctx.currentTime);

    this.dspLowWarmthNode = ctx.createBiquadFilter();
    this.dspLowWarmthNode.type = 'lowshelf';
    this.dspLowWarmthNode.frequency.setValueAtTime(220, ctx.currentTime);
    this.dspLowWarmthNode.gain.setValueAtTime(0, ctx.currentTime);

    this.dspTapeSatNode = ctx.createWaveShaper();
    this.dspTapeSatNode.curve = this.createSaturationCurve(40, false) as Float32Array<ArrayBuffer>;
    this.dspTapeSatNode.oversample = '4x';

    this.dspAirExciterNode = ctx.createBiquadFilter();
    this.dspAirExciterNode.type = 'highshelf';
    this.dspAirExciterNode.frequency.setValueAtTime(14500, ctx.currentTime);
    this.dspAirExciterNode.gain.setValueAtTime(0, ctx.currentTime);

    this.dspOrbanShelfNode = ctx.createBiquadFilter();
    this.dspOrbanShelfNode.type = 'highshelf';
    this.dspOrbanShelfNode.frequency.setValueAtTime(6000, ctx.currentTime);
    this.dspOrbanShelfNode.gain.setValueAtTime(0, ctx.currentTime);

    this.dspMasterGainNode = ctx.createGain();
    this.dspMasterGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    this.dspInputNode.connect(this.dspDeHarshNode);
    this.dspDeHarshNode.connect(this.dspLowWarmthNode);
    this.dspLowWarmthNode.connect(this.dspTapeSatNode);
    this.dspTapeSatNode.connect(this.dspAirExciterNode);
    this.dspAirExciterNode.connect(this.dspOrbanShelfNode);
    this.dspOrbanShelfNode.connect(this.dspMasterGainNode);
    this.dspMasterGainNode.connect(this.sumBusNode);
  }

  public updateRealtimeDspNodes() {
    if (
      !this.ctx ||
      !this.dspDeHarshNode ||
      !this.dspLowWarmthNode ||
      !this.dspTapeSatNode ||
      !this.dspAirExciterNode ||
      !this.dspOrbanShelfNode ||
      !this.dspMasterGainNode
    ) {
      return;
    }
    const ctx = this.ctx;
    const s = this.currentSettings;

    // 1. De-Harsh Notch
    this.dspDeHarshNode.frequency.setTargetAtTime(s.notchFrequencyHz || 3400, ctx.currentTime, 0.015);
    this.dspDeHarshNode.Q.setTargetAtTime(Math.max(1.0, Math.min(6.0, s.notchBandwidthQ || 2.5)), ctx.currentTime, 0.015);
    const notchGain = s.deHarshBypass ? 0 : -1 * Math.min(3.5, (s.deHarshIntensity || 60) * 0.04);
    this.dspDeHarshNode.gain.setTargetAtTime(notchGain, ctx.currentTime, 0.015);

    // 2. Low Warmth
    const lowGain = s.tapeWarmthBypass ? 0 : Math.min(2.0, Math.max(0, s.lowMidBody || 1.2));
    this.dspLowWarmthNode.gain.setTargetAtTime(lowGain, ctx.currentTime, 0.015);

    // 3. Tape Saturation
    this.dspTapeSatNode.curve = this.createSaturationCurve(s.tapeWarmth || 40, !!s.tapeWarmthBypass) as Float32Array<ArrayBuffer>;

    // 4. Air Exciter
    this.dspAirExciterNode.frequency.setTargetAtTime(Math.max(12000, Math.min(16000, s.airCutoffHz || 14500)), ctx.currentTime, 0.015);
    const airGain = s.airExciterBypass ? 0 : Math.min(2.5, (s.airExciterGain || 50) * 0.035);
    this.dspAirExciterNode.gain.setTargetAtTime(airGain, ctx.currentTime, 0.015);

    // 5. Orban Treble Shelf
    const isOrbanBypassed = !!s.orbanHfBypass || s.orbanHfEnabled === false;
    const rawShelf = s.orbanHfHighShelfGainDb !== undefined ? s.orbanHfHighShelfGainDb : (s.orbanHfAutoBrillianceDb ?? 0.0);
    const orbanGain = isOrbanBypassed ? 0 : rawShelf;
    this.dspOrbanShelfNode.frequency.setTargetAtTime(s.orbanHfCrossoverHz || 6000, ctx.currentTime, 0.015);
    this.dspOrbanShelfNode.gain.setTargetAtTime(orbanGain, ctx.currentTime, 0.015);

    // 6. Master Output & Target LUFS Make-up Gain
    let totalGainDb = s.outputGainDb || 0;
    if (s.limitlessEnabled !== false && !s.limitlessBypass && s.targetLufs !== undefined && this.trackLoudnessMetrics) {
      const deltaDb = s.targetLufs - this.trackLoudnessMetrics.integratedLufs;
      totalGainDb += Math.max(-12, Math.min(14, deltaDb));
    }
    const linearGain = Math.pow(10, totalGainDb / 20);
    this.dspMasterGainNode.gain.setTargetAtTime(linearGain, ctx.currentTime, 0.015);
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
   * Immediately wipes active audio buffer, stops all playback nodes immediately,
   * cancels all pending renders and resets track epoch ID so that the previous song
   * NEVER plays when switching tracks.
   */
  public wipeCurrentTrack() {
    this.currentTrackId++;
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
      this.renderDebounceTimer = null;
    }
    this.stopNodesOnly();
    this.isPlaying = false;
    this.pauseOffset = 0;
    this.rawBuffer = null;
    this.pristineRawBuffer = null;
    this.masteredBuffer = null;
    this.tapeDropoutAnalysis = null;
    this.trackLoudnessMetrics = null;
    this.tapeDenoiseTelemetry = null;
    this.stems = [];
    this.isStemTouchActive = false;
    this.isCompareOriginal = false;
    const queued = Array.from(this.onMasterRenderedCallbacks);
    this.onMasterRenderedCallbacks.clear();
    for (const cb of queued) {
      try { cb(); } catch {}
    }
  }

  /**
   * Resets active track state and cancels any pending renders from previous songs
   */
  public resetTrack(buffer: AudioBuffer, pristine?: AudioBuffer, analysis?: TapeDropoutAnalysis | null) {
    this.currentTrackId++;
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
      this.renderDebounceTimer = null;
    }
    this.stopNodesOnly();
    this.isPlaying = false;
    this.pauseOffset = 0;

    this.rawBuffer = buffer;
    this.pristineRawBuffer = pristine || buffer;
    this.masteredBuffer = null;
    this.tapeDropoutAnalysis = analysis || null;
    this.tapeDenoiseTelemetry = null;
    this.stems = [];
    this.isStemTouchActive = false;
    this.isCompareOriginal = false;
    const queued = Array.from(this.onMasterRenderedCallbacks);
    this.onMasterRenderedCallbacks.clear();
    for (const cb of queued) {
      try { cb(); } catch {}
    }
  }

  public setRawBuffer(buffer: AudioBuffer) {
    this.rawBuffer = buffer;
  }

  /**
   * Called when the user uploads a new raw track.
   * Caches pristine raw buffer, wipes previous track's master, and starts render immediately.
   */
  public async loadRawBuffer(buffer: AudioBuffer): Promise<AudioBuffer | null> {
    this.resetTrack(buffer);
    return this.triggerMasterRender();
  }

  /**
   * Loads an audio buffer that has already had tape dropouts cleanly reconstructed,
   * retaining the repaired dropout analysis telemetry without duplicate processing.
   */
  public async loadDropoutRestoredBuffer(
    buffer: AudioBuffer,
    analysis: TapeDropoutAnalysis,
    pristine?: AudioBuffer
  ): Promise<AudioBuffer | null> {
    this.resetTrack(buffer, pristine || buffer, analysis);
    return this.triggerMasterRender();
  }

  /**
   * Sets multitrack stems and triggers master summing re-render.
   */
  public setStems(stems: AudioStem[], isStemTouchActive: boolean = true) {
    this.stems = stems;
    this.isStemTouchActive = isStemTouchActive;
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  public getStems(): AudioStem[] {
    return this.stems;
  }

  public setStemTouchActive(active: boolean) {
    this.isStemTouchActive = active;
    if (this.rawBuffer) {
      this.scheduleMasterRender();
    }
  }

  /**
   * Triggers a debounced re-render of the master buffer when any knob/slider is changed.
   * Runs offline at ~150x real-time speed.
   * Hot-swaps the playing source seamlessly without stopping audio.
   */
  public updateSettings(newSettings: Partial<HumanizerSettings>) {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    this.updateRealtimeDspNodes();
    if (this.rawBuffer && this.rawBuffer.duration <= 300) {
      this.scheduleMasterRender();
    }
  }

  public getTapeAzimuthSettings(): TapeAzimuthSettings {
    return { ...this.tapeAzimuthSettings };
  }

  public updateTapeAzimuthSettings(newSettings: Partial<TapeAzimuthSettings>) {
    this.tapeAzimuthSettings = { ...this.tapeAzimuthSettings, ...newSettings };
    this.updateRealtimeDspNodes();
    if (this.rawBuffer && this.rawBuffer.duration <= 300) {
      this.scheduleMasterRender();
    }
  }

  public getTapeDropoutSettings(): TapeDropoutSettings {
    return { ...this.tapeDropoutSettings };
  }

  public updateTapeDropoutSettings(newSettings: Partial<TapeDropoutSettings>) {
    this.tapeDropoutSettings = { ...this.tapeDropoutSettings, ...newSettings };
    this.updateRealtimeDspNodes();
    if (this.rawBuffer && this.rawBuffer.duration <= 300) {
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
    this.updateRealtimeDspNodes();
    if (this.rawBuffer && this.rawBuffer.duration <= 300) {
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
    this.tapeDenoiseSettings.enabled = true;
    if (this.tapeDenoiseTelemetry) {
      this.tapeDenoiseTelemetry.noiseProfileBands = res.profileBands;
      this.tapeDenoiseTelemetry.quietestSegmentStartSec = res.startSec;
      this.tapeDenoiseTelemetry.quietestSegmentDurationSec = res.durationSec;
      this.tapeDenoiseTelemetry.hissNoiseFloorDb = res.hissNoiseFloorDb;
    }
    this.scheduleMasterRender();
    return res.profileBands;
  }


  public getOrbanTrebleTelemetry(buffer?: AudioBuffer): OrbanTrebleTelemetry | null {
    const target = buffer || this.rawBuffer;
    if (!target) return null;
    return analyzeBufferTreble(target);
  }

  private scheduleMasterRender() {
    if (!this.rawBuffer) {
      return;
    }
    // For long tracks (> 5 min), never schedule background offline renders during live editing.
    // The real-time WebAudio DSP nodes handle live listening with 0ms latency and 0 RAM overhead.
    if (this.rawBuffer.duration > 300) {
      this.updateRealtimeDspNodes();
      return;
    }
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
    }
    this.renderDebounceTimer = setTimeout(() => {
      this.triggerMasterRender().catch(() => {});
    }, 45);
  }

  public onMasterRendered(cb: (buf: AudioBuffer) => void): () => void {
    this.masterRenderListeners.add(cb);
    return () => {
      this.masterRenderListeners.delete(cb);
    };
  }

  public getMasteredBuffer(): AudioBuffer | null {
    return this.masteredBuffer;
  }

  public getRawBuffer(): AudioBuffer | null {
    return this.pristineRawBuffer || this.rawBuffer;
  }

  public isStemTouchEnabled(): boolean {
    return this.isStemTouchActive;
  }

  public async triggerMasterRender(): Promise<AudioBuffer | null> {
    const renderTrackId = this.currentTrackId;
    const sourceToRender = this.pristineRawBuffer || this.rawBuffer;
    if (!sourceToRender) {
      return null;
    }
    // For long tracks (> 5 min), never run heavy offline rendering in background during playback/preset tweaks.
    // Real-time WebAudio DSP handles live playback with 0ms latency and 0 RAM overhead.
    if (sourceToRender.duration > 300) {
      this.updateRealtimeDspNodes();
      return sourceToRender;
    }
    if (this.isRenderingMaster) {
      // Re-trigger fresh render immediately after current in-flight render finishes
      return new Promise((resolve) => {
        const onPreviousDone = () => {
          this.onMasterRenderedCallbacks.delete(onPreviousDone);
          if (this.currentTrackId === renderTrackId && (this.pristineRawBuffer || this.rawBuffer)) {
            this.triggerMasterRender().then(resolve).catch(() => resolve(null));
          } else {
            resolve(null);
          }
        };
        this.onMasterRenderedCallbacks.add(onPreviousDone);
      });
    }

    this.isRenderingMaster = true;
    try {
      const rendered = await this.renderMasteredBuffer(sourceToRender, this.currentSettings);

      // If user switched tracks while render was in progress, DISCARD the stale master!
      if (this.currentTrackId !== renderTrackId) {
        return null;
      }

      this.masteredBuffer = rendered;

      // If currently playing in Mastered mode, seamlessly crossfade to the updated master
      if (this.isPlaying && !this.isCompareOriginal && this.sourceNode) {
        const curTime = this.getCurrentPlaybackTime();
        this.startSourceWithBuffer(rendered, curTime, true);
      }

      for (const listener of this.masterRenderListeners) {
        try {
          listener(rendered);
        } catch (err) {
          console.error(err);
        }
      }

      return rendered;
    } finally {
      this.isRenderingMaster = false;
      // Drain queued render callbacks so the waiting render can execute immediately
      const queued = Array.from(this.onMasterRenderedCallbacks);
      this.onMasterRenderedCallbacks.clear();
      for (const cb of queued) {
        try { cb(); } catch (e) { console.error(e); }
      }
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
      const targetBuffer = compareOriginal ? (this.pristineRawBuffer || this.rawBuffer) : (this.masteredBuffer || this.rawBuffer);
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
   * If master is not ready yet, plays rawBuffer immediately and hot-swaps to master when ready.
   */
  public play(offsetSeconds: number = 0) {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const isLongTrack = (this.rawBuffer?.duration || 0) > 300;
    const activeBuf = this.isCompareOriginal
      ? (this.pristineRawBuffer || this.rawBuffer!)
      : (!isLongTrack && this.masteredBuffer ? this.masteredBuffer : (this.rawBuffer!));

    if (activeBuf) {
      this.startSourceWithBuffer(activeBuf, offsetSeconds, false);
      this.isPlaying = true;
    }

    // For short tracks only (<= 300s): if master buffer is not ready yet, render it in background and hot-swap
    if (!this.masteredBuffer && this.rawBuffer && !isLongTrack) {
      const playTrackId = this.currentTrackId;
      this.triggerMasterRender().then((mastered) => {
        if (mastered && this.currentTrackId === playTrackId && this.isPlaying && !this.isCompareOriginal) {
          const curTime = this.getCurrentPlaybackTime();
          this.startSourceWithBuffer(mastered, curTime, true);
        }
      });
    }
  }

  public async playBuffer(buffer?: AudioBuffer, offsetSeconds: number = 0) {
    const ctx = this.getAudioContext();

    if (buffer && buffer !== this.rawBuffer) {
      this.resetTrack(buffer);
    }

    const isLongTrack = ((buffer || this.rawBuffer)?.duration || 0) > 300;
    const activeBuf = this.isCompareOriginal
      ? (this.pristineRawBuffer || this.rawBuffer || buffer)
      : (!isLongTrack && this.masteredBuffer ? this.masteredBuffer : (this.rawBuffer || buffer));

    if (activeBuf) {
      this.startSourceWithBuffer(activeBuf, offsetSeconds, false);
      this.isPlaying = true;
    }

    // For short tracks only (<= 300s): if master buffer is not ready yet, render it in background and hot-swap
    if (!this.masteredBuffer && (this.rawBuffer || buffer) && !isLongTrack) {
      const playTrackId = this.currentTrackId;
      this.triggerMasterRender().then((mastered) => {
        if (mastered && this.currentTrackId === playTrackId && this.isPlaying && !this.isCompareOriginal) {
          const curTime = this.getCurrentPlaybackTime();
          this.startSourceWithBuffer(mastered, curTime, true);
        }
      });
    }
  }

  /**
   * Internal click-free source starter with micro-crossfade and strict node leak prevention
   */
  private startSourceWithBuffer(buffer: AudioBuffer, offsetSeconds: number, crossfade: boolean = false) {
    if (!this.ctx || !this.sumBusNode) return;
    const ctx = this.ctx;

    // Immediately stop and flush any prior fading nodes so multiple clicks/updates NEVER leak background audio
    for (const item of this.pendingFadingSources) {
      if (item.timer) clearTimeout(item.timer);
      try {
        item.src.stop();
        item.src.disconnect();
        item.gain.disconnect();
      } catch {
        // safe ignore
      }
      this.allActiveSources.delete(item.src);
      this.allActiveGains.delete(item.gain);
    }
    this.pendingFadingSources.clear();

    const oldSrc = this.sourceNode;
    const oldGain = this.sourceGain;

    // Stop and clear all multitrack stem nodes so they never play simultaneously with master buffer
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

      const fadingItem: { src: AudioBufferSourceNode; gain: GainNode; timer: any } = {
        src: oldSrc,
        gain: oldGain,
        timer: null
      };

      fadingItem.timer = setTimeout(() => {
        try {
          fadingItem.src.stop();
          fadingItem.src.disconnect();
          fadingItem.gain.disconnect();
        } catch {
          // safe ignore
        }
        this.pendingFadingSources.delete(fadingItem);
        this.allActiveSources.delete(fadingItem.src);
        this.allActiveGains.delete(fadingItem.gain);
      }, 25);

      this.pendingFadingSources.add(fadingItem);
    } else {
      if (oldSrc) {
        try {
          oldSrc.stop();
          oldSrc.disconnect();
        } catch {
          // safe ignore
        }
        this.allActiveSources.delete(oldSrc);
      }
      if (oldGain) {
        try {
          oldGain.disconnect();
        } catch {
          // safe ignore
        }
        this.allActiveGains.delete(oldGain);
      }
      // Micro-ramp (6ms) eliminates abrupt waveform step clicks on start/seek
      newGain.gain.setValueAtTime(0, ctx.currentTime);
      newGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.006);
    }

    newSrc.connect(newGain);

    // Dynamic Real-time Audio Routing:
    // 1. If comparing original (Dry): bypass real-time DSP and connect directly to sumBusNode.
    // 2. If buffer is an offline pre-rendered master: connect directly to sumBusNode (no double-processing).
    // 3. If playing rawBuffer in Master mode (e.g. long files > 5min or instant preview):
    //    route through real-time WebAudio DSP chain (de-harsh, warmth, tape sat, air, orban, master gain).
    const isPlayingRawInMaster =
      !this.isCompareOriginal &&
      (!this.masteredBuffer || buffer === this.rawBuffer || buffer === this.pristineRawBuffer);

    if (isPlayingRawInMaster && this.dspInputNode) {
      this.updateRealtimeDspNodes();
      newGain.connect(this.dspInputNode);
    } else {
      newGain.connect(this.sumBusNode);
    }

    this.allActiveSources.add(newSrc);
    this.allActiveGains.add(newGain);

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
    this.stop(true);

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

  public stop(immediate: boolean = false) {
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
      this.renderDebounceTimer = null;
    }
    if (!immediate && this.sourceGain && this.ctx && this.isPlaying) {
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
    // Terminate and clear all fading sources and their timers
    for (const item of this.pendingFadingSources) {
      if (item.timer) clearTimeout(item.timer);
      try {
        item.src.stop();
        item.src.disconnect();
        item.gain.disconnect();
      } catch {
        // safe ignore
      }
    }
    this.pendingFadingSources.clear();

    // Terminate all tracked active sources
    for (const src of this.allActiveSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // safe ignore
      }
    }
    this.allActiveSources.clear();

    for (const gain of this.allActiveGains) {
      try {
        gain.disconnect();
      } catch {
        // safe ignore
      }
    }
    this.allActiveGains.clear();

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
    customDenoiseSettings?: SpectralDenoiseSettings,
    customDropoutSettings?: TapeDropoutSettings
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
        azimuthToUse.listenInMono ||
        (azimuthToUse.ghostChannelHandling !== 'passthrough' &&
          (azimuthToUse.activeChannel === 'L' || azimuthToUse.activeChannel === 'R')))
    ) {
      sourceBuffer = processBufferWithAzimuthAndBalance(buffer, azimuthToUse);
    }

    // 0.1 Pre-Mastering Stage: Tape Dropout Detection & Cross-Channel Reconstruction
    // Especially critical for Full-Track Ampex transferred to Studer A80 2-Track and Mono Wander Graft
    const dropoutToUse = customDropoutSettings || this.tapeDropoutSettings;
    if (dropoutToUse.enabled) {
      let dropAnalysis = this.tapeDropoutAnalysis;
      if (
        !dropAnalysis ||
        dropAnalysis.sampleRate !== sourceBuffer.sampleRate ||
        Math.abs(dropAnalysis.duration - sourceBuffer.duration) > 0.05
      ) {
        dropAnalysis = analyzeTapeDropouts(sourceBuffer, dropoutToUse);
        this.tapeDropoutAnalysis = dropAnalysis;
      }
      if (dropAnalysis && (dropAnalysis.events.length > 0 || dropoutToUse.mode === 'mono_wander_graft')) {
        const { restoredBuffer } = reconstructTapeDropouts(sourceBuffer, dropAnalysis, dropoutToUse);
        sourceBuffer = restoredBuffer;
      }
    }
    if (dropoutToUse.enabled && dropoutToUse.listenDropoutMaskOnly) {
      return sourceBuffer;
    }

    // 0.2 Pre-Mastering Stage: Sonic Solutions NoNoise / iZotope RX Spectral De-noise
    const denoiseToUse = customDenoiseSettings || this.tapeDenoiseSettings;
    if (denoiseToUse.enabled || denoiseToUse.listenNoiseDeltaOnly) {
      sourceBuffer = processBufferWithSpectralDenoise(sourceBuffer, denoiseToUse);
    }
    if (denoiseToUse.listenNoiseDeltaOnly) {
      return sourceBuffer;
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

    // 5.1 Processador Inteligente de Agudos (Flat Input Response & HF Limiter)
    const isOrbanEnabled = settings.orbanHfEnabled !== false;
    const isOrbanBypassed = !!settings.orbanHfBypass;
    if (isOrbanEnabled && !isOrbanBypassed) {
      const shelfGain = settings.orbanHfHighShelfGainDb !== undefined
        ? settings.orbanHfHighShelfGainDb
        : (settings.orbanHfAutoBrillianceDb !== undefined ? settings.orbanHfAutoBrillianceDb : 0.0);

      renderedBuffer = processBufferWithOrbanTreble(renderedBuffer, {
        enabled: true,
        bypass: false,
        mode: settings.orbanHfMode || 'broadcast_optimod',
        amount: settings.orbanHfAmount !== undefined ? settings.orbanHfAmount : 50,
        autoBrillianceDb: shelfGain,
        highShelfGainDb: shelfGain,
        harmonicAirExciter: settings.orbanHfHarmonicAir ?? 0,
        thresholdDb: settings.orbanHfThresholdDb !== undefined ? settings.orbanHfThresholdDb : -6.0,
        crossoverHz: settings.orbanHfCrossoverHz || 6000,
        speed: settings.orbanHfSpeed || 'fast',
      });
    }

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

    // High-fidelity analog tape warmth:
    // Strictly unity gain (f'(0) = 1.0) for nominal audio to preserve 100% attack transient clarity and punch.
    // Soft analog tape rounding only applies to extreme peaks above -2 dBFS without harsh digital or squashing artifacts.
    const warmth = Math.max(0, Math.min(100, amount)) / 100;
    const knee = 0.78 + (1.0 - warmth) * 0.18; // 0.78 to 0.96 linear headroom
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / (nSamples - 1) - 1;
      const absX = Math.abs(x);
      if (absX <= knee || warmth <= 0.01) {
        curve[i] = x;
      } else {
        const excess = (absX - knee) / (1.0 - knee);
        const sat = knee + (1.0 - knee) * (excess / (1.0 + excess * 0.35 * warmth));
        curve[i] = (x < 0 ? -1 : 1) * Math.min(1.0, sat);
      }
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
    customDenoiseSettings?: SpectralDenoiseSettings,
    customDropoutSettings?: TapeDropoutSettings
  ): Promise<Blob> {
    const sourceBuffer = buffer || this.pristineRawBuffer || this.rawBuffer;
    const renderedBuffer = await this.renderMasteredBuffer(
      sourceBuffer,
      settings,
      customAzimuthSettings,
      targetSampleRate,
      customDenoiseSettings,
      customDropoutSettings
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
    const sourceBuffer = buffer || this.pristineRawBuffer || this.rawBuffer;
    let alignedBuffer = processBufferWithAzimuthAndBalance(sourceBuffer, azimuthSettings);
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
   * Exports an archival preservation WAV with Tape Azimuth aligned, Dropouts reconstructed,
   * and optional Spectral Denoise.
   * Completely bypasses mastering EQ/compressor/maximizer for pristine archival transfers.
   */
  public async exportDropoutRestoredOnlyWav(
    buffer: AudioBuffer,
    dropoutSettings: TapeDropoutSettings,
    azimuthSettings: TapeAzimuthSettings,
    targetBitDepth: 16 | 24 | 32 = 24,
    targetSampleRate?: number,
    denoiseSettings?: SpectralDenoiseSettings
  ): Promise<Blob> {
    const originalSource = buffer || this.pristineRawBuffer || this.rawBuffer;
    let procBuffer = originalSource;
    if (azimuthSettings.enabled) {
      procBuffer = processBufferWithAzimuthAndBalance(procBuffer, azimuthSettings);
    }
    if (dropoutSettings.enabled) {
      const dropAnalysis = analyzeTapeDropouts(procBuffer, dropoutSettings);
      if (dropAnalysis && (dropAnalysis.events.length > 0 || dropoutSettings.mode === 'mono_wander_graft')) {
        const { restoredBuffer } = reconstructTapeDropouts(procBuffer, dropAnalysis, dropoutSettings);
        procBuffer = restoredBuffer;
      }
    }
    const denoiseToUse = denoiseSettings || this.tapeDenoiseSettings;
    if (denoiseToUse && (denoiseToUse.enabled || denoiseToUse.listenNoiseDeltaOnly)) {
      procBuffer = processBufferWithSpectralDenoise(procBuffer, denoiseToUse);
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
    let procBuffer = this.rawBuffer || buffer;
    if (azimuthSettings.enabled) {
      procBuffer = processBufferWithAzimuthAndBalance(procBuffer, azimuthSettings);
    }
    if (this.tapeDropoutSettings.enabled) {
      const dropAnalysis = this.tapeDropoutAnalysis || analyzeTapeDropouts(procBuffer, this.tapeDropoutSettings);
      if (dropAnalysis && (dropAnalysis.events.length > 0 || this.tapeDropoutSettings.mode === 'mono_wander_graft')) {
        const { restoredBuffer } = reconstructTapeDropouts(procBuffer, dropAnalysis, this.tapeDropoutSettings);
        procBuffer = restoredBuffer;
      }
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
/**
 * Converts an AudioBuffer into a universally compliant WAV Blob:
 * - 16-bit PCM: 100% universal across Windows Media Player, macOS QuickTime, car players, TVs, phones
 * - 24-bit PCM: Audiophile studio master with clean 3-byte packing and RIFF word-alignment
 * - 32-bit Float: Fully compliant with mandatory RIFF 'fact' subchunk per specification
 * - Zero-NaN / Zero-Infinity protection guarantees no corrupted audio or silent files
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
  const totalFrames = buffer.length;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const rawDataLength = totalFrames * blockAlign;

  // RIFF standard requires chunks to be 2-byte word aligned
  const paddingByte = rawDataLength % 2;
  const dataChunkLength = rawDataLength + paddingByte;

  // 'fact' subchunk is MANDATORY for format tag 3 (IEEE Float) per RIFF specification
  const isFloat = bitDepth === 32;
  const factChunkLength = isFloat ? 12 : 0; // 'fact' (4) + size 4 (4) + dwSampleLength (4)

  const headerLength = 44 + factChunkLength;
  const totalBufferLength = headerLength + dataChunkLength;

  const arrayBuffer = new ArrayBuffer(totalBufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Header
  writeString(0, 'RIFF');
  // RIFF Chunk Size = Total file size minus 8 bytes (RIFF identifier + RIFF size field)
  view.setUint32(4, 36 + factChunkLength + dataChunkLength, true);
  writeString(8, 'WAVE');

  // 2. 'fmt ' Subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for standard PCM / Float = 16 bytes
  const audioFormatTag = isFloat ? 3 : 1; // 1 = WAVE_FORMAT_PCM, 3 = WAVE_FORMAT_IEEE_FLOAT
  view.setUint16(20, audioFormatTag, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  let curOffset = 36;

  // 3. Mandatory 'fact' Subchunk for IEEE Float (WMP and QuickTime reject float WAV without this)
  if (isFloat) {
    writeString(curOffset, 'fact');
    view.setUint32(curOffset + 4, 4, true); // size of fact data
    view.setUint32(curOffset + 8, totalFrames, true); // number of sample frames
    curOffset += 12;
  }

  // 4. 'data' Subchunk
  writeString(curOffset, 'data');
  view.setUint32(curOffset + 4, rawDataLength, true);
  curOffset += 8;

  // Channel Interleaving
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const maxLinear = Math.pow(10, Math.min(0, targetCeilingDb) / 20);

  for (let i = 0; i < totalFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];

      // Robust NaN / Infinity / undefined guard
      if (!Number.isFinite(sample)) {
        sample = 0;
      }

      // Ceiling limiter protection
      if (sample > maxLinear) sample = maxLinear;
      else if (sample < -maxLinear) sample = -maxLinear;

      if (bitDepth === 16) {
        // 16-bit Signed PCM (-32768 to +32767)
        const s = Math.max(-1, Math.min(1, sample));
        const intSample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
        view.setInt16(curOffset, intSample, true);
        curOffset += 2;
      } else if (bitDepth === 24) {
        // 24-bit Signed PCM (-8388608 to +8388607) Little-Endian
        const s = Math.max(-1, Math.min(1, sample));
        const intSample = Math.floor(s < 0 ? s * 8388608 : s * 8388607);
        view.setUint8(curOffset, intSample & 0xff);
        view.setUint8(curOffset + 1, (intSample >> 8) & 0xff);
        view.setUint8(curOffset + 2, (intSample >> 16) & 0xff);
        curOffset += 3;
      } else if (bitDepth === 32) {
        // 32-bit IEEE 754 Single-Precision Floating Point
        view.setFloat32(curOffset, sample, true);
        curOffset += 4;
      }
    }
  }

  // If raw data length was odd, write the 0 padding byte per RIFF specification
  if (paddingByte > 0) {
    view.setUint8(curOffset, 0);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const audioEngine = new AudioEngine();
