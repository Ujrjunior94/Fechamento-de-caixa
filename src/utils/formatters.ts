import { CashConference, ExtraEntry, FuelCode, NozzleData, OverallSummary, ShiftInfo } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';

export function parseNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  let str = value.toString().trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!str) return 0;

  // Case 1: Both dot and comma present (e.g., "42.100,50" or "42,100.50")
  if (str.includes('.') && str.includes(',')) {
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    if (lastCommaIndex > lastDotIndex) {
      // Brazilian format: "42.100,50" -> dots are thousands, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: "42,100.50" -> commas are thousands, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Case 2: Only comma present (e.g., "42100,50" or "4,33") -> comma is decimal
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function cleanMeterString(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  let str = value.toString().trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!str) return '';

  if (str.includes('.') && str.includes(',')) {
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    if (lastCommaIndex > lastDotIndex) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  return str;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatLiters(liters: number, decimals: number = 2): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(liters || 0);
  return `${formatted} L`;
}

export function calculateNozzleMetrics(nozzle: NozzleData): {
  litersSold: number;
  totalSold: number;
  hasInput: boolean;
  hasWarning: boolean;
  warningMsg?: string;
  diffLiters?: number;
} {
  const open = parseNumber(nozzle.openingMeter);
  const close = parseNumber(nozzle.closingMeter);
  const calib = parseNumber(nozzle.calibrationLiters);
  const price = nozzle.unitPrice || 0;

  const hasOpen = nozzle.openingMeter.trim() !== '';
  const hasClose = nozzle.closingMeter.trim() !== '';
  const hasInput = hasOpen || hasClose;

  if (!hasInput && calib === 0) {
    return { litersSold: 0, totalSold: 0, hasInput: false, hasWarning: false };
  }

  // If both opening and closing were entered, and closing is less than opening
  if (hasOpen && hasClose && close < open) {
    const diff = open - close;
    return {
      litersSold: 0,
      totalSold: 0,
      hasInput: true,
      hasWarning: true,
      warningMsg: `Fechamento (${nozzle.closingMeter}) menor que Abertura (${nozzle.openingMeter}) por ${formatLiters(diff)}!`,
      diffLiters: -diff,
    };
  }

  const rawDiff = close - open - calib;
  const litersSold = Math.max(0, rawDiff);
  const totalSold = litersSold * price;

  return {
    litersSold,
    totalSold,
    hasInput: true,
    hasWarning: false,
  };
}

export function computeOverallSummary(
  nozzles: NozzleData[],
  extraEntries: ExtraEntry[]
): OverallSummary {
  const byProduct: Record<FuelCode, { liters: number; revenue: number; activeNozzles: number }> = {
    ETANOL: { liters: 0, revenue: 0, activeNozzles: 0 },
    G_COM: { liters: 0, revenue: 0, activeNozzles: 0 },
    G_ADIT: { liters: 0, revenue: 0, activeNozzles: 0 },
    D_S10: { liters: 0, revenue: 0, activeNozzles: 0 },
    D_COM: { liters: 0, revenue: 0, activeNozzles: 0 },
  };

  let totalLiters = 0;
  let totalFuelRevenue = 0;

  nozzles.forEach((n) => {
    const { litersSold, totalSold, hasInput } = calculateNozzleMetrics(n);
    totalLiters += litersSold;
    totalFuelRevenue += totalSold;

    if (byProduct[n.productCode]) {
      byProduct[n.productCode].liters += litersSold;
      byProduct[n.productCode].revenue += totalSold;
      if (hasInput && (n.openingMeter || n.closingMeter)) {
        byProduct[n.productCode].activeNozzles += 1;
      }
    }
  });

  const totalExtraRevenue = extraEntries.reduce((acc, curr) => {
    return acc + parseNumber(curr.value);
  }, 0);

  const grandTotal = totalFuelRevenue + totalExtraRevenue;

  return {
    totalLiters,
    totalFuelRevenue,
    totalExtraRevenue,
    grandTotal,
    byProduct,
  };
}

export function generateWhatsAppMessage(
  shift: ShiftInfo,
  summary: OverallSummary,
  nozzles: NozzleData[],
  extraEntries: ExtraEntry[],
  conference?: CashConference
): string {
  const dateFormatted = shift.date
    ? shift.date.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  let text = `⛽ *FECHAMENTO DE CAIXA - POSTO DE COMBUSTÍVEIS*\n`;
  if (shift.stationName) text += `🏢 *Posto:* ${shift.stationName}\n`;
  text += `📅 *Data:* ${dateFormatted} | *Turno:* ${shift.shiftType}\n`;
  if (shift.cashierName) text += `👤 *Operador/Caixa:* ${shift.cashierName}\n`;
  text += `───────────────────────\n`;
  text += `📊 *TOTAIS GERAIS (SISTEMA):*\n`;
  text += `• Total Litros Vendidos: *${formatLiters(summary.totalLiters)}*\n`;
  text += `• Total Combustíveis: *${formatCurrency(summary.totalFuelRevenue)}*\n`;
  text += `• Recolhimentos / Outros: *${formatCurrency(summary.totalExtraRevenue)}*\n`;
  text += `💰 *TOTAL ESPERADO DO CAIXA: ${formatCurrency(summary.grandTotal)}*\n`;
  text += `───────────────────────\n`;

  // Financial Conference and Quebra if provided
  if (conference) {
    const cashVal = parseNumber(conference.cashAmount);
    const cardsVal = parseNumber(conference.cardsAmount);
    const pixVal = parseNumber(conference.pixAmount);
    const otherVal = parseNumber(conference.otherAmount);
    const totalAudited = cashVal + cardsVal + pixVal + otherVal;
    const diff = totalAudited - summary.grandTotal;

    const hasAnyAudited =
      conference.cashAmount.trim() !== '' ||
      conference.cardsAmount.trim() !== '' ||
      Boolean(conference.pixAmount && conference.pixAmount.trim() !== '') ||
      Boolean(conference.otherAmount && conference.otherAmount.trim() !== '');

    if (hasAnyAudited) {
      text += `💵 *CONFERÊNCIA DE VALORES APURADOS:*\n`;
      text += `• Dinheiro em Caixa: *${formatCurrency(cashVal)}*\n`;
      text += `• Cartões (Débito/Crédito): *${formatCurrency(cardsVal)}*\n`;
      if (pixVal > 0) text += `• PIX / Pagamentos Digitais: *${formatCurrency(pixVal)}*\n`;
      if (otherVal > 0) text += `• Faturado / Outros: *${formatCurrency(otherVal)}*\n`;
      text += `• *TOTAL APURADO: ${formatCurrency(totalAudited)}*\n`;

      if (Math.abs(diff) < 0.01) {
        text += `⚖️ *QUEBRA DE CAIXA:* ✅ *R$ 0,00 (Caixa Batido)*\n`;
      } else if (diff < 0) {
        text += `⚖️ *QUEBRA DE CAIXA:* 🔴 *FALTA DE -${formatCurrency(Math.abs(diff))}*\n`;
      } else {
        text += `⚖️ *QUEBRA DE CAIXA:* 🔵 *SOBRA DE +${formatCurrency(diff)}*\n`;
      }
      text += `───────────────────────\n`;
    }

    if (conference.notes && conference.notes.trim()) {
      text += `📝 *OBSERVAÇÕES:*\n`;
      text += `"${conference.notes.trim()}"\n`;
      text += `───────────────────────\n`;
    }
  }

  text += `🛢️ *SUBTOTAL POR COMBUSTÍVEL:*\n`;
  (Object.keys(summary.byProduct) as FuelCode[]).forEach((code) => {
    const p = summary.byProduct[code];
    const prod = FUEL_PRODUCTS[code];
    if (p.liters > 0 || p.revenue > 0) {
      text += `• ${prod.shortLabel}: ${formatLiters(p.liters)}  ➝  ${formatCurrency(p.revenue)}\n`;
    }
  });
  text += `───────────────────────\n`;

  // Filter nozzles with movements or all
  text += `📋 *LEITURA DOS BICOS (01 a 16):*\n`;
  nozzles.forEach((n) => {
    const { litersSold, totalSold, hasWarning } = calculateNozzleMetrics(n);
    const prod = FUEL_PRODUCTS[n.productCode]?.shortLabel || n.productCode;
    const open = n.openingMeter || '0';
    const close = n.closingMeter || '0';
    const calib = n.calibrationLiters || '0';
    
    // Only display compact line
    if (hasWarning) {
      text += `*Bico ${n.numberLabel}* (${prod}) [${open} ➝ ${close}] = ⚠️ *ERRO: Fechamento menor que Abertura!*\n`;
    } else {
      text += `*Bico ${n.numberLabel}* (${prod}) [${open} ➝ ${close} | Af: ${calib}L] = *${formatLiters(litersSold)}* (${formatCurrency(totalSold)})\n`;
    }
  });

  if (extraEntries.length > 0) {
    const validExtras = extraEntries.filter((e) => parseNumber(e.value) > 0 || e.description.trim());
    if (validExtras.length > 0) {
      text += `───────────────────────\n`;
      text += `💼 *RECOLHIMENTOS / OUTROS (Linha 17+):*\n`;
      validExtras.forEach((e) => {
        text += `• ${e.description || 'Recolhimento'}: ${formatCurrency(parseNumber(e.value))}\n`;
      });
    }
  }

  text += `───────────────────────\n`;
  text += `_Relatório gerado via Web App Fechamento de Caixa_ 🕒 ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  return text;
}
