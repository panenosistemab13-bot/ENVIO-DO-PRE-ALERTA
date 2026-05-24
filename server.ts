import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Tesseract from "tesseract.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with a limit for images
  app.use(express.json({ limit: "15mb" }));

  // API routes
  app.post("/api/scan-iscas", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image data is required." });
      }

      // Convert base64 to buffer
      // The frontend sends base64 with data:image/... prefix sometimes, 
      // but let's assume it's just the base64 string or handle both.
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const imageBuffer = Buffer.from(base64Data, "base64");

      console.log("Starting OCR with Tesseract...");
      
      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'por', {
        logger: m => console.log(m.status, (m.progress * 100).toFixed(2) + "%")
      });

      console.log("OCR finished. Raw text length:", text.length);

      // Extract numbers (bait numbers are usually 4 to 12 digits)
      const matches = text.match(/\b\d{4,12}\b/g) || [];
      
      // Clean and unique
      const extractedNumbers = [...new Set(matches)];

      console.log("Extracted numbers:", extractedNumbers);

      res.json({ numbers: extractedNumbers });
    } catch (error: any) {
      console.error("Error performing OCR:", error);
      res.status(500).json({ error: "Erro ao processar imagem (OCR). Certifique-se de que a imagem está legível." });
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
