/**
 * تحويل الصور إلى WebP داخل المتصفح قبل رفعها.
 *
 * نستخدم Canvas بدل مكتبة خارجية: نفس نتيجة sharp المستخدمة في
 * scripts/import-questions.ts (WebP بحد أقصى 1600px للضلع الأطول)
 * دون إضافة أي اعتمادية للواجهة.
 */

export const WEBP_MAX_EDGE = 1600;
export const WEBP_QUALITY = 0.82;

export interface ConvertedImage {
  file: File;
  /** رابط معاينة محلي — نادِ revokeObjectURL عند الانتهاء */
  previewUrl: string;
  width: number;
  height: number;
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  // مسار احتياطي للمتصفحات القديمة
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة."));
    };
    img.src = url;
  });
}

export async function convertImageToWebp(
  file: File,
  maxEdge: number = WEBP_MAX_EDGE,
  quality: number = WEBP_QUALITY
): Promise<ConvertedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }

  const bitmap = await loadBitmap(file);
  const sourceWidth = "width" in bitmap ? bitmap.width : 0;
  const sourceHeight = "height" in bitmap ? bitmap.height : 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("تعذّر تحديد أبعاد الصورة.");
  }

  // تصغير بحيث لا يتجاوز الضلع الأطول الحد، بدون تكبير الصور الصغيرة
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز الصورة في المتصفح.");

  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );

  if (!blob) throw new Error("تعذّر تحويل الصورة إلى صيغة WebP.");

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const converted = new File([blob], `${baseName}.webp`, { type: "image/webp" });

  return {
    file: converted,
    previewUrl: URL.createObjectURL(converted),
    width,
    height,
  };
}
