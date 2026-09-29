import { useState } from 'react';
import { ForensicAnalysisResult } from '../types/audio';
import { X, FileText, Check, Download, ShieldAlert, Cpu, AlertTriangle, Activity } from 'lucide-react';

interface ForensicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ForensicAnalysisResult | null;
  onSeek: (time: number) => void;
}

export function ForensicReportModal({
  isOpen,
  onClose,
  report,
  onSeek,
}: ForensicReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopySummary = () => {
    const text = `=== RELATÓRIO TÉCNICO DE MASTERIZAÇÃO & ANÁLISE ESPECTRAL ===
Arquivo: ${report.filename}
Data/Hora: ${report.timestamp}
Diagnóstico Tonal: ${report.verdict}
Probabilidade de Geração IA: ${report.overallAiProbability}%
Confiança do Modelo: ${report.confidenceScore}%

ORIGEM & CARACTERÍSTICAS:
- ${report.dominantPlatform.name} (${report.dominantPlatform.probability}% probabilidade)
- Características Espectrais: ${report.dominantPlatform.keyFingerprints.join('; ')}

MÉTRICAS ACÚSTICAS MEDIDAS:
- Corte Nyquist / Largura de Banda: ${report.metrics.nyquistCutoffHz} Hz
- Correlação de Fase Estéreo: ${report.metrics.phaseCorrelationIndex.toFixed(2)}
- Fator de Crista Dinâmico: ${report.metrics.dynamicCrestFactorDb.toFixed(1)} dB
- Resíduo de Fundo: ${report.metrics.diffusionNoiseFloorDb} dB

DIAGNÓSTICO & RECOMENDAÇÃO DE MASTERIZAÇÃO:
${report.summaryDiagnosis}
==================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `relatorio_masterizacao_${report.filename.replace(/\.[^/.]+$/, '')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isHighAi = report.overallAiProbability > 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1322]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Relatório Técnico de Masterização & Análise Espectral
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{report.filename}</span>
                <span aria-hidden="true">·</span>
                <span>{report.timestamp}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">Master DSP ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-slate-200">
          {/* Executive Verdict Banner */}
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isHighAi
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${isHighAi ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isHighAi ? <ShieldAlert className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-mono opacity-80">
                  Veredito da Análise Forense
                </span>
                <h3 className="text-xl font-bold tracking-tight mt-0.5">
                  {report.verdict}
                </h3>
                <p className="text-xs opacity-90 mt-1 max-w-xl">
                  {report.summaryDiagnosis}
                </p>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-amber-500/20 sm:pl-6 pt-3 sm:pt-0 shrink-0">
              <span className="text-[11px] font-mono opacity-80 uppercase">Probabilidade Geral</span>
              <div className="text-3xl font-black font-mono tracking-tight">
                {report.overallAiProbability.toFixed(1)}%
              </div>
              <span className="text-[10px] font-mono opacity-80">
                Confiança: {report.confidenceScore}%
              </span>
            </div>
          </div>

          {/* Platform Identification Rankings */}
          <div className="bg-[#101524] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                Classificação & Atribuição de Plataforma Generativa
              </h4>
              <span className="text-xs font-mono text-amber-400">
                Mais Provável: {report.dominantPlatform.name} ({report.dominantPlatform.versionGuess || 'v3.5'})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {report.platformRankings.map((p, idx) => (
                <div
                  key={p.platform}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 ${
                    idx === 0
                      ? 'border-amber-500/40 bg-[#162035]'
                      : 'border-slate-800 bg-[#0d121e]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400">
                        {idx + 1}
                      </span>
                      {p.name}
                    </span>
                    <span className={`text-xs font-mono font-bold ${idx === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {p.probability.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-slate-600'}`}
                      style={{ width: `${p.probability}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {p.keyFingerprints.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline of Anomaly Detections */}
          {report.timelineMarkers.length > 0 && (
            <div className="bg-[#101524] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
                <Activity className="w-4 h-4 text-cyan-400" />
                Linha do Tempo de Anomalias Acústicas Detectadas
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-1">
                {report.timelineMarkers.map((marker, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSeek(marker.timeSeconds);
                      onClose();
                    }}
                    className="p-3 rounded-lg border border-slate-800 bg-[#0d121e] hover:border-slate-700 text-left transition-all group flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-mono font-semibold text-cyan-400 group-hover:text-cyan-300">
                        ⏱ {marker.timeFormatted}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        {marker.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {marker.label}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-2">
                      {marker.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acoustic Metric Grid */}
          <div className="bg-[#101524] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/80">
              Métricas Acústicas e Espectrais de Laboratório
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              <div className="p-3 rounded-lg bg-[#0d121e] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Corte Nyquist
                </span>
                <span className="text-base font-bold font-mono text-slate-200 mt-0.5 block">
                  {report.metrics.nyquistCutoffHz} Hz
                </span>
                <span className="text-[10px] text-slate-400">
                  {report.metrics.nyquistCutoffHz <= 16500 ? 'Brickwall Típico Suno' : 'Extensão Normal'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0d121e] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Correlação de Fase
                </span>
                <span className="text-base font-bold font-mono text-slate-200 mt-0.5 block">
                  {report.metrics.phaseCorrelationIndex.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {report.metrics.phaseCorrelationIndex < 0.5 ? 'Desfasamento Severo' : 'Mono Coeso'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0d121e] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Fator de Crista
                </span>
                <span className="text-base font-bold font-mono text-slate-200 mt-0.5 block">
                  {report.metrics.dynamicCrestFactorDb.toFixed(1)} dB
                </span>
                <span className="text-[10px] text-slate-400">
                  Faixa dinâmica de pico
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0d121e] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Resíduo de Difusão
                </span>
                <span className="text-base font-bold font-mono text-slate-200 mt-0.5 block">
                  {report.metrics.diffusionNoiseFloorDb} dB
                </span>
                <span className="text-[10px] text-slate-400">
                  Ruído latente medido
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
