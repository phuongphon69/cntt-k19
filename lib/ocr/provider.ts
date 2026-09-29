// lib/ocr/provider.ts
// OCR Provider - Supports Gemini Vision, Google Cloud Vision, and smart text fallback

export interface OcrResult {
  fullText: string;
  lines: string[];
}

export interface OcrProvider {
  recognize(imageBuffer: Buffer, mimeType?: string): Promise<OcrResult>;
}

// ─── Gemini Vision OCR Provider ──────────────────────────────────────────────
// Uses Gemini 1.5 Flash (free tier, excellent Vietnamese support)
export class GeminiOcrProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    const base64Image = imageBuffer.toString("base64");

    // Use Gemini 1.5 Flash - fast and free
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const prompt = `Đây là ảnh chụp màn hình danh sách người tham gia Zoom.
Hãy trích xuất TẤT CẢ các tên người dùng hiển thị trong danh sách.
Trả về ĐÚNG mỗi dòng là một tên, KHÔNG thêm số thứ tự hay giải thích.
Giữ nguyên tên tiếng Việt có dấu nếu có.
Ví dụ kết quả:
Nguyễn Văn An 01.01.2005 K19 CNTT
Phạm Thị Bình
Trần Hoàng Nam K19`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!fullText.trim()) {
        throw new Error("Gemini returned empty response");
      }

      const lines = fullText
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      return { fullText, lines };
    } catch (err: any) {
      console.error("[GeminiOCR] Error:", err?.message || err);
      throw err;
    }
  }
}

// ─── Google Cloud Vision OCR Provider ────────────────────────────────────────
export class GoogleVisionOcrProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
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
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses?.[0]?.textAnnotations || [];
    const fullText = textAnnotations[0]?.description || "";

    if (!fullText.trim()) {
      throw new Error("Google Vision returned empty text");
    }

    const lines = fullText.split(/\r?\n/).filter(Boolean);
    return { fullText, lines };
  }
}

// ─── Fallback: No-API text extraction (for when user pastes raw text) ─────────
// This is used when no image OCR API key is configured
export class NoApiOcrProvider implements OcrProvider {
  async recognize(imageBuffer: Buffer, _mimeType?: string): Promise<OcrResult> {
    // Cannot process images without an API key
    // Return error message that tells user to configure API or use text paste
    throw new Error(
      "NO_OCR_API: Chưa cấu hình API để nhận diện ảnh. Vui lòng dán danh sách tên trực tiếp vào ô văn bản bên dưới, hoặc cấu hình GEMINI_API_KEY trong biến môi trường."
    );
  }
}

// ─── Provider factory ─────────────────────────────────────────────────────────
export function getOcrProvider(): OcrProvider {
  // Priority 1: Gemini Vision (best for Vietnamese, free tier available)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    return new GeminiOcrProvider(geminiKey);
  }

  // Priority 2: Google Cloud Vision
  const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (visionKey) {
    return new GoogleVisionOcrProvider(visionKey);
  }

  // No API available - return no-op that shows helpful error
  return new NoApiOcrProvider();
}
