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

      const prompt = `Você é um assistente especialista em leitura e auditoria de fechamento de caixa de postos de combustíveis no Brasil.
Analise o documento ou imagem fornecida (pode ser: documento PDF de fechamento de caixa impresso/digital, relatório de automação Linx/Companytec/PostoGestor, folha de fechamento física em papel/caderno, visor de bomba de combustível ou cupom térmico).

${
  isPreviousShift
    ? 'ATENÇÃO ESPECIAL: O usuário está importando um FECHAMENTO ANTERIOR (do turno anterior ou dia anterior). Sua prioridade máxima é extrair com precisão os ENCERRANTES DE FECHAMENTO (ou leitura final) de cada um dos Bicos 01 a 16 da folha anterior, pois esses valores serão transferidos para os Encerrantes de Abertura do novo turno.'
    : 'OBJETIVO: Extrair todos os dados possíveis para preencher o fechamento de caixa do posto (Bicos de 1 a 16, preços, recolhimentos e apuração financeira).'
}

PRODUTOS VÁLIDOS (use exatamente esses códigos):
- "ETANOL": Etanol Comum / Álcool / AEAC / Hidratado
- "G_COM": Gasolina Comum / GC / Gas. Comum
- "G_ADIT": Gasolina Aditivada / GA / G. Adit / V-Power / Grid / DT Clean / Octapro
- "D_S10": Diesel S-10 / S10 / Diesel S10 Aditivado
- "D_COM": Diesel S-500 / Comum / D500 / D Comum

REGRAS DE EXTRAÇÃO:
1. "detectedNozzles": Array com os bicos identificados na imagem/documento (1 a 16).
   - "nozzleNumber": Número inteiro do bico entre 1 e 16 (ex: Bico 01 -> 1, Bico 16 -> 16).
   - "productCode": Um dos 5 códigos acima ("ETANOL", "G_COM", "G_ADIT", "D_S10", "D_COM") ou null se não especificado.
   - "openingMeter": Encerrante inicial / Abertura como string numérica limpa (ex: "42100.50"). Converta vírgula para ponto e remova pontos de milhar.
   - "closingMeter": Encerrante final / Fechamento / Leitura atual como string numérica limpa (ex: "42350.20").
   - "calibrationLiters": Aferição em litros se indicada (ex: "0" ou "20"), ou null.
   - "unitPrice": Preço unitário por litro em reais (número float, ex: 6.33), se visível.

2. "prices": Preços por litro de cada combustível se visíveis no documento (ex: { "ETANOL": 4.33, "G_COM": 6.33, "G_ADIT": 6.33, "D_S10": 6.99, "D_COM": 6.43 }).

3. "extraEntries": Array de recolhimentos ou itens extras da linha 17+ (ex: Arla 32, Troca de Óleo, Loja de Conveniência, Sangria). Cada item com { "description": string, "value": string numérica limpa }.

4. "stationInfo": Dados do cabeçalho da folha:
   - "stationName": Nome do posto ou razão social (string ou null)
   - "cashierName": Nome do frentista, operador ou caixa (string ou null)
   - "date": Data no formato "YYYY-MM-DD" se legível (ou null)
   - "shiftType": "Manhã", "Tarde", "Noite" ou "Geral" se legível (ou null)

5. "financialConference": Valores de conferência/apuração financeira se anotados:
   - "cashAmount": Dinheiro em espécie contado (string numérica ou null)
   - "cardsAmount": Cartões de débito/crédito (string numérica ou null)
   - "pixAmount": PIX / Transferências (string numérica ou null)
   - "otherAmount": Outros recebimentos / faturado (string numérica ou null)
   - "notes": Observações, justificativas de quebra ou fundo de troco (string ou null)

6. "observations": Breve resumo explicativo em português do que foi reconhecido com sucesso no documento/foto.

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

      // Try with primary model, retry with fallback models if 503 / high-demand occurs
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
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
              temperature: 0.1,
            },
          });
          if (response && response.text) {
            break; // Succeeded
          }
        } catch (callErr: any) {
          lastError = callErr;
          console.warn(`Tentativa com modelo ${modelName} falhou:`, callErr?.message || callErr);
          if (attempt < modelsToTry.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('O modelo de IA não retornou resposta.');
      }

      const rawResponseText = response.text || '{}';
      // Clean possible markdown code fences if present
      const cleanJsonText = rawResponseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      let parsedData;
      try {
        parsedData = JSON.parse(cleanJsonText);
      } catch (parseErr) {
        // Fallback: extract json between outermost braces
        const match = cleanJsonText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          throw new Error('Não foi possível interpretar a resposta estruturada da IA.');
        }
      }

      // Sanitize detected nozzles
      if (Array.isArray(parsedData.detectedNozzles)) {
        parsedData.detectedNozzles = parsedData.detectedNozzles.filter((n: any) => {
          return n && typeof n.nozzleNumber === 'number' && n.nozzleNumber >= 1 && n.nozzleNumber <= 16;
        });
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
