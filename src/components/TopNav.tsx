import { Sparkles, Sliders, Layers, FileText, Download, Activity, Gauge, Disc, Bookmark, FolderDown, ShieldCheck, Waves, Archive, GitFork } from 'lucide-react';

interface TopNavProps {
  activeTab: 'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer';
  setActiveTab: (tab: 'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer') => void;
  onOpenReport: () => void;
  onOpenPresets: () => void;
  onOpenBatch: () => void;
  onOpenFolderSettings?: () => void;
  onOpenSplitStereoModal?: () => void;
  outputDirectoryName?: string;
  onExport: () => void;
  onExportAzimuthOnly?: () => void;
  onExportPreMaster?: () => void;
  onExportZipPackage?: () => void;
  onChangeBitDepth?: (depth: 16 | 24) => void;
  isHumanizedActive: boolean;
  onToggleAB: () => void;
  isExporting: boolean;
  isExportingPreMaster?: boolean;
  isExportingZip?: boolean;
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
  onOpenSplitStereoModal,
  outputDirectoryName,
  onExport,
  onExportAzimuthOnly,
  onExportPreMaster,
  onExportZipPackage,
  onChangeBitDepth,
  isHumanizedActive,
  onToggleAB,
  isExporting,
  isExportingPreMaster = false,
  isExportingZip = false,
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
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">v2.0</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
            Master & Azimute de Fitas 1/4"
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation modes */}
      <nav className="hidden lg:flex items-center gap-1 bg-[#0f1422] p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setActiveTab('modular')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'modular'
              ? 'bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/60 shadow-xs ring-1 ring-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Fluxo Inteligente em 3 Blocos Modulares: Triagem Automática, Restauração de Fita, Equalização e Masterização"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          ⚡ Fluxo Inteligente (Blocos)
        </button>
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
          onClick={() => setActiveTab('dropouts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'dropouts'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Detecção e reconstrução de dropouts de fita magnética (ideal para fitas Mono Ampex em Studer A80)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Dropouts & Full-Track
        </button>


        <button
          onClick={() => setActiveTab('denoise')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
            activeTab === 'denoise'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-xs ring-1 ring-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Redutor de Ruído Espectral NoNoise / RX (Hiss, Ronco e Subtração Multi-Banda)"
        >
          <Waves className="w-3.5 h-3.5 text-purple-400" />
          Denoise NoNoise / RX
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

        {/* Pro Tools Split-Mono L+R Trigger */}
        {onOpenSplitStereoModal && (
          <button
            onClick={onOpenSplitStereoModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/30 hover:bg-emerald-900/40 rounded-lg border border-emerald-600/40 transition-colors whitespace-nowrap cursor-pointer"
            title="Unir múltiplos arquivos mono .L e .R do Pro Tools em Estéreo Real de 2 Canais"
          >
            <GitFork className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Unir .L/.R</span>
          </button>
        )}

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

        {/* Bit Depth Selector (16-bit CD Universal vs 24-bit Studio Master) */}
        {onChangeBitDepth && (
          <div
            className="hidden sm:flex items-center bg-[#0d1322] border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono shadow-inner"
            title="Resolução de Saída WAV: 16-bit (compatibilidade total em 100% dos reprodutores/WMP/som automotivo) ou 24-bit (master audiófilo de estúdio)"
          >
            <button
              onClick={() => onChangeBitDepth(16)}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                outputBitDepth === 16
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              16-bit
            </button>
            <button
              onClick={() => onChangeBitDepth(24)}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                outputBitDepth === 24
                  ? 'bg-cyan-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              24-bit
            </button>
          </div>
        )}

        {/* Export Pre-Master Archival WAV Button (Azimuth + Dropouts corrected, WITHOUT final mastering) */}
        {onExportPreMaster && (
          <button
            onClick={onExportPreMaster}
            disabled={isExportingPreMaster || isExporting || !hasAudioLoaded}
            title={
              hasAudioLoaded
                ? `Exportar Pré-Master Restaurado em ${outputBitDepth}-bit WAV (Azimute e Dropouts corrigidos, SEM a masterização final / Preservação Arquivística)`
                : 'Carregue uma música para exportar o pré-master'
            }
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/40 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden md:inline">
              {isExportingPreMaster ? 'Renderizando...' : `Pré-Master (${outputBitDepth}-bit)`}
            </span>
            <span className="md:hidden">{isExportingPreMaster ? '...' : 'Pré-Master'}</span>
          </button>
        )}

        {/* Export ZIP Package Button (Master + Pré-Master + Recall) */}
        {onExportZipPackage && (
          <button
            onClick={onExportZipPackage}
            disabled={isExportingZip || isExporting || !hasAudioLoaded}
            title={
              hasAudioLoaded
                ? 'Exportar Pacote Completo (.ZIP com Master WAV + Pré-Master WAV + Recall .aurapreset organizados na subpasta)'
                : 'Carregue uma música para exportar o pacote ZIP'
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Archive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden xl:inline">{isExportingZip ? 'Gerando ZIP...' : 'Pacote ZIP'}</span>
          </button>
        )}

        {/* Export WAV Button */}
        <button
          onClick={onExport}
          disabled={isExporting || !hasAudioLoaded}
          title={
            hasAudioLoaded
              ? `Exportar Master em ${outputBitDepth}-bit WAV + Preset de Recall (.aurapreset) conjunto`
              : 'Carregue uma música para exportar o master'
          }
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isExporting ? 'Renderizando...' : `Exportar Master (${outputBitDepth}-bit)`}
          </span>
          <span className="sm:hidden">{isExporting ? '...' : 'Exportar'}</span>
        </button>
      </div>
    </header>
  );
}
