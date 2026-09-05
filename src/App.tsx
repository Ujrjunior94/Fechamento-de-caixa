import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FuelCode, NozzleData, ExtraEntry, ShiftInfo, CashConference } from './types';
import { INITIAL_PRICES, createInitialNozzles } from './constants/fuels';
import { computeOverallSummary, generateWhatsAppMessage } from './utils/formatters';
import { Header } from './components/Header';
import { PriceBar } from './components/PriceBar';
import { NozzleTable } from './components/NozzleTable';
import { NozzleCardsMobile } from './components/NozzleCardsMobile';
import { RecolhimentosSection } from './components/RecolhimentosSection';
import { SummaryPanel } from './components/SummaryPanel';
import { CashConferenceSection } from './components/CashConferenceSection';
import { ActionToolbar } from './components/ActionToolbar';
import { PrintSheet } from './components/PrintSheet';
import { PhotoImportModal } from './components/PhotoImportModal';
import { LayoutGrid, Table, Check, Smartphone, Monitor } from 'lucide-react';

const STORAGE_KEY = 'posto_combustivel_fechamento_caixa_v1';

const INITIAL_CONFERENCE: CashConference = {
  cashAmount: '',
  cardsAmount: '',
  pixAmount: '',
  otherAmount: '',
  notes: '',
};

export default function App() {
  // 1. Shift state
  const [shift, setShift] = useState<ShiftInfo>(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      stationName: '',
      cashierName: '',
      shiftType: 'Manhã',
      date: today,
    };
  });

  // 2. Prices state
  const [prices, setPrices] = useState<Record<FuelCode, number>>(INITIAL_PRICES);

  // 3. Nozzles state (01 to 16)
  const [nozzles, setNozzles] = useState<NozzleData[]>(() => createInitialNozzles(INITIAL_PRICES));

  // 4. Recolhimentos / Extra items (Linha 17+)
  const [extraEntries, setExtraEntries] = useState<ExtraEntry[]>([
    { id: 'extra-1', description: 'Arla 32 (Litros / Galões)', value: '' },
    { id: 'extra-2', description: 'Loja de Conveniência', value: '' },
  ]);

  // 5. Cash Conference & Quebra state (Dinheiro, Cartões, Observações)
  const [conference, setConference] = useState<CashConference>(INITIAL_CONFERENCE);

  // View mode toggle for mobile vs table
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');

  // Last saved time indicator
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Copied WhatsApp indicator
  const [isCopied, setIsCopied] = useState(false);

  // Photo Import Modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoModalTab, setPhotoModalTab] = useState<'photo' | 'pdf_previous'>('photo');

  const handleOpenPhotoModal = (tab: 'photo' | 'pdf_previous' = 'photo') => {
    setPhotoModalTab(tab);
    setIsPhotoModalOpen(true);
  };

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shift) setShift(parsed.shift);
        if (parsed.prices) setPrices(parsed.prices);
        if (parsed.nozzles && Array.isArray(parsed.nozzles) && parsed.nozzles.length === 16) {
          setNozzles(parsed.nozzles);
        }
        if (parsed.extraEntries && Array.isArray(parsed.extraEntries)) {
          setExtraEntries(parsed.extraEntries);
        }
        if (parsed.conference) {
          setConference({
            cashAmount: parsed.conference.cashAmount || '',
            cardsAmount: parsed.conference.cardsAmount || '',
            pixAmount: parsed.conference.pixAmount || '',
            otherAmount: parsed.conference.otherAmount || '',
            notes: parsed.conference.notes || '',
          });
        }
        setLastSavedAt('Rascunho recuperado');
      }
    } catch (err) {
      console.warn('Erro ao carregar rascunho local:', err);
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      const payload = {
        shift,
        prices,
        nozzles,
        extraEntries,
        conference,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      const now = new Date();
      setLastSavedAt(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.warn('Erro ao salvar rascunho local:', err);
    }
  }, [shift, prices, nozzles, extraEntries, conference]);

  // Handlers for Cash Conference
  const handleUpdateConference = (field: keyof CashConference, value: string) => {
    setConference((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearConference = () => {
    setConference(INITIAL_CONFERENCE);
  };

  // Calculate live totals
  const summary = useMemo(() => {
    return computeOverallSummary(nozzles, extraEntries);
  }, [nozzles, extraEntries]);

  // Handlers for Shift
  const handleUpdateShift = (field: keyof ShiftInfo, value: string) => {
    setShift((prev) => ({ ...prev, [field]: value }));
  };

  // Handlers for Prices
  const handleUpdatePrice = (code: FuelCode, newPrice: number) => {
    setPrices((prev) => ({ ...prev, [code]: newPrice }));
    // Auto-update nozzles with that fuel type
    setNozzles((prev) =>
      prev.map((n) => (n.productCode === code ? { ...n, unitPrice: newPrice } : n))
    );
  };

  const handleApplyPricesToAllNozzles = () => {
    setNozzles((prev) =>
      prev.map((n) => ({
        ...n,
        unitPrice: prices[n.productCode] ?? n.unitPrice,
      }))
    );
  };

  const handleResetDefaultPrices = () => {
    setPrices(INITIAL_PRICES);
    setNozzles((prev) =>
      prev.map((n) => ({
        ...n,
        unitPrice: INITIAL_PRICES[n.productCode] ?? n.unitPrice,
      }))
    );
  };

  // Handlers for Nozzles
  const handleUpdateNozzle = (id: number, field: keyof NozzleData, value: any) => {
    setNozzles((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  };

  const handleProductChange = (id: number, productCode: FuelCode) => {
    setNozzles((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              productCode,
              unitPrice: prices[productCode],
            }
          : n
      )
    );
  };

  // Handlers for Extra Entries
  const handleUpdateExtra = (id: string, field: 'description' | 'value', value: string) => {
    setExtraEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExtra = (description: string = '') => {
    const newId = `extra-${Date.now()}`;
    setExtraEntries((prev) => [...prev, { id: newId, description, value: '' }]);
  };

  const handleRemoveExtra = (id: string) => {
    setExtraEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // Toolbar Actions
  const handleClearForm = () => {
    // Reset meter numbers & calibrations, keep products and prices
    setNozzles((prev) =>
      prev.map((n) => ({
        ...n,
        openingMeter: '',
        calibrationLiters: '0',
        closingMeter: '',
      }))
    );
    setExtraEntries([
      { id: 'extra-1', description: 'Arla 32', value: '' },
      { id: 'extra-2', description: 'Loja de Conveniência', value: '' },
    ]);
    setConference(INITIAL_CONFERENCE);
  };

  const handleLoadDemoData = () => {
    // Populate realistic gas station pump meter readings
    // Etanol, G COM, G ADIT, D S-10, D COM
    const baseMeters: Record<number, { open: number; close: number; calib?: number }> = {
      1: { open: 42100.5, close: 42350.2, calib: 0 },   // Etanol: 249.7 L
      2: { open: 58900.0, close: 59280.0, calib: 20 },  // G ADIT: 360.0 L (20L calib)
      3: { open: 91450.2, close: 92100.7, calib: 0 },   // G COM: 650.5 L
      4: { open: 34120.0, close: 34310.0, calib: 0 },   // Etanol: 190.0 L
      5: { open: 61200.4, close: 61580.9, calib: 0 },   // G ADIT: 380.5 L
      6: { open: 88500.0, close: 89300.0, calib: 0 },   // G COM: 800.0 L
      7: { open: 74200.0, close: 74850.5, calib: 20 },  // G COM: 630.5 L (20L calib)
      8: { open: 53100.0, close: 53420.0, calib: 0 },   // G ADIT: 320.0 L
      9: { open: 29800.0, close: 30040.5, calib: 0 },   // Etanol: 240.5 L
      10: { open: 82000.0, close: 82690.0, calib: 0 },  // G COM: 690.0 L
      11: { open: 47900.0, close: 48210.0, calib: 0 },  // G ADIT: 310.0 L
      12: { open: 36500.0, close: 36720.0, calib: 0 },  // Etanol: 220.0 L
      13: { open: 120500.0, close: 121650.0, calib: 0 }, // D S-10: 1150.0 L
      14: { open: 95400.0, close: 96150.0, calib: 0 },  // D COM: 750.0 L
      15: { open: 98200.0, close: 98900.0, calib: 0 },  // D COM: 700.0 L
      16: { open: 114000.0, close: 115200.0, calib: 0 }, // D S-10: 1200.0 L
    };

    setShift((prev) => ({
      ...prev,
      stationName: prev.stationName || 'Auto Posto Modelo Ltda',
      cashierName: prev.cashierName || 'José Oliveira (Frentista)',
    }));

    setNozzles((prev) =>
      prev.map((n) => {
        const demo = baseMeters[n.id];
        if (demo) {
          return {
            ...n,
            openingMeter: demo.open.toFixed(2),
            closingMeter: demo.close.toFixed(2),
            calibrationLiters: demo.calib ? demo.calib.toString() : '0',
          };
        }
        return n;
      })
    );

    setExtraEntries([
      { id: 'extra-1', description: 'Arla 32 (3 Galões x R$ 65,00)', value: '195.00' },
      { id: 'extra-2', description: 'Loja de Conveniência (Bebidas/Doces)', value: '450.00' },
      { id: 'extra-3', description: 'Óleo Lubrificante 15W40 (2 Frascos)', value: '110.00' },
    ]);

    // Set sample conference values (Dinheiro, Cartões, PIX, Observações)
    setConference({
      cashAmount: '16850.00',
      cardsAmount: '38268.57',
      pixAmount: '1500.00',
      otherAmount: '',
      notes: 'Caixa conferido sem pendências. Comprovantes de cartão conferidos com fita da máquina.',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = async () => {
    const text = generateWhatsAppMessage(shift, summary, nozzles, extraEntries, conference);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for sandboxed iframes
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
    }
  };

  const handleApplyPhotoData = (data: {
    nozzles?: Array<{
      nozzleNumber: number;
      productCode?: FuelCode;
      openingMeter?: string;
      closingMeter?: string;
      calibrationLiters?: string;
      unitPrice?: number;
    }>;
    extraEntries?: Array<{ description: string; value: string }>;
    prices?: Partial<Record<FuelCode, number>>;
    stationInfo?: Partial<ShiftInfo>;
    financialConference?: {
      cashAmount?: string | null;
      cardsAmount?: string | null;
      pixAmount?: string | null;
      otherAmount?: string | null;
      notes?: string | null;
    };
    mergeMode: 'merge' | 'replace' | 'previous_shift_transition';
  }) => {
    // 1. Update Shift Info if detected
    if (data.stationInfo) {
      setShift((prev) => ({
        ...prev,
        stationName: data.stationInfo?.stationName || prev.stationName,
        cashierName: data.stationInfo?.cashierName || prev.cashierName,
        date: data.stationInfo?.date || prev.date,
        shiftType: (data.stationInfo?.shiftType as any) || prev.shiftType,
      }));
    }

    // 2. Update prices if detected
    if (data.prices && Object.keys(data.prices).length > 0) {
      setPrices((prev) => ({
        ...prev,
        ...data.prices,
      }));
    }

    // 3. Update nozzles
    if (data.nozzles && data.nozzles.length > 0) {
      setNozzles((prev) => {
        const detectedMap = new Map<number, any>();
        data.nozzles?.forEach((d) => {
          if (d.nozzleNumber >= 1 && d.nozzleNumber <= 16) {
            detectedMap.set(d.nozzleNumber, d);
          }
        });

        return prev.map((n) => {
          const detected = detectedMap.get(n.id);
          if (detected) {
            const product = detected.productCode || n.productCode;
            const unitPrice =
              detected.unitPrice ??
              (data.prices && data.prices[product]) ??
              prices[product] ??
              n.unitPrice;

            return {
              ...n,
              productCode: product,
              unitPrice,
              openingMeter:
                detected.openingMeter !== undefined && detected.openingMeter !== null
                  ? String(detected.openingMeter)
                  : n.openingMeter,
              closingMeter:
                detected.closingMeter !== undefined && detected.closingMeter !== null
                  ? String(detected.closingMeter)
                  : n.closingMeter,
              calibrationLiters:
                detected.calibrationLiters !== undefined && detected.calibrationLiters !== null
                  ? String(detected.calibrationLiters)
                  : n.calibrationLiters,
            };
          }

          if (data.mergeMode === 'replace') {
            return {
              ...n,
              openingMeter: '',
              closingMeter: '',
              calibrationLiters: '0',
            };
          }

          return n;
        });
      });
    }

    // 4. Update extra entries
    if (data.extraEntries && data.extraEntries.length > 0) {
      const formattedEntries: ExtraEntry[] = data.extraEntries.map((e, idx) => ({
        id: `extra-ai-${Date.now()}-${idx}`,
        description: e.description,
        value: String(e.value),
      }));

      if (data.mergeMode === 'replace') {
        setExtraEntries(formattedEntries);
      } else {
        setExtraEntries((prev) => [...prev, ...formattedEntries]);
      }
    }

    // 5. Update Financial Conference if detected
    if (data.financialConference) {
      setConference((prev) => ({
        ...prev,
        cashAmount:
          data.financialConference?.cashAmount !== undefined &&
          data.financialConference?.cashAmount !== null
            ? String(data.financialConference.cashAmount)
            : prev.cashAmount,
        cardsAmount:
          data.financialConference?.cardsAmount !== undefined &&
          data.financialConference?.cardsAmount !== null
            ? String(data.financialConference.cardsAmount)
            : prev.cardsAmount,
        pixAmount:
          data.financialConference?.pixAmount !== undefined &&
          data.financialConference?.pixAmount !== null
            ? String(data.financialConference.pixAmount)
            : prev.pixAmount,
        notes:
          data.financialConference?.notes !== undefined &&
          data.financialConference?.notes !== null
            ? String(data.financialConference.notes)
            : prev.notes,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 text-slate-800">
      {/* Hidden printable sheet rendered strictly when printing */}
      <PrintSheet
        shift={shift}
        nozzles={nozzles}
        extraEntries={extraEntries}
        summary={summary}
        conference={conference}
      />

      {/* Screen Interface (hidden when printing) */}
      <div className="no-print max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 md:pt-6">
        {/* Top Header */}
        <Header
          shift={shift}
          onUpdateShift={handleUpdateShift}
          lastSavedAt={lastSavedAt}
          onOpenPhotoModal={handleOpenPhotoModal}
        />

        {/* Price Configuration Header Bar */}
        <PriceBar
          prices={prices}
          onUpdatePrice={handleUpdatePrice}
          onApplyPricesToAllNozzles={handleApplyPricesToAllNozzles}
          onResetDefaultPrices={handleResetDefaultPrices}
        />

        {/* View Switcher Controls for Touch/Mobile */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span>Visualização dos Bicos:</span>
          </div>
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewMode('auto')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'auto'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Automático
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards Celular</span>
            </button>
          </div>
        </div>

        {/* Nozzle Grid (Table or Cards depending on screen / viewMode) */}
        {viewMode === 'cards' ? (
          <NozzleCardsMobile
            nozzles={nozzles}
            onUpdateNozzle={handleUpdateNozzle}
            onProductChange={handleProductChange}
          />
        ) : viewMode === 'table' ? (
          <NozzleTable
            nozzles={nozzles}
            onUpdateNozzle={handleUpdateNozzle}
            onProductChange={handleProductChange}
          />
        ) : (
          <>
            {/* Auto: show Cards on mobile (md:hidden), Table on desktop (hidden md:block) */}
            <div className="md:hidden">
              <NozzleCardsMobile
                nozzles={nozzles}
                onUpdateNozzle={handleUpdateNozzle}
                onProductChange={handleProductChange}
              />
            </div>
            <div className="hidden md:block">
              <NozzleTable
                nozzles={nozzles}
                onUpdateNozzle={handleUpdateNozzle}
                onProductChange={handleProductChange}
              />
            </div>
          </>
        )}

        {/* Section for Recolhimentos (Linha 17+) */}
        <RecolhimentosSection
          entries={extraEntries}
          onUpdateEntry={handleUpdateExtra}
          onAddEntry={handleAddExtra}
          onRemoveEntry={handleRemoveExtra}
        />

        {/* Summary and Financial Closing Panel */}
        <SummaryPanel summary={summary} />

        {/* Cash Conference, Quebra de Caixa and Notes */}
        <CashConferenceSection
          conference={conference}
          onChangeField={handleUpdateConference}
          summary={summary}
          onClearConference={handleClearConference}
        />

        {/* Action Toolbar */}
        <ActionToolbar
          onClearForm={handleClearForm}
          onPrint={handlePrint}
          onCopyWhatsApp={handleCopyWhatsApp}
          onLoadDemoData={handleLoadDemoData}
          onOpenPhotoModal={handleOpenPhotoModal}
          isCopied={isCopied}
        />
      </div>

      {/* Photo / PDF Import AI Modal */}
      <PhotoImportModal
        isOpen={isPhotoModalOpen}
        initialTab={photoModalTab}
        onClose={() => setIsPhotoModalOpen(false)}
        onApplyData={handleApplyPhotoData}
      />
    </div>
  );
}
