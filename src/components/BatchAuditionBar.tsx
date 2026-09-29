import {
  SkipForward,
  SkipBack,
  FolderDown,
  Bookmark,
  Headphones,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { BatchItem } from './BatchProcessingModal';
import { UserPreset } from '../audio/presetManager';

interface BatchAuditionBarProps {
  currentIndex: number;
  totalTracks: number;
  currentTrack: BatchItem;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onReturnToBatchModal: () => void;
  onExitBatchMode: () => void;
  onChangeTrackPreset: (presetId: string) => void;
  allPresets: UserPreset[];
}

export function BatchAuditionBar({
  currentIndex,
  totalTracks,
  currentTrack,
  onNextTrack,
  onPrevTrack,
  onReturnToBatchModal,
  onExitBatchMode,
  onChangeTrackPreset,
  allPresets,
}: BatchAuditionBarProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalTracks - 1;

  return (
    <div className="bg-gradient-to-r from-[#0d1627] via-[#101b33] to-[#0d1627] border-y border-amber-500/40 shadow-lg px-4 md:px-8 py-3 sticky top-14 z-30 animate-in fade-in select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information & Inspection Status */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-tight">
            <Headphones className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>AUDIÇÃO DO LOTE ({currentIndex + 1} de {totalTracks})</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={currentTrack.title}>
              {currentTrack.title}
            </span>
          </div>

          {/* Quick Preset Selector for this track */}
          <div className="flex items-center gap-1 bg-[#090d18] px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs">
            <Bookmark className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-mono uppercase">Preset:</span>
            <select
              value={currentTrack.presetId || currentTrack.presetName}
              onChange={(e) => onChangeTrackPreset(e.target.value)}
              className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer truncate max-w-[180px]"
            >
              {allPresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0b101d] text-slate-200">
                  {p.name} {p.category === 'user' ? '(Meu Preset)' : ''}
                </option>
              ))}
            </select>
            {currentTrack.isCustomized && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold">
                AJUSTADO
              </span>
            )}
          </div>
        </div>

        {/* Right: Return & Navigation Controls */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          {/* Previous Track */}
          <button
            onClick={onPrevTrack}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#141d33] hover:bg-[#1a2745] text-slate-300 hover:text-white border border-slate-700/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Salva os ajustes da faixa atual e carrega a faixa anterior do lote"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Next Track (Primary Requested Action) */}
          <button
            onClick={onNextTrack}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
              isLast
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
            }`}
            title={
              isLast
                ? 'Salva a última faixa e conclui os ajustes para voltar ao lote'
                : 'Salva os ajustes desta faixa e avança imediatamente para ouvir a próxima faixa do lote'
            }
          >
            {isLast ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Concluir e Voltar ao Lote</span>
              </>
            ) : (
              <>
                <span>Próxima Faixa do Lote</span>
                <SkipForward className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Return to Batch Modal without finishing all */}
          <button
            onClick={onReturnToBatchModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#141d33] hover:bg-[#1a2745] text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all cursor-pointer"
            title="Salva os ajustes desta faixa e reabre a lista do processamento em lote"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Fila do Lote</span>
          </button>

          {/* Close/Exit Batch Audition Mode */}
          <button
            onClick={onExitBatchMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sair do modo de audição do lote"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
