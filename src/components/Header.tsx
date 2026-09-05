import React from 'react';
import { Fuel, Calendar, Clock, User, Building, CheckCircle2, Camera, FileText, History } from 'lucide-react';
import { ShiftInfo } from '../types';
import { WORK_SHIFTS, normalizeShiftType } from '../constants/shifts';

interface HeaderProps {
  shift: ShiftInfo;
  onUpdateShift: (field: keyof ShiftInfo, value: string) => void;
  lastSavedAt: string | null;
  onOpenPhotoModal?: (defaultTab?: 'photo' | 'pdf_previous') => void;
  onOpenHistoryModal?: () => void;
  historyCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  shift,
  onUpdateShift,
  lastSavedAt,
  onOpenPhotoModal,
  onOpenHistoryModal,
  historyCount = 0,
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
          {onOpenHistoryModal && (
            <button
              id="header-history-btn"
              type="button"
              onClick={onOpenHistoryModal}
              title="Abrir histórico dos últimos 30 fechamentos de caixa"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Histórico ({historyCount}/30)</span>
            </button>
          )}

          {onOpenPhotoModal && (
            <>
              <button
                id="header-import-pdf-btn"
                type="button"
                onClick={() => onOpenPhotoModal('pdf_previous')}
                title="Importar PDF ou imagem do fechamento anterior para preencher abertura"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Importar PDF Anterior</span>
              </button>

              <button
                id="header-import-photo-btn"
                type="button"
                onClick={() => onOpenPhotoModal('photo')}
                title="Ler bicos e encerrantes através de foto ou câmera"
                className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>Importar por Foto</span>
              </button>
            </>
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
            value={normalizeShiftType(shift.shiftType)}
            onChange={(e) => onUpdateShift('shiftType', e.target.value as any)}
            className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-colors font-medium text-slate-800"
          >
            {WORK_SHIFTS.map((s) => (
              <option key={s.id} value={s.name}>
                {s.label}
              </option>
            ))}
            <option value="Geral">Fechamento Geral / 24h</option>
          </select>
        </div>
      </div>
    </header>
  );
};
