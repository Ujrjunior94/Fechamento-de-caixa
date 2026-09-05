import React from 'react';
import { NozzleData, FuelCode } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { calculateNozzleMetrics, formatCurrency, formatLiters } from '../utils/formatters';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface NozzleTableProps {
  nozzles: NozzleData[];
  onUpdateNozzle: (id: number, field: keyof NozzleData, value: any) => void;
  onProductChange: (id: number, productCode: FuelCode) => void;
}

export const NozzleTable: React.FC<NozzleTableProps> = ({
  nozzles,
  onUpdateNozzle,
  onProductChange,
}) => {
  const fuelCodes: FuelCode[] = ['ETANOL', 'G_COM', 'G_ADIT', 'D_S10', 'D_COM'];

  // Count nozzles with closing meter < opening meter
  const nozzlesWithWarning = nozzles.filter((n) => calculateNozzleMetrics(n).hasWarning);
  const warningCount = nozzlesWithWarning.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-6">
      {/* Table Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Leitura dos Encerrantes e Aferições (Bicos 01 a 16)
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Litros = Fechamento - Abertura - Aferição | Total R$ = Litros × Preço
        </p>
      </div>

      {/* Prominent Warning Banner if any nozzle has Closing < Opening */}
      {warningCount > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex items-center justify-between gap-3 text-rose-900">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                Atenção: {warningCount}{' '}
                {warningCount === 1
                  ? 'bico com encerrante de fechamento menor que o de abertura!'
                  : 'bicos com encerrante de fechamento menor que abertura!'}
              </p>
              <p className="text-[11px] text-rose-700">
                O encerrante final não pode ser menor que o inicial. Os campos divergentes estão
                destacados em vermelho abaixo para correção.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex text-[11px] font-mono font-bold bg-rose-200/80 text-rose-800 px-2.5 py-1 rounded-md">
            {nozzlesWithWarning.map((n) => `Bico ${n.numberLabel}`).join(', ')}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-3 w-16 text-center">Bico</th>
              <th className="py-3 px-3 w-36">Produto</th>
              <th className="py-3 px-3 w-28 text-right">Preço (R$)</th>
              <th className="py-3 px-3 w-40">Encerrante Abertura</th>
              <th className="py-3 px-3 w-28 text-center">Aferição (L)</th>
              <th className="py-3 px-3 w-44">Encerrante Fechamento</th>
              <th className="py-3 px-3 w-32 text-right">Litros Vendidos</th>
              <th className="py-3 px-3 w-36 text-right">Total Vendido (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {nozzles.map((nozzle, index) => {
              const product = FUEL_PRODUCTS[nozzle.productCode];
              const { litersSold, totalSold, hasWarning, warningMsg } = calculateNozzleMetrics(nozzle);
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={nozzle.id}
                  className={`hover:bg-amber-50/30 transition-colors ${
                    hasWarning
                      ? 'bg-rose-50/60 border-l-4 border-l-rose-500'
                      : isEven
                      ? 'bg-white'
                      : 'bg-slate-50/40'
                  }`}
                >
                  {/* Bico N.º */}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold ${
                        hasWarning
                          ? 'bg-rose-100 border-rose-300 text-rose-800 ring-1 ring-rose-400'
                          : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      {nozzle.numberLabel}
                    </span>
                  </td>

                  {/* Produto */}
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <select
                        id={`nozzle-product-${nozzle.id}`}
                        value={nozzle.productCode}
                        onChange={(e) => onProductChange(nozzle.id, e.target.value as FuelCode)}
                        className={`text-xs font-semibold py-1 px-2 pr-6 rounded-md border appearance-none w-full cursor-pointer focus:outline-hidden ${product.bgBadge}`}
                      >
                        {fuelCodes.map((fc) => (
                          <option key={fc} value={fc}>
                            {FUEL_PRODUCTS[fc].shortLabel}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                        ▼
                      </span>
                    </div>
                  </td>

                  {/* Preço Unitário (R$) */}
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700 font-medium">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={nozzle.unitPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateNozzle(nozzle.id, 'unitPrice', isNaN(val) ? 0 : val);
                      }}
                      className="w-20 text-right text-xs font-mono py-1 px-1.5 bg-transparent hover:bg-white border border-transparent hover:border-slate-300 focus:border-amber-500 focus:bg-white rounded-sm focus:outline-hidden"
                    />
                  </td>

                  {/* Encerrante Abertura */}
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <input
                        id={`nozzle-open-${nozzle.id}`}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={nozzle.openingMeter}
                        onChange={(e) => onUpdateNozzle(nozzle.id, 'openingMeter', e.target.value)}
                        className={`w-full text-xs font-mono py-1.5 px-2.5 rounded-lg transition-all focus:outline-hidden ${
                          hasWarning
                            ? 'bg-amber-50/70 border border-amber-300 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                        }`}
                      />
                    </div>
                  </td>

                  {/* Aferição em Litros */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      id={`nozzle-calib-${nozzle.id}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      value={nozzle.calibrationLiters}
                      onChange={(e) => onUpdateNozzle(nozzle.id, 'calibrationLiters', e.target.value)}
                      className="w-full text-xs font-mono py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-hidden transition-all text-center"
                    />
                  </td>

                  {/* Encerrante Fechamento com Validação Visual em Vermelho */}
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <input
                        id={`nozzle-close-${nozzle.id}`}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={nozzle.closingMeter}
                        onChange={(e) => onUpdateNozzle(nozzle.id, 'closingMeter', e.target.value)}
                        className={`w-full text-xs font-mono py-1.5 px-2.5 rounded-lg transition-all focus:outline-hidden ${
                          hasWarning
                            ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold placeholder-rose-300 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/30 shadow-xs'
                            : 'bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                        }`}
                        title={hasWarning ? warningMsg : undefined}
                      />
                      {/* Red visual alert badge directly on the field */}
                      {hasWarning && (
                        <div
                          className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600 leading-tight"
                          title={warningMsg}
                        >
                          <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
                          <span>Menor que abertura!</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Litros Vendidos (Calculado) */}
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {hasWarning ? (
                      <span
                        className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-200 text-[11px]"
                        title={warningMsg}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Erro leitura
                      </span>
                    ) : (
                      <span className={`font-semibold ${litersSold > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                        {formatLiters(litersSold)}
                      </span>
                    )}
                  </td>

                  {/* Total Vendido R$ (Calculado) */}
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {hasWarning ? (
                      <span className="text-rose-500 text-[11px] font-semibold">
                        R$ 0,00
                      </span>
                    ) : (
                      <span className={`font-bold ${totalSold > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {formatCurrency(totalSold)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
