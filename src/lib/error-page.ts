export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>Stránku se nepodařilo načíst — My Chata</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font: 17px/1.5 system-ui, -apple-system, sans-serif; background: linear-gradient(180deg, #E2EFE5 0px, #F5F8F5 280px) no-repeat, #F5F8F5; color: #14201A; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 20px; }
      .card { max-width: 35rem; width: 100%; text-align: center; }
      .logo { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: #1F7A4D; color: #FFFFFF; margin-bottom: 20px; }
      h1 { font-size: 28px; line-height: 1.15; margin: 0 0 16px; }
      p { color: #4E5F55; margin: 0 0 20px; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      a, button { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 12px 24px; border-radius: 9999px; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; border: 0; }
      .primary { background: #1F7A4D; color: #FFFFFF; }
      .primary:hover { background: #155C39; }
      .secondary { background: #FFFFFF; color: #14201A; box-shadow: inset 0 0 0 1.5px #D3DDD6; }
      a:focus-visible, button:focus-visible { outline: 2px solid #1F7A4D; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="logo" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg></span>
      <h1>Stránku se nepodařilo načíst</h1>
      <p lang="en">This page did not load</p>
      <p>Zkuste stránku obnovit nebo se vraťte na úvod.<br /><span lang="en">Try refreshing the page or go back home.</span></p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Zkusit znovu / <span lang="en">Try again</span></button>
        <a class="secondary" href="/">Zpět na úvod / <span lang="en">Go home</span></a>
      </div>
    </div>
  </body>
</html>`;
}
