import React from 'react';
import { Plus, Trash2, ShoppingBag, DollarSign } from 'lucide-react';
import { ExtraEntry } from '../types';
import { formatCurrency, parseNumber } from '../utils/formatters';

interface RecolhimentosSectionProps {
  entries: ExtraEntry[];
  onUpdateEntry: (id: string, field: 'description' | 'value', value: string) => void;
  onAddEntry: (description?: string) => void;
  onRemoveEntry: (id: string) => void;
}

export const RecolhimentosSection: React.FC<RecolhimentosSectionProps> = ({
  entries,
  onUpdateEntry,
  onAddEntry,
  onRemoveEntry,
}) => {
  const totalExtra = entries.reduce((acc, item) => acc + parseNumber(item.value), 0);

  const presets = [
    { label: '+ Arla 32', desc: 'Arla 32' },
    { label: '+ Loja de Conveniência', desc: 'Loja de Conveniência' },
    { label: '+ Troca de Óleo / Lubrificantes', desc: 'Troca de Óleo' },
    { label: '+ Aditivos / Palhetas', desc: 'Aditivos / Acessórios' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
            17+
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Recolhimentos, Arla 32 e Outros (Linha 17+)
            </h2>
            <p className="text-xs text-slate-500">
              Valores adicionais que somam ao fechamento geral (Arla, loja de conveniência, serviços, etc.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Subtotal Recolhimentos:</span>
          <span className="text-sm font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            {formatCurrency(totalExtra)}
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="py-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Atalhos rápidos:</span>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onAddEntry(preset.desc)}
            className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Entries List */}
      <div className="space-y-2.5 mt-2">
        {entries.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="text-xs text-slate-500 mb-2">Nenhum recolhimento adicional cadastrado.</p>
            <button
              type="button"
              onClick={() => onAddEntry('Arla 32')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Linha 17 (Arla / Outros)
            </button>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 sm:gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200"
            >
              <span className="text-xs font-mono font-bold text-slate-400 w-16 shrink-0 pl-1">
                Linha {17 + index}
              </span>

              {/* Description */}
              <div className="flex-1">
                <input
                  id={`extra-desc-${entry.id}`}
                  type="text"
                  placeholder="Descrição (ex: Arla 32, Loja, Troca de Óleo...)"
                  value={entry.description}
                  onChange={(e) => onUpdateEntry(entry.id, 'description', e.target.value)}
                  className="w-full text-xs font-medium py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Value R$ */}
              <div className="w-32 sm:w-40 relative shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <input
                  id={`extra-val-${entry.id}`}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={entry.value}
                  onChange={(e) => onUpdateEntry(entry.id, 'value', e.target.value)}
                  className="w-full text-xs font-mono font-semibold py-1.5 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-right focus:border-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                title="Remover linha"
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-3 flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => onAddEntry('')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Outro Recolhimento
          </button>
        </div>
      )}
    </div>
  );
};
