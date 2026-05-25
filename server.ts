import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Configuração do Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Aumentar o limite de tamanho do corpo para receber imagens base64
app.use(express.json({ limit: '20mb' }));

// API para processar OCR com Gemini
app.post("/api/ocr", async (req, res) => {
  try {
    const { image } = req.body; // base64 image data (without prefix)
    
    if (!image) {
      return res.status(400).json({ error: "Imagem não fornecida" });
    }

    const prompt = `Analyze this image of a logistical clipboard table.
Extract all rows of data into a JSON array.
Each object in the array should have these fields (if found):
- iscaNo: The bait number (starts with R or just numbers, e.g., R100000876)
- data: The date (DD/MM)
- hora: The time (HH:II)
- doca: The dock number (2 digits)
- cavalo: Vehicle plate 1 (e.g., RYB7G26)
- carreta: Vehicle plate 2 (e.g., MEM4453)
- m3: Cubic meters (e.g., 103)
- destino: Destination city
- nfNo: Invoice number (7 digits)
- responsavel: Responsible person name
- produto: Product code (8 digits)
- uma: UMA code (formatted like 12.973.150.010 or 12973150010)
- valorNf: Invoice value (e.g., R$ 473.531,05)
- preAlertaGr: The person's name in the "USO DO GR" columns (e.g., Vini, RN, ok)

Return ONLY a JSON array. If no data is found, return [].`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest", // Using flash for speed/cost
      contents: {
        parts: [
          { inlineData: { data: image, mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              iscaNo: { type: Type.STRING },
              data: { type: Type.STRING },
              hora: { type: Type.STRING },
              doca: { type: Type.STRING },
              cavalo: { type: Type.STRING },
              carreta: { type: Type.STRING },
              m3: { type: Type.STRING },
              destino: { type: Type.STRING },
              nfNo: { type: Type.STRING },
              responsavel: { type: Type.STRING },
              produto: { type: Type.STRING },
              uma: { type: Type.STRING },
              valorNf: { type: Type.STRING },
              preAlertaGr: { type: Type.STRING },
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    res.json(data);
  } catch (error: any) {
    console.error("Erro no OCR Gemini:", error);
    res.status(500).json({ error: error.message || "Erro ao processar imagem" });
  }
});

async function startServer() {
  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
