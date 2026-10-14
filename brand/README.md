# Brand images: the one place to change the logo

| File            | What it is                                                           | Becomes                                                       |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| `logo-mark.png` | The picture alone (cottage, trees, moon), **transparent background** | Android home-screen icons, iPhone home-screen icon (on cream) |
| `logo-icon.png` | A simplified version for tiny sizes: the cabin in a green circle     | Browser tab icon and `favicon.ico` (16–48 px)                 |
| `logo.jpeg`     | Picture + "mychata.cz" on cream                                      | The link-preview image (WhatsApp, Facebook, Messenger, Slack) |

`logo-mark.png` and `logo-icon.png` were made on 14 Oct 2026 from `design/LogoOption1_graphic.jpeg` (background removed; cabin cut out for the small icon). `logo.jpeg` is `design/LogoOption1.jpeg`.

## To change a logo

1. Replace the file here, keeping its name. For `logo-mark.png` and `logo-icon.png` use a PNG with a transparent background, 1024 px or more; the script trims the edges and centres the drawing. `logo-icon.png` is optional: delete it and the tab icon is made from `logo-mark.png`.
2. In the terminal, inside `mychata`: `bun run brand`
3. Commit everything it changed (`brand/`, `public/favicon.ico`, `public/brand/`, `public/manifest.webmanifest`, `src/lib/brand-assets.ts`), open a PR, merge, publish.

The script (`scripts/brand-assets.ts`) fetches its image tool on demand, so nothing needs installing. It adds a version to every icon address, so browsers pick up a new logo instead of showing a cached old one. Link-preview services (WhatsApp, Facebook) cache previews for days; Facebook's Sharing Debugger can refresh one.

The iPhone icon and the preview image use the cream background `#FAF8F2` (iOS shows transparency as black). To change it, edit `BACKGROUND` at the top of the script.

Never edit `public/brand/*`, `public/favicon.ico` or `src/lib/brand-assets.ts` by hand, and never let Lovable add its own icon or preview image (Lovable Knowledge rule 12).
