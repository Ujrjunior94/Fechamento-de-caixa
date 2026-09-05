import { SavedShiftRecord, ShiftInfo, ShiftType, FuelCode, NozzleData, ExtraEntry, CashConference, OverallSummary } from '../types';
import { INITIAL_PRICES, createInitialNozzles } from '../constants/fuels';
import { computeOverallSummary } from './formatters';

export const MAX_HISTORY_ITEMS = 30;
export const HISTORY_STORAGE_KEY = 'posto_combustivel_historico_fechamentos_v1';

/**
 * Retrieve saved shift records from localStorage (max 30, sorted newest first)
 */
export function getShiftHistory(): SavedShiftRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
    return [];
  } catch (err) {
    console.error('Erro ao ler histórico de fechamentos do localStorage:', err);
    return [];
  }
}

/**
 * Save a new shift record to the history list in localStorage, enforcing the 30-item limit.
 */
export function saveShiftToHistory(params: {
  shift: ShiftInfo;
  prices: Record<FuelCode, number>;
  nozzles: NozzleData[];
  extraEntries: ExtraEntry[];
  conference: CashConference;
  summary: OverallSummary;
  quebraValor?: number;
}): { list: SavedShiftRecord[]; savedItem: SavedShiftRecord } {
  const currentList = getShiftHistory();

  // Calculate quebra if not provided
  let quebra = params.quebraValor ?? 0;
  if (params.quebraValor === undefined) {
    const cash = parseFloat(params.conference.cashAmount.replace(',', '.')) || 0;
    const cards = parseFloat(params.conference.cardsAmount.replace(',', '.')) || 0;
    const pix = parseFloat((params.conference.pixAmount || '').replace(',', '.')) || 0;
    const other = parseFloat((params.conference.otherAmount || '').replace(',', '.')) || 0;
    const totalApurado = cash + cards + pix + other;
    quebra = totalApurado - params.summary.grandTotal;
  }

  const newRecord: SavedShiftRecord = {
    id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    savedAt: new Date().toISOString(),
    shift: { ...params.shift },
    prices: { ...params.prices },
    nozzles: JSON.parse(JSON.stringify(params.nozzles)),
    extraEntries: JSON.parse(JSON.stringify(params.extraEntries)),
    conference: { ...params.conference },
    summary: JSON.parse(JSON.stringify(params.summary)),
    quebraValor: quebra,
  };

  // Add new item to front, filter out any duplicates with same ID, and slice to 30
  const updatedList = [newRecord, ...currentList.filter((item) => item.id !== newRecord.id)].slice(
    0,
    MAX_HISTORY_ITEMS
  );

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }

  return { list: updatedList, savedItem: newRecord };
}

/**
 * Delete a specific shift from the history list
 */
export function deleteShiftFromHistory(id: string): SavedShiftRecord[] {
  const currentList = getShiftHistory();
  const updatedList = currentList.filter((item) => item.id !== id);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Erro ao atualizar localStorage após exclusão:', err);
  }
  return updatedList;
}

/**
 * Clear the entire history from localStorage
 */
export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.error('Erro ao limpar histórico:', err);
  }
}

/**
 * Helper to generate 5-7 sample historic shifts for instant visualization and demonstration
 */
export function generateDemoHistory(): SavedShiftRecord[] {
  const demoList: SavedShiftRecord[] = [];
  const cashiers = ['Carlos Silva', 'José Oliveira', 'Marcos Santos', 'Ana Paula Souza', 'Roberto Lima'];
  const shiftTypes: ShiftType[] = [
    'Turno 1 (00:00 às 06:00)',
    'Turno 2 (06:00 às 14:00)',
    'Turno 3 (14:00 às 22:00)',
    'Turno 4 (22:00 às 00:00)',
  ];

  const now = new Date();

  for (let i = 1; i <= 6; i++) {
    const shiftDate = new Date(now);
    shiftDate.setDate(now.getDate() - i);
    const dateStr = shiftDate.toISOString().split('T')[0];

    const baseNozzles = createInitialNozzles(INITIAL_PRICES);
    // Add realistic numbers
    const multiplier = 1 + (i % 3) * 0.15;
    const shiftNozzles = baseNozzles.map((n) => {
      const baseLiters = (300 + (n.id * 45)) * multiplier;
      const open = 10000 + (n.id * 5000) - (i * 800);
      const close = open + baseLiters;
      return {
        ...n,
        openingMeter: open.toFixed(2),
        closingMeter: close.toFixed(2),
        calibrationLiters: n.id === 2 || n.id === 7 ? '20' : '0',
      };
    });

    const shiftExtras: ExtraEntry[] = [
      { id: `demo-extra-1-${i}`, description: 'Arla 32 (Litros)', value: (150 + i * 25).toFixed(2) },
      { id: `demo-extra-2-${i}`, description: 'Loja de Conveniência', value: (320 + i * 40).toFixed(2) },
    ];

    const shiftSummary = computeOverallSummary(shiftNozzles, shiftExtras);
    const cashShare = shiftSummary.grandTotal * 0.32;
    const cardsShare = shiftSummary.grandTotal * 0.58;
    const pixShare = shiftSummary.grandTotal * 0.10;

    const diff = (i % 2 === 0 ? -12.5 : (i === 3 ? 0 : 5.20));

    demoList.push({
      id: `demo-shift-hist-${i}`,
      savedAt: shiftDate.toISOString(),
      shift: {
        stationName: 'Auto Posto Modelo Ltda',
        cashierName: cashiers[i % cashiers.length],
        shiftType: shiftTypes[i % shiftTypes.length],
        date: dateStr,
      },
      prices: INITIAL_PRICES,
      nozzles: shiftNozzles,
      extraEntries: shiftExtras,
      conference: {
        cashAmount: (cashShare + diff).toFixed(2),
        cardsAmount: cardsShare.toFixed(2),
        pixAmount: pixShare.toFixed(2),
        otherAmount: '',
        notes: i % 2 === 0 ? 'Diferença de R$ 12,50 referente a troco pendente conferido.' : 'Fechamento de caixa regular sem divergências.',
      },
      summary: shiftSummary,
      quebraValor: diff,
    });
  }

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(demoList));
  } catch (err) {
    console.error('Erro ao salvar histórico de exemplo:', err);
  }

  return demoList;
}
