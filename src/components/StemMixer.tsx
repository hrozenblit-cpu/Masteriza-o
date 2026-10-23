import { AudioStem } from '../types/audio';
import { Mic, Disc, Music, Guitar, Sparkles, Volume2, VolumeX, Eye, Play, Pause, SlidersHorizontal, CheckCircle2, RotateCcw } from 'lucide-react';

interface StemMixerProps {
  stems: AudioStem[];
  onUpdateStem: (stemId: string, updates: Partial<AudioStem>) => void;
  onSoloStem: (stemId: string) => void;
  onMuteStem: (stemId: string) => void;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  isMasterTouchActive?: boolean;
  onToggleMasterTouch?: () => void;
  onResetUnity?: () => void;
}

export function StemMixer({
  stems,
  onUpdateStem,
  onSoloStem,
  onMuteStem,
  isPlaying,
  onTogglePlay,
  isMasterTouchActive = true,
  onToggleMasterTouch,
  onResetUnity,
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
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            Mixer Multitrack de Stems & Toque Master Analógico
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle de volume, pan, solo e humanização por stems isolados (Vocais, Bateria, Baixo, Instrumentos e FX), somados diretamente ao Master Bus com calor e masterização analógica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetUnity && (
            <button
              onClick={onResetUnity}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all"
              title="Restaura os faders de stems para o equilíbrio padrão de soma unitária 0 dB"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Resetar 0 dB Unity</span>
            </button>
          )}

          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar Master</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tocar Master & Stems</span>
                </>
              )}
            </button>
          )}

          {onToggleMasterTouch && (
            <button
              onClick={onToggleMasterTouch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isMasterTouchActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Aplica o equilíbrio e processamento individual de stems diretamente na soma da masterização final"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Toque Multitrack: {isMasterTouchActive ? 'ATIVADO' : 'BYPASS'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Soma Ativa no Master</span>
            <span aria-hidden="true" className="text-emerald-600">·</span>
            <span className="text-emerald-400/80">{stems.length} Stems</span>
          </div>
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-[#111726] border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Soma Unificada no Master Bus:</strong> Todos os stems (Vocais, Bateria, Baixo, Instrumentos e FX) são combinados diretamente no barramento estéreo e passam pela cadeia completa de masterização analógica (Azimute 1/4", De-harshing, Tape Warmth, Orban Treble e Limitless True-Peak). Não há reprodução descompassada ou isolada.
          </span>
        </div>
      </div>
    </div>
  );
}
