import React, { useState, useEffect, useRef } from 'react';
import {
  UserPreset,
  FACTORY_PRESETS,
  getSavedUserPresets,
  saveUserPreset,
  deleteUserPreset,
  exportPresetsAsJson,
  importPresetsFromJson,
} from '../audio/presetManager';
import { HumanizerSettings } from '../types/audio';
import { TapeAzimuthSettings } from '../audio/tapeAzimuthEngine';
import {
  Bookmark,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  Sparkles,
  Disc,
  Clock,
  FileCheck,
  History,
  FileText
} from 'lucide-react';
import { parseRecallFile, TrackMasterRecall } from '../audio/presetRecallManager';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: HumanizerSettings;
  currentAzimuthSettings: TapeAzimuthSettings;
  onLoadPreset: (preset: UserPreset) => void;
}

export function PresetManagerModal({
  isOpen,
  onClose,
  currentSettings,
  currentAzimuthSettings,
  onLoadPreset,
}: PresetManagerModalProps) {
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'factory'>('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshPresets();
    }
  }, [isOpen]);

  const refreshPresets = () => {
    setUserPresets(getSavedUserPresets());
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const saved = saveUserPreset(
      newPresetName.trim(),
      currentSettings,
      currentAzimuthSettings,
      newPresetDesc.trim() || undefined
    );

    refreshPresets();
    setNewPresetName('');
    setNewPresetDesc('');
    setSaveSuccessMsg(`Preset "${saved.name}" salvo com sucesso!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o preset "${name}"?`)) {
      deleteUserPreset(id);
      refreshPresets();
    }
  };

  const recallInputRef = useRef<HTMLInputElement>(null);

  const handleImportRecall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const recall = await parseRecallFile(file);
        if (recall) {
          const newPreset: UserPreset = {
            id: `recall_${Date.now()}`,
            name: `Recall: ${recall.trackTitle || recall.presetName || 'Master Anterior'}`,
            category: 'user',
            description: `Configurações originais de master da faixa "${recall.trackTitle}" (${new Date(
              recall.exportDate
            ).toLocaleDateString()})`,
            createdDate: recall.exportDate,
            settings: recall.humanizerSettings,
            azimuthSettings: recall.azimuthSettings,
          };
          saveUserPreset(
            newPreset.name,
            newPreset.settings,
            newPreset.azimuthSettings,
            newPreset.description
          );
          refreshPresets();
          onLoadPreset(newPreset);
          setSaveSuccessMsg(
            `✓ Recall da faixa "${recall.trackTitle}" importado e aplicado com sucesso! Todos os parâmetros de master foram restabelecidos.`
          );
          setTimeout(() => setSaveSuccessMsg(null), 5000);
          return;
        }
      } catch {
        // continue fallback
      }
      alert('Arquivo de recall inválido ou não reconhecido. Certifique-se de escolher um arquivo .aurapreset ou .json gerado pelo AuraTune.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Try single track recall first
      const recall = await parseRecallFile(file);
      if (recall) {
        const newPreset: UserPreset = {
          id: `recall_${Date.now()}`,
          name: `Recall: ${recall.trackTitle || recall.presetName || 'Master Anterior'}`,
          category: 'user',
          description: `Configuração de master recuperada da faixa "${recall.trackTitle}"`,
          createdDate: recall.exportDate,
          settings: recall.humanizerSettings,
          azimuthSettings: recall.azimuthSettings,
        };
        saveUserPreset(
          newPreset.name,
          newPreset.settings,
          newPreset.azimuthSettings,
          newPreset.description
        );
        refreshPresets();
        onLoadPreset(newPreset);
        setSaveSuccessMsg(`✓ Recall de master da faixa "${recall.trackTitle}" importado e ativado!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        return;
      }

      try {
        const count = await importPresetsFromJson(file);
        refreshPresets();
        setSaveSuccessMsg(`✓ ${count} preset(s) importado(s) com sucesso!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } catch {
        alert('Erro ao importar arquivo de presets. Certifique-se de que é um JSON válido do AuraTune.');
      }
    }
  };

  if (!isOpen) return null;

  const allPresets = [...userPresets, ...FACTORY_PRESETS];
  const filteredPresets =
    activeTab === 'all'
      ? allPresets
      : activeTab === 'user'
      ? userPresets
      : FACTORY_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gerenciador de Presets Próprios & Studio
              </h2>
              <p className="text-xs text-slate-400">
                Salve e carregue suas configurações de masterização e azimute de fitas 1/4".
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {saveSuccessMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-6 py-2.5 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Section 1: Save Current Settings as Preset */}
          <form
            onSubmit={handleSaveCurrent}
            className="bg-[#101728] border border-cyan-500/30 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                Salvar Ajustes Atuais como Preset Customizado
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Inclui Masterizador + Azimute + Balanço
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                placeholder="Ex: Minha Master Fita 1/4 Ampex 1970"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                required
                className="sm:col-span-6 px-3 py-2 rounded-lg bg-[#090e1a] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Descrição / notas técnicas (opcional)"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#090e1a] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>
          </form>

          {/* Section 2: Preset List & Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Category tabs */}
              <div className="flex items-center gap-1 bg-[#101728] p-1 rounded-lg border border-slate-800 self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({allPresets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'user'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Meus Presets ({userPresets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('factory')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'factory'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Padrões de Estúdio ({FACTORY_PRESETS.length})
                </button>
              </div>

              {/* Backup & Restore buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => recallInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Carregar arquivo de recall (.aurapreset) gerado na pasta da faixa para restaurar 100% dos ajustes de master"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Carregar Recall (.aurapreset)</span>
                </button>
                <input
                  ref={recallInputRef}
                  type="file"
                  accept=".aurapreset,.json,application/json"
                  onChange={handleImportRecall}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={exportPresetsAsJson}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-slate-700/80 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Baixar arquivo JSON com todos os seus presets para backup"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar Presets</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-slate-700/80 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Restaurar presets de arquivo JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Importar Presets</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.aurapreset,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredPresets.map((preset) => {
                const isUser = preset.category === 'user';
                return (
                  <div
                    key={preset.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isUser
                        ? 'bg-[#11192e] border-cyan-500/40 hover:border-cyan-400'
                        : 'bg-[#0f1524] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              MEU PRESET
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              ESTÚDIO
                            </span>
                          )}
                          {preset.azimuthSettings && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-300 bg-amber-950/40 border border-amber-600/30 flex items-center gap-1">
                              <Disc className="w-2.5 h-2.5" />
                              Fita 1/4"
                            </span>
                          )}
                        </div>

                        {isUser && (
                          <button
                            onClick={() => handleDelete(preset.id, preset.name)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="Excluir preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mt-1.5">{preset.name}</h3>

                      {preset.description && (
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {preset.description}
                        </p>
                      )}
                    </div>

                    {/* Preset Key Metrics & Apply Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                        <span>Alvo: {preset.settings.targetLufs ?? -14} LUFS</span>
                        <span>·</span>
                        <span>Calor: {preset.settings.tapeWarmth}%</span>
                      </div>

                      <button
                        onClick={() => {
                          onLoadPreset(preset);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Carregar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0e1424] flex items-center justify-between text-xs text-slate-400">
          <span>Os presets próprios ficam salvos permanentemente no seu navegador.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
