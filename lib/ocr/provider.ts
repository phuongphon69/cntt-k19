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
// Uses Gemini 1.5 Flash (free tier, excellent Vietnamese support) with fallback to Gemini 2.0 Flash
export class GeminiOcrProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    const base64Image = imageBuffer.toString("base64");

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

    // Try primary model gemini-1.5-flash, fallback to gemini-2.0-flash if needed
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
    let lastError: any = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(28000),
        });

        if (!response.ok) {
          const errText = await response.text();
          let humanMessage = `Gemini API (${response.status})`;

          if (response.status === 400 || response.status === 403) {
            humanMessage = "API Key Gemini không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại mã API key.";
            throw new Error(humanMessage);
          } else if (response.status === 429) {
            humanMessage = "Gemini API đã chạm hạn mức gọi miễn phí (Rate Limit). Vui lòng thử lại sau 1 phút hoặc dùng chế độ quét trình duyệt.";
            throw new Error(humanMessage);
          }

          // If 404 model not found or 503 service unavailable, try next model
          lastError = new Error(`${humanMessage}: ${errText.slice(0, 150)}`);
          continue;
        }

        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!fullText.trim()) {
          throw new Error("Gemini không tìm thấy chữ nào trong ảnh");
        }

        const lines = fullText
          .split(/\r?\n/)
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        return { fullText, lines };
      } catch (err: any) {
        if (err.name === "TimeoutError") {
          lastError = new Error("Thời gian chờ xử lý ảnh từ Gemini quá lâu (Timeout 28s). Vui lòng thử lại hoặc giảm bớt dung lượng ảnh.");
        } else {
          lastError = err;
        }

        // If it was an invalid key or rate limit error, don't try other models
        if (err.message?.includes("API Key") || err.message?.includes("hạn mức")) {
          throw err;
        }
      }
    }

    console.error("[GeminiOCR] All models failed. Last error:", lastError?.message || lastError);
    throw lastError || new Error("Không thể kết nối đến dịch vụ AI Gemini");
  }
}

// ─── Google Cloud Vision OCR Provider ────────────────────────────────────────
export class GoogleVisionOcrProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
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
      signal: AbortSignal.timeout(25000),
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

// ─── Fallback: No-API text extraction ────────────────────────────────────────
export class NoApiOcrProvider implements OcrProvider {
  async recognize(imageBuffer: Buffer, _mimeType?: string): Promise<OcrResult> {
    throw new Error(
      "NO_OCR_API: Chưa cấu hình API để nhận diện ảnh. Bạn có thể: (1) Nhập Gemini API Key trực tiếp trên giao diện, (2) Chuyển sang chế độ Quét trực tiếp bằng trình duyệt (không cần API), hoặc (3) Dán trực tiếp danh sách tên vào ô văn bản."
    );
  }
}

// ─── Key Verification Helper ────────────────────────────────────────────────
export async function testGeminiApiKey(apiKey?: string): Promise<{ ok: boolean; message: string; model?: string }> {
  const cleanKey = apiKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!cleanKey) {
    return { ok: false, message: "Chưa nhập API Key" };
  }

  const models = ["gemini-1.5-flash", "gemini-2.0-flash"];
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        return { ok: true, message: `Kết nối thành công tới Google Gemini (${model})!`, model };
      }

      if (res.status === 400 || res.status === 403) {
        return { ok: false, message: "API Key không hợp lệ hoặc không có quyền gọi Gemini API. Vui lòng kiểm tra lại." };
      }

      if (res.status === 429) {
        return { ok: false, message: "API Key đã vượt quá hạn mức miễn phí (Rate Limit) của Google." };
      }
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        return { ok: false, message: "Kết nối tới Google AI bị quá hạn (Timeout). Vui lòng thử lại." };
      }
    }
  }

  return { ok: false, message: "Không thể kết nối tới máy chủ Google Gemini. Vui lòng kiểm tra đường truyền mạng hoặc API key." };
}

// ─── Check if server has pre-configured OCR keys ───────────────────────────
export function hasConfiguredOcrApi(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_CLOUD_VISION_API_KEY && process.env.GOOGLE_CLOUD_VISION_API_KEY.trim().length > 0)
  );
}

// ─── Provider factory ─────────────────────────────────────────────────────────
export function getOcrProvider(clientApiKey?: string): OcrProvider {
  // Priority 1: User-supplied API key from UI / localStorage
  if (clientApiKey && clientApiKey.trim().length > 0) {
    return new GeminiOcrProvider(clientApiKey.trim());
  }

  // Priority 2: Gemini Vision configured in Server Environment (.env / Vercel)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    return new GeminiOcrProvider(geminiKey.trim());
  }

  // Priority 3: Google Cloud Vision API Key
  const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (visionKey && visionKey.trim().length > 0) {
    return new GoogleVisionOcrProvider(visionKey.trim());
  }

  // Fallback: No API configured
  return new NoApiOcrProvider();
}
