import React, { useState } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Scale,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowDownCircle,
  Check,
  Plus,
} from 'lucide-react';
import { CashConference, OverallSummary } from '../types';
import { formatCurrency, parseNumber } from '../utils/formatters';

interface CashConferenceSectionProps {
  conference: CashConference;
  onChangeField: (field: keyof CashConference, value: string) => void;
  summary: OverallSummary;
  onClearConference: () => void;
}

export const CashConferenceSection: React.FC<CashConferenceSectionProps> = ({
  conference,
  onChangeField,
  summary,
  onClearConference,
}) => {
  const [showAdditionalMethods, setShowAdditionalMethods] = useState(
    () => Boolean(parseNumber(conference.pixAmount) > 0 || parseNumber(conference.otherAmount) > 0)
  );

  const cashVal = parseNumber(conference.cashAmount);
  const cardsVal = parseNumber(conference.cardsAmount);
  const pixVal = parseNumber(conference.pixAmount);
  const otherVal = parseNumber(conference.otherAmount);

  // Total Apurado (Valores físicos e comprovantes conferidos)
  const totalAudited = cashVal + cardsVal + pixVal + otherVal;
  // Total Esperado (Encerrantes dos 16 bicos + Recolhimentos extras)
  const totalExpected = summary.grandTotal;

  // Quebra = Apurado - Esperado
  // Negativo = Falta (apurou menos do que vendeu)
  // Positivo = Sobra (apurou mais do que o registrado)
  // Zero = Caixa Batido
  const difference = totalAudited - totalExpected;
  const hasValuesEntered =
    conference.cashAmount.trim() !== '' ||
    conference.cardsAmount.trim() !== '' ||
    Boolean(conference.pixAmount && conference.pixAmount.trim() !== '') ||
    Boolean(conference.otherAmount && conference.otherAmount.trim() !== '');

  const isExactMatch = hasValuesEntered && Math.abs(difference) < 0.009;
  const isShortage = totalExpected > 0 && (difference < -0.009 || (!hasValuesEntered && totalExpected > 0));
  const isStrictShortageWithValues = hasValuesEntered && difference < -0.009;
  const isSurplus = hasValuesEntered && difference > 0.009;

  // Percentage calculated for visual progress bar
  const coveragePercent = totalExpected > 0
    ? Math.min(100, Math.max(0, (totalAudited / totalExpected) * 100))
    : (hasValuesEntered ? 100 : 0);

  const missingAmount = Math.max(0, totalExpected - totalAudited);

  // Fill remaining difference in Cash or Cards
  const handleCompleteInCash = () => {
    if (missingAmount <= 0) return;
    const newCash = (cashVal + missingAmount).toFixed(2);
    onChangeField('cashAmount', newCash);
  };

  const handleCompleteInCards = () => {
    if (missingAmount <= 0) return;
    const newCards = (cardsVal + missingAmount).toFixed(2);
    onChangeField('cardsAmount', newCards);
  };

  // Fill in cards & cash automatically as a starting split (35% cash, 65% cards)
  const handleAutoEqualize = () => {
    if (totalExpected <= 0) return;
    onChangeField('cashAmount', (totalExpected * 0.35).toFixed(2));
    onChangeField('cardsAmount', (totalExpected * 0.65).toFixed(2));
  };

  const handleApplyNotePreset = (preset: string) => {
    if (!conference.notes.trim()) {
      onChangeField('notes', preset);
    } else {
      onChangeField('notes', `${conference.notes.trim()} | ${preset}`);
    }
  };

  return (
    <div className={`bg-white border rounded-2xl shadow-xs overflow-hidden mb-8 transition-colors ${
      isStrictShortageWithValues
        ? 'border-rose-300 ring-1 ring-rose-200'
        : isExactMatch
        ? 'border-emerald-300 ring-1 ring-emerald-200'
        : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className={`p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isStrictShortageWithValues
          ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900'
          : isExactMatch
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900'
          : 'bg-gradient-to-r from-slate-900 to-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isStrictShortageWithValues
              ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/40'
              : isExactMatch
              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40'
              : 'bg-white/10 text-amber-400'
          }`}>
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 flex-wrap">
              Conferência de Caixa e Quebra
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isStrictShortageWithValues
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  : isExactMatch
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              }`}>
                Apurado vs Esperado
              </span>
              {isStrictShortageWithValues && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Soma Menor que o Esperado (-{formatCurrency(Math.abs(difference))})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300">
              Declare o dinheiro físico e cartões para validação imediata em relação ao total dos bicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {hasValuesEntered && (
            <button
              type="button"
              onClick={onClearConference}
              className="text-xs font-medium text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Conferência</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Progress & Immediate Shortage Alert Banner */}
      {totalExpected > 0 && (
        <div className={`px-4 sm:px-6 py-3 border-b transition-colors ${
          isStrictShortageWithValues
            ? 'bg-rose-50/90 border-rose-200'
            : isExactMatch
            ? 'bg-emerald-50/90 border-emerald-200'
            : isSurplus
            ? 'bg-blue-50/90 border-blue-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              {isStrictShortageWithValues ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Divergência detectada: Valor apurado está abaixo do faturamento dos bicos</span>
                </div>
              ) : isExactMatch ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conferência 100% batida com o faturamento dos bicos!</span>
                </div>
              ) : isSurplus ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Sobra apurada no caixa (+{formatCurrency(difference)})</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-600">
                  Progresso da conferência financeira:
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className={isStrictShortageWithValues ? 'text-rose-700 font-extrabold' : 'text-slate-700'}>
                {formatCurrency(totalAudited)}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900">{formatCurrency(totalExpected)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                isStrictShortageWithValues
                  ? 'bg-rose-200 text-rose-900'
                  : isExactMatch
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {coveragePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isStrictShortageWithValues
                  ? 'bg-rose-500'
                  : isExactMatch
                  ? 'bg-emerald-500'
                  : isSurplus
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>

          {/* Action pills for immediate adjustment when in shortage */}
          {isStrictShortageWithValues && (
            <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-rose-800 font-medium flex items-center gap-1">
                <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />
                Faltam declarar <strong className="font-bold">{formatCurrency(missingAmount)}</strong> para igualar os bicos.
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCompleteInCash}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Soma o valor faltante no campo de Dinheiro"
                >
                  <Plus className="w-3 h-3 text-rose-600" />
                  Completar no Dinheiro
                </button>
                <button
                  type="button"
                  onClick={handleCompleteInCards}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Soma o valor faltante no campo de Cartões"
                >
                  <Plus className="w-3 h-3 text-rose-600" />
                  Completar no Cartão
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6">
        {/* Main Inputs Grid: Dinheiro em Caixa and Cartões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dinheiro em Caixa */}
          <div className={`p-4 rounded-xl border transition-all ${
            isStrictShortageWithValues
              ? 'bg-rose-50/50 border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
              : isExactMatch
              ? 'bg-emerald-50/30 border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
              : 'bg-slate-50 border-slate-200 focus-within:border-amber-400 focus-within:bg-white'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="input-cash-amount"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  isStrictShortageWithValues
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <span>Dinheiro em Caixa (Espécie)</span>
              </label>

              <div className="flex items-center gap-1.5">
                {isStrictShortageWithValues && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Falta na soma
                  </span>
                )}
                {cashVal > 0 && (
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    {formatCurrency(cashVal)}
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                isStrictShortageWithValues ? 'text-rose-500' : 'text-slate-400'
              }`}>
                R$
              </span>
              <input
                id="input-cash-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={conference.cashAmount}
                onChange={(e) => onChangeField('cashAmount', e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm font-mono font-semibold placeholder-slate-400 focus:outline-none transition-colors ${
                  isStrictShortageWithValues
                    ? 'border-rose-400 text-rose-950 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : isExactMatch
                    ? 'border-emerald-400 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-500">
                Total em notas e moedas físicas contadas na gaveta ou cofre
              </span>
              {isStrictShortageWithValues && missingAmount > 0 && (
                <button
                  type="button"
                  onClick={handleCompleteInCash}
                  className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  +{formatCurrency(missingAmount)}
                </button>
              )}
            </div>
          </div>

          {/* Cartões (Débito e Crédito) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isStrictShortageWithValues
              ? 'bg-rose-50/50 border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
              : isExactMatch
              ? 'bg-emerald-50/30 border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
              : 'bg-slate-50 border-slate-200 focus-within:border-amber-400 focus-within:bg-white'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="input-cards-amount"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  isStrictShortageWithValues
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span>Cartões (Débito e Crédito)</span>
              </label>

              <div className="flex items-center gap-1.5">
                {isStrictShortageWithValues && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Falta na soma
                  </span>
                )}
                {cardsVal > 0 && (
                  <span className="text-[11px] font-mono font-bold text-blue-700">
                    {formatCurrency(cardsVal)}
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                isStrictShortageWithValues ? 'text-rose-500' : 'text-slate-400'
              }`}>
                R$
              </span>
              <input
                id="input-cards-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={conference.cardsAmount}
                onChange={(e) => onChangeField('cardsAmount', e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm font-mono font-semibold placeholder-slate-400 focus:outline-none transition-colors ${
                  isStrictShortageWithValues
                    ? 'border-rose-400 text-rose-950 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : isExactMatch
                    ? 'border-emerald-400 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-500">
                Soma total dos comprovantes ou relatório POS/TEF de cartões
              </span>
              {isStrictShortageWithValues && missingAmount > 0 && (
                <button
                  type="button"
                  onClick={handleCompleteInCards}
                  className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  +{formatCurrency(missingAmount)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Optional Additional Payment Methods (PIX / Outros) Toggle */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdditionalMethods(!showAdditionalMethods)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1"
          >
            {showAdditionalMethods ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>
              {showAdditionalMethods
                ? 'Ocultar outras formas de recebimento (PIX / Faturado)'
                : 'Adicionar outras formas de recebimento (PIX, Convênio, Faturado...)'}
            </span>
          </button>

          {showAdditionalMethods && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {/* PIX / Carteiras Digitais */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isStrictShortageWithValues
                  ? 'bg-rose-50/40 border-rose-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="input-pix-amount"
                    className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5 text-teal-600" />
                    <span>PIX / Pagamentos Digitais</span>
                  </label>
                  {pixVal > 0 && (
                    <span className="text-[11px] font-mono font-bold text-teal-700">
                      {formatCurrency(pixVal)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    isStrictShortageWithValues ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    R$
                  </span>
                  <input
                    id="input-pix-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={conference.pixAmount || ''}
                    onChange={(e) => onChangeField('pixAmount', e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-lg text-xs font-mono font-semibold placeholder-slate-400 focus:outline-none ${
                      isStrictShortageWithValues
                        ? 'border-rose-400 text-rose-950 focus:border-rose-500'
                        : 'border-slate-300 text-slate-800 focus:border-teal-500'
                    }`}
                  />
                </div>
              </div>

              {/* Faturado / Convênio / Outros */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isStrictShortageWithValues
                  ? 'bg-rose-50/40 border-rose-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="input-other-amount"
                    className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>Faturado / Convênio / Outros</span>
                  </label>
                  {otherVal > 0 && (
                    <span className="text-[11px] font-mono font-bold text-purple-700">
                      {formatCurrency(otherVal)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    isStrictShortageWithValues ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    R$
                  </span>
                  <input
                    id="input-other-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={conference.otherAmount || ''}
                    onChange={(e) => onChangeField('otherAmount', e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-lg text-xs font-mono font-semibold placeholder-slate-400 focus:outline-none ${
                      isStrictShortageWithValues
                        ? 'border-rose-400 text-rose-950 focus:border-rose-500'
                        : 'border-slate-300 text-slate-800 focus:border-purple-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comparison & Quebra Result Box */}
        <div className={`border rounded-2xl overflow-hidden shadow-xs transition-colors ${
          isStrictShortageWithValues
            ? 'border-rose-300'
            : isExactMatch
            ? 'border-emerald-300'
            : 'border-slate-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50">
            {/* Col 1: Total Esperado */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  1. Total Esperado (Bicos)
                </span>
                <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
                  {formatCurrency(totalExpected)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2">
                Bicos 01 a 16 + Recolhimentos extras
              </span>
            </div>

            {/* Col 2: Total Apurado */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  2. Total Apurado (Declarado)
                </span>
                <span className={`text-xl font-extrabold font-mono tracking-tight block ${
                  isStrictShortageWithValues
                    ? 'text-rose-700'
                    : isExactMatch
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }`}>
                  {formatCurrency(totalAudited)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between flex-wrap gap-1">
                <span>Dinheiro + Cartões {pixVal > 0 ? '+ PIX' : ''}</span>
                {!hasValuesEntered && totalExpected > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoEqualize}
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                  >
                    Simular conferência
                  </button>
                )}
              </div>
            </div>

            {/* Col 3: Quebra / Diferença */}
            <div
              className={`p-4 flex flex-col justify-between transition-colors ${
                !hasValuesEntered
                  ? 'bg-slate-100/70 text-slate-700'
                  : isExactMatch
                  ? 'bg-emerald-50 text-emerald-900'
                  : isShortage
                  ? 'bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-300/60'
                  : 'bg-blue-50 text-blue-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider block">
                    3. Quebra de Caixa (Diferença)
                  </span>
                  {hasValuesEntered && (
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        isExactMatch
                          ? 'bg-emerald-200 text-emerald-800'
                          : isShortage
                          ? 'bg-rose-200 text-rose-900 font-black ring-1 ring-rose-400'
                          : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {isExactMatch ? 'Batido' : isShortage ? 'Falta / Negativo' : 'Sobra'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black font-mono tracking-tight ${
                      !hasValuesEntered
                        ? 'text-slate-400'
                        : isExactMatch
                        ? 'text-emerald-700'
                        : isShortage
                        ? 'text-rose-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {hasValuesEntered
                      ? `${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`
                      : 'R$ 0,00'}
                  </span>
                </div>
              </div>

              {/* Status explanation message */}
              <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
                {!hasValuesEntered ? (
                  <span className="text-slate-500 text-[11px]">
                    Preencha o dinheiro e cartões para conferir a quebra
                  </span>
                ) : isExactMatch ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-semibold">
                      Caixa exato! Valores conferidos sem quebra.
                    </span>
                  </>
                ) : isShortage ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-rose-800 font-semibold">
                      Falta de {formatCurrency(Math.abs(difference))} no caixa apurado.
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-blue-800 font-semibold">
                      Sobra de {formatCurrency(difference)} no caixa apurado.
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Campo de Observações */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label
              htmlFor="conference-notes"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Observações e Justificativas do Fechamento</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Registrado no relatório impresso e WhatsApp
            </span>
          </div>

          <textarea
            id="conference-notes"
            rows={3}
            value={conference.notes}
            onChange={(e) => onChangeField('notes', e.target.value)}
            placeholder="Registre aqui justificativas de quebra de caixa, troco inicial na gaveta, vales, notas pendentes, divergências de leitura ou ocorrências do turno..."
            className={`w-full p-3 border rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none transition-all font-sans ${
              isStrictShortageWithValues && !conference.notes.trim()
                ? 'bg-rose-50/30 border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800'
                : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800'
            }`}
          />

          {/* Preset tags for quick insertion */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
              Inserir rápido:
            </span>
            {[
              'Caixa conferido sem pendências',
              'Troco inicial mantido na gaveta',
              'Comprovantes de cartão conferidos com fita da máquina',
              'Diferença pendente de apuração com gerência',
              'Aferição extraordinária autorizada',
            ].map((preset, idx) => (
              <button
                key={`preset-${idx}`}
                type="button"
                onClick={() => handleApplyNotePreset(preset)}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
