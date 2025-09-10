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
  --bg: #071024;         /* deep page background */
  --panel-bg: #0b1220;   /* card background */
  --glass: rgba(255,255,255,0.02);
  --muted: #9aa4b2;
  --text: #e6eef8;
  --accent: #60a5fa;
  --accent-2: #7dd3fc;
  --accent-strong: #2b6fd6;
  --success: #22c55e;
  --danger: #ef4444;
  --border: rgba(255,255,255,0.04);
  --glass-strong: rgba(255,255,255,0.03);
  --radius-lg: 12px;
  --radius-sm: 8px;
  --shadow-1: 0 6px 18px rgba(2,6,23,0.6);
}

html,body{height:100%;margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;}
/* keep everything centered like before */
body{
  background: linear-gradient(180deg, var(--bg) 0%, #0a1a2b 100%);
  color: var(--text);
  display:flex;
  align-items:center;          /* centered vertically */
  justify-content:center;      /* centered horizontally */
  padding:48px 20px;          /* comfortable breathing room */
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  box-sizing:border-box;
}

/* Outer container */
.container{
  max-width:980px;
  width:100%;
  margin:0 auto;
}

/* Top header */
header{display:flex;align-items:center;gap:12px;margin-bottom:18px;justify-content:center}
header h1{font-size:18px;margin:0;font-weight:600}
header .subtitle{color:var(--muted);font-size:13px}

/* Card style (panels) */
.card{
  background: linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01));
  border-radius: var(--radius-lg);
  padding:18px;
  box-shadow: var(--shadow-1);
  border: 1px solid var(--border);
  backdrop-filter: blur(6px);
}

/* Form text + inputs */
label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
input[type="text"], input[type="url"], input[type="date"], select, textarea{
  width:100%;
  padding:10px 12px;
  border-radius: var(--radius-sm);
  border:1px solid var(--border);
  background: transparent;
  color: inherit;
  font-size:14px;
  box-sizing:border-box;
  outline: none;
  transition: box-shadow .12s ease, border-color .12s ease, transform .06s ease;
}
input[type="text"]:focus, input[type="url"]:focus, input[type="date"]:focus, select:focus, textarea:focus{
  border-color: rgba(96,165,250,0.9);
  box-shadow: 0 6px 22px rgba(96,165,250,0.06);
  transform: translateY(-1px);
}

/* layout helpers */
.row{display:flex;gap:12px}
.col{flex:1}
.actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}

/* Buttons: use .btn + modifiers */
button, .btn {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:9px 14px;
  border-radius:10px;
  font-weight:600;
  cursor:pointer;
  border: none;
  transition: transform .08s ease, box-shadow .12s ease, opacity .12s ease;
  user-select: none;
}

/* Primary — subtle gradient but flatter */
button, .btn.primary {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  color: #04253b;
  box-shadow: 0 6px 22px rgba(96,165,250,0.06);
}
button.primary:hover { transform: translateY(-2px); }
button.primary:active { transform: translateY(0); }

/* Ghost (outline) */
button.ghost, .btn.ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  box-shadow: none;
}
button.ghost:hover { border-color: rgba(255,255,255,0.07); color: var(--text); transform: translateY(-1px); }

/* Danger / success */
button.danger, .btn.danger {
  background: linear-gradient(90deg,#f87171,#ef4444);
  color: white;
}
button.success, .btn.success {
  background: linear-gradient(90deg,#34d399,#10b981);
  color: #04253b;
}

/* Table */
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
th,td{padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03);text-align:left;vertical-align:top}
thead th{color:var(--muted);font-size:13px}
tbody tr:hover td{background: rgba(255,255,255,0.01)}

/* Muted text / small pre */
.muted{color:var(--muted);font-size:13px}
a.small{font-size:13px;color:var(--accent);text-decoration:none}
.qr{width:90px;height:90px;border-radius:6px;background:var(--glass-strong);display:inline-flex;align-items:center;justify-content:center;padding:8px;box-shadow:inset 0 -8px 24px rgba(11,18,32,0.4)}
footer{margin-top:16px;color:var(--muted);font-size:13px}
pre.small{font-size:12px;white-space:pre-wrap;word-break:break-all;background:rgba(255,255,255,0.02);padding:8px;border-radius:6px;overflow:auto}

/* Small helpers for compact UI */
.card--split { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; }
.card--split > .panel { flex:1; min-width:320px; }
.card--narrow { width:420px; }

/* responsive */
@media (max-width:920px){
  .card--split{flex-direction:column}
  header{justify-content:flex-start}
}

/* tiny utilities */
.hidden{display:none}
.center{display:flex;align-items:center;justify-content:center}
.small{font-size:13px}

/* subtle link hover */
a.small:hover { text-decoration:underline; color:var(--accent-strong); }

/* focus-visible accessibility */
:focus { outline: 2px solid rgba(96,165,250,0.12); outline-offset: 2px; }
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

