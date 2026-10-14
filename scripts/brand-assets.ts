// Builds every logo file the site serves from the source images in brand/.
//
//   bun run brand
//
// Sources (replace a file, keep its name, run the command, commit the result):
//   brand/logo-mark.png   the picture alone, transparent background: home-screen icons
//   brand/logo-icon.png   a simplified version for tiny sizes (browser tab, 16–48 px);
//                         optional: without it the tab icon is made from logo-mark.png
//   brand/logo.jpeg       picture + "mychata.cz": the link-preview image (WhatsApp, Facebook, …)
//
// Outputs (never edit by hand):
//   public/favicon.ico                      16, 32 and 48 px, for browsers that ask for /favicon.ico
//   public/brand/icon-32.png                browser tab
//   public/brand/apple-touch-icon.png       iPhone home screen (180 px, on the cream background,
//                                           because iOS turns transparency black)
//   public/brand/icon-192.png, icon-512.png Android home screen (manifest), transparent
//   public/brand/og-image.jpg               link previews, 1200 × 630
//   public/manifest.webmanifest             "icons" list only; the other fields are kept
//   src/lib/brand-assets.ts                 the paths above plus a version, so a new logo
//                                           is not hidden by browser caches
//
// Image work is done by sharp-cli, fetched on demand by bunx (no package.json change).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SHARP = "sharp-cli@5.2.0";
// The cream background of the logo artwork. Used behind the iPhone icon and the preview image.
const BACKGROUND = "#FAF8F2";
const TRANSPARENT = "rgba(0,0,0,0)";
const SRC_MARK = "brand/logo-mark.png";
const SRC_ICON = existsSync("brand/logo-icon.png") ? "brand/logo-icon.png" : SRC_MARK;
const SRC_LOGO = "brand/logo.jpeg";
const OUT = "public/brand";
const TMP = "brand/.tmp";

function sharp(input: string, output: string, ...ops: string[]) {
  const r = Bun.spawnSync(["bunx", SHARP, "-i", input, "-o", output, ...ops], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (r.exitCode !== 0) {
    throw new Error(`sharp-cli failed for ${output}:\n${r.stderr.toString()}`);
  }
}

// An .ico file whose entries are PNGs (supported by every current browser).
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

for (const src of [SRC_MARK, SRC_LOGO]) {
  if (!existsSync(src)) throw new Error(`Missing ${src}`);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// A source trimmed to its drawing and centred on a transparent square.
function square(src: string, name: string) {
  const out = join(TMP, name);
  sharp(
    src,
    out,
    "-f",
    "png",
    "trim",
    "--",
    "resize",
    "1024",
    "1024",
    "--fit",
    "contain",
    "--background",
    TRANSPARENT,
  );
  return out;
}
const markSquare = square(SRC_MARK, "mark-square.png");
const iconSquare = square(SRC_ICON, "icon-square.png");

const png = (src: string, size: number, out: string, background?: string) =>
  sharp(
    src,
    out,
    "-f",
    "png",
    "-c",
    "9",
    "--palette",
    "--effort",
    "6",
    "resize",
    String(size),
    String(size),
    ...(background ? ["--", "flatten", background] : []),
  );

png(iconSquare, 32, join(OUT, "icon-32.png"));
png(markSquare, 192, join(OUT, "icon-192.png"));
png(markSquare, 512, join(OUT, "icon-512.png"));
// iOS shows transparency as black, so the iPhone icon gets the cream background and a margin.
sharp(
  markSquare,
  join(OUT, "apple-touch-icon.png"),
  "-f",
  "png",
  "-c",
  "9",
  "--palette",
  "resize",
  "150",
  "150",
  "--",
  "extend",
  "15",
  "15",
  "15",
  "15",
  "--background",
  BACKGROUND,
  "--",
  "flatten",
  BACKGROUND,
);

const icoParts = [16, 32, 48].map((size) => {
  const p = join(TMP, `ico-${size}.png`);
  png(iconSquare, size, p);
  return { size, data: readFileSync(p) };
});
writeFileSync("public/favicon.ico", ico(icoParts));

// The full logo centred on a 1200 × 630 card with a margin.
sharp(
  SRC_LOGO,
  join(OUT, "og-image.jpg"),
  "-f",
  "jpeg",
  "-q",
  "82",
  "-p",
  "--mozjpeg",
  "trim",
  "--threshold",
  "20",
  "--",
  "resize",
  "1040",
  "470",
  "--fit",
  "contain",
  "--background",
  BACKGROUND,
  "--",
  // top, bottom, left, right
  "extend",
  "80",
  "80",
  "80",
  "80",
  "--background",
  BACKGROUND,
);

rmSync(TMP, { recursive: true, force: true });

const version = createHash("sha256")
  .update(readFileSync(SRC_MARK))
  .update(readFileSync(SRC_ICON))
  .update(readFileSync(SRC_LOGO))
  .digest("hex")
  .slice(0, 8);
const v = (path: string) => `${path}?v=${version}`;

const manifestPath = "public/manifest.webmanifest";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.icons = [
  { src: v("/brand/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: v("/brand/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

writeFileSync(
  "src/lib/brand-assets.ts",
  `// Generated by \`bun run brand\` (scripts/brand-assets.ts) from the images in brand/. Do not edit by hand: replace a source image and run the command again.
export const BRAND_VERSION = "${version}";

export const brandAssets = {
  favicon: "${v("/favicon.ico")}",
  icon32: "${v("/brand/icon-32.png")}",
  appleTouchIcon: "${v("/brand/apple-touch-icon.png")}",
  icon192: "${v("/brand/icon-192.png")}",
  icon512: "${v("/brand/icon-512.png")}",
  // Absolute, because link-preview crawlers need a full URL.
  ogImage: "https://mychata.cz${v("/brand/og-image.jpg")}",
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const;
`,
);

// Same formatting as the rest of the repo, so CI's format check passes.
Bun.spawnSync([
  "bunx",
  "prettier",
  "--write",
  "src/lib/brand-assets.ts",
  "public/manifest.webmanifest",
]);

console.log(
  `Brand assets written (version ${version}). Commit public/, src/lib/brand-assets.ts and brand/.`,
);
