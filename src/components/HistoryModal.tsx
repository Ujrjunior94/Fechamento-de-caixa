import React, { useState, useMemo } from 'react';
import {
  SavedShiftRecord,
  ShiftInfo,
  FuelCode,
  NozzleData,
  ExtraEntry,
  CashConference,
} from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import {
  formatCurrency,
  formatLiters,
  generateWhatsAppMessage,
} from '../utils/formatters';
import {
  History,
  X,
  Search,
  Calendar,
  User,
  Clock,
  Trash2,
  Download,
  Share2,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Check,
  Building,
  TrendingUp,
  Coins,
  Fuel,
  ArrowUpRight,
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: SavedShiftRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onGenerateDemo: () => void;
  onLoadRecordToActiveShift: (record: SavedShiftRecord) => void;
  onApplyAsOpeningMeters: (record: SavedShiftRecord) => void;
  onSaveCurrentShiftNow: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyList,
  onDeleteRecord,
  onClearAll,
  onGenerateDemo,
  onLoadRecordToActiveShift,
  onApplyAsOpeningMeters,
  onSaveCurrentShiftNow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [inspectingRecord, setInspectingRecord] = useState<SavedShiftRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Filtered records
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.shift.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.shift.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.conference.notes && item.conference.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.shift.date.includes(searchTerm);

      const matchesShift =
        selectedShiftFilter === 'all' || item.shift.shiftType === selectedShiftFilter;

      const matchesDate =
        !selectedDateFilter || item.shift.date === selectedDateFilter;

      return matchesSearch && matchesShift && matchesDate;
    });
  }, [historyList, searchTerm, selectedShiftFilter, selectedDateFilter]);

  // Aggregate metrics over the 30 saved records
  const aggregateMetrics = useMemo(() => {
    let totalLiters = 0;
    let totalRevenue = 0;
    let totalQuebra = 0;

    historyList.forEach((rec) => {
      totalLiters += rec.summary.totalLiters || 0;
      totalRevenue += rec.summary.grandTotal || 0;
      totalQuebra += rec.quebraValor || 0;
    });

    return {
      count: historyList.length,
      totalLiters,
      totalRevenue,
      totalQuebra,
      avgRevenue: historyList.length > 0 ? totalRevenue / historyList.length : 0,
    };
  }, [historyList]);

  if (!isOpen) return null;

  const handleCopyRecordWhatsApp = async (rec: SavedShiftRecord) => {
    const text = generateWhatsAppMessage(
      rec.shift,
      rec.summary,
      rec.nozzles,
      rec.extraEntries,
      rec.conference
    );
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleLoadShift = (rec: SavedShiftRecord) => {
    onLoadRecordToActiveShift(rec);
    setAppliedNotice(`Fechamento de ${rec.shift.date} (${rec.shift.cashierName}) restaurado no caixa com sucesso!`);
    setTimeout(() => {
      setAppliedNotice(null);
      onClose();
    }, 1500);
  };

  const handleApplyTransition = (rec: SavedShiftRecord) => {
    onApplyAsOpeningMeters(rec);
    setAppliedNotice(`Encerrantes do dia ${rec.shift.date} aplicados como abertura para o novo turno!`);
    setTimeout(() => {
      setAppliedNotice(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Histórico de Fechamentos</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {historyList.length} / 30 salvos
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Consulta dos últimos fechamentos armazenados em localStorage no seu dispositivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if Action Applied */}
        {appliedNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
        )}

        {/* Top Aggregate Summary Metrics */}
        {historyList.length > 0 && (
          <div className="bg-slate-900 text-white p-3 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Fechamentos</span>
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {aggregateMetrics.count} <span className="text-xs font-normal text-slate-400">turnos</span>
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                <span>Volume Total</span>
              </div>
              <div className="text-lg font-bold text-white tracking-tight">
                {formatLiters(aggregateMetrics.totalLiters)}
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Faturamento Total</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 tracking-tight">
                {formatCurrency(aggregateMetrics.totalRevenue)}
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Saldo de Quebra</span>
              </div>
              <div
                className={`text-lg font-bold tracking-tight ${
                  aggregateMetrics.totalQuebra < -0.05
                    ? 'text-rose-400'
                    : aggregateMetrics.totalQuebra > 0.05
                    ? 'text-blue-400'
                    : 'text-slate-300'
                }`}
              >
                {formatCurrency(aggregateMetrics.totalQuebra)}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Quick Actions Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por frentista, posto..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Date Filter */}
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>

            {/* Shift Type Filter */}
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">Todos os Turnos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
              <option value="Geral">Geral</option>
            </select>

            {(searchTerm || selectedDateFilter || selectedShiftFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDateFilter('');
                  setSelectedShiftFilter('all');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save current shift button */}
            <button
              type="button"
              onClick={onSaveCurrentShiftNow}
              className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salvar Caixa Atual</span>
            </button>
          </div>
        </div>

        {/* Modal Body: List of Records */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/50 space-y-3">
          {historyList.length === 0 ? (
            <div className="text-center py-12 px-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Nenhum fechamento salvo ainda</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Os fechamentos são gravados automaticamente quando você clica em &quot;Salvar no Histórico&quot;. Você pode armazenar os últimos 30 turnos para consultas e conferências.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onSaveCurrentShiftNow}
                  className="w-full sm:w-auto text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Salvar Caixa Atual Agora
                </button>
                <button
                  type="button"
                  onClick={onGenerateDemo}
                  className="w-full sm:w-auto text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Gerar Histórico de Exemplo (6 dias)
                </button>
              </div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Nenhum fechamento encontrado para os filtros selecionados.
            </div>
          ) : (
            filteredList.map((rec) => {
              const dateObj = new Date(rec.shift.date + 'T12:00:00');
              const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : rec.shift.date;

              const isQuebraNegative = rec.quebraValor < -0.05;
              const isQuebraPositive = rec.quebraValor > 0.05;

              return (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-amber-300 hover:shadow-xs transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    {/* Shift identification info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex flex-col items-center justify-center font-bold shrink-0 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-semibold leading-none">
                          {rec.shift.shiftType.substring(0, 3).toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-800 font-bold leading-tight">
                          {formattedDate.split('/')[0]}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {formattedDate}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {rec.shift.shiftType}
                          </span>
                          {rec.shift.stationName && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {rec.shift.stationName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Frentista: <strong>{rec.shift.cashierName || 'Não informado'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Financial & Volume Summary Badges */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <div className="text-left md:text-right">
                        <div className="text-[11px] text-slate-400 font-medium">Volume Total</div>
                        <div className="text-xs font-bold text-slate-800">
                          {formatLiters(rec.summary.totalLiters)}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-[11px] text-slate-400 font-medium">Faturamento Geral</div>
                        <div className="text-sm font-bold text-emerald-600">
                          {formatCurrency(rec.summary.grandTotal)}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-[11px] text-slate-400 font-medium">Quebra / Diferença</div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block ${
                            isQuebraNegative
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isQuebraPositive
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isQuebraNegative
                            ? `Falta ${formatCurrency(Math.abs(rec.quebraValor))}`
                            : isQuebraPositive
                            ? `Sobra ${formatCurrency(rec.quebraValor)}`
                            : 'Zerado (OK)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fuel Breakdown Mini Chips */}
                  <div className="py-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                    {Object.entries(rec.summary.byProduct || {}).map(([code, prodSum]) => {
                      const typedSum = prodSum as { liters: number; revenue: number; activeNozzles: number } | undefined;
                      if (!typedSum || typedSum.liters <= 0) return null;
                      const fuelDef = FUEL_PRODUCTS[code as FuelCode];
                      return (
                        <div
                          key={code}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: fuelDef?.dotColor || '#94a3b8' }}
                          />
                          <span className="font-semibold">{fuelDef?.shortLabel || code}:</span>
                          <span>{formatLiters(typedSum.liters)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => setInspectingRecord(rec)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver Detalhes</span>
                      </button>

                      {/* Transition to Next Shift (use closing as opening) */}
                      <button
                        type="button"
                        onClick={() => handleApplyTransition(rec)}
                        title="Usa os encerrantes finais deste fechamento como abertura para o novo turno"
                        className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                        <span>Usar p/ Novo Turno</span>
                      </button>

                      {/* Restore to Active Shift */}
                      <button
                        type="button"
                        onClick={() => handleLoadShift(rec)}
                        title="Carrega este fechamento na tela principal para edição ou reimpressão"
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Restaurar no Caixa</span>
                      </button>

                      {/* Copy WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleCopyRecordWhatsApp(rec)}
                        className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedId === rec.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      {/* Delete single record */}
                      {confirmDeleteId === rec.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <span className="text-[11px] text-rose-600 font-semibold">Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteRecord(rec.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-xs font-bold text-white bg-rose-600 px-2 py-1 rounded-md cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-md cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(rec.id)}
                          className="text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded-md transition-colors cursor-pointer"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {historyList.length > 0 && (
              <>
                {confirmClearAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-600">Apagar todos os 30 registros?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAll();
                        setConfirmClearAll(false);
                      }}
                      className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Sim, Apagar Tudo
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Todo Histórico</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerateDemo}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gerar Dados Demonstração</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Detail Inspection Modal for a Single Historic Shift */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in">
            {/* Inspect Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>Detalhes do Fechamento: {inspectingRecord.shift.date}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500 text-slate-900 font-bold">
                    {inspectingRecord.shift.shiftType}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Frentista: {inspectingRecord.shift.cashierName || 'N/A'} &bull; Posto: {inspectingRecord.shift.stationName || 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspect Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Financial & Volume Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium mb-0.5">Volume Total</div>
                  <div className="text-base font-bold text-slate-800">
                    {formatLiters(inspectingRecord.summary.totalLiters)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium mb-0.5">Faturamento Combustíveis</div>
                  <div className="text-base font-bold text-slate-800">
                    {formatCurrency(inspectingRecord.summary.totalFuelRevenue)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium mb-0.5">Recolhimentos Extras</div>
                  <div className="text-base font-bold text-slate-800">
                    {formatCurrency(inspectingRecord.summary.totalExtraRevenue)}
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-emerald-700 font-medium mb-0.5">Faturamento Geral</div>
                  <div className="text-base font-bold text-emerald-700">
                    {formatCurrency(inspectingRecord.summary.grandTotal)}
                  </div>
                </div>
              </div>

              {/* Nozzles Table (01 to 16) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
                  <span>Leitura dos Bicos (01 a 16)</span>
                  <span className="text-[11px] font-normal text-slate-500">16 bicos registrados</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-center">Bico</th>
                        <th className="p-2">Combustível</th>
                        <th className="p-2 text-right">Abertura</th>
                        <th className="p-2 text-right">Aferição (L)</th>
                        <th className="p-2 text-right">Fechamento</th>
                        <th className="p-2 text-right">Litros Vendidos</th>
                        <th className="p-2 text-right">Preço Unit.</th>
                        <th className="p-2 text-right font-bold">Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {inspectingRecord.nozzles.map((n) => {
                        const open = parseFloat(n.openingMeter.replace(',', '.')) || 0;
                        const close = parseFloat(n.closingMeter.replace(',', '.')) || 0;
                        const calib = parseFloat(n.calibrationLiters.replace(',', '.')) || 0;
                        const rawDiff = Math.max(0, close - open);
                        const netLiters = Math.max(0, rawDiff - calib);
                        const totalReais = netLiters * n.unitPrice;
                        const fuelDef = FUEL_PRODUCTS[n.productCode];

                        return (
                          <tr key={n.id} className="hover:bg-slate-50/80">
                            <td className="p-2 text-center font-bold text-slate-800">Bico {n.numberLabel}</td>
                            <td className="p-2 font-medium">
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: fuelDef?.dotColor || '#94a3b8' }}
                              />
                              {fuelDef?.shortLabel || n.productCode}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700">{n.openingMeter || '-'}</td>
                            <td className="p-2 text-right text-slate-600">{n.calibrationLiters || '0'}</td>
                            <td className="p-2 text-right font-mono text-slate-700">{n.closingMeter || '-'}</td>
                            <td className="p-2 text-right font-semibold text-slate-800">{formatLiters(netLiters)}</td>
                            <td className="p-2 text-right text-slate-600">{formatCurrency(n.unitPrice)}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(totalReais)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extra Entries and Cash Conference Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extra Entries */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2">Recolhimentos / Itens Extras (Linha 17+)</h4>
                  {inspectingRecord.extraEntries.filter((e) => parseFloat(e.value) > 0).length === 0 ? (
                    <p className="text-slate-400 italic">Nenhum recolhimento extra lançado neste fechamento.</p>
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {inspectingRecord.extraEntries
                        .filter((e) => parseFloat(e.value) > 0)
                        .map((entry) => (
                          <li key={entry.id} className="py-1.5 flex items-center justify-between">
                            <span className="text-slate-700">{entry.description}</span>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(parseFloat(entry.value) || 0)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                {/* Cash Conference & Quebra */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2">Conferência de Caixa &amp; Quebra</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dinheiro em Espécie:</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(parseFloat(inspectingRecord.conference.cashAmount.replace(',', '.')) || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cartões (Débito/Crédito):</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(parseFloat(inspectingRecord.conference.cardsAmount.replace(',', '.')) || 0)}
                      </span>
                    </div>
                    {inspectingRecord.conference.pixAmount && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">PIX / Transferências:</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(parseFloat(inspectingRecord.conference.pixAmount.replace(',', '.')) || 0)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Resultado da Quebra:</span>
                      <span
                        className={
                          inspectingRecord.quebraValor < -0.05
                            ? 'text-rose-600'
                            : inspectingRecord.quebraValor > 0.05
                            ? 'text-blue-600'
                            : 'text-emerald-600'
                        }
                      >
                        {inspectingRecord.quebraValor < -0.05
                          ? `Falta ${formatCurrency(Math.abs(inspectingRecord.quebraValor))}`
                          : inspectingRecord.quebraValor > 0.05
                          ? `Sobra ${formatCurrency(inspectingRecord.quebraValor)}`
                          : 'Correto / Sem Quebra'}
                      </span>
                    </div>
                  </div>

                  {inspectingRecord.conference.notes && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-600">
                      <strong className="block text-[10px] uppercase text-slate-400">Observações:</strong>
                      <p className="mt-0.5">{inspectingRecord.conference.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inspect Modal Actions */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApplyTransition(inspectingRecord);
                    setInspectingRecord(null);
                  }}
                  className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  <span>Usar p/ Abertura do Novo Turno</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleLoadShift(inspectingRecord);
                    setInspectingRecord(null);
                  }}
                  className="text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  <span>Restaurar este Fechamento no Caixa</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
