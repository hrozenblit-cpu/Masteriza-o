import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { Compass } from 'lucide-react';

interface LissajousScopeProps {
  isPlaying: boolean;
  phaseCorrelation: number; // fallback baseline (-1 to +1)
}

export function LissajousScope({ isPlaying, phaseCorrelation: baselineCorrelation }: LissajousScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [liveCorrelation, setLiveCorrelation] = useState<number>(baselineCorrelation);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { left: analyserL, right: analyserR } = audioEngine.getStereoAnalysers();
    const bufferLength = 256;
    const timeDataL = new Uint8Array(bufferLength);
    const timeDataR = new Uint8Array(bufferLength);
    let frameCount = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Dark background with slight persistent fade for analog phosphor trail
      ctx.fillStyle = 'rgba(8, 12, 20, 0.3)';
      ctx.fillRect(0, 0, w, h);

      // Polar / Cross grid lines
      ctx.strokeStyle = '#182136';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      // 45 degree diagonals (L / R axes)
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(0, h);
      ctx.lineTo(w, 0);
      ctx.stroke();

      if (analyserL && analyserR && isPlaying) {
        analyserL.getByteTimeDomainData(timeDataL);
        analyserR.getByteTimeDomainData(timeDataR);

        // Update correlation readout periodically (every 10 frames) to save UI renders
        if (frameCount % 10 === 0) {
          const stereoStats = audioEngine.getStereoLevels();
          setLiveCorrelation(stereoStats.phaseCorrelation);
        }

        const isProblem = liveCorrelation < 0.4;
        ctx.strokeStyle = isProblem ? '#f59e0b' : '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const step = 2;
        const radius = Math.min(cx, cy) * 0.85;

        for (let i = 0; i < bufferLength; i += step) {
          // True Left and Right channel samples
          const sampleL = (timeDataL[i] - 128) / 128;
          const sampleR = (timeDataR[i] - 128) / 128;

          // Rotate 45 degrees into M/S coordinate frame (Lissajous)
          const mid = (sampleL + sampleR) * 0.707;
          const side = (sampleL - sampleR) * 0.707;

          const px = cx + side * radius * 1.5;
          const py = cy - mid * radius * 1.5;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      } else {
        // Idle dot
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        if (!isPlaying) {
          setLiveCorrelation(baselineCorrelation);
        }
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, baselineCorrelation, liveCorrelation]);

  const activeCorr = isPlaying ? liveCorrelation : baselineCorrelation;
  const meterPercent = ((activeCorr + 1) / 2) * 100;
  const isPhaseProblem = activeCorr < 0.45;

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          Goniômetro & Fase Estéreo
        </span>
        <span className={`text-xs font-mono font-medium ${isPhaseProblem ? 'text-amber-400' : 'text-emerald-400'}`}>
          {activeCorr >= 0 ? `+${activeCorr.toFixed(2)}` : activeCorr.toFixed(2)}
        </span>
      </div>

      {/* Scope canvas */}
      <div className="relative my-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={180}
          height={160}
          className="rounded-lg bg-[#080c14] border border-slate-800/80 shadow-inner"
        />
        <span className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">L</span>
        <span className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">R</span>
        <span className="absolute bottom-1 text-[9px] font-mono text-slate-500">M / S</span>
      </div>

      {/* Phase correlation bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span className="text-rose-400">-1 (Desfase)</span>
          <span>0 (90°)</span>
          <span className="text-emerald-400">+1 (Mono Coeso)</span>
        </div>
        <div className="w-full h-2 bg-[#121827] rounded-full overflow-hidden relative border border-slate-700/50">
          {/* Center reference tick */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10" />
          <div
            className={`h-full transition-all duration-150 ${
              isPhaseProblem ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${meterPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 text-center">
          {isPhaseProblem
            ? '⚠️ Dispersão de fase detectada (típica de IA generativa)'
            : '✓ Coerência de fase compatível com estúdio analógico'}
        </span>
      </div>
    </div>
  );
}
