import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX, Download, Sparkles } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  isHumanizedActive: boolean;
  onToggleAB: () => void;
  onExport: () => void;
  isExporting: boolean;
  detectedPlatformName?: string;
  hasAudioLoaded?: boolean;
  outputSampleRate?: number;
  outputBitDepth?: number;
  targetLufs?: number;
  targetCeilingDb?: number;
  currentPresetName?: string;
}


/**
 * Dedicated Hardware-style Master Stereo VU Meter
 * Displays real Left (L) and Right (R) channels with peak-hold ballistics and clipping indicators
 */
function MasterStereoVUMeter({ isPlaying }: { isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [digitalPeakL, setDigitalPeakL] = useState<number>(-70);
  const [digitalPeakR, setDigitalPeakR] = useState<number>(-70);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let peakLHold = 0;
    let peakRHold = 0;
    let peakLTimer = 0;
    let peakRTimer = 0;
    let smoothL = 0;
    let smoothR = 0;
    let throttleCounter = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      let targetL = 0;
      let targetR = 0;
      let isClipL = false;
      let isClipR = false;
      let curPeakDbL = -70;
      let curPeakDbR = -70;

      if (isPlaying) {
        const stats = audioEngine.getStereoLevels();
        targetL = stats.leftLevel;
        targetR = stats.rightLevel;
        isClipL = stats.isClippingL;
        isClipR = stats.isClippingR;
        curPeakDbL = stats.peakDbL;
        curPeakDbR = stats.peakDbR;

        // Update digital readout numbers at ~15fps to keep it crisp and legible
        throttleCounter++;
        if (throttleCounter % 4 === 0) {
          setDigitalPeakL(curPeakDbL);
          setDigitalPeakR(curPeakDbR);
        }
      } else if (throttleCounter !== 0) {
        throttleCounter = 0;
        setDigitalPeakL(-70);
        setDigitalPeakR(-70);
      }

      // Professional ballistic response: fast attack (instant), smooth decay
      smoothL = targetL > smoothL ? targetL : Math.max(0, smoothL * 0.86 - 0.5);
      smoothR = targetR > smoothR ? targetR : Math.max(0, smoothR * 0.86 - 0.5);

      // Peak Hold with 45-frame pause then gentle descent
      if (smoothL > peakLHold) {
        peakLHold = smoothL;
        peakLTimer = 45;
      } else if (peakLTimer > 0) {
        peakLTimer--;
      } else {
        peakLHold = Math.max(0, peakLHold - 1.8);
      }

      if (smoothR > peakRHold) {
        peakRHold = smoothR;
        peakRTimer = 45;
      } else if (peakRTimer > 0) {
        peakRTimer--;
      } else {
        peakRHold = Math.max(0, peakRHold - 1.8);
      }

      const barWidth = 7;
      const barGap = 4;
      const startX = 3;
      const meterTop = 5;
      const meterHeight = h - meterTop - 9; // leave 9px for L/R channel labels

      // Channel backgrounds
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(startX, meterTop, barWidth, meterHeight);
      ctx.fillRect(startX + barWidth + barGap, meterTop, barWidth, meterHeight);

      const drawBar = (x: number, level: number, peakVal: number, isClip: boolean, label: string) => {
        // Red Digital Clip LED at top
        ctx.fillStyle = isClip ? '#f43f5e' : '#1e293b';
        ctx.fillRect(x, 1, barWidth, 3);

        const fillH = (level / 100) * meterHeight;
        if (fillH > 0) {
          const grad = ctx.createLinearGradient(0, meterTop + meterHeight, 0, meterTop);
          grad.addColorStop(0, '#06b6d4');   // Cyan (-48 to -18 dBFS)
          grad.addColorStop(0.55, '#10b981'); // Emerald (-18 to -6 dBFS)
          grad.addColorStop(0.85, '#f59e0b'); // Amber (-6 to -1 dBFS)
          grad.addColorStop(1, '#ef4444');    // Red (> -1 dBFS)
          ctx.fillStyle = grad;
          ctx.fillRect(x, meterTop + meterHeight - fillH, barWidth, fillH);
        }

        // Peak Hold Line
        if (peakVal > 2) {
          const peakY = meterTop + meterHeight - (peakVal / 100) * meterHeight;
          ctx.fillStyle = peakVal > 95 ? '#ef4444' : '#fde047';
          ctx.fillRect(x, Math.max(meterTop, peakY - 1.2), barWidth, 1.8);
        }

        // Channel Letter (L / R)
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barWidth / 2, h - 1);
      };

      drawBar(startX, smoothL, peakLHold, isClipL, 'L');
      drawBar(startX + barWidth + barGap, smoothR, peakRHold, isClipR, 'R');
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0a0f1d] border border-slate-800 shadow-inner"
      title="Medidor Digital Master True Peak (Mede exatamente o barramento digital WAV, livre de interferência do volume de escuta)"
    >
      <canvas
        ref={canvasRef}
        width={28}
        height={34}
        className="block"
      />
      <div className="flex flex-col text-[8.5px] font-mono leading-tight tabular-nums text-slate-400">
        <span className="text-[7.5px] text-slate-500 uppercase tracking-wider font-semibold">SAÍDA DIGITAL</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">L:</span>
          <span className={digitalPeakL >= -0.5 ? 'text-amber-400 font-bold' : digitalPeakL > -70 ? 'text-cyan-300' : 'text-slate-600'}>
            {digitalPeakL > -60 ? `${digitalPeakL.toFixed(1)}` : '- -.-'} dB
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">R:</span>
          <span className={digitalPeakR >= -0.5 ? 'text-amber-400 font-bold' : digitalPeakR > -70 ? 'text-cyan-300' : 'text-slate-600'}>
            {digitalPeakR > -60 ? `${digitalPeakR.toFixed(1)}` : '- -.-'} dB
          </span>
        </div>
      </div>
    </div>
  );
}

export function AudioPlayerBar({
  isPlaying,
  playbackTime,
  duration,
  onPlayPause,
  onStop,
  onSeek,
  isHumanizedActive,
  onToggleAB,
  onExport,
  isExporting,
  detectedPlatformName,
  hasAudioLoaded = true,
  outputSampleRate = 44100,
  outputBitDepth = 24,
  targetLufs = -14.0,
  targetCeilingDb = -1.0,
  currentPresetName,
}: AudioPlayerBarProps) {

  // Monitor Listening Fader: Default 0.90 (-1.0 dB True-Peak Safe Headroom for USB Audio Interfaces & DACs)
  const [volume, setVolume] = useState(0.90);
  const [isMuted, setIsMuted] = useState(false);

  // Handle monitor listening volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    audioEngine.setMasterVolume(isMuted ? 0 : newVol);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMasterVolume(nextMute ? 0 : volume);
  };

  const progressPercent = duration > 0 ? (playbackTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/95 backdrop-blur-md border-t border-slate-800 px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 select-none pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* DESKTOP LAYOUT (md and above) */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Group 1: Playback Transport & Time */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onPlayPause}
                disabled={!hasAudioLoaded}
                className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer min-w-[40px] min-h-[40px]"
                title={!hasAudioLoaded ? 'Carregue uma música para iniciar a reprodução' : isPlaying ? 'Pausar' : 'Reproduzir'}
                aria-label={isPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
              </button>

              <button
                onClick={onStop}
                disabled={!hasAudioLoaded}
                className="p-2 text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Parar e Reiniciar"
                aria-label="Parar e reiniciar"
              >
                <Square className="w-4 h-4" />
              </button>

              <button
                onClick={() => onSeek(0)}
                disabled={!hasAudioLoaded}
                className="p-2 text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Voltar ao Início"
                aria-label="Voltar ao início"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-mono text-slate-300 tabular-nums">
              <span className="text-white font-semibold">{formatTime(playbackTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Group 2: Center Progress Scrubber */}
          <div className="flex-1 max-w-xl mx-2 flex items-center">
            <div className="relative w-full flex items-center group">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={playbackTime}
                disabled={!hasAudioLoaded}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:cursor-not-allowed"
                aria-label="Barra de progresso e busca de tempo"
              />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-cyan-500/30 rounded-l-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Group 3: Monitoring, VU Meters, Volume & Export */}
          <div className="flex items-center gap-3 shrink-0">
            {/* A/B Compare Button */}
            <button
              onClick={onToggleAB}
              disabled={!hasAudioLoaded}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all shadow-xs cursor-pointer min-h-[38px] disabled:opacity-40 disabled:cursor-not-allowed ${
                isHumanizedActive
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60 ring-1 ring-emerald-500/30'
                  : 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/60 ring-1 ring-amber-500/30'
              }`}
              title={
                isHumanizedActive
                  ? 'Ouvindo com Masterizador de Estúdio ativo. Clique para comparar com o áudio cru original sem efeitos.'
                  : 'Ouvindo o arquivo original cru sem efeitos. Clique para reativar o sinal masterizado.'
              }
            >
              <Sparkles className={`w-3.5 h-3.5 ${isHumanizedActive ? 'text-emerald-400' : 'text-amber-400'} shrink-0`} />
              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">
                    Sinal:
                  </span>
                  {isHumanizedActive && currentPresetName?.toLowerCase().includes('recall') && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/50 animate-pulse">
                      RECALL ATIVO
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">
                  {isHumanizedActive ? `✨ Masterizado (${currentPresetName || 'Preset'})` : `⚠️ Cru (${detectedPlatformName || 'Faixa'})`}
                </span>
              </div>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700/60">
                A/B
              </span>
            </button>

            {/* Master Stereo Level Meters & Target LUFS Indicator */}
            <div className="flex items-center gap-1.5">
              <MasterStereoVUMeter isPlaying={isPlaying} />
              <div
                className="hidden xl:flex flex-col text-[9px] font-mono leading-tight px-1.5 py-1 rounded bg-[#0a0f1d] border border-slate-800 text-slate-400"
                title={`Alvo de Loudness: ${targetLufs} LUFS · Teto True-Peak: ${targetCeilingDb} dBTP`}
              >
                <span className="text-cyan-400 font-bold">{targetLufs.toFixed(1)} LUFS</span>
                <span className="text-emerald-400">{targetCeilingDb.toFixed(1)} dBTP</span>
              </div>
            </div>

            {/* Studio Monitor Fader */}
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] px-2 py-1 rounded-lg border border-slate-800 min-h-[38px]">
              <button
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={isMuted ? 'Desmutar Monitor' : 'Mutar Monitor'}
                aria-label={isMuted ? 'Desmutar Monitor' : 'Mutar Monitor'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 leading-tight gap-1">
                  <span>MONITOR</span>
                  <span className={volume >= 0.99 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
                    {volume >= 0.99 ? '0 dB' : `${(20 * Math.log10(Math.max(0.001, volume))).toFixed(1)} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  title="Atenuador de Escuta (Padrão -1.0 dB: Headroom seguro contra distorção inter-amostras em DACs externos)."
                  className="w-16 lg:w-20 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  aria-label="Atenuador de Escuta Monitor"
                />
              </div>
            </div>

            {/* Export WAV Button */}
            <button
              onClick={onExport}
              disabled={isExporting || !hasAudioLoaded}
              title={
                hasAudioLoaded
                  ? `Exportar Master em ${outputSampleRate} Hz / ${outputBitDepth}-bit WAV + Preset de Recall (.aurapreset)`
                  : 'Carregue uma música para exportar o master'
              }
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Renderizando...' : `Exportar Master (${outputBitDepth}-bit)`}</span>
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET LAYOUT (< md) - Clean Two-Tier Architecture */}
        <div className="flex md:hidden flex-col gap-2.5">
          {/* Mobile Tier 1: Transport Controls + Time + Full-width Scrubber */}
          <div className="flex items-center gap-2.5 w-full">
            <button
              onClick={onPlayPause}
              disabled={!hasAudioLoaded}
              className="w-11 h-11 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0 min-w-[44px] min-h-[44px]"
              title={!hasAudioLoaded ? 'Carregue uma música' : isPlaying ? 'Pausar' : 'Reproduzir'}
              aria-label={isPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              disabled={!hasAudioLoaded}
              className="p-2.5 text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Parar"
              aria-label="Parar reprodução"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Scrubber takes the available width */}
            <div className="flex-1 flex flex-col justify-center min-w-0 px-1">
              <div className="relative w-full flex items-center py-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={playbackTime}
                  disabled={!hasAudioLoaded}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:cursor-not-allowed touch-manipulation"
                  aria-label="Barra de progresso e busca de tempo"
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-cyan-500/30 rounded-l-lg pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 -mt-1 tabular-nums">
                <span className="text-white font-semibold">{formatTime(playbackTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Mobile Tier 2: Monitored Signal A/B + VU Meter + Monitor Volume + Quick Export */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
            {/* A/B Compare */}
            <button
              onClick={onToggleAB}
              disabled={!hasAudioLoaded}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer min-h-[44px] flex-1 min-w-[130px] disabled:opacity-40 disabled:cursor-not-allowed ${
                isHumanizedActive
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : 'bg-amber-950/70 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isHumanizedActive ? 'text-emerald-400' : 'text-amber-400'} shrink-0`} />
              <div className="flex flex-col text-left leading-tight truncate">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Sinal:</span>
                <span className="text-[11px] font-bold truncate">
                  {isHumanizedActive ? '✨ Masterizado' : '⚠️ Cru (Original)'}
                </span>
              </div>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700/60">
                A/B
              </span>
            </button>

            {/* VU Meter */}
            <div className="shrink-0 flex items-center min-h-[44px]">
              <MasterStereoVUMeter isPlaying={isPlaying} />
            </div>

            {/* Monitor Volume */}
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] px-2 py-1 rounded-lg border border-slate-800 min-h-[44px]">
              <button
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                title={isMuted ? 'Desmutar' : 'Mutar'}
                aria-label={isMuted ? 'Desmutar' : 'Mutar'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-400">
                  {volume >= 0.99 ? '0 dB' : `${(20 * Math.log10(Math.max(0.001, volume))).toFixed(0)} dB`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-14 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 touch-manipulation"
                  aria-label="Volume do monitor"
                />
              </div>
            </div>

            {/* Quick Export Button */}
            <button
              onClick={onExport}
              disabled={isExporting || !hasAudioLoaded}
              title={hasAudioLoaded ? `Exportar Master (${outputBitDepth}-bit)` : 'Carregue uma música'}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer min-h-[44px] shrink-0"
              aria-label="Exportar áudio masterizado"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '...' : `Master ${outputBitDepth}b`}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
