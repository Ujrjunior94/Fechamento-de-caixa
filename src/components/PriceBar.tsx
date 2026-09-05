import React, { useState } from 'react';
import { Settings, RefreshCw, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { FuelCode } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { formatCurrency } from '../utils/formatters';

interface PriceBarProps {
  prices: Record<FuelCode, number>;
  onUpdatePrice: (code: FuelCode, newPrice: number) => void;
  onApplyPricesToAllNozzles: () => void;
  onResetDefaultPrices: () => void;
}

export const PriceBar: React.FC<PriceBarProps> = ({
  prices,
  onUpdatePrice,
  onApplyPricesToAllNozzles,
  onResetDefaultPrices,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<FuelCode | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const fuelList: FuelCode[] = ['G_COM', 'G_ADIT', 'ETANOL', 'D_S10', 'D_COM'];

  const startEdit = (code: FuelCode) => {
    setEditingCode(code);
    setTempPrice(prices[code].toString());
  };

  const saveEdit = (code: FuelCode) => {
    const parsed = parseFloat(tempPrice.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onUpdatePrice(code, parsed);
    }
    setEditingCode(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs mb-6 overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Tabela de Preços por Litro (R$)
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            • Valores aplicados automaticamente nos bicos correspondentes
          </span>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            id="apply-prices-btn"
            type="button"
            onClick={onApplyPricesToAllNozzles}
            title="Sincronizar preços atuais da tabela em todos os bicos"
            className="text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sincronizar Preços nos Bicos</span>
            <span className="sm:hidden">Sincronizar</span>
          </button>

          <button
            id="toggle-price-settings-btn"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Ajustar Tabela</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Badges preview / Quick list */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {fuelList.map((code) => {
          const product = FUEL_PRODUCTS[code];
          const currentPrice = prices[code];
          const isEditing = editingCode === code;

          return (
            <div
              key={code}
              className={`p-3 rounded-xl border transition-all ${
                isEditing
                  ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${product.dotColor}`} />
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {product.shortLabel}
                  </span>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEdit(code)}
                    className="text-[11px] text-slate-400 hover:text-amber-600 cursor-pointer"
                  >
                    Editar
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1 mt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(code);
                        if (e.key === 'Escape') setEditingCode(null);
                      }}
                      autoFocus
                      className="w-full text-xs font-mono pl-7 pr-2 py-1 bg-white border border-amber-400 rounded-md focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveEdit(code)}
                    className="text-xs bg-amber-600 text-white px-2 py-1 rounded-md hover:bg-amber-700 cursor-pointer font-medium"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-bold text-slate-900 font-mono tracking-tight">
                    {formatCurrency(currentPrice)}
                  </span>
                  <span className="text-[10px] text-slate-400">/ litro</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed edit drawer when user clicks "Ajustar Tabela" */}
      {isOpen && (
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Painel de Edição Rápida de Preços
            </h3>
            <button
              type="button"
              onClick={onResetDefaultPrices}
              className="text-xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
            >
              Restaurar preços padrão de fábrica
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {fuelList.map((code) => {
              const product = FUEL_PRODUCTS[code];
              return (
                <div key={`panel-${code}`} className="bg-white p-3 rounded-lg border border-slate-200">
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {product.name}
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                      R$
                    </span>
                    <input
                      id={`price-input-${code}`}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={prices[code]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdatePrice(code, isNaN(val) ? 0 : val);
                      }}
                      className="w-full text-sm font-mono pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-md focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
