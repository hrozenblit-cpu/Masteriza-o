import { AudioStem } from '../types/audio';
import { Mic, Disc, Music, Guitar, Sparkles, Volume2, VolumeX, Eye } from 'lucide-react';

interface StemMixerProps {
  stems: AudioStem[];
  onUpdateStem: (stemId: string, updates: Partial<AudioStem>) => void;
  onSoloStem: (stemId: string) => void;
  onMuteStem: (stemId: string) => void;
  isPlaying: boolean;
}

export function StemMixer({
  stems,
  onUpdateStem,
  onSoloStem,
  onMuteStem,
}: StemMixerProps) {
  const getStemIcon = (type: AudioStem['type']) => {
    switch (type) {
      case 'vocals':
        return <Mic className="w-4 h-4 text-rose-400" />;
      case 'drums':
        return <Disc className="w-4 h-4 text-amber-400" />;
      case 'bass':
        return <Guitar className="w-4 h-4 text-cyan-400" />;
      case 'instruments':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'fx':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="bg-[#0e1320] border border-slate-800 rounded-xl p-4 md:p-6 flex flex-col gap-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            Humanização Multitrack por Stems Individuais
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Processe cada canal isoladamente para resolver problemas acústicos específicos (ressonância no vocal, ataque na bateria, fase no baixo).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{stems.length} Stems Ativos</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400">Processamento DSP Dedicado</span>
        </div>
      </div>

      {/* Multitrack Stems Grid / Rack */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {stems.map((stem) => {
          return (
            <div
              key={stem.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                stem.solo
                  ? 'border-amber-500 bg-[#172138] ring-1 ring-amber-500/50 shadow-md'
                  : stem.muted
                  ? 'border-slate-800/60 bg-[#0d111c]/50 opacity-60'
                  : 'border-slate-800 bg-[#111726] hover:border-slate-700'
              }`}
            >
              {/* Stem Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800/70">
                    {getStemIcon(stem.type)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 truncate">
                      {stem.name}
                    </h3>
                    <span className="text-[10px] font-mono text-amber-400">
                      {stem.aiProbability}% IA
                    </span>
                  </div>
                </div>

                {/* Solo / Mute Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSoloStem(stem.id)}
                    title="Solo Stem"
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                      stem.solo
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => onMuteStem(stem.id)}
                    title="Mudo Stem"
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                      stem.muted
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                </div>
              </div>

              {/* Detected Anomaly on this stem */}
              <div className="my-2.5 p-2 rounded-lg bg-[#090d16] border border-slate-800/80 text-[11px]">
                <span className="text-slate-400 block text-[9px] uppercase font-mono tracking-wider">
                  Artefato Detectado
                </span>
                <span className="text-slate-200 font-medium line-clamp-2 mt-0.5">
                  {stem.detectedArtifact}
                </span>
              </div>

              {/* Stem Humanization Slider */}
              <div className="flex flex-col gap-1.5 my-2">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Humanização
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {stem.humanizeStrength}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stem.humanizeStrength}
                  onChange={(e) =>
                    onUpdateStem(stem.id, { humanizeStrength: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-400">
                  {stem.type === 'vocals'
                    ? 'De-harsh notch 3.4kHz & calor valvular'
                    : stem.type === 'drums'
                    ? 'Restauração de transiente e punch'
                    : stem.type === 'bass'
                    ? 'Sub-mono e saturação de fita'
                    : stem.type === 'instruments'
                    ? 'Modulação micro-swing analógico'
                    : 'Revitalização de cauda >16kHz'}
                </span>
              </div>

              {/* Volume Fader */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    {stem.volume === 0 ? <VolumeX className="w-3 h-3 text-slate-500" /> : <Volume2 className="w-3 h-3 text-slate-400" />}
                    Volume
                  </span>
                  <span>{Math.round(stem.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={stem.volume}
                  onChange={(e) =>
                    onUpdateStem(stem.id, { volume: Number(e.target.value) })
                  }
                  className="w-full accent-slate-300 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Pan Slider */}
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Pan</span>
                  <span>
                    {stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.abs(Math.round(stem.pan * 100))}` : `R${Math.round(stem.pan * 100)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={stem.pan}
                  onChange={(e) =>
                    onUpdateStem(stem.id, { pan: Number(e.target.value) })
                  }
                  className="w-full accent-slate-400 cursor-pointer h-1 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-[#111726] border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Cada stem processado é somado à matriz estéreo com ganho compensado e oversampling 2x, garantindo fidelidade acústica livre de aliasing digital.
          </span>
        </div>
      </div>
    </div>
  );
}
