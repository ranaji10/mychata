// Photo preparation and upload error messages (B-007).
// Photos are shrunk in the browser before upload: phones take 4–12 MB pictures, and people
// at a chata are often on a weak mobile signal. Re-encoding also drops EXIF, so the GPS
// position stored in phone photos never reaches our storage.

export const MAX_PHOTO_SIDE = 2000;
export const TARGET_PHOTO_BYTES = 1_000_000;

export type PhotoErrorKind = "too_large" | "wrong_type" | "permission" | "network" | "unknown";

/** An error found in the browser before anything was sent. */
export class PhotoError extends Error {
  readonly kind: PhotoErrorKind;
  constructor(kind: PhotoErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "PhotoError";
  }
}

export function isHeic(file: { name: string; type: string }): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Size that fits inside max × max without changing the aspect ratio or enlarging. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_PHOTO_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Sorts an upload failure into something a person can act on. Handles Supabase Storage
 * errors (status/statusCode), PostgREST errors (code), fetch failures and our PhotoError.
 */
export function classifyUploadError(error: unknown, online = true): PhotoErrorKind {
  if (error instanceof PhotoError) return error.kind;
  if (!online) return "network";
  const e = (error ?? {}) as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    originalError?: { message?: unknown } | null;
  };
  const status = String(e.statusCode ?? e.status ?? "");
  const code = String(e.code ?? "");
  const msg = `${String(e.message ?? "")} ${String(e.originalError?.message ?? "")}`.toLowerCase();
  if (status === "413" || /exceeded the maximum|too large|payload too large/.test(msg))
    return "too_large";
  if (status === "415" || /mime type|invalid_mime|not supported|unsupported/.test(msg))
    return "wrong_type";
  if (
    status === "401" ||
    status === "403" ||
    code === "42501" ||
    /row-level security|permission denied|unauthorized/.test(msg)
  )
    return "permission";
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed/.test(msg))
    return "network";
  return "unknown";
}

type T = (cs: string, en: string) => string;

export function uploadErrorMessage(kind: PhotoErrorKind, t: T, detail?: string): string {
  switch (kind) {
    case "too_large":
      return t(
        "Fotka je příliš velká. Zkuste jinou nebo menší fotku.",
        "The photo is too large. Try another or a smaller photo.",
      );
    case "wrong_type":
      return t(
        "Tento typ souboru neumíme nahrát. Použijte JPG nebo PNG. Fotky z iPhonu (HEIC): Nastavení → Fotoaparát → Formáty → Nejkompatibilnější.",
        "This file type can't be uploaded. Use JPG or PNG. For iPhone photos (HEIC): Settings → Camera → Formats → Most Compatible.",
      );
    case "permission":
      return t(
        "Nemáte oprávnění přidávat fotky k této chatě. Zkuste se odhlásit a přihlásit, nebo se obraťte na správce.",
        "You don't have permission to add photos to this chata. Try signing out and in again, or ask an admin.",
      );
    case "network":
      return t(
        "Nahrání se nepovedlo kvůli připojení. Zkontrolujte internet a zkuste to znovu.",
        "The upload failed because of the connection. Check your internet and try again.",
      );
    default:
      return detail
        ? t(`Nahrání se nepodařilo: ${detail}`, `Upload failed: ${detail}`)
        : t("Nahrání se nepodařilo.", "Upload failed.");
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img>, which some Safari versions decode when createImageBitmap can't */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns a JPEG of at most MAX_PHOTO_SIDE px on the long side and about TARGET_PHOTO_BYTES.
 * HEIC works where the browser can decode it (Safari); elsewhere it is a clear "wrong_type".
 */
export async function preparePhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !isHeic(file)) {
    throw new PhotoError("wrong_type", `not an image: ${file.type || file.name}`);
  }
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    throw new PhotoError("wrong_type", `cannot decode ${file.type || file.name}`);
  }
  let { width, height } = fitWithin(image.width, image.height);
  const canvas = document.createElement("canvas");
  let blob: Blob | null = null;
  // Lower quality first, then size, until the photo is small enough.
  for (let attempt = 0; attempt < 4; attempt++) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoError("unknown", "canvas unavailable");
    ctx.fillStyle = "#fff"; // transparent PNG areas would otherwise turn black
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    for (const quality of [0.85, 0.75, 0.65]) {
      blob = await toJpeg(canvas, quality);
      if (blob && blob.size <= TARGET_PHOTO_BYTES) break;
    }
    if (blob && blob.size <= TARGET_PHOTO_BYTES) break;
    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }
  if ("close" in image) image.close();
  if (!blob) throw new PhotoError("unknown", "could not encode the photo");
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
