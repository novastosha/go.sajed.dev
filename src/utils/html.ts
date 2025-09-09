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
<style>
  :root{
    --bg:#0f1724;
    --card:#0b1220;
    --muted:#9aa4b2;
    --accent:#60a5fa;
    --accent-2:#7dd3fc;
    --success:#22c55e;
    --danger:#ef4444;
    --glass: rgba(255,255,255,0.03);
  }
  html,body{height:100%;margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;}
  body{background:linear-gradient(180deg,var(--bg) 0%, #071024 100%);color:#e6eef8;display:flex;align-items:flex-start;justify-content:center;padding:36px;}
  .container{max-width:920px;width:100%;}
  header{display:flex;align-items:center;gap:12px;margin-bottom:18px}
  header h1{font-size:18px;margin:0;font-weight:600}
  .card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border-radius:12px;padding:18px;box-shadow:0 6px 18px rgba(2,6,23,0.6);border:1px solid rgba(255,255,255,0.03)}
  label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
  input[type="text"], input[type="url"], input[type="date"], select, textarea{
    width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit;font-size:14px;
    box-sizing:border-box;
  }
  .row{display:flex;gap:12px}
  .col{flex:1}
  .actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  button{background:linear-gradient(90deg,var(--accent),var(--accent-2));border:none;padding:10px 14px;border-radius:8px;color:#04253b;font-weight:600;cursor:pointer}
  button.ghost{background:transparent;border:1px solid rgba(255,255,255,0.04);color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
  th,td{padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03);text-align:left}
  .muted{color:var(--muted);font-size:13px}
  a.small{font-size:13px;color:var(--accent);text-decoration:none}
  .qr{width:90px;height:90px;border-radius:6px;background:var(--glass);display:inline-flex;align-items:center;justify-content:center;padding:8px}
  .danger{background:linear-gradient(90deg,#f87171,#ef4444);color:#fff;border:none;padding:8px;border-radius:8px}
  .success{background:linear-gradient(90deg,#34d399,#10b981);color:#04253b;padding:8px;border-radius:8px;border:none}
  footer{margin-top:16px;color:var(--muted);font-size:13px}
  pre.small{font-size:12px;white-space:pre-wrap;word-break:break-all;background:rgba(255,255,255,0.02);padding:8px;border-radius:6px}
  @media (max-width:640px){.row{flex-direction:column}}
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

