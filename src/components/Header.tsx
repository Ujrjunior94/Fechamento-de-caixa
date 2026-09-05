import React from 'react';
import { Fuel, Calendar, Clock, User, Building, CheckCircle2, Camera } from 'lucide-react';
import { ShiftInfo } from '../types';

interface HeaderProps {
  shift: ShiftInfo;
  onUpdateShift: (field: keyof ShiftInfo, value: string) => void;
  lastSavedAt: string | null;
  onOpenPhotoModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  shift,
  onUpdateShift,
  lastSavedAt,
  onOpenPhotoModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-xs mb-6 rounded-2xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Fuel className="w-7 h-7" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Fechamento de Caixa
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Posto de Combustíveis
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Controle de encerrantes dos bicos 01 a 16, aferições, litragens e resumo financeiro.
            </p>
          </div>
        </div>

        {/* Action button & autosave status indicator */}
        <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
          {onOpenPhotoModal && (
            <button
              id="header-import-photo-btn"
              type="button"
              onClick={onOpenPhotoModal}
              title="Ler bicos e encerrantes através de foto ou câmera"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar por Foto</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {lastSavedAt ? `Salvo: ${lastSavedAt}` : 'Salvamento automático'}
            </span>
          </div>
        </div>
      </div>

      {/* Shift information inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Nome do Posto
          </label>
          <input
            id="station-name-input"
            type="text"
            value={shift.stationName}
            onChange={(e) => onUpdateShift('stationName', e.target.value)}
            placeholder="Ex: Auto Posto Estrela"
            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Operador / Frentista
          </label>
          <input
            id="cashier-name-input"
            type="text"
            value={shift.cashierName}
            onChange={(e) => onUpdateShift('cashierName', e.target.value)}
            placeholder="Ex: Carlos Silva"
            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Data do Fechamento
          </label>
          <input
            id="shift-date-input"
            type="date"
            value={shift.date}
            onChange={(e) => onUpdateShift('date', e.target.value)}
            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Turno de Trabalho
          </label>
          <select
            id="shift-type-select"
            value={shift.shiftType}
            onChange={(e) => onUpdateShift('shiftType', e.target.value as any)}
            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-colors"
          >
            <option value="Manhã">Turno 1 (Manhã: 06h às 14h)</option>
            <option value="Tarde">Turno 2 (Tarde: 14h às 22h)</option>
            <option value="Noite">Turno 3 (Noite: 22h às 06h)</option>
            <option value="Geral">Fechamento Geral / 24h</option>
          </select>
        </div>
      </div>
    </header>
  );
};
