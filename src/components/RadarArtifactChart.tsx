import { AcousticArtifact } from '../types/audio';
import { Target } from 'lucide-react';

interface RadarArtifactChartProps {
  artifacts: AcousticArtifact[];
  overallAiProb: number;
}

export function RadarArtifactChart({ artifacts, overallAiProb }: RadarArtifactChartProps) {
  const size = 260;
  const center = size / 2;
  const radius = 90;
  const numAxes = artifacts.length || 5;

  // Compute polygon points for axes and grid rings
  const getCoordinates = (index: number, valNorm: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = radius * valNorm;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Generate data polygon path
  const dataPoints = artifacts.map((art, idx) => {
    const norm = Math.max(0.1, Math.min(1.0, art.score / 100));
    return getCoordinates(idx, norm);
  });

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const isHighAi = overallAiProb > 50;

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-400" />
          Perfil Forense Multiaxial de Artefatos
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          5 Vetores Acústicos
        </span>
      </div>

      {/* SVG Spider chart */}
      <div className="relative flex items-center justify-center py-2">
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric grid polygons */}
          {rings.map((ring, ringIdx) => {
            const ringPath = artifacts
              .map((_, idx) => {
                const pt = getCoordinates(idx, ring);
                return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
              })
              .join(' ') + ' Z';

            return (
              <path
                key={ringIdx}
                d={ringPath}
                fill="none"
                stroke="#1c253b"
                strokeWidth={1}
                strokeDasharray={ringIdx === rings.length - 1 ? 'none' : '2 2'}
              />
            );
          })}

          {/* Radial axis lines */}
          {artifacts.map((_, idx) => {
            const edge = getCoordinates(idx, 1.0);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={edge.x}
                y2={edge.y}
                stroke="#1f2a42"
                strokeWidth={1}
              />
            );
          })}

          {/* Filled data polygon */}
          <path
            d={polygonPath}
            fill={isHighAi ? 'rgba(245, 158, 11, 0.22)' : 'rgba(16, 185, 129, 0.22)'}
            stroke={isHighAi ? '#f59e0b' : '#10b981'}
            strokeWidth={2}
          />

          {/* Vertices */}
          {dataPoints.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={isHighAi ? '#f59e0b' : '#10b981'}
              stroke="#090d16"
              strokeWidth={1.5}
            />
          ))}

          {/* Axis Labels */}
          {artifacts.map((art, idx) => {
            const labelPos = getCoordinates(idx, 1.25);
            // Short label
            const shortLabels = [
              'Corte 16k',
              'Desfase L/R',
              'Borrão Trans.',
              'Metálico 3k',
              'Grade Rígida'
            ];
            const label = shortLabels[idx] || art.namePt.slice(0, 10);

            return (
              <text
                key={idx}
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-mono fill-slate-400"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
        <span>Área Preenchida: Intensidade de Sintetização</span>
        <span className="font-mono text-amber-400 font-semibold">{overallAiProb.toFixed(1)}% Geral</span>
      </div>
    </div>
  );
}
