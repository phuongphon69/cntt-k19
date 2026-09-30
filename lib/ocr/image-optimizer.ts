// lib/ocr/image-optimizer.ts

/**
 * Optimizes an image file for OCR by resizing (max 1600px) and compressing to JPEG.
 * Reduces 4-10MB mobile/desktop screenshots down to ~250-400KB while preserving text sharpness.
 * Avoids Vercel 4.5MB serverless body payload limit and drastically accelerates OCR.
 */
export async function optimizeImageForOcr(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  // If not an image or already smaller than 300KB, return as-is
  if (!file.type.startsWith("image/") || file.size < 300 * 1024) {
    return file;
  }

  // Only run in browser environment
  if (typeof window === "undefined" || !window.createImageBitmap) {
    return file;
  }

  try {
    const imgBitmap = await createImageBitmap(file);
    let { width, height } = imgBitmap;

    // If dimensions are within bounds and size is reasonable (<1MB), return original
    if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
      return file;
    }

    // Scale proportionally
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return file;

    // Use high quality image interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Client image optimization skipped:", err);
    return file;
  }
}
