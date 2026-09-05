import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Layers,
  ArrowRight,
  Info,
  Edit3,
  HelpCircle,
  FileText,
  FileSpreadsheet,
  ArrowRightLeft,
  Calendar,
  User,
  Fuel,
} from 'lucide-react';
import { FuelCode, NozzleData, ExtraEntry, ShiftInfo } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { formatCurrency, parseNumber } from '../utils/formatters';

export type ImportTabMode = 'photo' | 'pdf_previous';

interface PhotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ImportTabMode;
  onApplyData: (data: {
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
  }) => void;
}

interface LoadedFileInfo {
  name: string;
  sizeFormatted: string;
  isPdf: boolean;
  dataUrl: string;
  mimeType: string;
}

// Format bytes to readable string
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper to safely optimize image files, falling back smoothly to raw data if needed
const processSelectedFile = (file: File): Promise<LoadedFileInfo> => {
  return new Promise((resolve) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const sizeFormatted = formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || '';

      if (isPdf) {
        resolve({
          name: file.name,
          sizeFormatted,
          isPdf: true,
          dataUrl: rawDataUrl,
          mimeType: 'application/pdf',
        });
        return;
      }

      // If it's an image, attempt downscaling for fast network transfer
      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              name: file.name,
              sizeFormatted,
              isPdf: false,
              dataUrl: rawDataUrl,
              mimeType: file.type || 'image/jpeg',
            });
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
          resolve({
            name: file.name,
            sizeFormatted,
            isPdf: false,
            dataUrl: optimizedDataUrl,
            mimeType: 'image/jpeg',
          });
        } catch {
          // Graceful fallback to raw data
          resolve({
            name: file.name,
            sizeFormatted,
            isPdf: false,
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
          });
        }
      };

      img.onerror = () => {
        // If image loading fails, still allow sending raw data URL
        resolve({
          name: file.name,
          sizeFormatted,
          isPdf: false,
          dataUrl: rawDataUrl,
          mimeType: file.type || 'image/jpeg',
        });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve({
        name: file.name,
        sizeFormatted,
        isPdf,
        dataUrl: '',
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
      });
    };

    reader.readAsDataURL(file);
  });
};

export const PhotoImportModal: React.FC<PhotoImportModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'photo',
  onApplyData,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTabMode>(initialTab);
  const [loadedFile, setLoadedFile] = useState<LoadedFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Application mode selection
  const [applyMode, setApplyMode] = useState<
    'previous_shift_transition' | 'replace' | 'merge'
  >('previous_shift_transition');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialTab === 'pdf_previous') {
        setApplyMode('previous_shift_transition');
      } else {
        setApplyMode('merge');
      }
    }
  }, [isOpen, initialTab]);

  // Close live camera stream when modal closes or unmounts
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startLiveCamera = async () => {
    setErrorMsg(null);
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Erro ao acessar webcam diretamente:', err);
      // Fallback: trigger standard mobile file camera input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setErrorMsg('Não foi possível abrir a câmera diretamente. Por favor, escolha um arquivo de imagem.');
      }
    }
  };

  const capturePhotoFromLiveCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      stopCameraStream();

      setLoadedFile({
        name: `camera_captura_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.jpg`,
        sizeFormatted: '~ 450 KB',
        isPdf: false,
        dataUrl: rawDataUrl,
        mimeType: 'image/jpeg',
      });
      setParsedResult(null);
      setErrorMsg(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizing(true);
    try {
      const processed = await processSelectedFile(file);
      if (!processed.dataUrl) {
        throw new Error('Falha ao ler o conteúdo do arquivo.');
      }
      setLoadedFile(processed);
      setParsedResult(null);

      // If a PDF was uploaded or tab is pdf_previous, set default mode to shift transition
      if (processed.isPdf || activeTab === 'pdf_previous') {
        setApplyMode('previous_shift_transition');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível carregar o arquivo selecionado.');
    } finally {
      setIsOptimizing(false);
      // reset file input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  // Rotate image 90 degrees clockwise
  const handleRotateImage = () => {
    if (!loadedFile || loadedFile.isPdf || !loadedFile.dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotated = canvas.toDataURL('image/jpeg', 0.92);
      setLoadedFile({
        ...loadedFile,
        dataUrl: rotated,
      });
      setParsedResult(null);
    };
    img.src = loadedFile.dataUrl;
  };

  // Generate a realistic demonstration sheet for quick testing
  const handleLoadSampleSheet = (type: 'current' | 'previous') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px sans-serif';
    const title =
      type === 'previous'
        ? 'POSTO ESTRELA DO NORTE - FECHAMENTO TURNO ANTERIOR (TURNO 1 - MANHÃ)'
        : 'POSTO ESTRELA DO NORTE - FECHAMENTO DE TURNO';
    ctx.fillText(title, 40, 50);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(
      type === 'previous'
        ? 'DATA: 04/09/2026   |   TURNO ANTERIOR: MANHÃ (06h-14h)   |   FRENTISTA: CARLOS LIMA'
        : 'DATA: 05/09/2026   |   TURNO: MANHÃ   |   FRENTISTA: MARCOS SILVA',
      40,
      85
    );
    ctx.fillText(
      'TABELA PREÇOS: ETANOL R$ 4,33 | G COM R$ 6,33 | G ADIT R$ 6,33 | D S-10 R$ 6,99 | D COM R$ 6,43',
      40,
      115
    );

    // Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(40, 140, 920, 36);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('BICO | PRODUTO | ABERTURA    | FECHAMENTO  | AFERIÇÃO (L)', 50, 163);

    // Rows
    const rows = [
      { bico: 'BICO 01', prod: 'ETANOL', abert: '42100.50', fech: '42350.20', af: '0' },
      { bico: 'BICO 02', prod: 'G ADIT', abert: '58900.00', fech: '59280.00', af: '20' },
      { bico: 'BICO 03', prod: 'G COM', abert: '91450.20', fech: '92100.70', af: '0' },
      { bico: 'BICO 04', prod: 'ETANOL', abert: '34120.00', fech: '34310.00', af: '0' },
      { bico: 'BICO 05', prod: 'G ADIT', abert: '61200.40', fech: '61580.90', af: '0' },
      { bico: 'BICO 06', prod: 'G COM', abert: '88500.00', fech: '89300.00', af: '0' },
      { bico: 'BICO 07', prod: 'G COM', abert: '74200.00', fech: '74850.50', af: '20' },
      { bico: 'BICO 08', prod: 'G ADIT', abert: '53100.00', fech: '53420.00', af: '0' },
      { bico: 'BICO 09', prod: 'ETANOL', abert: '29800.00', fech: '30040.50', af: '0' },
      { bico: 'BICO 10', prod: 'G COM', abert: '82000.00', fech: '82690.00', af: '0' },
      { bico: 'BICO 11', prod: 'G ADIT', abert: '47900.00', fech: '48210.00', af: '0' },
      { bico: 'BICO 12', prod: 'ETANOL', abert: '36500.00', fech: '36720.00', af: '0' },
      { bico: 'BICO 13', prod: 'D S-10', abert: '120500.0', fech: '121650.0', af: '0' },
      { bico: 'BICO 14', prod: 'D COM', abert: '95400.00', fech: '96150.00', af: '0' },
      { bico: 'BICO 15', prod: 'D COM', abert: '98200.00', fech: '98900.00', af: '0' },
      { bico: 'BICO 16', prod: 'D S-10', abert: '114000.0', fech: '115200.0', af: '0' },
    ];

    let y = 195;
    ctx.font = '13px monospace';
    rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, y - 18, 920, 24);
      }
      ctx.fillStyle = '#1e293b';
      ctx.fillText(
        `${r.bico.padEnd(7)}| ${r.prod.padEnd(8)}| ${r.abert.padEnd(12)}| ${r.fech.padEnd(12)}| ${r.af}`,
        50,
        y
      );
      y += 24;
    });

    // Extra entries at bottom
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('RECOLHIMENTOS / OUTROS: Arla 32: R$ 195,00 | Loja: R$ 450,00', 50, y + 40);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setLoadedFile({
      name:
        type === 'previous'
          ? 'fechamento_anterior_exemplo.jpg'
          : 'folha_fechamento_exemplo.jpg',
      sizeFormatted: '~ 320 KB',
      isPdf: false,
      dataUrl,
      mimeType: 'image/jpeg',
    });
    setParsedResult(null);
    setErrorMsg(null);
    stopCameraStream();

    if (type === 'previous') {
      setApplyMode('previous_shift_transition');
    }
  };

  const handleProcessDocument = async () => {
    if (!loadedFile || !loadedFile.dataUrl) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusText(
      loadedFile.isPdf
        ? 'Lendo documento PDF com IA Gemini...'
        : 'Processando imagem com IA Gemini...'
    );

    try {
      const response = await fetch('/api/scan-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64: loadedFile.dataUrl,
          mimeType: loadedFile.mimeType,
          isPreviousShift: activeTab === 'pdf_previous',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro ${response.status} ao processar arquivo com a IA.`
        );
      }

      const result = await response.json();
      if (result.success && result.data) {
        const nozzlesCount = result.data.detectedNozzles?.length || 0;
        const extrasCount = result.data.extraEntries?.length || 0;

        if (nozzlesCount === 0 && extrasCount === 0 && !result.data.stationInfo?.cashierName) {
          setErrorMsg(
            'A IA analisou o documento, mas não conseguiu identificar bicos (1 a 16) ou encerrantes com clareza. Verifique a qualidade do arquivo ou selecione outro.'
          );
        } else {
          setParsedResult(result.data);
        }
      } else {
        throw new Error(result.error || 'Nenhum dado legível retornado pela IA.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o arquivo.');
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  // Helper to update a detected nozzle directly in the modal preview
  const handleUpdateDetectedNozzle = (
    index: number,
    field: 'openingMeter' | 'closingMeter' | 'calibrationLiters' | 'productCode',
    value: any
  ) => {
    if (!parsedResult || !parsedResult.detectedNozzles) return;
    const updated = [...parsedResult.detectedNozzles];
    updated[index] = { ...updated[index], [field]: value };
    setParsedResult({ ...parsedResult, detectedNozzles: updated });
  };

  const handleConfirmApply = () => {
    if (!parsedResult) return;

    let nozzlesToApply = parsedResult.detectedNozzles || [];

    // If shift transition mode is selected:
    // Map closingMeter from the previous shift -> openingMeter of the current shift,
    // and reset closingMeter to '' for the new cashier to type!
    if (applyMode === 'previous_shift_transition') {
      nozzlesToApply = nozzlesToApply.map((n: any) => ({
        ...n,
        // The closing meter of previous shift becomes opening meter of the new shift
        openingMeter: n.closingMeter || n.openingMeter || '',
        closingMeter: '', // blank for the new shift
        calibrationLiters: '0', // reset calibration for new shift
      }));
    }

    onApplyData({
      nozzles: nozzlesToApply,
      extraEntries:
        applyMode === 'previous_shift_transition' ? [] : parsedResult.extraEntries || [],
      prices: parsedResult.prices || {},
      stationInfo: {
        stationName: parsedResult.stationInfo?.stationName,
        // When transitioning shift, do not overwrite cashier name with previous shift operator unless desired
        cashierName:
          applyMode === 'previous_shift_transition'
            ? undefined
            : parsedResult.stationInfo?.cashierName,
        date: parsedResult.stationInfo?.date,
        shiftType:
          applyMode === 'previous_shift_transition'
            ? undefined
            : parsedResult.stationInfo?.shiftType,
      },
      financialConference:
        applyMode === 'previous_shift_transition'
          ? undefined
          : parsedResult.financialConference || undefined,
      mergeMode: applyMode === 'previous_shift_transition' ? 'merge' : applyMode,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="import-document-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              {activeTab === 'pdf_previous' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                Importação com IA
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white">
                  Gemini Flash
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                {activeTab === 'pdf_previous'
                  ? 'Importe o PDF do fechamento anterior para preencher a abertura do novo turno'
                  : 'Tire foto do visor da bomba, folha de encerrantes ou cupom de automação'}
              </p>
            </div>
          </div>

          <button
            id="modal-close-btn"
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/80 p-1.5 gap-1.5 shrink-0">
          <button
            id="tab-photo-btn"
            type="button"
            onClick={() => {
              setActiveTab('photo');
              setParsedResult(null);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Foto / Câmera (Folha ou Bomba)</span>
          </button>

          <button
            id="tab-pdf-previous-btn"
            type="button"
            onClick={() => {
              setActiveTab('pdf_previous');
              setParsedResult(null);
              setErrorMsg(null);
              setApplyMode('previous_shift_transition');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'pdf_previous'
                ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Fechamento Anterior (PDF / Imagem)</span>
            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-extrabold">
              NOVO
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Informational Banner for Previous Shift PDF Mode */}
          {activeTab === 'pdf_previous' && !loadedFile && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Transição Automática de Turno / Dia:
                </strong>
                Carregue o relatório em <strong>PDF</strong> ou <strong>Foto</strong> do
                fechamento anterior. O sistema lerá os encerrantes de{' '}
                <strong>Fechamento</strong> da folha anterior e preencherá como{' '}
                <strong>Abertura</strong> nos Bicos 01 a 16 do novo turno!
              </div>
            </div>
          )}

          {/* Live Camera Feed if active */}
          {isCameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-300">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhotoFromLiveCamera}
                  disabled={isOptimizing}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Capturar Foto Agora
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="bg-white/80 hover:bg-white text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar Câmera
                </button>
              </div>
            </div>
          )}

          {/* Hidden inputs for file types */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Dropzone / Action Selector */}
          {!isCameraActive && !loadedFile && (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-amber-400 bg-slate-50/50 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                {activeTab === 'pdf_previous' ? (
                  <FileSpreadsheet className="w-7 h-7" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {activeTab === 'pdf_previous'
                  ? 'Selecione o PDF ou Foto do Fechamento Anterior'
                  : 'Escolha como deseja importar a foto ou documento'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                {activeTab === 'pdf_previous'
                  ? 'Formatos aceitos: PDF (.pdf), Fotos da folha anterior (.jpg, .png, .webp).'
                  : 'Tire uma foto na hora com a câmera ou anexe imagem/PDF da galeria ou computador.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {activeTab === 'pdf_previous' ? (
                  <>
                    <button
                      id="select-pdf-btn"
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Selecionar Arquivo PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-500" /> Foto da Folha Anterior
                    </button>

                    <button
                      id="sample-previous-pdf-btn"
                      type="button"
                      onClick={() => handleLoadSampleSheet('previous')}
                      className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Testar com Exemplo
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="open-live-camera-btn"
                      type="button"
                      onClick={startLiveCamera}
                      className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Tirar Foto com Câmera
                    </button>

                    <button
                      id="select-image-file-btn"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-500" /> Escolher Arquivo / Galeria
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSampleSheet('current')}
                      className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Testar com Folha Exemplo
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Selected File / Document Preview */}
          {loadedFile && !isCameraActive && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  {loadedFile.isPdf ? (
                    <FileText className="w-4 h-4 text-rose-600" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {loadedFile.isPdf ? 'Documento PDF Selecionado' : 'Foto Selecionada'}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {loadedFile.sizeFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!loadedFile.isPdf && (
                    <button
                      type="button"
                      onClick={handleRotateImage}
                      title="Girar foto 90°"
                      className="text-xs text-slate-600 hover:text-amber-700 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-500" /> Girar 90°
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setLoadedFile(null);
                      setParsedResult(null);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Trocar Arquivo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* File Visual Card */}
                {loadedFile.isPdf ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-48">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 break-all">
                        {loadedFile.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Documento PDF pronto para leitura por IA
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      ✓ Pronto para Análise
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 max-h-60 flex items-center justify-center">
                    <img
                      src={loadedFile.dataUrl}
                      alt="Arquivo selecionado"
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Analysis Action / Status */}
                <div className="space-y-3">
                  {!parsedResult && (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          {activeTab === 'pdf_previous'
                            ? 'A IA extrairá os encerrantes finais e dados do fechamento anterior com alta precisão.'
                            : 'Nossa IA reconhece números dos bicos (1 a 16), encerrantes de abertura, fechamento e recolhimentos.'}
                        </span>
                      </div>

                      <button
                        id="process-doc-btn"
                        type="button"
                        onClick={handleProcessDocument}
                        disabled={isLoading || isOptimizing}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                          isLoading || isOptimizing
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{statusText || 'Analisando Arquivo...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-200" />
                            <span>
                              {activeTab === 'pdf_previous'
                                ? 'Ler Fechamento Anterior com IA'
                                : 'Ler Foto com Inteligência Artificial'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{errorMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleProcessDocument}
                        disabled={isLoading}
                        className="self-end sm:self-center shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parsed Result Review */}
          {parsedResult && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">
                    Dados Extraídos com Sucesso pela IA!
                  </span>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  {parsedResult.detectedNozzles?.length || 0} bicos identificados
                </span>
              </div>

              {/* Observation summary */}
              {parsedResult.observations && (
                <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <strong>Resumo da leitura:</strong> {parsedResult.observations}
                </div>
              )}

              {/* Application Mode Banner */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Selecione como deseja aplicar no fechamento atual:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                      applyMode === 'previous_shift_transition'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="applyMode"
                      value="previous_shift_transition"
                      checked={applyMode === 'previous_shift_transition'}
                      onChange={() => setApplyMode('previous_shift_transition')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <strong className="block text-amber-900">
                        Transição de Turno (Recomendado para PDF Anterior)
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Fechamento anterior ➔ Abertura do novo turno (fechamentos ficam em branco
                        para digitar).
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                      applyMode === 'replace'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="applyMode"
                      value="replace"
                      checked={applyMode === 'replace'}
                      onChange={() => setApplyMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <strong className="block text-slate-900">Espelho Completo</strong>
                      <span className="text-[11px] text-slate-500">
                        Preenche abertura, fechamento e aferição exatamente como na folha.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                      applyMode === 'merge'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="applyMode"
                      value="merge"
                      checked={applyMode === 'merge'}
                      onChange={() => setApplyMode('merge')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <strong className="block text-slate-900">Mesclar Apenas Bicos Lidos</strong>
                      <span className="text-[11px] text-slate-500">
                        Atualiza somente os bicos reconhecidos sem apagar outros dados.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Detected Nozzles Grid */}
              {parsedResult.detectedNozzles && parsedResult.detectedNozzles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Bicos Reconhecidos (Você pode editar antes de aplicar):
                    </h4>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
                    {parsedResult.detectedNozzles.map((n: any, idx: number) => {
                      const prod =
                        FUEL_PRODUCTS[n.productCode as FuelCode]?.shortLabel || n.productCode;
                      const openVal = parseNumber(n.openingMeter);
                      const closeVal = parseNumber(n.closingMeter);
                      const hasInvertedMeters =
                        n.openingMeter && n.closingMeter && closeVal < openVal;

                      return (
                        <div
                          key={`detected-${idx}`}
                          className={`p-2.5 rounded-xl border transition-all ${
                            hasInvertedMeters && applyMode !== 'previous_shift_transition'
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs ${
                                  hasInvertedMeters && applyMode !== 'previous_shift_transition'
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-slate-900 text-white'
                                }`}
                              >
                                Bico {n.nozzleNumber < 10 ? `0${n.nozzleNumber}` : n.nozzleNumber}
                              </span>
                              <span className="font-semibold text-slate-800">{prod}</span>
                            </div>

                            {applyMode === 'previous_shift_transition' ? (
                              <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                                Abertura Novo Turno: <strong>{n.closingMeter || n.openingMeter}</strong>
                              </span>
                            ) : (
                              hasInvertedMeters && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                                  ⚠️ Fechamento &lt; Abertura
                                </span>
                              )
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                            <div>
                              <span className="block text-[10px] text-slate-400">
                                {applyMode === 'previous_shift_transition'
                                  ? 'Abertura Folha Anterior:'
                                  : 'Abertura:'}
                              </span>
                              <input
                                type="text"
                                value={n.openingMeter || ''}
                                onChange={(e) =>
                                  handleUpdateDetectedNozzle(idx, 'openingMeter', e.target.value)
                                }
                                className="w-full px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400">
                                {applyMode === 'previous_shift_transition'
                                  ? 'Fechamento Anterior (Abertura Atual):'
                                  : 'Fechamento:'}
                              </span>
                              <input
                                type="text"
                                value={n.closingMeter || ''}
                                onChange={(e) =>
                                  handleUpdateDetectedNozzle(idx, 'closingMeter', e.target.value)
                                }
                                className={`w-full px-1.5 py-0.5 rounded text-xs font-mono ${
                                  applyMode === 'previous_shift_transition'
                                    ? 'bg-amber-50 border border-amber-300 font-bold text-amber-900'
                                    : hasInvertedMeters
                                    ? 'bg-rose-100 border border-rose-400 text-rose-900 font-bold'
                                    : 'bg-slate-50 border border-slate-200'
                                }`}
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400">Aferição (L):</span>
                              <input
                                type="text"
                                value={n.calibrationLiters || '0'}
                                onChange={(e) =>
                                  handleUpdateDetectedNozzle(
                                    idx,
                                    'calibrationLiters',
                                    e.target.value
                                  )
                                }
                                className="w-full px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra entries */}
              {parsedResult.extraEntries &&
                parsedResult.extraEntries.length > 0 &&
                applyMode !== 'previous_shift_transition' && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Recolhimentos / Linha 17+:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.extraEntries.map((e: any, idx: number) => (
                        <span
                          key={`extra-detected-${idx}`}
                          className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700"
                        >
                          {e.description}: <strong>R$ {e.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Bottom Confirm Action */}
              <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {applyMode === 'previous_shift_transition'
                    ? '✓ Encerrantes de fechamento do turno anterior serão gravados como abertura no novo turno.'
                    : '✓ Todos os dados selecionados serão consolidados na folha.'}
                </span>

                <button
                  id="confirm-apply-btn"
                  type="button"
                  onClick={handleConfirmApply}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {applyMode === 'previous_shift_transition'
                      ? 'Aplicar como Abertura do Novo Turno'
                      : 'Aplicar ao Fechamento'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
