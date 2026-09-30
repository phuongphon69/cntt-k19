// lib/ocr/client-tesseract.ts

export interface TesseractProgress {
  progress: number; // 0 to 100
  statusText: string;
}

/**
 * Recognizes text from image files directly inside the client's browser.
 * Uses WebAssembly / Web Worker via Tesseract.js.
 * Requires 0 API keys and works 100% offline or on slow connections.
 */
export async function recognizeImagesWithClientTesseract(
  files: File[],
  onProgress?: (info: TesseractProgress) => void
): Promise<string[]> {
  if (files.length === 0) return [];

  onProgress?.({ progress: 5, statusText: "Đang nạp mô-đun Tesseract OCR..." });

  // Dynamic import on client only
  const { createWorker } = await import("tesseract.js");

  // Determine local public path if available
  const langPath = typeof window !== "undefined" ? `${window.location.origin}/tessdata` : undefined;

  let worker: any = null;
  try {
    try {
      worker = await createWorker(["vie", "eng"], 1, {
        langPath,
        gzip: true,
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            const pct = Math.min(99, Math.round(m.progress * 100));
            onProgress?.({ progress: pct, statusText: `Đang quét nhận diện chữ: ${pct}%` });
          } else if (m.status === "loading language traineddata") {
            onProgress?.({ progress: 20, statusText: "Đang nạp bộ dữ liệu tiếng Việt (vie.traineddata)..." });
          } else if (m.status === "loading tesseract core") {
            onProgress?.({ progress: 10, statusText: "Đang tải thư viện xử lý WebAssembly..." });
          }
        },
      });
    } catch (localErr) {
      console.warn("Local tessdata loading fallback to default CDN:", localErr);
      // Fallback to default Tesseract CDN if local load fails
      worker = await createWorker(["vie", "eng"], 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            const pct = Math.min(99, Math.round(m.progress * 100));
            onProgress?.({ progress: pct, statusText: `Đang quét nhận diện chữ: ${pct}%` });
          }
        },
      });
    }

    const results: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({
        progress: Math.round(((i + 0.1) / files.length) * 100),
        statusText: `Đang nhận diện ảnh ${i + 1}/${files.length} (${file.name})...`,
      });

      const ret = await worker.recognize(file);
      const text = ret?.data?.text || "";
      if (text.trim()) {
        results.push(text.trim());
      }
    }

    onProgress?.({ progress: 100, statusText: "Hoàn tất quét ảnh!" });
    return results;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn("Error terminating tesseract worker:", termErr);
      }
    }
  }
}
