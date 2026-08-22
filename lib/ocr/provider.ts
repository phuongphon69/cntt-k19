// lib/ocr/provider.ts

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
  private clientEmail?: string;
  private privateKey?: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY;
    this.clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    // 1. If direct Vision API Key is present
    if (this.apiKey) {
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

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Cloud Vision API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const textAnnotations = data.responses?.[0]?.textAnnotations || [];
      const fullText = textAnnotations[0]?.description || "";
      const lines = fullText.split(/\r?\n/).filter(Boolean);

      return { fullText, lines };
    }

    // Fallback: If no dedicated Vision key, check if mock/fallback should handle
    return fallbackOcrProvider.recognize(imageBuffer, mimeType);
  }
}

/**
 * Fallback OCR Provider:
 * Useful for development, testing, or when OCR API is in setup mode
 */
export class FallbackOcrProvider implements OcrProvider {
  async recognize(imageBuffer: Buffer, mimeType?: string): Promise<OcrResult> {
    // If buffer contains UTF-8 text string (e.g. for testing)
    const rawText = imageBuffer.toString("utf-8");
    if (rawText.length > 5 && !rawText.includes("\0") && (rawText.includes("\n") || rawText.includes("CNTT") || rawText.includes("K19"))) {
      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return { fullText: rawText, lines };
    }

    return {
      fullText: "",
      lines: [],
    };
  }
}

export const fallbackOcrProvider = new FallbackOcrProvider();
export const googleVisionOcrProvider = new GoogleVisionOcrProvider();

export function getOcrProvider(): OcrProvider {
  if (process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY) {
    return googleVisionOcrProvider;
  }
  return fallbackOcrProvider;
}
