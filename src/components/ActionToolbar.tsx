import React, { useState } from 'react';
import { Trash2, Printer, Share2, Copy, Check, Sparkles, AlertTriangle, X, Camera, FileText, BookmarkCheck, History } from 'lucide-react';

interface ActionToolbarProps {
  onClearForm: () => void;
  onPrint: () => void;
  onCopyWhatsApp: () => void;
  onLoadDemoData: () => void;
  onOpenPhotoModal: (tab?: 'photo' | 'pdf_previous') => void;
  onSaveToHistory?: () => void;
  onOpenHistory?: () => void;
  isCopied: boolean;
  isHistorySaved?: boolean;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onClearForm,
  onPrint,
  onCopyWhatsApp,
  onLoadDemoData,
  onOpenPhotoModal,
  onSaveToHistory,
  onOpenHistory,
  isCopied,
  isHistorySaved = false,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 mb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Save to History (30 shifts) */}
            {onSaveToHistory && (
              <button
                id="save-to-history-btn"
                type="button"
                onClick={onSaveToHistory}
                title="Salva este fechamento no histórico local de 30 dias"
                className={`flex-1 sm:flex-initial text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isHistorySaved
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/15'
                }`}
              >
                {isHistorySaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvo no Histórico!</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Salvar no Histórico (30d)</span>
                  </>
                )}
              </button>
            )}

            {/* Open History Drawer */}
            {onOpenHistory && (
              <button
                id="toolbar-open-history-btn"
                type="button"
                onClick={onOpenHistory}
                title="Visualizar histórico dos últimos 30 fechamentos"
                className="flex-1 sm:flex-initial text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <History className="w-4 h-4 text-amber-600" />
                <span>Ver Histórico</span>
              </button>
            )}

            {/* Import by PDF Previous Shift Button */}
            <button
              id="import-pdf-previous-btn"
              type="button"
              onClick={() => onOpenPhotoModal('pdf_previous')}
              title="Importar PDF ou imagem do fechamento anterior para preencher abertura dos bicos"
              className="flex-1 sm:flex-initial text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar PDF Anterior</span>
            </button>

            {/* Import by Photo Button */}
            <button
              id="import-photo-btn"
              type="button"
              onClick={() => onOpenPhotoModal('photo')}
              title="Tirar foto ou carregar imagem para preenchimento automático via IA"
              className="flex-1 sm:flex-initial text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar por Foto</span>
            </button>

            {/* Demo data filler for fast testing */}
            <button
              id="load-demo-btn"
              type="button"
              onClick={onLoadDemoData}
              title="Preencher com leituras de exemplo para testar os cálculos"
              className="flex-1 sm:flex-initial text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Dados Exemplo</span>
            </button>

            {/* Clear Form */}
            <button
              id="clear-form-btn"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex-1 sm:flex-initial text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {/* WhatsApp Copy */}
            <button
              id="copy-whatsapp-btn"
              type="button"
              onClick={onCopyWhatsApp}
              className={`flex-1 sm:flex-initial text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                isCopied
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado para WhatsApp!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Copiar Resumo (WhatsApp)</span>
                </>
              )}
            </button>

            {/* Print / Export PDF */}
            <button
              id="print-pdf-btn"
              type="button"
              onClick={onPrint}
              className="flex-1 sm:flex-initial text-xs font-semibold text-slate-800 hover:text-slate-900 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Limpar Formulário */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              Limpar todo o formulário?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Esta ação irá apagar as leituras de abertura, aferições, fechamentos e recolhimentos salvos localmente. Deseja continuar?
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearForm();
                  setShowClearConfirm(false);
                }}
                className="flex-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Sim, Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
