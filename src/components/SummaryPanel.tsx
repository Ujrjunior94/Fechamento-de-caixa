import React from 'react';
import { Droplet, DollarSign, PlusCircle, CheckCheck, TrendingUp, Layers } from 'lucide-react';
import { OverallSummary, FuelCode } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { formatCurrency, formatLiters } from '../utils/formatters';

interface SummaryPanelProps {
  summary: OverallSummary;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  const fuelCodes: FuelCode[] = ['ETANOL', 'G_COM', 'G_ADIT', 'D_S10', 'D_COM'];

  return (
    <div className="space-y-4 mb-8">
      {/* Primary Highlights 4-card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Litros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Litros Vendidos
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatLiters(summary.totalLiters)}
            </span>
          </div>
        </div>

        {/* Total R$ Combustíveis */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Combustíveis (01 a 16)
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCurrency(summary.totalFuelRevenue)}
            </span>
          </div>
        </div>

        {/* Total R$ Recolhimentos / Arla */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Recolhimentos / Arla
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCurrency(summary.totalExtraRevenue)}
            </span>
          </div>
        </div>

        {/* TOTAL GERAL DO CAIXA */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl shadow-md text-white flex items-center gap-3.5 border border-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
              TOTAL GERAL DO CAIXA
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-xs">
              {formatCurrency(summary.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Fuel Breakdown Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <Layers className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Subtotais por Combustível
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {fuelCodes.map((code) => {
            const product = FUEL_PRODUCTS[code];
            const data = summary.byProduct[code];
            const hasSales = data.liters > 0;

            return (
              <div
                key={`subtotal-${code}`}
                className={`p-3 rounded-xl border transition-all ${
                  hasSales
                    ? 'bg-slate-50/90 border-slate-300 shadow-2xs'
                    : 'bg-white border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${product.dotColor}`} />
                  <span className="text-xs font-bold text-slate-800">
                    {product.shortLabel}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-600">
                  {formatLiters(data.liters)}
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  {formatCurrency(data.revenue)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
