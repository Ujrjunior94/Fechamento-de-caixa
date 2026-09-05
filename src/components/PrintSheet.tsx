import React from 'react';
import { CashConference, ExtraEntry, NozzleData, OverallSummary, ShiftInfo, FuelCode } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { calculateNozzleMetrics, formatCurrency, formatLiters, parseNumber } from '../utils/formatters';

interface PrintSheetProps {
  shift: ShiftInfo;
  nozzles: NozzleData[];
  extraEntries: ExtraEntry[];
  summary: OverallSummary;
  conference?: CashConference;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  shift,
  nozzles,
  extraEntries,
  summary,
  conference,
}) => {
  const dateFormatted = shift.date
    ? shift.date.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  const fuelCodes: FuelCode[] = ['ETANOL', 'G_COM', 'G_ADIT', 'D_S10', 'D_COM'];

  const cashVal = conference ? parseNumber(conference.cashAmount) : 0;
  const cardsVal = conference ? parseNumber(conference.cardsAmount) : 0;
  const pixVal = conference ? parseNumber(conference.pixAmount) : 0;
  const otherVal = conference ? parseNumber(conference.otherAmount) : 0;
  const totalAudited = cashVal + cardsVal + pixVal + otherVal;
  const diff = totalAudited - summary.grandTotal;

  const hasConferenceValues =
    Boolean(conference) &&
    (conference!.cashAmount.trim() !== '' ||
      conference!.cardsAmount.trim() !== '' ||
      Boolean(conference!.pixAmount && conference!.pixAmount.trim() !== '') ||
      Boolean(conference!.otherAmount && conference!.otherAmount.trim() !== ''));

  return (
    <div className="print-only p-4 text-black bg-white max-w-4xl mx-auto text-xs">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-4 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider">
          {shift.stationName || 'POSTO DE COMBUSTÍVEIS'}
        </h1>
        <h2 className="text-sm font-bold uppercase mt-0.5">
          RELATÓRIO DE FECHAMENTO DE CAIXA E ENCERRANTES
        </h2>
        <div className="flex justify-between items-center mt-3 text-xs border-t border-slate-300 pt-2">
          <span><strong>Data:</strong> {dateFormatted}</span>
          <span><strong>Turno:</strong> {shift.shiftType}</span>
          <span><strong>Operador:</strong> {shift.cashierName || 'Não informado'}</span>
          <span><strong>Emissão:</strong> {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {/* Highlights Box */}
      <div className="grid grid-cols-4 gap-2 border-2 border-black p-2.5 mb-4 text-center">
        <div className="border-r border-slate-300 pr-2">
          <div className="text-[10px] uppercase font-bold text-slate-700">Total Litros</div>
          <div className="text-sm font-black font-mono">{formatLiters(summary.totalLiters)}</div>
        </div>
        <div className="border-r border-slate-300 pr-2">
          <div className="text-[10px] uppercase font-bold text-slate-700">Total Combustíveis</div>
          <div className="text-sm font-black font-mono">{formatCurrency(summary.totalFuelRevenue)}</div>
        </div>
        <div className="border-r border-slate-300 pr-2">
          <div className="text-[10px] uppercase font-bold text-slate-700">Recolhimentos / Arla</div>
          <div className="text-sm font-black font-mono">{formatCurrency(summary.totalExtraRevenue)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-black">TOTAL GERAL CAIXA</div>
          <div className="text-sm font-black font-mono">{formatCurrency(summary.grandTotal)}</div>
        </div>
      </div>

      {/* Subtotais por combustível */}
      <div className="mb-4">
        <h3 className="font-bold text-[11px] uppercase border-b border-black pb-1 mb-2">
          1. Resumo por Combustível
        </h3>
        <table className="w-full text-left border border-slate-400">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 text-[10px] uppercase font-bold">
              <th className="p-1.5">Produto</th>
              <th className="p-1.5 text-right">Volume (Litros)</th>
              <th className="p-1.5 text-right">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            {fuelCodes.map((code) => {
              const prod = FUEL_PRODUCTS[code];
              const s = summary.byProduct[code];
              return (
                <tr key={`print-summary-${code}`} className="border-b border-slate-200">
                  <td className="p-1 font-semibold">{prod.name} ({prod.shortLabel})</td>
                  <td className="p-1 text-right font-mono">{formatLiters(s.liters)}</td>
                  <td className="p-1 text-right font-mono font-bold">{formatCurrency(s.revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tabela dos 16 bicos */}
      <div className="mb-4 print-break-inside-avoid">
        <h3 className="font-bold text-[11px] uppercase border-b border-black pb-1 mb-2">
          2. Leituras dos Encerrantes (Bicos 01 a 16)
        </h3>
        <table className="w-full text-left border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
              <th className="p-1 text-center w-10">Bico</th>
              <th className="p-1">Produto</th>
              <th className="p-1 text-right">Preço</th>
              <th className="p-1 text-right">Abertura</th>
              <th className="p-1 text-center">Aferição</th>
              <th className="p-1 text-right">Fechamento</th>
              <th className="p-1 text-right">Litros Vend.</th>
              <th className="p-1 text-right">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            {nozzles.map((n) => {
              const { litersSold, totalSold, hasWarning } = calculateNozzleMetrics(n);
              const prod = FUEL_PRODUCTS[n.productCode];
              return (
                <tr
                  key={`print-nozzle-${n.id}`}
                  className={`border-b border-slate-200 ${hasWarning ? 'bg-rose-50' : ''}`}
                >
                  <td className="p-1 text-center font-bold font-mono">{n.numberLabel}</td>
                  <td className="p-1 font-medium">{prod.shortLabel}</td>
                  <td className="p-1 text-right font-mono">{formatCurrency(n.unitPrice)}</td>
                  <td className="p-1 text-right font-mono">{n.openingMeter || '0'}</td>
                  <td className="p-1 text-center font-mono">{n.calibrationLiters || '0'}</td>
                  <td
                    className={`p-1 text-right font-mono ${
                      hasWarning ? 'text-rose-700 font-bold underline' : ''
                    }`}
                  >
                    {n.closingMeter || '0'}
                    {hasWarning && ' (!)'}
                  </td>
                  <td
                    className={`p-1 text-right font-mono font-semibold ${
                      hasWarning ? 'text-rose-700 font-bold' : ''
                    }`}
                  >
                    {hasWarning ? 'Erro (!)' : formatLiters(litersSold)}
                  </td>
                  <td
                    className={`p-1 text-right font-mono font-bold ${
                      hasWarning ? 'text-rose-700' : ''
                    }`}
                  >
                    {hasWarning ? 'R$ 0,00' : formatCurrency(totalSold)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recolhimentos */}
      {extraEntries.length > 0 && (
        <div className="mb-4 print-break-inside-avoid">
          <h3 className="font-bold text-[11px] uppercase border-b border-black pb-1 mb-2">
            3. Recolhimentos e Outros (Linha 17+)
          </h3>
          <table className="w-full text-left border border-slate-400 text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                <th className="p-1">Linha / Descrição</th>
                <th className="p-1 text-right w-32">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {extraEntries.map((e, idx) => (
                <tr key={`print-extra-${e.id}`} className="border-b border-slate-200">
                  <td className="p-1 font-medium">Linha {17 + idx}: {e.description || 'Recolhimento'}</td>
                  <td className="p-1 text-right font-mono font-bold">{formatCurrency(parseNumber(e.value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Conferência de Valores Apurados e Quebra */}
      <div className="mb-4 print-break-inside-avoid">
        <h3 className="font-bold text-[11px] uppercase border-b border-black pb-1 mb-2">
          {extraEntries.length > 0 ? '4' : '3'}. Conferência Financeira e Quebra de Caixa
        </h3>
        <table className="w-full text-left border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
              <th className="p-1">Forma de Recebimento</th>
              <th className="p-1 text-right">Valor Apurado (R$)</th>
              <th className="p-1 text-right">Esperado Sistema (R$)</th>
              <th className="p-1 text-right">Diferença / Quebra (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-1 font-medium">Dinheiro em Caixa (Espécie)</td>
              <td className="p-1 text-right font-mono font-bold">{formatCurrency(cashVal)}</td>
              <td className="p-1 text-right font-mono text-slate-500" rowSpan={4} style={{ verticalAlign: 'middle' }}>
                {formatCurrency(summary.grandTotal)}
              </td>
              <td
                className="p-1 text-right font-mono font-bold"
                rowSpan={4}
                style={{ verticalAlign: 'middle' }}
              >
                {hasConferenceValues ? (
                  Math.abs(diff) < 0.01 ? (
                    'R$ 0,00 (Batido)'
                  ) : diff < 0 ? (
                    `FALTA: -${formatCurrency(Math.abs(diff))}`
                  ) : (
                    `SOBRA: +${formatCurrency(diff)}`
                  )
                ) : (
                  'Pendente'
                )}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-1 font-medium">Cartões (Débito e Crédito)</td>
              <td className="p-1 text-right font-mono font-bold">{formatCurrency(cardsVal)}</td>
            </tr>
            {pixVal > 0 && (
              <tr className="border-b border-slate-200">
                <td className="p-1 font-medium">PIX / Pagamentos Digitais</td>
                <td className="p-1 text-right font-mono font-bold">{formatCurrency(pixVal)}</td>
              </tr>
            )}
            {otherVal > 0 && (
              <tr className="border-b border-slate-200">
                <td className="p-1 font-medium">Faturado / Convênio / Outros</td>
                <td className="p-1 text-right font-mono font-bold">{formatCurrency(otherVal)}</td>
              </tr>
            )}
            <tr className="bg-slate-100 font-bold border-t border-slate-400">
              <td className="p-1 uppercase">TOTAL APURADO DECLARADO</td>
              <td className="p-1 text-right font-mono">{formatCurrency(totalAudited)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Observações */}
      {conference?.notes && conference.notes.trim() && (
        <div className="mb-6 print-break-inside-avoid">
          <h3 className="font-bold text-[11px] uppercase border-b border-black pb-1 mb-1">
            {extraEntries.length > 0 ? '5' : '4'}. Observações e Ocorrências do Turno
          </h3>
          <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[10px] whitespace-pre-wrap">
            {conference.notes}
          </div>
        </div>
      )}

      {/* Assinaturas */}
      <div className="mt-8 pt-8 grid grid-cols-2 gap-8 text-center print-break-inside-avoid">
        <div>
          <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
            {shift.cashierName || 'Frentista / Caixa Responsável'}
          </div>
          <div className="text-[10px] text-slate-600">Assinatura do Operador</div>
        </div>
        <div>
          <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
            Gerência / Supervisão do Posto
          </div>
          <div className="text-[10px] text-slate-600">Conferido e Aprovado</div>
        </div>
      </div>
    </div>
  );
};
