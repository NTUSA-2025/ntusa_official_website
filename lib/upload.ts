import imageCompression from "browser-image-compression";

export type ImageUploadErrorCode =
  | "emptyFile"
  | "invalidFormat"
  | "processingFailed"
  | "tooLarge"
  | "sessionExpired"
  | "permissionDenied"
  | "networkFailed"
  | "serverFailed"
  | "uploadFailed";

export type ImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; errorCode: ImageUploadErrorCode };

function isHeicFile(file: File): boolean {
  return /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.(?:heic|heif)$/i.test(file.name);
}

function errorFromResponse(status: number, errorCode: unknown): ImageUploadErrorCode {
  if (status === 413 || errorCode === "FILE_TOO_LARGE") return "tooLarge";
  if (status === 401 || errorCode === "UNAUTHORIZED") return "sessionExpired";
  if (status === 403 || errorCode === "FORBIDDEN") return "permissionDenied";
  if (status === 415 || errorCode === "INVALID_FILE_TYPE" || errorCode === "INVALID_IMAGE" || errorCode === "NO_FILE") {
    return "invalidFormat";
  }
  if (status >= 500) return "serverFailed";
  return "uploadFailed";
}

export async function uploadImage(file: File): Promise<ImageUploadResult> {
  if (file.size === 0) return { ok: false, errorCode: "emptyFile" };
  const heic = isHeicFile(file);
  if (!heic && !file.type.startsWith("image/")) return { ok: false, errorCode: "invalidFormat" };

  let compressedFile: File;
  try {
    let imageFile = file;
    if (heic) {
      const { heicTo } = await import("heic-to/csp");
      const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
      if (jpeg.size === 0 || jpeg.type !== "image/jpeg") throw new Error("HEIC conversion produced an invalid JPEG");
      const jpegName = /\.(?:heic|heif)$/i.test(file.name)
        ? file.name.replace(/\.(?:heic|heif)$/i, ".jpg")
        : `${file.name}.jpg`;
      imageFile = new File([jpeg], jpegName, { type: "image/jpeg", lastModified: file.lastModified });
    }

    compressedFile = await imageCompression(imageFile, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });
  } catch (error) {
    console.error("圖片壓縮失敗:", error);
    return { ok: false, errorCode: "processingFailed" };
  }

  const formData = new FormData();
  formData.append("image", compressedFile);

  let response: Response;
  try {
    response = await fetch("/api/upload", { method: "POST", body: formData });
  } catch (error) {
    console.error("圖片上傳連線失敗:", error);
    return { ok: false, errorCode: "networkFailed" };
  }

  // Vercel's request-size response may be HTML rather than our API's JSON.
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiErrorCode = body && typeof body === "object" && "errorCode" in body ? body.errorCode : undefined;
    console.error("圖片上傳失敗:", { status: response.status, errorCode: apiErrorCode });
    return { ok: false, errorCode: errorFromResponse(response.status, apiErrorCode) };
  }

  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    console.error("圖片上傳回應缺少連結:", { status: response.status });
    return { ok: false, errorCode: "serverFailed" };
  }

  return { ok: true, url: body.url };
}
