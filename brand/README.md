# Brand images: the one place to change the logo

| File             | What it is                         | Becomes                                                               |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `logo-mark.jpeg` | The picture alone (cottage, trees) | Browser tab icon, `favicon.ico`, iPhone and Android home-screen icons |
| `logo.jpeg`      | Picture + "mychata.cz"             | The link-preview image (WhatsApp, Facebook, Messenger, Slack)         |

## To change a logo

1. Replace the file here, keeping its name. A square image of 1024 px or more on a plain background works best; the script trims the background and centres the drawing.
2. In the terminal, inside `mychata`: `bun run brand`
3. Commit everything it changed (`brand/`, `public/favicon.ico`, `public/brand/`, `public/manifest.webmanifest`, `src/lib/brand-assets.ts`), open a PR, merge, publish.

The script (`scripts/brand-assets.ts`) fetches its image tool on demand, so nothing needs installing. It adds a version to every icon address, so browsers pick up a new logo instead of showing a cached old one. Link-preview services (WhatsApp, Facebook) cache previews for days; Facebook's Sharing Debugger can refresh one.

If the new images have a different background colour, change `BACKGROUND` at the top of the script.

Never edit `public/brand/*`, `public/favicon.ico` or `src/lib/brand-assets.ts` by hand, and never let Lovable add its own icon or preview image (Lovable Knowledge rule 12).
