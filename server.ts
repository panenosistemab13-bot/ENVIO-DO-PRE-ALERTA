import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with a limit for images
  app.use(express.json({ limit: "10mb" }));

  // API routes
  app.post("/api/scan-iscas", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      if (!image) {
        return res.status(400).json({ error: "Image data is required." });
      }

      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using a more standard stable alias

      const prompt = "Extraia todos os números de isca desta imagem. Retorne apenas um array JSON de strings contendo os números encontrados. Exemplo: [\"12345\", \"67890\"]. Se não encontrar nada, retorne um array vazio [].";

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
      ]);

      const responseText = result.response.text();
      // Clean up response text in case Gemini adds markdown blocks
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let extractedNumbers: string[] = [];
      try {
        extractedNumbers = JSON.parse(cleanedJson);
      } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", cleanedJson);
        // Fallback or handle error
      }

      res.json({ numbers: extractedNumbers });
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
