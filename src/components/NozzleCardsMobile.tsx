import React from 'react';
import { NozzleData, FuelCode } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { calculateNozzleMetrics, formatCurrency, formatLiters } from '../utils/formatters';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface NozzleCardsMobileProps {
  nozzles: NozzleData[];
  onUpdateNozzle: (id: number, field: keyof NozzleData, value: any) => void;
  onProductChange: (id: number, productCode: FuelCode) => void;
}

export const NozzleCardsMobile: React.FC<NozzleCardsMobileProps> = ({
  nozzles,
  onUpdateNozzle,
  onProductChange,
}) => {
  const fuelCodes: FuelCode[] = ['ETANOL', 'G_COM', 'G_ADIT', 'D_S10', 'D_COM'];
  const nozzlesWithWarning = nozzles.filter((n) => calculateNozzleMetrics(n).hasWarning);
  const warningCount = nozzlesWithWarning.length;

  return (
    <div className="space-y-3 mb-6">
      {/* Mobile Top Warning Banner */}
      {warningCount > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-900">
              {warningCount} {warningCount === 1 ? 'bico com erro' : 'bicos com erros'} de leitura!
            </p>
            <p className="text-[11px] text-rose-700 leading-snug mt-0.5">
              Encerrante de fechamento menor que o de abertura. Verifique os campos em vermelho para não distorcer os litros vendidos.
            </p>
          </div>
        </div>
      )}

      {nozzles.map((nozzle) => {
        const product = FUEL_PRODUCTS[nozzle.productCode];
        const { litersSold, totalSold, hasWarning, warningMsg } = calculateNozzleMetrics(nozzle);

        return (
          <div
            key={`mobile-nozzle-${nozzle.id}`}
            className={`bg-white rounded-2xl border p-3.5 shadow-xs transition-all ${
              hasWarning
                ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/20'
                : litersSold > 0
                ? 'border-emerald-200 bg-emerald-50/10'
                : 'border-slate-200'
            }`}
          >
            {/* Card Header: Bico Number, Fuel selector, and Totals */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-xl font-mono text-sm font-bold shadow-xs ${
                    hasWarning
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {nozzle.numberLabel}
                </span>

                <div className="relative">
                  <select
                    id={`mobile-select-${nozzle.id}`}
                    value={nozzle.productCode}
                    onChange={(e) => onProductChange(nozzle.id, e.target.value as FuelCode)}
                    className={`text-xs font-semibold py-1 px-2.5 rounded-lg border appearance-none cursor-pointer focus:outline-hidden ${product.bgBadge}`}
                  >
                    {fuelCodes.map((fc) => (
                      <option key={fc} value={fc}>
                        {FUEL_PRODUCTS[fc].shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time result pill */}
              <div className="text-right">
                {hasWarning ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                    <AlertCircle className="w-3 h-3" />
                    Erro Leitura
                  </span>
                ) : (
                  <>
                    <div className="text-xs font-bold font-mono text-slate-800">
                      {formatLiters(litersSold)}
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-600">
                      {formatCurrency(totalSold)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error message banner if closing < opening */}
            {hasWarning && (
              <div className="mt-2.5 p-2 bg-rose-100/70 border border-rose-300 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{warningMsg}</span>
              </div>
            )}

            {/* Inputs: 3 columns (Abertura, Aferição, Fechamento) */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {/* Encerrante Abertura */}
              <div>
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    hasWarning ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  Abertura
                </label>
                <input
                  id={`m-open-${nozzle.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={nozzle.openingMeter}
                  onChange={(e) => onUpdateNozzle(nozzle.id, 'openingMeter', e.target.value)}
                  className={`w-full text-xs font-mono py-2 px-2 rounded-lg focus:outline-hidden transition-all ${
                    hasWarning
                      ? 'bg-amber-50/70 border border-amber-300 text-slate-900 focus:bg-white focus:border-amber-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Aferição */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Aferição (L)
                </label>
                <input
                  id={`m-calib-${nozzle.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  value={nozzle.calibrationLiters}
                  onChange={(e) => onUpdateNozzle(nozzle.id, 'calibrationLiters', e.target.value)}
                  className="w-full text-xs font-mono py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-amber-500 focus:outline-hidden text-center"
                />
              </div>

              {/* Encerrante Fechamento com Validação Visual em Vermelho */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    hasWarning ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  Fechamento {hasWarning && <span className="text-rose-600">*</span>}
                </label>
                <input
                  id={`m-close-${nozzle.id}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={nozzle.closingMeter}
                  onChange={(e) => onUpdateNozzle(nozzle.id, 'closingMeter', e.target.value)}
                  className={`w-full text-xs font-mono py-2 px-2 rounded-lg font-bold focus:outline-hidden transition-all ${
                    hasWarning
                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/30'
                      : 'bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:bg-white focus:border-amber-500'
                  }`}
                />
                {hasWarning && (
                  <span className="block text-[9px] font-bold text-rose-600 mt-1 leading-tight">
                    Menor que abertura!
                  </span>
                )}
              </div>
            </div>

            {/* Footer with unit price indicator */}
            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Preço: {formatCurrency(nozzle.unitPrice)}/L</span>
              <span className="font-mono">
                {nozzle.openingMeter && nozzle.closingMeter ? (
                  `${nozzle.closingMeter} - ${nozzle.openingMeter} - ${nozzle.calibrationLiters || '0'}`
                ) : (
                  'Aguardando leitura'
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
