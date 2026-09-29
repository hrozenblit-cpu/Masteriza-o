import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { Activity, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SpectrogramCanvasProps {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  nyquistCutoffHz: number;
  onSeek: (time: number) => void;
  isAiDetected: boolean;
  detectedPlatformName: string;
}

export function SpectrogramCanvas({
  isPlaying,
  playbackTime,
  duration,
  nyquistCutoffHz,
  onSeek,
  isAiDetected,
  detectedPlatformName,
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'spectrum' | 'waveform'>('spectrum');

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 1024;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    // Ballistic smoothing and peak-hold memory for right-side Master Stereo VU Meter
    let smoothL = 0;
    let smoothR = 0;
    let peakLHold = 0;
    let peakRHold = 0;
    let peakLTimer = 0;
    let peakRTimer = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      // Reserve right 60px for dedicated Master Stereo VU Meter
      const vuWidth = 60;
      const mainWidth = width - vuWidth;

      // Clear canvas with dark gradient
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal frequency grid lines (within main spectrum width)
      ctx.lineWidth = 1;
      const freqMarkers = [
        { label: '20 kHz', f: 20000 },
        { label: '16.2 kHz', f: 16200, isCutoff: true },
        { label: '8 kHz', f: 8000 },
        { label: '3.4 kHz', f: 3400, isMetallic: true },
        { label: '1 kHz', f: 1000 },
        { label: '250 Hz', f: 250 },
      ];

      // Draw faint grid
      ctx.strokeStyle = '#151d2f';
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mainWidth, y);
        ctx.stroke();
      }

      if (analyser && isPlaying) {
        if (viewMode === 'spectrum') {
          analyser.getByteFrequencyData(freqData);

          // Render high-definition frequency spectrum bars
          const numBars = Math.min(160, Math.floor(mainWidth / 3));
          const barWidth = mainWidth / numBars;

          for (let i = 0; i < numBars; i++) {
            // Logarithmic frequency mapping
            const binIdx = Math.floor(Math.pow(i / numBars, 2) * (bufferLength / 2));
            const val = freqData[binIdx] || 0;
            const barHeight = (val / 255) * (height - 25);
            const x = i * barWidth;
            const y = height - barHeight;

            // Color grading: Cyan base -> Amber peak -> Purple/White transient
            const freqHz = (binIdx * 24000) / (bufferLength / 2);
            let barColor = '#06b6d4'; // Cyan

            if (freqHz > 16000 && isAiDetected) {
              barColor = '#f43f5e'; // Rose cutoff alert
            } else if (freqHz >= 3000 && freqHz <= 4500 && isAiDetected) {
              barColor = '#f59e0b'; // Amber metallic formant
            } else if (val > 210) {
              barColor = '#38bdf8';
            }

            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
          }
        } else {
          // Time domain waveform view
          analyser.getByteTimeDomainData(timeData);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();

          const sliceWidth = mainWidth / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();
        }
      } else {
        // Idle decorative prompt
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Clique em Reproduzir para visualizar a FFT em tempo real', mainWidth / 2, height / 2);
      }

      // Draw the Nyquist Brickwall line if AI cutoff is detected
      if (nyquistCutoffHz <= 18000 && viewMode === 'spectrum') {
        const cutoffRatio = Math.sqrt(nyquistCutoffHz / 22050);
        const cutoffX = mainWidth * Math.min(0.96, Math.max(0.6, cutoffRatio * 0.9));

        ctx.strokeStyle = '#f43f5e';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cutoffX, 0);
        ctx.lineTo(cutoffX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cutoff badge
        ctx.fillStyle = '#f43f5e';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Corte Nyquist IA (${nyquistCutoffHz} Hz)`, cutoffX - 6, 20);
      }

      // Draw timeline playback playhead indicator
      if (duration > 0) {
        const playheadX = (playbackTime / duration) * mainWidth;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        // Cursor head
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(playheadX, 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==========================================
      // RIGHT-SIDE MASTER STEREO VU METER (L / R)
      // ==========================================
      // 1. Column Divider
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mainWidth, 0);
      ctx.lineTo(mainWidth, height);
      ctx.stroke();

      // 2. VU Background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(mainWidth + 1, 0, vuWidth - 1, height);

      // 3. Top Title
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VU MASTER', mainWidth + vuWidth / 2, 12);

      // 4. Query Stereo Audio Levels
      let targetL = 0;
      let targetR = 0;
      let isClipL = false;
      let isClipR = false;

      if (isPlaying) {
        const stats = audioEngine.getStereoLevels();
        targetL = stats.leftLevel;
        targetR = stats.rightLevel;
        isClipL = stats.isClippingL;
        isClipR = stats.isClippingR;
      }

      smoothL = targetL > smoothL ? targetL : Math.max(0, smoothL * 0.88 - 0.4);
      smoothR = targetR > smoothR ? targetR : Math.max(0, smoothR * 0.88 - 0.4);

      if (smoothL > peakLHold) {
        peakLHold = smoothL;
        peakLTimer = 35;
      } else if (peakLTimer > 0) {
        peakLTimer--;
      } else {
        peakLHold = Math.max(0, peakLHold - 1.5);
      }

      if (smoothR > peakRHold) {
        peakRHold = smoothR;
        peakRTimer = 35;
      } else if (peakRTimer > 0) {
        peakRTimer--;
      } else {
        peakRHold = Math.max(0, peakRHold - 1.5);
      }

      const barW = 8;
      const barSpacing = 4;
      const meterTop = 26;
      const meterBottom = height - 16;
      const meterH = meterBottom - meterTop;
      const barLX = mainWidth + 8;
      const barRX = barLX + barW + barSpacing;
      const scaleX = barRX + barW + 3;

      // Draw dB tick scale marks
      const ticks = [
        { label: '0', ratio: 1.0, color: '#f43f5e' },
        { label: '-6', ratio: 0.875, color: '#fbbf24' },
        { label: '-12', ratio: 0.75, color: '#34d399' },
        { label: '-24', ratio: 0.5, color: '#64748b' },
        { label: '-36', ratio: 0.25, color: '#475569' },
      ];

      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      for (const tick of ticks) {
        const ty = meterBottom - tick.ratio * meterH;
        ctx.fillStyle = tick.color;
        ctx.fillRect(mainWidth + 5, ty, barW * 2 + barSpacing + 2, 1);
        ctx.fillText(tick.label, scaleX, ty + 2.5);
      }

      // Channel bar slots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barLX, meterTop, barW, meterH);
      ctx.fillRect(barRX, meterTop, barW, meterH);

      // Render channel bars
      const drawVUMeterBar = (x: number, level: number, peakHold: number, isClip: boolean, label: string) => {
        // Red Clip LED at top
        ctx.fillStyle = isClip ? '#f43f5e' : '#334155';
        ctx.fillRect(x, 17, barW, 4);

        // Meter fill with gradient
        const fillH = (level / 100) * meterH;
        if (fillH > 0) {
          const grad = ctx.createLinearGradient(0, meterBottom, 0, meterTop);
          grad.addColorStop(0, '#10b981');    // Green (-48 to -12 dB)
          grad.addColorStop(0.72, '#f59e0b'); // Amber (-12 to -3 dB)
          grad.addColorStop(1, '#ef4444');    // Red (> -3 dB)
          ctx.fillStyle = grad;
          ctx.fillRect(x, meterBottom - fillH, barW, fillH);
        }

        // Peak Hold Marker
        if (peakHold > 1) {
          const peakY = meterBottom - (peakHold / 100) * meterH;
          ctx.fillStyle = peakHold > 90 ? '#ef4444' : '#fde047';
          ctx.fillRect(x, Math.max(meterTop, peakY - 1), barW, 2);
        }

        // Channel Label (L / R)
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barW / 2, height - 4);
      };

      drawVUMeterBar(barLX, smoothL, peakLHold, isClipL, 'L');
      drawVUMeterBar(barRX, smoothR, peakRHold, isClipR, 'R');
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackTime, duration, nyquistCutoffHz, viewMode, isAiDetected]);

  // Handle canvas click to scrub (bounded to main spectrum width)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const vuWidthRatio = 60 / 800;
    const mainWidthPx = rect.width * (1 - vuWidthRatio);

    if (clickX <= mainWidthPx) {
      const ratio = Math.max(0, Math.min(1, clickX / mainWidthPx));
      onSeek(ratio * duration);
    }
  };

  return (
    <div ref={containerRef} className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Top HUD with telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Espectrograma & Análise FFT Contínua
          </span>
          {isAiDetected ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Assinatura {detectedPlatformName} Detectada</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{detectedPlatformName || 'Áudio Analógico / Acústico Autêntico'}</span>
            </div>
          )}
        </div>

        {/* View toggle (Spectrum FFT vs Waveform) */}
        <div className="flex items-center gap-1 bg-[#131929] p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setViewMode('spectrum')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              viewMode === 'spectrum' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Espectro FFT
          </button>
          <button
            onClick={() => setViewMode('waveform')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              viewMode === 'waveform' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Forma de Onda
          </button>
        </div>
      </div>

      {/* Main interactive canvas */}
      <div className="relative w-full h-48 md:h-56 rounded-lg overflow-hidden bg-[#080c14] border border-slate-800/80 cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />

        {/* Top frequency calibration markers overlay */}
        <div className="absolute top-2 left-3 right-20 flex justify-between pointer-events-none text-[10px] font-mono text-slate-500">
          <span>20 Hz</span>
          <span>250 Hz</span>
          <span>1 kHz</span>
          <span className="text-amber-400/80">3.4 kHz (Formante)</span>
          <span className="text-rose-400/80">16.2 kHz (Cutoff)</span>
          <span>22 kHz</span>
        </div>
      </div>

      {/* Bottom timecode and inspection probe */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span>Tempo: {formatSeconds(playbackTime)} / {formatSeconds(duration)}</span>
          <span aria-hidden="true">·</span>
          <span>Resolução: 2048 bins FFT</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Clique no gráfico para posicionar o cursor de áudio
        </div>
      </div>
    </div>
  );
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}
