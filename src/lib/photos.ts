// Photo preparation and upload error messages (B-007).
// Photos are shrunk in the browser before upload: phones take 4–12 MB pictures, and people
// at a chata are often on a weak mobile signal. Re-encoding also drops EXIF, so the GPS
// position stored in phone photos never reaches our storage.

export const MAX_PHOTO_SIDE = 2000;
export const TARGET_PHOTO_BYTES = 1_000_000;
/**
 * A smaller copy for lists and Home (bug 13 of 18 Oct): the photo grid and the Home picture
 * used to download every full 2000 px photo (~1 MB each). 1000 px is sharp enough for a phone
 * screen and Home on a computer, at roughly a fifth of the size. ADR-0009.
 */
export const PREVIEW_SIDE = 1000;
export const TARGET_PREVIEW_BYTES = 200_000;

/** Where a photo's preview is stored: next to it, in a "preview" folder. */
export function previewPathFor(path: string): string {
  const i = path.lastIndexOf("/");
  return `${path.slice(0, i)}/preview/${path.slice(i + 1)}`;
}

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

/**
 * D-29 (T-045): Chrome and Firefox can't decode iPhone HEIC photos. Convert them to JPEG with
 * heic-to (libheif in WebAssembly, about 0.8 MB gzipped), loaded only when such a photo is
 * picked. Safari decodes HEIC itself and never loads it.
 */
export async function heicToJpeg(file: File): Promise<File> {
  try {
    // Browser only: the SSR build drops this import, so the 3 MB library never enters the
    // server bundle (Worker size limits).
    if (import.meta.env.SSR) throw new Error("browser only");
    const { heicTo } = await import("heic-to");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    throw new PhotoError("wrong_type", `HEIC conversion failed: ${(error as Error).message}`);
  }
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
 * HEIC: Safari decodes it; elsewhere it is converted with heic-to first (D-29).
 */
export async function preparePhoto(
  file: File,
  { maxSide = MAX_PHOTO_SIDE, targetBytes = TARGET_PHOTO_BYTES } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") && !isHeic(file)) {
    throw new PhotoError("wrong_type", `not an image: ${file.type || file.name}`);
  }
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    if (!isHeic(file))
      throw new PhotoError("wrong_type", `cannot decode ${file.type || file.name}`);
    // Not Safari: convert the iPhone photo first (D-29), then decode the JPEG.
    try {
      image = await decode(await heicToJpeg(file));
    } catch (error) {
      if (error instanceof PhotoError) throw error;
      throw new PhotoError("wrong_type", `cannot decode converted ${file.name}`);
    }
  }
  let { width, height } = fitWithin(image.width, image.height, maxSide);
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
      if (blob && blob.size <= targetBytes) break;
    }
    if (blob && blob.size <= targetBytes) break;
    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }
  if ("close" in image) image.close();
  if (!blob) throw new PhotoError("unknown", "could not encode the photo");
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/** The preview copy, made from the already-shrunk photo. */
export function preparePreview(photo: File): Promise<File> {
  return preparePhoto(photo, { maxSide: PREVIEW_SIDE, targetBytes: TARGET_PREVIEW_BYTES });
}

/**
 * Picks the preview's signed link when the preview exists (photos added before 18 Oct have
 * none) and the full photo's link otherwise.
 */
export function pickPhotoUrls(
  photos: { id: string; storage_path: string }[],
  signed: { path: string | null; signedUrl: string | null; error: string | null }[],
): Record<string, string> {
  const byPath = new Map<string, string>();
  for (const row of signed)
    if (row.path && row.signedUrl && !row.error) byPath.set(row.path, row.signedUrl);
  const out: Record<string, string> = {};
  for (const p of photos) {
    const url = byPath.get(previewPathFor(p.storage_path)) ?? byPath.get(p.storage_path);
    if (url) out[p.id] = url;
  }
  return out;
}
