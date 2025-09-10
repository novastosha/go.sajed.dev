export function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c])
}

export function htmlTemplate(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.sajed.dev/web/assets/input-compatible-styles.css">

  <style>
    :root {
      --bg: #0b0b0b;
      --panel: #0f0f0f;
      --border: #2b2b2b;
      --muted: #888;
      --accent: #7cc;
      --success: #7c7;
      --danger: #f55;
      font-family: monospace;
    }

    html, body { height: 100%; }
    body {
      background: var(--bg);
      color: #ddd;
      margin: 0;
      padding: 1rem;
      /* content flows top -> down; container centered horizontally */
    }

    /* Horizontal center only: container with auto horizontal margins */
    .container {
      width: 100%;
      max-width: 980px;
      margin: 2rem auto; /* centers horizontally and keeps top spacing */
    }

    #navbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 0.5rem 1rem;
      border-bottom:1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
      border-radius: 6px 6px 0 0;
    }
    h1 { margin:0; font-size:1.1rem; }
    #navbar-links a { color: #ddd; text-decoration:none; margin-left:0.75rem; }

    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      padding: 1rem;
      margin-top: 1rem;
      border-radius: 6px;
    }

    .panel, #navbar { width: 100%; box-sizing: border-box; }

    label { display:inline-block; width:60px; }
    input[type="text"], input[type="url"], textarea, select {
      background: black;
      color: white;
      border: 1px solid #444;
      padding: 4px 6px;
      font-family: monospace;
      width: 320px;
    }
    textarea { height: 4.5rem; width: 100%; max-width: 640px; }

    .controls {
      display:flex;
      gap: 0.5rem;
      align-items:center;
      margin-top: 0.5rem;
      flex-wrap:wrap;
    }

    button, .link-btn {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: #ddd;
      cursor: pointer;
      font-family: monospace;
    }
    button.primary { border-color: var(--accent); }
    button.danger { border-color: var(--danger); color: var(--danger); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    #list {
      margin-top: 1rem;
      border-collapse: collapse;
      width: 100%;
      font-size: 0.95rem;
    }

    table#list th, table#list td {
      padding: 8px;
      border-bottom: 1px solid #1b1b1b;
      vertical-align: top;
      text-align: left;
    }

    table#list th { color: var(--muted); font-weight: normal; font-size: 0.85rem; }
    .entry-message { white-space: pre-wrap; max-width: 60ch; color: #ddd; }

    .checkbox {
      width:18px;
      height:18px;
      accent-color: var(--accent);
      cursor: pointer;
    }

    .meta {
      color: var(--muted);
      font-size: 0.85rem;
    }

    #feedback {
      margin-top: 0.75rem;
      font-weight: bold;
    }
    #feedback.success { color: var(--success); }
    #feedback.error { color: var(--danger); }

    .small { font-size:0.85rem; color:var(--muted); }

    /* Approved badges */
    .badge-yes { color: var(--success); font-weight: 700; }
    .badge-no  { color: var(--danger); font-weight: 700; }

    @media (max-width: 720px) {
      body { padding: 0.5rem; }
      .container { max-width: 100%; margin: 1rem auto; }
      label { display:block; width:100%; margin-bottom:0.25rem; }
      input[type="text"], select { width: 100%; }
      textarea { width: 100%; }
      .panel { padding: 0.75rem; }
      #navbar { padding: 0.5rem; }
    }
  </style>
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

