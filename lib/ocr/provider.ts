// lib/ocr/provider.ts
import Tesseract from "tesseract.js";

export interface OcrResult {
  fullText: string;
  lines: string[];
}

export interface OcrProvider {
  recognize(imageBuffer: Buffer, mimeType?: string): Promise<OcrResult>;
}

/**
 * Google Cloud Vision OCR Provider
 */
export class GoogleVisionOcrProvider implements OcrProvider {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY;
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    // 1. If direct Vision API Key is present
    if (this.apiKey) {
      try {
        const base64Image = imageBuffer.toString("base64");
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
        const requestBody = {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const textAnnotations = data.responses?.[0]?.textAnnotations || [];
          const fullText = textAnnotations[0]?.description || "";
          const lines = fullText.split(/\r?\n/).filter(Boolean);

          if (fullText.trim()) {
            return { fullText, lines };
          }
        }
      } catch (visionErr) {
        console.warn("Google Cloud Vision API failed, falling back to Tesseract:", visionErr);
      }
    }

    // Fallback: Use Tesseract OCR
    return tesseractOcrProvider.recognize(imageBuffer, mimeType);
  }
}

/**
 * High-performance Built-in Tesseract OCR Provider
 * Operates offline / without requiring external API keys
 */
export class TesseractOcrProvider implements OcrProvider {
  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    try {
      const result = await Tesseract.recognize(imageBuffer, "vie+eng", {
        errorHandler: (e) => console.warn("Tesseract error:", e),
      });

      const fullText = result.data?.text || "";
      const lines = fullText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return { fullText, lines };
    } catch (err: any) {
      console.warn("Tesseract vie+eng OCR error, trying eng fallback:", err?.message || err);
      try {
        const fallbackRes = await Tesseract.recognize(imageBuffer, "eng");
        const fullText = fallbackRes.data?.text || "";
        const lines = fullText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        return { fullText, lines };
      } catch (fallbackErr) {
        console.error("All OCR fallbacks failed:", fallbackErr);
        return { fullText: "", lines: [] };
      }
    }
  }
}

export const tesseractOcrProvider = new TesseractOcrProvider();
export const googleVisionOcrProvider = new GoogleVisionOcrProvider();

export function getOcrProvider(): OcrProvider {
  if (process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY) {
    return googleVisionOcrProvider;
  }
  return tesseractOcrProvider;
}
