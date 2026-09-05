export type FuelCode = 'ETANOL' | 'G_COM' | 'G_ADIT' | 'D_S10' | 'D_COM';

export interface FuelProduct {
  code: FuelCode;
  name: string;
  shortLabel: string;
  defaultPrice: number;
  bgBadge: string;
  textBadge: string;
  borderColor: string;
  dotColor: string;
}

export interface NozzleData {
  id: number; // 1 to 16
  numberLabel: string; // "01", "02", ...
  productCode: FuelCode;
  unitPrice: number;
  openingMeter: string; // string to preserve user typing (e.g. "12450.50")
  calibrationLiters: string; // default "0"
  closingMeter: string;
}

export interface ExtraEntry {
  id: string;
  description: string;
  value: string;
}

export interface CashConference {
  cashAmount: string; // Dinheiro em Caixa
  cardsAmount: string; // Cartões (Débito/Crédito)
  pixAmount?: string; // PIX / Transferências (opcional)
  otherAmount?: string; // Outros / Faturado / Cheques (opcional)
  notes: string; // Observações do Caixa
}

export type ShiftType =
  | 'Turno 1 (00:00 às 06:00)'
  | 'Turno 2 (06:00 às 14:00)'
  | 'Turno 3 (14:00 às 22:00)'
  | 'Turno 4 (22:00 às 00:00)'
  | 'Turno 1'
  | 'Turno 2'
  | 'Turno 3'
  | 'Turno 4'
  | 'Manhã'
  | 'Tarde'
  | 'Noite'
  | 'Geral';

export interface ShiftInfo {
  stationName: string;
  cashierName: string;
  shiftType: ShiftType;
  date: string;
}

export interface ProductSummary {
  liters: number;
  revenue: number;
  activeNozzles: number;
}

export interface OverallSummary {
  totalLiters: number;
  totalFuelRevenue: number;
  totalExtraRevenue: number;
  grandTotal: number;
  byProduct: Record<FuelCode, ProductSummary>;
}

export interface SavedShiftRecord {
  id: string; // unique ID
  savedAt: string; // ISO string when saved
  shift: ShiftInfo;
  prices: Record<FuelCode, number>;
  nozzles: NozzleData[];
  extraEntries: ExtraEntry[];
  conference: CashConference;
  summary: OverallSummary;
  quebraValor: number; // diferenca entre valor apurado e esperado
}
