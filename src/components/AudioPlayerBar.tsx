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
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/95 backdrop-blur-md border-t border-slate-800 px-4 md:px-8 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Playback Controls & Time */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPlayPause}
              disabled={!hasAudioLoaded}
              className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-95"
              title={
                !hasAudioLoaded
                  ? 'Carregue uma música para iniciar a reprodução'
                  : isPlaying
                  ? 'Pausar'
                  : 'Reproduzir'
              }
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              disabled={!hasAudioLoaded}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800 transition-colors"
              title="Parar e Reiniciar"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSeek(0)}
              disabled={!hasAudioLoaded}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800 transition-colors"
              title="Voltar ao Início"
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

        {/* Center Progress Scrubber */}
        <div className="w-full md:flex-1 md:max-w-xl flex items-center gap-3">
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
            />
            {/* Visual buffered indicator */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-cyan-500/30 rounded-l-lg pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* A/B Switch, Volume & Export Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Zero-latency A/B Compare Button with unambiguous monitoring labels */}
          <button
            onClick={onToggleAB}
            disabled={!hasAudioLoaded}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
              isHumanizedActive
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60 ring-1 ring-emerald-500/30'
                : 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/60 ring-1 ring-amber-500/30'
            }`}
            title={
              isHumanizedActive
                ? 'Ouvindo com Masterizador de Estúdio ativo (calor de fita, de-harsh, ar sedoso e limiter). Clique para comparar com o áudio cru original sem efeitos.'
                : 'Ouvindo o arquivo original cru sem efeitos. Clique para reativar o sinal masterizado.'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${isHumanizedActive ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">
                Sinal Monitorado:
              </span>
              <span className="text-xs font-bold">
                {isHumanizedActive ? '✨ Masterizado (Estúdio)' : `⚠️ Original Cru (${detectedPlatformName || 'Faixa'})`}
              </span>
            </div>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700/60 hidden sm:inline">
              A/B
            </span>
          </button>

          {/* Master Stereo Level Meters (L / R) & Target LUFS Indicator */}
          <div className="flex items-center gap-1.5">
            <MasterStereoVUMeter isPlaying={isPlaying} />
            <div
              className="hidden lg:flex flex-col text-[9px] font-mono leading-tight px-1.5 py-1 rounded bg-[#0a0f1d] border border-slate-800 text-slate-400"
              title={`Alvo de Loudness: ${targetLufs} LUFS · Teto True-Peak: ${targetCeilingDb} dBTP`}
            >
              <span className="text-cyan-400 font-bold">{targetLufs.toFixed(1)} LUFS</span>
              <span className="text-emerald-400">{targetCeilingDb.toFixed(1)} dBTP</span>
            </div>
          </div>


          {/* Studio Monitor Fader (Controls listening volume to USB Audio Interface / Amp with True-Peak DAC protection) */}
          <div className="flex items-center gap-1.5 bg-[#0a0f1d] px-2 py-1 rounded-lg border border-slate-800">
            <button
              onClick={toggleMute}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title={isMuted ? 'Desmutar Monitor' : 'Mutar Monitor'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 leading-tight gap-1">
                <span>MONITOR</span>
                <span className={volume >= 0.99 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
                  {volume >= 0.99 ? '0 dB (Máx)' : `${(20 * Math.log10(Math.max(0.001, volume))).toFixed(1)} dB`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                title="Atenuador de Escuta (Padrão -1.0 dB: Headroom seguro contra distorção de inter-amostras em placas de áudio USB e DACs externos. Trava anti-clip ativa no hardware)."
                className="w-16 md:w-20 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Export WAV Button - preserves exact input sample rate and bits */}
          <button
            onClick={onExport}
            disabled={isExporting || !hasAudioLoaded}
            title={
              hasAudioLoaded
                ? `Exportar Master em ${outputSampleRate} Hz / ${outputBitDepth}-bit WAV (Mesma taxa e bits de entrada, sem conversão)`
                : 'Carregue uma música para exportar o master'
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isExporting ? 'Renderizando...' : `Exportar Master (${outputBitDepth}-bit)`}
            </span>
          </button>
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
