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
} from 'lucide-react';
import { FuelCode, NozzleData, ExtraEntry, ShiftInfo } from '../types';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { formatCurrency, parseNumber } from '../utils/formatters';

interface PhotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    mergeMode: 'merge' | 'replace';
  }) => void;
}

// Helper to downscale and optimize large camera photos for fast, reliable OCR
const compressAndPrepareImage = (fileOrDataUrl: File | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
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
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      resolve(optimizedDataUrl);
    };
    img.onerror = () => reject(new Error('Falha ao processar arquivo de imagem.'));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
};

export const PhotoImportModal: React.FC<PhotoImportModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        setErrorMsg('Não foi possível abrir a câmera diretamente. Por favor, selecione um arquivo de imagem.');
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
      
      setIsOptimizing(true);
      try {
        const optimized = await compressAndPrepareImage(rawDataUrl);
        setImageSrc(optimized);
        setParsedResult(null);
        setErrorMsg(null);
      } catch {
        setImageSrc(rawDataUrl);
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizing(true);
    try {
      const optimized = await compressAndPrepareImage(file);
      setImageSrc(optimized);
      setParsedResult(null);
    } catch (err: any) {
      setErrorMsg('Não foi possível carregar a foto selecionada.');
    } finally {
      setIsOptimizing(false);
      // reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  // Rotate image 90 degrees clockwise
  const handleRotateImage = () => {
    if (!imageSrc) return;
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
      setImageSrc(rotated);
      setParsedResult(null);
    };
    img.src = imageSrc;
  };

  // Generate a realistic demonstration sheet image on a canvas for quick testing
  const handleLoadSampleSheet = () => {
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
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('POSTO ESTRELA DO NORTE - FECHAMENTO DE TURNO', 40, 50);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('DATA: 04/09/2026   |   TURNO: MANHÃ   |   FRENTISTA: MARCOS SILVA', 40, 85);
    ctx.fillText('TABELA PREÇOS: ETANOL R$ 4,33 | G COM R$ 6,33 | G ADIT R$ 6,33 | D S-10 R$ 6,99 | D COM R$ 6,43', 40, 115);

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
    setImageSrc(dataUrl);
    setParsedResult(null);
    setErrorMsg(null);
    stopCameraStream();
  };

  const handleProcessImage = async () => {
    if (!imageSrc) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusText('Processando imagem com IA Gemini...');

    try {
      const response = await fetch('/api/scan-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageSrc,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao processar foto`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const nozzlesCount = result.data.detectedNozzles?.length || 0;
        const extrasCount = result.data.extraEntries?.length || 0;

        if (nozzlesCount === 0 && extrasCount === 0 && !result.data.stationInfo?.cashierName) {
          setErrorMsg(
            'A IA analisou a imagem, mas não encontrou bicos (1 a 16) ou encerrantes com clareza. Tente girar a imagem se estiver de lado, ou tire uma foto mais próxima e iluminada.'
          );
        } else {
          setParsedResult(result.data);
        }
      } else {
        throw new Error(result.error || 'Nenhum dado legível retornado.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar a foto.');
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

    onApplyData({
      nozzles: parsedResult.detectedNozzles || [],
      extraEntries: parsedResult.extraEntries || [],
      prices: parsedResult.prices || {},
      stationInfo: parsedResult.stationInfo || {},
      financialConference: parsedResult.financialConference || undefined,
      mergeMode,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                Importar Fechamento por Foto
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white">
                  IA Gemini
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                Tire foto do visor da bomba, folha de encerrantes ou cupom de automação
              </p>
            </div>
          </div>

          <button
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
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

          {/* Hidden inputs for file and mobile camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Select / Capture Action Bar */}
          {!isCameraActive && !imageSrc && (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-amber-400 bg-slate-50/50 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Escolha como deseja importar a foto
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Você pode tirar uma foto na hora com a câmera do celular ou anexar uma imagem da galeria/computador.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" /> Tirar Foto com Câmera
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" /> Escolher Arquivo / Galeria
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleSheet}
                  className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Testar com Folha Exemplo
                </button>
              </div>
            </div>
          )}

          {/* Image Selected Preview */}
          {imageSrc && !isCameraActive && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  Foto Selecionada
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    title="Girar foto 90°"
                    className="text-xs text-slate-600 hover:text-amber-700 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" /> Girar 90°
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageSrc(null);
                      setParsedResult(null);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Trocar Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Image display */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 max-h-64 flex items-center justify-center">
                  <img
                    src={imageSrc}
                    alt="Foto do fechamento"
                    className="max-h-64 w-auto object-contain"
                  />
                </div>

                {/* Analysis action / Status */}
                <div className="space-y-3">
                  {!parsedResult && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          Nossa IA reconhece números dos bicos (1 a 16), encerrantes de abertura, fechamento e recolhimentos.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessImage}
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
                            <span>{statusText || 'Analisando Imagem...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-200" />
                            <span>Ler Foto com Inteligência Artificial</span>
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
                        onClick={handleProcessImage}
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
                  {parsedResult.detectedNozzles?.length || 0} bicos lidos
                </span>
              </div>

              {/* Observation summary */}
              {parsedResult.observations && (
                <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <strong>Resumo da leitura:</strong> {parsedResult.observations}
                </div>
              )}

              {/* Detected Nozzles Grid */}
              {parsedResult.detectedNozzles && parsedResult.detectedNozzles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Bicos Identificados (Você pode ajustar antes de aplicar):
                    </h4>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
                    {parsedResult.detectedNozzles.map((n: any, idx: number) => {
                      const prod = FUEL_PRODUCTS[n.productCode as FuelCode]?.shortLabel || n.productCode;
                      const openVal = parseNumber(n.openingMeter);
                      const closeVal = parseNumber(n.closingMeter);
                      const hasInvertedMeters =
                        n.openingMeter && n.closingMeter && closeVal < openVal;

                      return (
                        <div
                          key={`detected-${idx}`}
                          className={`p-2.5 rounded-xl border transition-all ${
                            hasInvertedMeters
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs ${
                                  hasInvertedMeters
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-slate-900 text-white'
                                }`}
                              >
                                Bico {n.nozzleNumber < 10 ? `0${n.nozzleNumber}` : n.nozzleNumber}
                              </span>
                              <span className="font-semibold text-slate-800">{prod}</span>
                            </div>
                            {hasInvertedMeters && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                                ⚠️ Fechamento &lt; Abertura
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                            <div>
                              <span className="block text-[10px] text-slate-400">Abertura:</span>
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
                              <span className="block text-[10px] text-slate-400">Fechamento:</span>
                              <input
                                type="text"
                                value={n.closingMeter || ''}
                                onChange={(e) =>
                                  handleUpdateDetectedNozzle(idx, 'closingMeter', e.target.value)
                                }
                                className={`w-full px-1.5 py-0.5 rounded text-xs font-mono ${
                                  hasInvertedMeters
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
                                  handleUpdateDetectedNozzle(idx, 'calibrationLiters', e.target.value)
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
              {parsedResult.extraEntries && parsedResult.extraEntries.length > 0 && (
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

              {/* Financial Conference if detected in photo */}
              {parsedResult.financialConference &&
                (parsedResult.financialConference.cashAmount ||
                  parsedResult.financialConference.cardsAmount ||
                  parsedResult.financialConference.notes) && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Conferência / Valores Declarados na Folha:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.financialConference.cashAmount && (
                        <span className="text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800">
                          Dinheiro: <strong>R$ {parsedResult.financialConference.cashAmount}</strong>
                        </span>
                      )}
                      {parsedResult.financialConference.cardsAmount && (
                        <span className="text-xs bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-blue-800">
                          Cartões: <strong>R$ {parsedResult.financialConference.cardsAmount}</strong>
                        </span>
                      )}
                      {parsedResult.financialConference.notes && (
                        <span className="text-xs bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-700">
                          Obs: {parsedResult.financialConference.notes}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* Merge mode selector */}
              <div className="pt-2 border-t border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-medium">Modo de aplicação:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mergeMode"
                      value="merge"
                      checked={mergeMode === 'merge'}
                      onChange={() => setMergeMode('merge')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Mesclar (atualizar apenas os bicos lidos)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="mergeMode"
                      value="replace"
                      checked={mergeMode === 'replace'}
                      onChange={() => setMergeMode('replace')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Substituir tudo</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmApply}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar Leituras ao Fechamento</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

