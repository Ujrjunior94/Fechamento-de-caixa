import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for smartphone photos
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Favicon handler to avoid 404s
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });

  // API Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // OCR / Image and PDF extraction endpoint (supports both /api/scan-photo and /api/scan-image)
  app.post(['/api/scan-photo', '/api/scan-photo/', '/api/scan-image', '/api/scan-image/'], async (req, res) => {
    try {
      const {
        imageBase64,
        fileBase64,
        mimeType: rawMimeType,
        isPreviousShift = false,
        scanMode,
      } = req.body;

      const inputBase64 = fileBase64 || imageBase64;

      if (!inputBase64) {
        return res.status(400).json({
          error: 'Nenhum arquivo ou imagem foi enviado. Forneça uma foto ou documento PDF.',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave de API GEMINI_API_KEY não configurada no ambiente do servidor.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Clean base64 data prefix and detect MIME type
      let determinedMimeType = rawMimeType || 'image/jpeg';
      let cleanedBase64 = inputBase64;

      if (inputBase64.startsWith('data:')) {
        const mimeMatch = inputBase64.match(/^data:([^;]+);base64,/);
        if (mimeMatch && mimeMatch[1]) {
          determinedMimeType = mimeMatch[1].toLowerCase();
        }
        cleanedBase64 = inputBase64.replace(/^data:[^;]+;base64,/, '');
      }

      // Ensure valid MIME type for Gemini
      let finalMimeType = 'image/jpeg';
      if (determinedMimeType.includes('pdf')) {
        finalMimeType = 'application/pdf';
      } else if (determinedMimeType.includes('png')) {
        finalMimeType = 'image/png';
      } else if (determinedMimeType.includes('webp')) {
        finalMimeType = 'image/webp';
      } else if (determinedMimeType.includes('gif')) {
        finalMimeType = 'image/gif';
      } else if (determinedMimeType.startsWith('image/')) {
        finalMimeType = determinedMimeType;
      }

      const prompt = `Você é um assistente especialista de alta precisão em leitura e auditoria de fechamento de caixa de postos de combustíveis no Brasil.
Analise detalhadamente o documento ou imagem fornecida. Pode ser:
1. Folha de fechamento de caixa impressa ou manuscrita em papel/caderno (Bicos 1 a 16, recolhimentos, conferência financeira).
2. Relatório de automação comercial ou LMC (Linx Softbox, Petros, PostoGestor, Companytec, Viasoft, EzTech, etc.).
3. Foto de visor/display eletrônico ou contador mecânico de bomba de combustível (Totalizador em Litros, R$ ou volume).
4. Cupom térmico POS/TEF ou resumo de encerrantes emitido pela impressora do posto.

${
  isPreviousShift
    ? 'ATENÇÃO ESPECIAL (TRANSIÇÃO DE TURNO ANTERIOR): O usuário está enviando o fechamento do TURNO ANTERIOR. Sua prioridade máxima é extrair com precisão absoluta os ENCERRANTES FINAIS / FECHAMENTO de cada um dos Bicos 1 a 16 da folha anterior, pois esses valores serão transferidos para os Encerrantes de Abertura do novo turno.'
    : 'OBJETIVO: Extrair todos os dados possíveis para preencher o fechamento de caixa do posto (Bicos de 1 a 16, preços, recolhimentos linha 17+ e apuração financeira).'
}

PADRONIZAÇÃO DOS PRODUTOS DE COMBUSTÍVEL:
Use ESTRITAMENTE um destes 5 códigos para "productCode":
- "ETANOL": Etanol Hidratado / Álcool / AEAC / Etanol Comum
- "G_COM": Gasolina Comum / GC / Gas. Comum / Gasolina C
- "G_ADIT": Gasolina Aditivada / GA / G. Adit / V-Power / Grid / DT Clean / Octapro / Shell V-Power / Ipiranga Dt Clean / Petrobras Grid
- "D_S10": Diesel S-10 / S10 / Diesel S-10 Aditivado / Evolux S10
- "D_COM": Diesel S-500 / S500 / Comum / D500 / Diesel Comum

REGRAS DE EXTRAÇÃO:
1. "detectedNozzles": Array contendo todos os bicos identificados no documento/foto (números de 1 a 16).
   - "nozzleNumber": Número inteiro do bico entre 1 e 16 (ex: se na foto diz "Bico 04" ou "B04", nozzleNumber = 4). Se for foto de bomba com Lado A / Lado B, deduza o bico correspondente.
   - "productCode": Código do produto ("ETANOL", "G_COM", "G_ADIT", "D_S10", "D_COM") ou null se não identificado.
   - "openingMeter": Encerrante de Abertura / Inicial como string numérica limpa (ex: "42100.50"). Converta vírgula decimal para ponto e remova pontos de milhar.
   - "closingMeter": Encerrante de Fechamento / Final / Leitura Atual como string numérica limpa (ex: "42350.20"). Se a foto for de um display individual com apenas 1 valor de encerrante, preencha no "closingMeter".
   - "calibrationLiters": Aferição de teste de bomba em litros (ex: "0" ou "20" ou "40").
   - "unitPrice": Preço por litro em reais (número float, ex: 6.33), se anotado.

2. "prices": Tabela de preços por litro se visível (ex: { "ETANOL": 4.33, "G_COM": 6.33, "G_ADIT": 6.33, "D_S10": 6.99, "D_COM": 6.43 }).

3. "extraEntries": Array de recolhimentos ou itens extras da Linha 17+ (ex: Arla 32, Troca de Óleo / Lubrificantes, Filtros, Loja de Conveniência, Vales / Adiantamentos, Despesas / Sangrias, Faturado). Cada item com { "description": string, "value": string numérica limpa }.

4. "stationInfo":
   - "stationName": Nome do posto ou bandeira (ex: "Posto Petrobras", "Posto Ipiranga", "Auto Posto...") ou null
   - "cashierName": Nome do frentista, operador de pista ou caixa (ou null)
   - "date": Data no formato "YYYY-MM-DD" (ex: "2026-09-05") ou null
   - "shiftType": "Manhã", "Tarde", "Noite" ou "Geral" (ou null)

5. "financialConference": Valores da apuração financeira se declarados na folha:
   - "cashAmount": Dinheiro em espécie contado na gaveta (string numérica limpa)
   - "cardsAmount": Total de cartões de débito + crédito somados
   - "pixAmount": PIX ou transferências
   - "otherAmount": Cheques, vales ou faturado
   - "notes": Observações, fundo de troco anotado ou justificativa de quebra

6. "observations": Resumo conciso em português do que foi lido e auditado com sucesso.

FORMATO DE RESPOSTA (retorne ESTRITAMENTE o JSON estruturado abaixo, sem markdown):
{
  "detectedNozzles": [
    {
      "nozzleNumber": 1,
      "productCode": "ETANOL",
      "openingMeter": "42100.50",
      "closingMeter": "42350.20",
      "calibrationLiters": "0",
      "unitPrice": 4.33
    }
  ],
  "extraEntries": [],
  "prices": {},
  "stationInfo": {
    "stationName": null,
    "cashierName": null,
    "date": null,
    "shiftType": null
  },
  "financialConference": {
    "cashAmount": null,
    "cardsAmount": null,
    "pixAmount": null,
    "otherAmount": null,
    "notes": null
  },
  "observations": "string"
}`;

      const filePart = {
        inlineData: {
          mimeType: finalMimeType,
          data: cleanedBase64,
        },
      };

      // Try with official recommended models: gemini-2.5-flash (primary multimodal), gemini-2.5-pro, gemini-2.5-flash-lite
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
      let response: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const modelName = modelsToTry[attempt];
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [filePart, { text: prompt }],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.0,
            },
          });
          if (response && response.text) {
            break; // Succeeded
          }
        } catch (callErr: any) {
          lastError = callErr;
          console.warn(`Tentativa com modelo ${modelName} falhou:`, callErr?.message || callErr);
          if (attempt < modelsToTry.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('O modelo de IA não retornou resposta.');
      }

      const rawResponseText = response.text || '{}';
      
      // Resilient JSON extraction
      function extractAndParseJSON(raw: string): any {
        if (!raw || typeof raw !== 'string') throw new Error('Resposta vazia da IA.');
        let text = raw.trim();

        // 1. Direct parse
        try {
          return JSON.parse(text);
        } catch {}

        // 2. Extract from markdown code fences ```json ... ```
        if (text.includes('```')) {
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (fenceMatch && fenceMatch[1]) {
            try {
              return JSON.parse(fenceMatch[1].trim());
            } catch {}
          }
        }

        // 3. Extract outermost { ... }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          const jsonSubstring = text.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(jsonSubstring);
          } catch {
            // Remove trailing commas before closing braces/brackets
            const fixedJson = jsonSubstring
              .replace(/,\s*([\]}])/g, '$1')
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
            try {
              return JSON.parse(fixedJson);
            } catch {}
          }
        }

        throw new Error('Não foi possível interpretar a resposta estruturada da IA.');
      }

      const parsedData = extractAndParseJSON(rawResponseText);

      // Helper function to clean meter numeric values
      function cleanMeterValue(val: any): string {
        if (val === undefined || val === null) return '';
        let str = String(val).trim().replace(/\s/g, '').replace(/R\$/gi, '');
        if (!str) return '';
        if (str.includes('.') && str.includes(',')) {
          const lastDot = str.lastIndexOf('.');
          const lastComma = str.lastIndexOf(',');
          if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
          } else {
            str = str.replace(/,/g, '');
          }
        } else if (str.includes(',')) {
          str = str.replace(',', '.');
        }
        return str;
      }

      // Helper function to normalize Brazilian fuel product names
      function normalizeFuelCode(raw: any): string | null {
        if (!raw || typeof raw !== 'string') return null;
        const upper = raw.toUpperCase().trim();
        if (upper === 'ETANOL' || upper.includes('ALCOOL') || upper.includes('ÁLCOOL') || upper.includes('ETAN') || upper.includes('AEAC') || upper.includes('HIDRATADO')) {
          return 'ETANOL';
        }
        if (upper === 'G_ADIT' || upper.includes('ADIT') || upper.includes('V-POWER') || upper.includes('GRID') || upper.includes('OCTAPRO') || upper.includes('DT CLEAN') || upper.includes('GA')) {
          return 'G_ADIT';
        }
        if (upper === 'G_COM' || upper.includes('GAS') || upper.includes('COMUM') || upper.includes('GC')) {
          return 'G_COM';
        }
        if (upper === 'D_S10' || upper.includes('S10') || upper.includes('S-10') || upper.includes('S 10')) {
          return 'D_S10';
        }
        if (upper === 'D_COM' || upper.includes('S500') || upper.includes('S-500') || upper.includes('DIESEL') || upper.includes('D500')) {
          return 'D_COM';
        }
        return null;
      }

      // Sanitize detected nozzles with deduplication & sorting (1 to 16)
      if (Array.isArray(parsedData.detectedNozzles)) {
        const nozzleMap = new Map<number, any>();
        for (const rawNozzle of parsedData.detectedNozzles) {
          if (!rawNozzle) continue;

          // Extract nozzle number from number or string (e.g. "Bico 01" -> 1)
          let nozzleNum: number | null = null;
          if (typeof rawNozzle.nozzleNumber === 'number' && rawNozzle.nozzleNumber >= 1 && rawNozzle.nozzleNumber <= 16) {
            nozzleNum = Math.floor(rawNozzle.nozzleNumber);
          } else if (typeof rawNozzle.nozzleNumber === 'string') {
            const match = rawNozzle.nozzleNumber.match(/\b([1-9]|1[0-6])\b/);
            if (match) nozzleNum = parseInt(match[1], 10);
          } else if (typeof rawNozzle.id === 'number' && rawNozzle.id >= 1 && rawNozzle.id <= 16) {
            nozzleNum = Math.floor(rawNozzle.id);
          }

          if (nozzleNum && nozzleNum >= 1 && nozzleNum <= 16) {
            const opVal = cleanMeterValue(rawNozzle.openingMeter);
            const clVal = cleanMeterValue(rawNozzle.closingMeter);
            const calVal = cleanMeterValue(rawNozzle.calibrationLiters) || '0';
            const code = normalizeFuelCode(rawNozzle.productCode);
            const price = typeof rawNozzle.unitPrice === 'number' ? rawNozzle.unitPrice : parseFloat(cleanMeterValue(rawNozzle.unitPrice)) || undefined;

            const existing = nozzleMap.get(nozzleNum);
            if (!existing) {
              nozzleMap.set(nozzleNum, {
                nozzleNumber: nozzleNum,
                productCode: code,
                openingMeter: opVal,
                closingMeter: clVal,
                calibrationLiters: calVal,
                unitPrice: price,
              });
            } else {
              // Merge if another row provides missing closing/opening
              nozzleMap.set(nozzleNum, {
                nozzleNumber: nozzleNum,
                productCode: code || existing.productCode,
                openingMeter: opVal || existing.openingMeter,
                closingMeter: clVal || existing.closingMeter,
                calibrationLiters: calVal !== '0' ? calVal : existing.calibrationLiters,
                unitPrice: price || existing.unitPrice,
              });
            }
          }
        }

        parsedData.detectedNozzles = Array.from(nozzleMap.values()).sort(
          (a, b) => a.nozzleNumber - b.nozzleNumber
        );
      } else {
        parsedData.detectedNozzles = [];
      }

      // Sanitize prices table
      if (parsedData.prices && typeof parsedData.prices === 'object') {
        const sanitizedPrices: Record<string, number> = {};
        for (const [key, val] of Object.entries(parsedData.prices)) {
          const normKey = normalizeFuelCode(key);
          const numVal = typeof val === 'number' ? val : parseFloat(cleanMeterValue(val));
          if (normKey && !isNaN(numVal) && numVal > 0) {
            sanitizedPrices[normKey] = numVal;
          }
        }
        parsedData.prices = sanitizedPrices;
      } else {
        parsedData.prices = {};
      }

      // Sanitize extraEntries
      if (Array.isArray(parsedData.extraEntries)) {
        parsedData.extraEntries = parsedData.extraEntries
          .filter((e: any) => e && (e.description || e.value))
          .map((e: any) => ({
            description: String(e.description || 'Recolhimento').trim(),
            value: cleanMeterValue(e.value),
          }));
      } else {
        parsedData.extraEntries = [];
      }

      // Sanitize financial conference
      if (parsedData.financialConference && typeof parsedData.financialConference === 'object') {
        parsedData.financialConference = {
          cashAmount: cleanMeterValue(parsedData.financialConference.cashAmount),
          cardsAmount: cleanMeterValue(parsedData.financialConference.cardsAmount),
          pixAmount: cleanMeterValue(parsedData.financialConference.pixAmount),
          otherAmount: cleanMeterValue(parsedData.financialConference.otherAmount),
          notes: parsedData.financialConference.notes ? String(parsedData.financialConference.notes).trim() : '',
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Erro ao processar imagem com Gemini:', err);
      const isUnavailable =
        err?.status === 'UNAVAILABLE' ||
        err?.code === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('quota');

      const userErrorMessage = isUnavailable
        ? 'Os servidores de IA estão com alta demanda temporária. Por favor, aguarde alguns instantes e clique em "Tentar Novamente" ou refaça a captura.'
        : err?.message || 'Falha ao processar a foto. Tente novamente com uma imagem mais nítida.';

      return res.status(isUnavailable ? 503 : 500).json({
        error: userErrorMessage,
      });
    }
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Development SPA fallback for any route
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Página não encontrada');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
