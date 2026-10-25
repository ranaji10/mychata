// Profile photos (bug 6, 17 Oct 2026). A small square JPEG, stored as a data URL in
// profiles.avatar_url: it is only ever shown to the person themselves (header and My profile),
// so it needs no storage bucket or sharing rules. 256 px at q 0.8 is about 15–25 kB.
import { fitWithin, heicToJpeg, isHeic, PhotoError } from "@/lib/photos";

export const AVATAR_SIDE = 256;

/** Square crop from the centre, as the canvas source rectangle. */
export function centreSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

export async function avatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !isHeic(file)) {
    throw new PhotoError("wrong_type", "not an image");
  }
  const bitmap = await createImageBitmap(file).catch(async () => {
    // iPhone HEIC outside Safari (D-29): convert, then read the JPEG.
    if (!isHeic(file)) throw new PhotoError("wrong_type", "unreadable image");
    return createImageBitmap(await heicToJpeg(file)).catch(() => {
      throw new PhotoError("wrong_type", "unreadable image");
    });
  });
  const { sx, sy, side } = centreSquare(bitmap.width, bitmap.height);
  const { width } = fitWithin(side, side, AVATAR_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("unknown", "no canvas");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, width, width);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.8);
}
