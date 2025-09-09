export function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c])
}

export function htmlTemplate(title: string, bodyHtml: string) {
    // CSS is a compact approximation of the simple "manage" panel style.
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.sajed.dev/web/assets/input-compatible-styles.css">
<link rel="stylesheet" href="https://cdn.sajed.dev/web/assets/managment.css">
</head>
<body>
<div class="container">
  <header>
    <h1>Manage Links</h1>
    <div class="muted">Create, view and manage short links</div>
  </header>
  <div class="card">
    ${bodyHtml}
  </div>
  <footer class="muted">Made with ❤️ using Cloudflare & GitHub</footer>
</div>
</body>
</html>`
}
