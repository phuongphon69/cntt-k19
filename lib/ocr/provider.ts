// lib/ocr/provider.ts
// OCR Provider - Supports Gemini Vision, Google Cloud Vision, and smart text fallback

export interface OcrResult {
  fullText: string;
  lines: string[];
}

export interface OcrProvider {
  recognize(imageBuffer: Buffer, mimeType?: string): Promise<OcrResult>;
}

// Built-in default Gemini API Key provided for deployment fallback
const _ENC_KEY = "QVEuQWI4Uk42STZjQmlSMkdSekVhb2RlVlk3MzdnOWZ6SFBpQ3ZZM3RqQ1RWLXNRSENZLVE=";
export const DEFAULT_GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim() ||
  Buffer.from(_ENC_KEY, "base64").toString("utf-8");

// ─── Gemini Vision OCR Provider ──────────────────────────────────────────────
// Uses modern Gemini Flash models (gemini-flash-latest, gemini-3.5-flash-lite, gemini-3.8-flash)
export class GeminiOcrProvider implements OcrProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  async recognize(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<OcrResult> {
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Bạn là chuyên gia nhận diện danh sách người tham gia phòng học Zoom tiếng Việt.
Nhiệm vụ: Trích xuất CHÍNH XÁC HỌ VÀ TÊN của từng học viên / sinh viên trong danh sách người tham gia Zoom từ ảnh.

QUY TẮC BẮT BUỘC:
1. CHỈ trích xuất đúng phần HỌ VÀ TÊN tiếng Việt chuẩn xác (Ví dụ: "Trương Văn Trung", "Nguyễn Văn Chung", "Nguyễn Huy Phương", "Nguyễn Quang Tuấn", "Trịnh Văn Đức", "Trịnh Đức Thịnh", "Hoàng Công Minh", "Trần Hoàng Anh", "Bùi Trung Hiếu", "Phạm Anh Tuấn", "Hoàng Đình Thành", "Hoàng Thị Phương", "Phùng Bá Hoan", "Võ Trọng Tưởng", "Đào Xuân Quế").
2. TUYỆT ĐỐI LOẠI BỎ các thành phần gây nhiễu:
   - Các chữ cái viết tắt đại diện cho avatar ở đầu dòng (như "Po", "Ps", "Mà", "Dạ", "Lại", "BH", "ĐQ", "Ne", "We es", "Lê", "Mã", v.v.)
   - Số thứ tự, dấu chấm hoặc ký hiệu đầu dòng (như "1", "(1", "01.", "[1]", v.v.)
   - Ngày tháng năm sinh (như "31/01/1985", "8/3/1991", "sn11/4/1981", "14/07/1986", v.v.)
   - Tên thiết bị, nhãn người dùng (như "(iPhone)", "(Samsung)", "(Galaxy)", "(Redmi)", "(Oppo)", "(iPad)", "(Host)", "(Co-host)", "(Me)", "(Chủ tọa)", v.v.)
   - Mã lớp, khóa học, chuyên ngành (như "CNTT", "K19", "CĐ", "Cnttk", "Cnt Zá", v.v.)
   - Ký tự lạ, dấu ngoặc, mã thiết bị ở cuối dòng (như "(Z4)", "(Zf)", "[A", "[4", "&", "©", "x", v.v.)
   - Các nút giao diện Zoom (như "Participants", "Search", "Mute All", "Invite", v.v.)
3. Đảm bảo chữ cái đầu mỗi từ viết hoa và giữ nguyên đầy đủ dấu tiếng Việt chuẩn.
4. Mỗi người là 1 dòng riêng biệt. KHÔNG thêm bất kỳ số thứ tự, gạch đầu dòng hay lời giải thích nào.
5. Nếu ảnh không có danh sách người tham gia, chỉ trả về chữ RONG.`;

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

    // Modern Gemini models supported by Google AI Studio (prioritizing high-availability flash-lite)
    const models = [
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
    ];
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

          // If 404 model not found or 503 high demand, try next candidate model
          lastError = new Error(`${humanMessage}: ${errText.slice(0, 150)}`);
          continue;
        }

        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!fullText.trim() || fullText.trim() === "RONG") {
          throw new Error("Không tìm thấy danh sách người tham gia Zoom trong ảnh. Vui lòng kiểm tra ảnh tải lên.");
        }

        const lines = fullText
          .split(/\r?\n/)
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && l !== "RONG");

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
  const cleanKey =
    apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    DEFAULT_GEMINI_API_KEY;

  if (!cleanKey) {
    return { ok: false, message: "Chưa nhập API Key" };
  }

  const models = [
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
  ];

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
    (process.env.GOOGLE_CLOUD_VISION_API_KEY && process.env.GOOGLE_CLOUD_VISION_API_KEY.trim().length > 0) ||
    (DEFAULT_GEMINI_API_KEY && DEFAULT_GEMINI_API_KEY.trim().length > 0)
  );
}

// ─── Provider factory ─────────────────────────────────────────────────────────
export function getOcrProvider(clientApiKey?: string): OcrProvider {
  // Priority 1: User-supplied API key from UI / localStorage
  if (clientApiKey && clientApiKey.trim().length > 0) {
    return new GeminiOcrProvider(clientApiKey.trim());
  }

  // Priority 2: Gemini Vision configured in Server Environment (.env / Vercel) or built-in key
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    DEFAULT_GEMINI_API_KEY;

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
