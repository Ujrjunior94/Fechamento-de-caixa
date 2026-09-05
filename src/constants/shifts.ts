import { ShiftType } from '../types';

export interface ShiftDefinition {
  id: string;
  name: ShiftType;
  label: string;
  timeRange: string;
  shortLabel: string;
  startHour: number;
  endHour: number;
  badgeClass: string;
}

export const WORK_SHIFTS: ShiftDefinition[] = [
  {
    id: 'turno-1',
    name: 'Turno 1 (00:00 às 06:00)',
    label: 'Turno 1 - 00:00 às 06:00',
    timeRange: '00:00 às 06:00',
    shortLabel: 'T1',
    startHour: 0,
    endHour: 6,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'turno-2',
    name: 'Turno 2 (06:00 às 14:00)',
    label: 'Turno 2 - 06:00 às 14:00',
    timeRange: '06:00 às 14:00',
    shortLabel: 'T2',
    startHour: 6,
    endHour: 14,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'turno-3',
    name: 'Turno 3 (14:00 às 22:00)',
    label: 'Turno 3 - 14:00 às 22:00',
    timeRange: '14:00 às 22:00',
    shortLabel: 'T3',
    startHour: 14,
    endHour: 22,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'turno-4',
    name: 'Turno 4 (22:00 às 00:00)',
    label: 'Turno 4 - 22:00 às 00:00',
    timeRange: '22:00 às 00:00',
    shortLabel: 'T4',
    startHour: 22,
    endHour: 24,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

/**
 * Returns the recommended shift based on the current local hour
 */
export function getCurrentShiftType(): ShiftType {
  const currentHour = new Date().getHours();
  if (currentHour >= 0 && currentHour < 6) return 'Turno 1 (00:00 às 06:00)';
  if (currentHour >= 6 && currentHour < 14) return 'Turno 2 (06:00 às 14:00)';
  if (currentHour >= 14 && currentHour < 22) return 'Turno 3 (14:00 às 22:00)';
  return 'Turno 4 (22:00 às 00:00)';
}

/**
 * Normalizes any shift string (from AI, legacy storage, etc.) to one of the 4 shifts
 */
export function normalizeShiftType(raw: string | undefined | null): ShiftType {
  if (!raw) return getCurrentShiftType();
  const lower = raw.toLowerCase().trim();

  if (lower.includes('1') || lower.includes('00:00') || lower.includes('00h') || lower.includes('madrugada')) {
    return 'Turno 1 (00:00 às 06:00)';
  }
  if (lower.includes('2') || lower.includes('06:00') || lower.includes('06h') || lower.includes('manhã') || lower.includes('manha')) {
    return 'Turno 2 (06:00 às 14:00)';
  }
  if (lower.includes('3') || lower.includes('14:00') || lower.includes('14h') || lower.includes('tarde')) {
    return 'Turno 3 (14:00 às 22:00)';
  }
  if (lower.includes('4') || lower.includes('22:00') || lower.includes('22h') || lower.includes('noite')) {
    return 'Turno 4 (22:00 às 00:00)';
  }
  if (lower.includes('geral') || lower.includes('24h') || lower.includes('diario') || lower.includes('diário')) {
    return 'Geral';
  }

  return 'Turno 2 (06:00 às 14:00)';
}

/**
 * Returns short badge text and styling for a shift
 */
export function getShiftBadge(shiftType: string | undefined): { label: string; short: string; badgeClass: string } {
  const normalized = normalizeShiftType(shiftType);
  const found = WORK_SHIFTS.find((s) => s.name === normalized);
  if (found) {
    return {
      label: found.label,
      short: found.shortLabel,
      badgeClass: found.badgeClass,
    };
  }
  return {
    label: shiftType || 'Geral',
    short: 'GER',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}
