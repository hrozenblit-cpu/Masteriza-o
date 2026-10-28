import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  Layers,
  FileText,
  Download,
  Activity,
  Gauge,
  Disc,
  Bookmark,
  History,
  FolderDown,
  ShieldCheck,
  Waves,
  Archive,
  GitFork,
  Menu,
  X
} from 'lucide-react';

export type NavigationTab = 'modular' | 'azimuth' | 'dropouts' | 'denoise' | 'mastering' | 'lufs' | 'analyzer';

interface NavItem {
  id: NavigationTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeClass: string;
  title: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'modular',
    label: '⚡ Fluxo Inteligente (Blocos)',
    shortLabel: 'Blocos',
    icon: Layers,
    color: 'text-cyan-400',
    activeClass: 'bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 text-white border-cyan-500/60 shadow-xs ring-1 ring-cyan-500/40 font-bold',
    title: 'Fluxo Inteligente em 3 Blocos Modulares: Triagem Automática, Restauração de Fita, Equalização e Masterização',
  },
  {
    id: 'azimuth',
    label: 'Azimute Tape 1/4"',
    shortLabel: 'Azimute',
    icon: Disc,
    color: 'text-amber-400',
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30 font-bold',
    title: 'Verificação e alinhamento de azimute e balanço de canal para fitas de 1/4 (1950-2000)',
  },
  {
    id: 'dropouts',
    label: 'Dropouts & Full-Track',
    shortLabel: 'Dropouts',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30 font-bold',
    title: 'Detecção e reconstrução de dropouts de fita magnética (ideal para fitas Mono Ampex em Studer A80)',
  },
  {
    id: 'denoise',
    label: 'Denoise NoNoise / RX',
    shortLabel: 'Denoise',
    icon: Waves,
    color: 'text-purple-400',
    activeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-xs ring-1 ring-purple-500/30 font-bold',
    title: 'Redutor de Ruído Espectral NoNoise / RX (Hiss, Ronco e Subtração Multi-Banda)',
  },
  {
    id: 'mastering',
    label: 'Masterizador',
    shortLabel: 'Master',
    icon: Sliders,
    color: 'text-cyan-400',
    activeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-xs font-bold',
    title: 'Equalizador Analógico, Processador de Agudos Orban e Saturação de Fita',
  },
  {
    id: 'lufs',
    label: 'LUFS & Limitless',
    shortLabel: 'LUFS',
    icon: Gauge,
    color: 'text-cyan-400',
    activeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/30 font-bold',
    title: 'Medição ITU-R BS.1770-4 e Limitador Dinâmico Multi-Estágio',
  },
  {
    id: 'analyzer',
    label: 'Análise RTA',
    shortLabel: 'RTA',
    icon: Activity,
    color: 'text-amber-400',
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs font-bold',
    title: 'Análise de Espectro RTA em Tempo Real e Goniômetro de Fase',
  },
];

interface TopNavProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
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
  onLoadRecallFile?: (file: File) => void;
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
  onLoadRecallFile,
}: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const recallFileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape key and return focus to hamburger button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        hamburgerButtonRef.current?.focus();
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSelectTab = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    hamburgerButtonRef.current?.focus();
  };

  return (
    <>
      <header className="h-14 border-b border-slate-800 bg-[#090d16] px-3 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Zone 1: Branding & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Hamburger button for mobile / tablet (< lg) */}
          <button
            ref={hamburgerButtonRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Menu de navegação e módulos"
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm tracking-tighter shadow-md shadow-cyan-500/20 shrink-0">
            AT
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none truncate">
              AuraTune <span className="font-light text-cyan-400">Studio</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                v3.0
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:inline truncate">
              Master & Azimute de Fitas 1/4"
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation modes (Desktop Full & Compact) */}
        <nav
          aria-label="Navegação de módulos de áudio"
          className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-[#0f1422] p-1 rounded-lg border border-slate-800/80"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.title}
                className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${item.activeClass} border`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color} shrink-0`} />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden font-medium">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Presets Modal Trigger */}
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#121828] hover:bg-[#182136] rounded-lg border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer min-h-[36px]"
            title="Abrir gerenciador de presets próprios e salvar configurações"
          >
            <Bookmark className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Presets</span>
          </button>

          {/* Direct Load Recall Preset Button */}
          {onLoadRecallFile && (
            <>
              <button
                onClick={() => recallFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 rounded-lg border border-amber-600/40 transition-colors whitespace-nowrap cursor-pointer min-h-[36px] shadow-xs"
                title="Carregar arquivo .aurapreset ou .json de Recall de Masterização para restaurar 100% dos ajustes na música atual"
              >
                <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Recall</span>
              </button>
              <input
                ref={recallFileInputRef}
                type="file"
                accept=".aurapreset,.json,application/json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onLoadRecallFile(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </>
          )}

          {/* Batch Queue Modal Trigger */}
          <button
            onClick={onOpenBatch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/30 hover:bg-amber-900/40 rounded-lg border border-amber-600/40 transition-colors whitespace-nowrap cursor-pointer min-h-[36px]"
            title="Processar múltiplos arquivos de fitas em lote e salvar na mesma pasta em subpasta automática"
          >
            <FolderDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Lote</span>
          </button>

          {/* Pro Tools Split-Mono L+R Trigger */}
          {onOpenSplitStereoModal && (
            <button
              onClick={onOpenSplitStereoModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/30 hover:bg-emerald-900/40 rounded-lg border border-emerald-600/40 transition-colors whitespace-nowrap cursor-pointer min-h-[36px]"
              title="Unir múltiplos arquivos mono .L e .R do Pro Tools em Estéreo Real de 2 Canais"
            >
              <GitFork className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden 2xl:inline">Unir .L/.R</span>
            </button>
          )}

          {/* Output Folder Settings Trigger */}
          {onOpenFolderSettings && (
            <button
              onClick={onOpenFolderSettings}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer min-h-[36px] ${
                outputDirectoryName
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                  : 'text-slate-300 hover:text-white bg-[#121828] hover:bg-[#182136] border-slate-700/60'
              }`}
              title="Configurar pasta de salvamento automático no computador (cria subpasta)"
            >
              <FolderDown className={`w-3.5 h-3.5 ${outputDirectoryName ? 'text-emerald-400' : 'text-slate-400'} shrink-0`} />
              <span className="hidden xl:inline">
                {outputDirectoryName ? `Pasta: ${outputDirectoryName}` : 'Pasta'}
              </span>
            </button>
          )}

          {/* A/B Quick Toggle */}
          <button
            onClick={onToggleAB}
            title="Alternar entre o áudio masterizado e o áudio original cru sem efeitos"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border whitespace-nowrap cursor-pointer min-h-[36px] ${
              isHumanizedActive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isHumanizedActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="hidden md:inline">{isHumanizedActive ? 'A: Masterizado' : 'B: Original Cru'}</span>
            <span className="md:hidden font-bold">{isHumanizedActive ? 'A' : 'B'}</span>
          </button>

          {/* Bit Depth Selector (16-bit vs 24-bit) */}
          {onChangeBitDepth && (
            <div
              className="hidden sm:flex items-center bg-[#0d1322] border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono shadow-inner h-9"
              title="Resolução de Saída WAV: 16-bit (compatibilidade 100%) ou 24-bit (master de estúdio)"
            >
              <button
                onClick={() => onChangeBitDepth(16)}
                className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                  outputBitDepth === 16
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                16b
              </button>
              <button
                onClick={() => onChangeBitDepth(24)}
                className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                  outputBitDepth === 24
                    ? 'bg-cyan-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                24b
              </button>
            </div>
          )}

          {/* Export Pre-Master Archival WAV Button */}
          {onExportPreMaster && (
            <button
              onClick={onExportPreMaster}
              disabled={isExportingPreMaster || isExporting || !hasAudioLoaded}
              title={
                hasAudioLoaded
                  ? `Exportar Pré-Master Restaurado em ${outputBitDepth}-bit WAV (Azimute e Dropouts corrigidos, SEM masterização final)`
                  : 'Carregue uma música para exportar o pré-master'
              }
              className="hidden lg:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/40 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-xs min-h-[36px]"
            >
              <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isExportingPreMaster ? 'Renderizando...' : `Pré-Master (${outputBitDepth}-bit)`}
              </span>
            </button>
          )}

          {/* Export ZIP Package Button */}
          {onExportZipPackage && (
            <button
              onClick={onExportZipPackage}
              disabled={isExportingZip || isExporting || !hasAudioLoaded}
              title={
                hasAudioLoaded
                  ? 'Exportar Pacote Completo (.ZIP com Master WAV + Pré-Master WAV + Recall .aurapreset)'
                  : 'Carregue uma música para exportar o pacote ZIP'
              }
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-xs min-h-[36px]"
            >
              <Archive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{isExportingZip ? 'Gerando...' : 'Pacote ZIP'}</span>
            </button>
          )}

          {/* Export WAV Button */}
          <button
            onClick={onExport}
            disabled={isExporting || !hasAudioLoaded}
            title={
              hasAudioLoaded
                ? `Exportar Master em ${outputBitDepth}-bit WAV + Preset de Recall (.aurapreset)`
                : 'Carregue uma música para exportar o master'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isExporting ? 'Renderizando...' : `Exportar Master (${outputBitDepth}-bit)`}
            </span>
            <span className="sm:hidden">{isExporting ? '...' : 'Master'}</span>
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Módulos e Configurações"
          className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            ref={drawerRef}
            className="relative w-[85vw] max-w-xs bg-[#0a0e1a] border-r border-slate-800 h-full p-4 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xs">
                    AT
                  </div>
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    AuraTune <span className="text-cyan-400">Studio</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      v3.0
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Module List */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 px-2 pt-1">
                  Módulos de Áudio
                </span>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-xs rounded-xl transition-all text-left cursor-pointer min-h-[44px] ${
                        isActive
                          ? `${item.activeClass} border`
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                      <div className="flex flex-col">
                        <span className="font-bold">{item.label}</span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">{item.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Utilities & Quick Actions in Mobile Drawer */}
              <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 px-2">
                  Ferramentas & Ações
                </span>

                <button
                  onClick={() => {
                    onOpenReport();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                >
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Relatório Técnico Forense</span>
                </button>

                <button
                  onClick={() => {
                    onOpenPresets();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                >
                  <Bookmark className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Gerenciador de Presets</span>
                </button>

                {onLoadRecallFile && (
                  <button
                    onClick={() => {
                      recallFileInputRef.current?.click();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <History className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Carregar Recall (.aurapreset)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenBatch();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                >
                  <FolderDown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Processamento em Lote</span>
                </button>

                {onOpenSplitStereoModal && (
                  <button
                    onClick={() => {
                      onOpenSplitStereoModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs text-emerald-300 hover:text-white hover:bg-emerald-950/40 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <GitFork className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unir Split Pro Tools (.L e .R)</span>
                  </button>
                )}

                {onOpenFolderSettings && (
                  <button
                    onClick={() => {
                      onOpenFolderSettings();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
                  >
                    <FolderDown className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{outputDirectoryName ? `Pasta: ${outputDirectoryName}` : 'Selecionar Pasta de Saída'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer: Resolution & Quick Export */}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2 mt-4">
              {onChangeBitDepth && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0e1424] border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] font-mono">Resolução WAV:</span>
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      onClick={() => onChangeBitDepth(16)}
                      className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                        outputBitDepth === 16 ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      16-bit
                    </button>
                    <button
                      onClick={() => onChangeBitDepth(24)}
                      className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                        outputBitDepth === 24 ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      24-bit
                    </button>
                  </div>
                </div>
              )}

              {onExportPreMaster && (
                <button
                  onClick={() => {
                    onExportPreMaster();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isExportingPreMaster || isExporting || !hasAudioLoaded}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-950/40 text-amber-300 border border-amber-600/40 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 min-h-[44px]"
                >
                  <Disc className="w-4 h-4 text-amber-400" />
                  <span>Pré-Master ({outputBitDepth}-bit)</span>
                </button>
              )}

              <button
                onClick={() => {
                  onExport();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isExporting || !hasAudioLoaded}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-md shadow-cyan-500/20 min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Master Final ({outputBitDepth}-bit)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
