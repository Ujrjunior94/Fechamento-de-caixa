import { FuelCode, FuelProduct, NozzleData } from '../types';

export const FUEL_PRODUCTS: Record<FuelCode, FuelProduct> = {
  ETANOL: {
    code: 'ETANOL',
    name: 'Etanol Hidratado',
    shortLabel: 'Etanol',
    defaultPrice: 4.33,
    bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textBadge: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  G_COM: {
    code: 'G_COM',
    name: 'Gasolina Comum',
    shortLabel: 'G COM',
    defaultPrice: 6.33,
    bgBadge: 'bg-amber-50 text-amber-900 border-amber-200',
    textBadge: 'text-amber-700',
    borderColor: 'border-amber-300',
    dotColor: 'bg-amber-500',
  },
  G_ADIT: {
    code: 'G_ADIT',
    name: 'Gasolina Aditivada',
    shortLabel: 'G ADIT',
    defaultPrice: 6.33,
    bgBadge: 'bg-red-50 text-red-900 border-red-200',
    textBadge: 'text-red-700',
    borderColor: 'border-red-300',
    dotColor: 'bg-red-500',
  },
  D_S10: {
    code: 'D_S10',
    name: 'Diesel S-10',
    shortLabel: 'D S-10',
    defaultPrice: 6.99,
    bgBadge: 'bg-blue-50 text-blue-900 border-blue-200',
    textBadge: 'text-blue-700',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
  },
  D_COM: {
    code: 'D_COM',
    name: 'Diesel S-500 (Comum)',
    shortLabel: 'D COM',
    defaultPrice: 6.43,
    bgBadge: 'bg-stone-100 text-stone-900 border-stone-300',
    textBadge: 'text-stone-700',
    borderColor: 'border-stone-400',
    dotColor: 'bg-stone-600',
  },
};

export const INITIAL_PRICES: Record<FuelCode, number> = {
  ETANOL: 4.33,
  G_COM: 6.33,
  G_ADIT: 6.33,
  D_S10: 6.99,
  D_COM: 6.43,
};

// Initial mapping according to prompt specifications:
// Bico 01: Etanol
// Bico 02: G ADIT
// Bico 03: G COM
// Bico 04: Etanol
// Bico 05: G ADIT
// Bico 06: G COM
// Bico 07: G COM
// Bico 08: G ADIT
// Bico 09: Etanol
// Bico 10: G COM
// Bico 11: G ADIT
// Bico 12: Etanol
// Bico 13: D S-10
// Bico 14: D COM
// Bico 15: D COM
// Bico 16: D S-10
export const DEFAULT_NOZZLE_PRODUCTS: FuelCode[] = [
  'ETANOL', // Bico 01
  'G_ADIT', // Bico 02
  'G_COM',  // Bico 03
  'ETANOL', // Bico 04
  'G_ADIT', // Bico 05
  'G_COM',  // Bico 06
  'G_COM',  // Bico 07
  'G_ADIT', // Bico 08
  'ETANOL', // Bico 09
  'G_COM',  // Bico 10
  'G_ADIT', // Bico 11
  'ETANOL', // Bico 12
  'D_S10',  // Bico 13
  'D_COM',  // Bico 14
  'D_COM',  // Bico 15
  'D_S10',  // Bico 16
];

export function createInitialNozzles(prices: Record<FuelCode, number> = INITIAL_PRICES): NozzleData[] {
  return DEFAULT_NOZZLE_PRODUCTS.map((prodCode, index) => {
    const id = index + 1;
    const numberLabel = id < 10 ? `0${id}` : `${id}`;
    return {
      id,
      numberLabel,
      productCode: prodCode,
      unitPrice: prices[prodCode],
      openingMeter: '',
      calibrationLiters: '0',
      closingMeter: '',
    };
  });
}
