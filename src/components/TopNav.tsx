import { Sparkles, Sliders, Layers, FileText, Download, Activity, Gauge, Disc, Bookmark, FolderDown } from 'lucide-react';

interface TopNavProps {
  activeTab: 'azimuth' | 'mastering' | 'lufs' | 'stems' | 'analyzer';
  setActiveTab: (tab: 'azimuth' | 'mastering' | 'lufs' | 'stems' | 'analyzer') => void;
  onOpenReport: () => void;
  onOpenPresets: () => void;
  onOpenBatch: () => void;
  onOpenFolderSettings?: () => void;
  outputDirectoryName?: string;
  onExport: () => void;
  onExportAzimuthOnly?: () => void;
  isHumanizedActive: boolean;
  onToggleAB: () => void;
  isExporting: boolean;
  hasAudioLoaded?: boolean;
  outputBitDepth?: number;
}

export function TopNav({
  activeTab,
  setActiveTab,
  onOpenReport,
  onOpenPresets,
  onOpenBatch,
  onOpenFolderSettings,
  outputDirectoryName,
  onExport,
  onExportAzimuthOnly,
  isHumanizedActive,
  onToggleAB,
  isExporting,
  hasAudioLoaded = true,
  outputBitDepth = 24,
}: TopNavProps) {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#090d16] px-3 md:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Zone 1: Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm tracking-tighter shadow-md shadow-cyan-500/20">
          AT
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
            AuraTune <span className="font-light text-cyan-400">Studio</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
            Master & Azimute de Fitas 1/4"
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation modes */}
      <nav className="hidden lg:flex items-center gap-1 bg-[#0f1422] p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setActiveTab('azimuth')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'azimuth'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs ring-1 ring-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Verificação e alinhamento de azimute e balanço de canal para fitas de 1/4 (1950-2000)"
        >
          <Disc className="w-3.5 h-3.5 text-amber-400" />
          Azimute Tape 1/4"
        </button>

        <button
          onClick={() => setActiveTab('mastering')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'mastering'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          Masterizador
        </button>

        <button
          onClick={() => setActiveTab('lufs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'lufs'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          LUFS & Limitless
        </button>

        <button
          onClick={() => setActiveTab('stems')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'stems'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Mixer Stems
        </button>

        <button
          onClick={() => setActiveTab('analyzer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'analyzer'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          Análise RTA
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Presets Modal Trigger */}
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#121828] hover:bg-[#182136] rounded-lg border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer"
          title="Abrir gerenciador de presets próprios e salvar configurações"
        >
          <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Presets</span>
        </button>

        {/* Batch Queue Modal Trigger */}
        <button
          onClick={onOpenBatch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/30 hover:bg-amber-900/40 rounded-lg border border-amber-600/40 transition-colors whitespace-nowrap cursor-pointer"
          title="Processar múltiplos arquivos de fitas em lote e salvar na mesma pasta em subpasta automática"
        >
          <FolderDown className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Lote</span>
        </button>

        {/* Output Folder Settings Trigger */}
        {onOpenFolderSettings && (
          <button
            onClick={onOpenFolderSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              outputDirectoryName
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                : 'text-slate-300 hover:text-white bg-[#121828] hover:bg-[#182136] border-slate-700/60'
            }`}
            title="Configurar pasta de salvamento automático no computador (cria subpasta)"
          >
            <FolderDown className={`w-3.5 h-3.5 ${outputDirectoryName ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">
              {outputDirectoryName ? `Pasta: ${outputDirectoryName}` : 'Pasta'}
            </span>
          </button>
        )}

        {/* A/B Quick Toggle */}
        <button
          onClick={onToggleAB}
          title="Alternar entre o áudio masterizado e o áudio original cru sem efeitos"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border whitespace-nowrap cursor-pointer ${
            isHumanizedActive
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isHumanizedActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className="hidden md:inline">{isHumanizedActive ? 'A: Masterizado' : 'B: Original Cru'}</span>
          <span className="md:hidden">{isHumanizedActive ? 'A' : 'B'}</span>
        </button>

        {/* Export WAV Button */}
        <button
          onClick={onExport}
          disabled={isExporting || !hasAudioLoaded}
          title={
            hasAudioLoaded
              ? `Exportar Master em ${outputBitDepth}-bit WAV (Mesma resolução de entrada)`
              : 'Carregue uma música para exportar o master'
          }
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isExporting ? 'Renderizando...' : `Exportar Master (${outputBitDepth}-bit)`}</span>
          <span className="sm:hidden">{isExporting ? '...' : 'Exportar'}</span>
        </button>
      </div>
    </header>
  );
}
