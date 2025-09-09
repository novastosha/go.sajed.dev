import { Hono } from "hono";
import { fromHono } from "chanfana";
import { htmlTemplate } from "../../utils/html";

export const router = fromHono(new Hono());

router.get("/", (c) => {
    return c.html(htmlTemplate('Manage links — go.sajed.dev', `
  <div style="display:flex;flex-direction:column;gap:14px">
    <!-- Manager token (required for all operations) -->
    <div style="display:flex;gap:12px;align-items:center;">
      <label style="font-size:13px;color:var(--muted);min-width:140px">Manager token (required)</label>
      <input id="managerToken" type="password" placeholder="Enter manager token" 
             style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />
      <button id="tokenApply" class="ghost" style="padding:9px 12px;border-radius:8px">Apply</button>
      <div id="tokenState" class="muted" style="min-width:220px;text-align:right">Token required for operations</div>
    </div>

    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <!-- LEFT: Full listing (QUERY) - displays all short links from KV -->
      <div class="card" style="flex:1;min-width:520px">
        <h3 style="margin-top:0">All short links</h3>
        <p class="muted" style="margin:6px 0 12px 0">This queries the KV and lists all stored short links with destination, name and expiry (if available).</p>

        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <button id="queryBtn" class="ghost">Refresh list</button>
          <button id="exportJson" class="ghost">Export JSON</button>
          <div style="margin-left:auto" class="muted" id="listState">Idle</div>
        </div>

        <div id="listWrapper" style="overflow:auto;max-height:560px;border-radius:8px">
          <table id="linksTable" style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="text-align:left">
                <th style="padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03)">Slug</th>
                <th style="padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03)">Name</th>
                <th style="padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03)">Destination</th>
                <th style="padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03)">Expiry</th>
                <th style="padding:10px;border-bottom:1px dashed rgba(255,255,255,0.03)">Actions</th>
              </tr>
            </thead>
            <tbody id="linksBody">
              <tr><td colspan="5" class="muted" style="padding:14px">No data yet — click "Refresh list".</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT: Add new short link -->
      <div class="card" style="width:420px;min-width:320px;flex-shrink:0">
        <h3 style="margin-top:0">Create short link</h3>
        <p class="muted" style="margin:6px 0 12px 0">Add a destination, optional slug and expiry. The Manager token will be sent automatically.</p>

        <form id="addForm">
          <label>Destination URL</label>
          <input name="dest" id="addDest" type="url" placeholder="https://example.com/long/path" required />

          <div class="row" style="display:flex;gap:8px;margin-top:8px">
            <div style="flex:1">
              <label>Slug (optional)</label>
              <input name="slug" id="addSlug" type="text" placeholder="abc123" />
            </div>
            <div style="width:150px">
              <label>Expiry (optional)</label>
              <input name="expiry" id="addExpiry" type="date" />
            </div>
          </div>

          <input type="hidden" name="action" value="ADD" />

          <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
            <button id="addBtn" type="submit" class="success">Create</button>
            <button id="randomAddSlug" type="button" class="ghost">Random slug</button>
            <div id="addStatus" style="margin-left:8px;font-weight:600"></div>
          </div>

          <div style="margin-top:12px">
            <label>Preview</label>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <div class="qr" id="previewBox" style="min-width:220px;display:flex;align-items:center;justify-content:flex-start;padding:10px">
                <div style="display:flex;flex-direction:column;gap:4px">
                  <div class="muted" style="font-size:12px">Short URL</div>
                  <a id="previewShort" class="small" href="#" target="_blank" rel="noreferrer">https://go.sajed.dev/…</a>
                </div>
              </div>
              <div style="flex:1">
                <div class="muted" style="font-size:12px">Destination (preview)</div>
                <div id="previewDest" class="small" style="margin-top:6px;background:rgba(255,255,255,0.02);padding:8px;border-radius:6px;min-height:36px;overflow:auto">—</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
  (function(){
    // helpers
    const genSlug = (len=6) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let out = '';
      for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
      return out;
    };
    const tokenInput = document.getElementById('managerToken');
    const tokenState = document.getElementById('tokenState');
    const applyBtn = document.getElementById('tokenApply');
    const listState = document.getElementById('listState');

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    // token UI
    function updateTokenState(){
      const t = (tokenInput.value||'').trim();
      if (!t) {
        tokenState.textContent = 'Token required for operations';
        tokenState.style.color = 'var(--muted)';
        return false;
      }
      tokenState.textContent = 'Token set (sent with requests)';
      tokenState.style.color = 'var(--accent)';
      return true;
    }
    applyBtn.addEventListener('click', () => updateTokenState());
    tokenInput.addEventListener('keyup', () => { tokenState.textContent = 'Unsaved token'; tokenState.style.color = 'var(--muted)'; });

    // Query / listing logic
    const queryBtn = document.getElementById('queryBtn');
    const exportBtn = document.getElementById('exportJson');
    const linksBody = document.getElementById('linksBody');

    async function fetchAllKeys(){
      if (!updateTokenState()) { alert('Please enter manager token'); return; }
      listState.textContent = 'Querying…';
      try {
        const form = new FormData();
        form.set('action', 'QUERY');   // server expected action
        form.set('token', tokenInput.value.trim());
        const res = await fetch('/manage', { method: 'POST', body: form });
        const text = await res.text();
        if (!res.ok) {
          linksBody.innerHTML = '<tr><td colspan="5" style="padding:12px;color:var(--danger)">Error: ' + escapeHtml(text) + '</td></tr>';
          listState.textContent = 'Error';
          return;
        }
        let data;
        try { data = JSON.parse(text); }
        catch(e){ linksBody.innerHTML = '<tr><td colspan="5" style="padding:12px;">Unexpected response (not JSON)</td></tr>'; listState.textContent = 'Invalid response'; return; }

        // expect data to be an array of {slug,dest,name?,expiry?}
        if (!Array.isArray(data)) {
          linksBody.innerHTML = '<tr><td colspan="5" style="padding:12px;">Unexpected response format</td></tr>';
          listState.textContent = 'Invalid format';
          return;
        }

        if (data.length === 0) {
          linksBody.innerHTML = '<tr><td colspan="5" class="muted" style="padding:12px">No short links found.</td></tr>';
          listState.textContent = 'Done';
          return;
        }

        // build rows
        const rows = data.map(item => {
          const slug = escapeHtml(item.slug || '');
          const name = escapeHtml(item.name || '');
          const dest = escapeHtml(item.dest || '');
          // expiry: show human-friendly or dash
          const expiry = item.expiry ? (new Date(item.expiry).toISOString().split('T')[0]) : '—';
          const shortUrl = 'https://go.sajed.dev/' + encodeURIComponent(item.slug || '');
          return \`
            <tr>
              <td style="padding:10px;vertical-align:top"><strong>\${slug}</strong></td>
              <td style="padding:10px;vertical-align:top">\${name || '<span class="muted">—</span>'}</td>
              <td style="padding:10px;vertical-align:top"><a class="small" href="\${shortUrl}" target="_blank" rel="noreferrer">\${shortUrl}</a><div style="margin-top:6px" class="muted"><pre class="small" style="margin:0;background:transparent;padding:0">\${dest}</pre></div></td>
              <td style="padding:10px;vertical-align:top">\${expiry}</td>
              <td style="padding:10px;vertical-align:top">
                <div style="display:flex;gap:6px;flex-direction:column">
                  <a class="ghost" href="/qr/\${encodeURIComponent(item.slug || '')}" target="_blank">QR</a>
                  <form method="post" action="/manage/delete" style="display:inline" onsubmit="return confirm('Delete ' + '\${escapeHtml(item.slug || '')} + '?')">
                    <input type="hidden" name="slug" value="\${escapeHtml(item.slug || '')}">
                    <input type="hidden" name="token" value="\${escapeHtml(tokenInput.value.trim())}">
                    <button class="ghost" type="submit" style="width:100%">Delete</button>
                  </form>
                </div>
              </td>
            </tr>\`;
        }).join('\\n');

        linksBody.innerHTML = rows;
        listState.textContent = 'Done — ' + data.length + ' items';
      } catch (err) {
        linksBody.innerHTML = '<tr><td colspan="5" style="padding:12px;color:var(--danger)">Network error: ' + escapeHtml(String(err)) + '</td></tr>';
        listState.textContent = 'Network error';
      }
    }

    queryBtn.addEventListener('click', (ev) => { ev.preventDefault(); fetchAllKeys(); });
    // auto-refresh on load
    window.addEventListener('load', () => { /* do not auto-run if token empty */ if (tokenInput.value && tokenInput.value.trim()) fetchAllKeys(); });

    exportBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!updateTokenState()) { alert('Please enter manager token'); return; }
      listState.textContent = 'Exporting…';
      try {
        const form = new FormData();
        form.set('action', 'QUERY');
        form.set('token', tokenInput.value.trim());
        const res = await fetch('/manage', { method: 'POST', body: form });
        const text = await res.text();
        if (!res.ok) { alert('Export failed: ' + text); listState.textContent = 'Error'; return; }
        const data = JSON.parse(text);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'links-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        listState.textContent = 'Exported';
      } catch (err) {
        alert('Export error: ' + String(err));
        listState.textContent = 'Error';
      }
    });

    // ADD form behavior (preview + create)
    const addForm = document.getElementById('addForm');
    const addStatus = document.getElementById('addStatus');
    const previewShort = document.getElementById('previewShort');
    const previewDest = document.getElementById('previewDest');
    const addSlug = document.getElementById('addSlug');
    const addDest = document.getElementById('addDest');
    const randomAddSlug = document.getElementById('randomAddSlug');

    function updatePreview(){
      const s = (addSlug.value || '').trim();
      const short = s ? ('https://go.sajed.dev/' + encodeURIComponent(s)) : 'https://go.sajed.dev/…';
      previewShort.textContent = short;
      previewShort.href = s ? short : '#';
      previewDest.textContent = (addDest.value || '—');
    }
    addSlug.addEventListener('input', updatePreview);
    addDest.addEventListener('input', updatePreview);
    randomAddSlug.addEventListener('click', () => { addSlug.value = genSlug(6); updatePreview(); });
    updatePreview();

    addForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!updateTokenState()) return alert('Please enter manager token');
      addStatus.textContent = 'Creating…';
      addStatus.style.color = 'var(--muted)';
      const form = new FormData(addForm);
      form.set('token', tokenInput.value.trim());
      form.set('action', 'ADD');
      try {
        const res = await fetch('/manage', { method:'POST', body: form });
        const json = await res.json();
        if (!res.ok) {
          addStatus.textContent = json.error || 'Unknown error';
          addStatus.style.color = 'var(--danger)';
        
          return;
        }


        if (!json || !json.success) {
          addStatus.textContent = json.error || 'Unknown error';
          addStatus.style.color = 'var(--danger)';
          return;
        }

        addStatus.textContent = 'Success link is now available at {}'.replace('{}', json.entry ? ('https://go.sajed.dev/' + json.entry.slug) : 'unknown');
        addStatus.style.color = 'var(--success)';
        // refresh list after create
        await fetchAllKeys();
      } catch (err) {
        addStatus.textContent = 'Network error';
        addStatus.style.color = 'var(--danger)';
        alert('Network error: ' + String(err));
      }
    });
  })();
  </script>
`));
});

export type ShortenedEntry = {
    slug: string;
    dest: string;
    expiry?: string; // ISO date string
}

router.post("/", async (c) => {
    const form = await c.req.formData();
    const action = (form.get("action") || "").toString().toUpperCase();
    const token = (form.get("token") || "").toString().trim();
    if (!token) {
        return c.text("Manager token is required", 400);
    }

    if (token !== c.env.TOKEN_SECRET) {
        return c.text("Invalid manager token", 403);
    }
    if (action === "QUERY") {
        const list = await c.env.SHORTENER_KV.list({ prefix: "short:" });

        const entries: ShortenedEntry[] = [];
        for (const key of list.keys) {
            const val = await c.env.SHORTENER_KV.get(key.name);
            if (!val) continue;

            const parsed = JSON.parse(val);
            entries.push(parsed);
        }

        return c.json({ success: true, entries });
    }

    if (action === "ADD") {
        const dest = (form.get("dest") || "").toString().trim();
        let slug = (form.get("slug") || "").toString().trim();
        const expiry = (form.get("expiry") || "").toString().trim();

        if (expiry) {
            const d = new Date(expiry);
            if (isNaN(d.getTime())) {
                return c.text("Invalid expiry date", 400);
            }
        }

        if(!slug) {
            let tries = 0;
            do {
                slug = genSlug(6);
                const exists = await c.env.SHORTENER_KV.get("short:" + slug);
                if (!exists) break;
                tries++;
            } while (tries < 5);
            if (tries === 5) {
                return c.text("Failed to generate unique slug, please try again", 500);
            }
        } else {
            if (!/^[a-zA-Z0-9_-]{3,30}$/.test(slug)) {
                return c.text("Invalid slug format (3-30 chars, alphanumeric, _ and - allowed)", 400);
            }
        }

        if (!dest || !slug) {
            return c.text("Destination and slug are required", 400);
        }

        const entry: ShortenedEntry = { slug, dest, expiry };
        await c.env.SHORTENER_KV.put("short:" + slug, JSON.stringify(entry));
        return c.json({ success: true, entry });
    }

    if (action === "DELETE") {
        const slug = (form.get("slug") || "").toString().trim();
        if (!slug) {
            return c.text("Slug is required", 400);
        }

        await c.env.SHORTENER_KV.delete("short:" + slug);
        return c.json({ success: true });
    }
});

function genSlug(len = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let out = ''
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
    return out
}