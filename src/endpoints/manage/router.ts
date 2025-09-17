import { Hono } from "hono";
import { fromHono } from "chanfana";
import { htmlTemplate } from "../../utils/html";
import { sl } from "zod/v4/locales";

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
      <div id="tokenState" class="muted" style="min-width:220px;text-align:right">Input the token.</div>
    </div>

    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div class="card" style="flex:1;min-width:520px">
        <h3 style="margin-top:0">All short links</h3>
        <p class="muted" style="margin:6px 0 12px 0">Gets the list of all shortened links</p>

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

      <!-- RIGHT: Add new short link (converted to a DIV, not a FORM) -->
      <div class="card" style="width:420px;min-width:320px;flex-shrink:0">
        <h3 style="margin-top:0">Create short link</h3>
        <p class="muted" style="margin:6px 0 12px 0">Add a destination, a slug and an optional expiry date.</p>

        <div id="addForm">
          <label>Destination URL</label>
          <input name="dest" id="addDest" type="url" placeholder="https://example.com/long/path" required />

          <div class="row" style="display:flex;gap:8px;margin-top:8px">
            <div style="flex:1">
              <label>Slug</label>
              <input name="slug" id="addSlug" type="text" placeholder="abc123" required />
            </div>
            <div style="width:150px">
              <label>Expiry (optional)</label>
              <input name="expiry" id="addExpiry" type="date" />
            </div>
          </div>

          <input type="hidden" id="addAction" value="ADD" />

          <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
            <button id="addBtn" type="button" class="success">Create</button>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script type="text/javascript" src="https://cdn.sajed.dev/web/assets/go/index.js"></script>
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

    if (typeof slug !== "string") {
      return c.text("Invalid slug format", 400);
    }

    if (typeof dest !== "string") {
      return c.text("Invalid destination URL", 400);
    }

    if (!dest || !/^https?:\/\//.test(dest)) {
      return c.text("Invalid destination URL", 400);
    }

    if (expiry) {
      const d = new Date(expiry);
      if (isNaN(d.getTime())) {
        return c.text("Invalid expiry date", 400);
      }
    }

    if (!slug) {
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

      const exists = await c.env.SHORTENER_KV.get("short:" + slug);
      if (exists) {
        return c.text("Slug already exists, please choose another", 409);
      }

      if (["manage", "qr", "go", "analytics"].includes(slug.toLowerCase())) {
        return c.text("Invalid slug, please choose another", 409);
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

router.post("/analytics/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!slug) {
    return c.text("Slug is required", 400);
  }

  const form = await c.req.formData();
  const token = (form.get("token") || "").toString().trim();

  if (!token) {
    return c.text("Manager token is required", 400);
  }

  if (token !== c.env.TOKEN_SECRET) {
    return c.text("Invalid manager token", 403);
  }

  const entries: any[] = [];
  if (slug === "*") {
    const allEntries = await c.env.SHORTENER_KV.list({ prefix: "analytics:" });
    for (const key of allEntries.keys) {
      const val = await c.env.SHORTENER_KV.get(key.name);
      if (!val) continue;
      entries.push(JSON.parse(val));
    }
  } else {

    const list = await c.env.SHORTENER_KV.list({ prefix: `analytics:${slug}:` });
    for (const key of list.keys) {
      const val = await c.env.SHORTENER_KV.get(key.name);
      if (!val) continue;
      entries.push(JSON.parse(val));
    }
  }

  return c.json({ success: true, entries });
});

router.get("/analytics", async (c) => {
  return c.html(htmlTemplate('Analytics — go.sajed.dev', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <!-- Token row -->
      <div style="display:flex;gap:12px;align-items:center;">
        <label style="font-size:13px;color:var(--muted);min-width:140px">Manager token (required)</label>
        <input id="managerToken" type="password" placeholder="Enter manager token"
               style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />
        <button id="tokenApply" class="ghost" style="padding:9px 12px;border-radius:8px">Apply</button>
        <div id="tokenState" class="muted" style="min-width:220px;text-align:right">Input the token.</div>
      </div>

      <!-- Slug + actions -->
      <div style="display:flex;gap:12px;align-items:center;">
        <label style="font-size:13px;color:var(--muted);min-width:140px">Slug</label>
        <input id="slugInput" type="text" placeholder="slug or * for all" value="*" 
               style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />
        <button id="fetchBtn" class="btn primary" style="padding:9px 12px;border-radius:8px">Fetch</button>
        <button id="csvBtn" class="ghost" style="padding:9px 12px;border-radius:8px">Export CSV</button>
        <div id="count" class="muted" style="min-width:160px;text-align:right">0 entries</div>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px;background:var(--glass);border-radius:10px">
        <input id="textSearch" type="text" placeholder="Search origin / referer / ip / browser..." 
               style="min-width:280px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />

        <div style="min-width:200px">
          <label class="muted small">From</label>
          <input id="fromDate" type="datetime-local" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />
        </div>

        <div style="min-width:200px">
          <label class="muted small">To</label>
          <input id="toDate" type="datetime-local" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit" />
        </div>

        <select id="deviceFilter" style="min-width:160px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit">
          <option value="">Device (all)</option>
        </select>

        <select id="osFilter" style="min-width:160px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit">
          <option value="">OS (all)</option>
        </select>

        <select id="browserFilter" style="min-width:160px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit">
          <option value="">Browser (all)</option>
        </select>

        <select id="sourceFilter" style="min-width:160px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit">
          <option value="">Source (all)</option>
        </select>

        <label style="margin-left:auto;display:flex;gap:8px;align-items:center" class="muted small">
          <input id="saveToken" type="checkbox" style="transform:translateY(1px)" /> Save token (local)
        </label>
      </div>

      <!-- Stats -->
      <div id="statsArea" style="display:none;gap:10px;align-items:center;margin-top:10px">
        <div style="background:rgba(255,255,255,0.03);padding:8px 10px;border-radius:999px;font-size:13px">Origins: <span id="uniqueOrigins">0</span></div>
        <div style="background:rgba(255,255,255,0.03);padding:8px 10px;border-radius:999px;font-size:13px">IPs: <span id="uniqueIPs">0</span></div>
        <div style="background:rgba(255,255,255,0.03);padding:8px 10px;border-radius:999px;font-size:13px">Range: <span id="timeRange">—</span></div>
      </div>

      <!-- Table -->
      <div style="max-height:420px;overflow:auto;border-radius:8px;padding-top:10px">
        <table id="entriesTable" style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th data-key="time" style="cursor:pointer;color:var(--muted)">Time ▾</th>
              <th data-key="ip" style="cursor:pointer;color:var(--muted)">IP</th>
              <th data-key="origin" style="cursor:pointer;color:var(--muted)">Origin</th>
              <th data-key="referer" style="cursor:pointer;color:var(--muted)">Referer</th>
              <th data-key="device" style="cursor:pointer;color:var(--muted)">Device</th>
              <th data-key="os" style="cursor:pointer;color:var(--muted)">OS</th>
              <th data-key="browser" style="cursor:pointer;color:var(--muted)">Browser</th>
              <th data-key="source" style="cursor:pointer;color:var(--muted)">Source</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <!-- Footer / pagination -->
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
        <div class="muted small">Showing <span id="showing">0</span> of <span id="total">0</span></div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <button id="prevPage" class="ghost" style="padding:8px 10px;border-radius:8px">Prev</button>
          <div id="pageInfo" class="muted small">1</div>
          <button id="nextPage" class="ghost" style="padding:8px 10px;border-radius:8px">Next</button>
          <select id="pageSize" style="min-width:70px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit">
            <option value="20">20</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <script>
        /* Minimal client-side app for fetching + filtering analytics entries.
           - Expects POST /analytics/:slug returning { success: true, entries: AnalyticDataRecord[] }
           - AnalyticDataRecord = { time, ip, origin, referer, device, os, browser, source }
        */

        const el = id => document.getElementById(id);

        // state
        let token = '';
        let allEntries = [];    // original fetched entries
        let filtered = [];      // filtered & sorted subset
        let sortKey = 'time';
        let sortDir = -1; // -1 = desc, 1 = asc
        let page = 1;
        let pageSize = parseInt(el('pageSize').value, 10);

        // restore token if the user saved it previously
        if (localStorage.getItem('analytics.token')) {
          token = localStorage.getItem('analytics.token');
          el('managerToken').value = token;
          el('saveToken').checked = true;
          el('tokenState').textContent = 'Token loaded from local storage.';
        }

        // helpers
        function formatTime(iso) {
          try {
            const d = new Date(iso);
            if (isNaN(d)) return iso;
            return d.toLocaleString();
          } catch (e) { return iso; }
        }

        function uniq(arr) {
          return Array.from(new Set(arr.filter(Boolean)));
        }

        function setTokenFromInput(saveToLocal) {
          token = el('managerToken').value.trim();
          if (!token) {
            el('tokenState').textContent = 'Empty token.';
            return false;
          }
          el('tokenState').textContent = 'Token applied.';
          if (saveToLocal) {
            localStorage.setItem('analytics.token', token);
          } else {
            localStorage.removeItem('analytics.token');
          }
          return true;
        }

        el('tokenApply').addEventListener('click', function () {
          const save = el('saveToken').checked;
          setTokenFromInput(save);
        });

        el('saveToken').addEventListener('change', function () {
          if (this.checked) {
            if (!el('managerToken').value.trim()) {
              el('tokenState').textContent = 'Enter a token first to save it.';
              this.checked = false;
              return;
            }
            localStorage.setItem('analytics.token', el('managerToken').value.trim());
          } else {
            localStorage.removeItem('analytics.token');
          }
        });

        // fetch entries from server
        async function fetchEntries() {
          const slug = el('slugInput').value.trim();
          if (!slug) {
            el('tokenState').textContent = 'Slug is required.';
            return;
          }
          if (!token) {
            const applied = setTokenFromInput(false);
            if (!applied) return;
          }

          el('tokenState').textContent = 'Fetching...';
          try {
            const fd = new FormData();
            fd.append('token', token);

            const res = await fetch('/analytics/' + encodeURIComponent(slug), {
              method: 'POST',
              body: fd,
            });

            if (!res.ok) {
              const text = await res.text();
              el('tokenState').textContent = 'Error: ' + text;
              return;
            }

            const json = await res.json();
            if (!json || !json.success || !Array.isArray(json.entries)) {
              el('tokenState').textContent = 'Unexpected server response.';
              return;
            }

            allEntries = json.entries.map(e => normalizeRecord(e)).sort((a,b)=> new Date(b.time) - new Date(a.time));
            page = 1;
            el('tokenState').textContent = 'Fetched ' + allEntries.length + ' entries.';
            populateFilterOptions();
            applyFilters();
          } catch (err) {
            console.error(err);
            el('tokenState').textContent = 'Fetch failed.';
          }
        }

        // normalize record shape (defensive)
        function normalizeRecord(r) {
          return {
            time: r.time || r.t || '',
            ip: r.ip || '',
            origin: r.origin || r.o || '',
            referer: r.referer || r.ref || '',
            device: r.device || '',
            os: r.os || '',
            browser: r.browser || '',
            source: r.source || '',
          };
        }

        // populate drop-down options based on currently fetched data
        function populateFilterOptions() {
          const devices = uniq(allEntries.map(e=>e.device)).sort();
          const oss = uniq(allEntries.map(e=>e.os)).sort();
          const browsers = uniq(allEntries.map(e=>e.browser)).sort();
          const sources = uniq(allEntries.map(e=>e.source)).sort();

          fillSelect(el('deviceFilter'), devices);
          fillSelect(el('osFilter'), oss);
          fillSelect(el('browserFilter'), browsers);
          fillSelect(el('sourceFilter'), sources);
        }

        function fillSelect(selectEl, values) {
          // preserve the first option (the 'all' option)
          const first = selectEl.options[0]?.outerHTML || '';
          selectEl.innerHTML = first;
          for (const v of values) {
            const opt = document.createElement('option');
            opt.value = v;
            opt.text = v;
            selectEl.appendChild(opt);
          }
        }

        // apply text/date/select filters to allEntries -> filtered
        function applyFilters() {
          const text = (el('textSearch').value || '').toLowerCase().trim();
          const from = el('fromDate').value ? new Date(el('fromDate').value) : null;
          const to = el('toDate').value ? new Date(el('toDate').value) : null;
          const device = el('deviceFilter').value;
          const osVal = el('osFilter').value;
          const browser = el('browserFilter').value;
          const source = el('sourceFilter').value;

          filtered = allEntries.filter(rec => {
            if (from) {
              const t = new Date(rec.time);
              if (isNaN(t) || t < from) return false;
            }
            if (to) {
              const t = new Date(rec.time);
              if (isNaN(t) || t > to) return false;
            }
            if (device && rec.device !== device) return false;
            if (osVal && rec.os !== osVal) return false;
            if (browser && rec.browser !== browser) return false;
            if (source && rec.source !== source) return false;

            if (text) {
              const hay = (rec.origin + ' ' + rec.referer + ' ' + rec.ip + ' ' + rec.browser + ' ' + rec.os + ' ' + rec.device + ' ' + rec.source).toLowerCase();
              if (!hay.includes(text)) return false;
            }
            return true;
          });

          sortFiltered();
          renderTable();
          renderStats();
        }

        function sortFiltered() {
          filtered.sort((a,b) => {
            let av = a[sortKey];
            let bv = b[sortKey];
            if (sortKey === 'time') {
              av = new Date(av);
              bv = new Date(bv);
              return (av - bv) * sortDir;
            }
            // string compare
            if ((av || '') < (bv || '')) return -1 * sortDir;
            if ((av || '') > (bv || '')) return 1 * sortDir;
            return 0;
          });
        }

        // render table for current page
        function renderTable() {
          pageSize = parseInt(el('pageSize').value, 10) || 50;
          const tbody = el('entriesTable').querySelector('tbody');
          tbody.innerHTML = '';

          const total = filtered.length;
          el('total').textContent = total;
          const maxPage = Math.max(1, Math.ceil(total / pageSize));
          if (page > maxPage) page = maxPage;

          const start = (page - 1) * pageSize;
          const end = Math.min(total, start + pageSize);
          const pageSlice = filtered.slice(start, end);

          for (const rec of pageSlice) {
            const tr = document.createElement('tr');

            const tTime = document.createElement('td');
            tTime.textContent = formatTime(rec.time);
            tr.appendChild(tTime);

            const tIp = document.createElement('td');
            tIp.textContent = rec.ip || '-';
            tr.appendChild(tIp);

            const tOrigin = document.createElement('td');
            tOrigin.innerHTML = rec.origin ? '<code style=\"font-family:inherit;white-space:nowrap\">' + escapeHtml(rec.origin) + '</code>' : '-';
            tr.appendChild(tOrigin);

            const tReferer = document.createElement('td');
            tReferer.innerHTML = rec.referer ? escapeHtml(rec.referer) : '-';
            tr.appendChild(tReferer);

            const tDevice = document.createElement('td');
            tDevice.textContent = rec.device || '-';
            tr.appendChild(tDevice);

            const tOs = document.createElement('td');
            tOs.textContent = rec.os || '-';
            tr.appendChild(tOs);

            const tBrowser = document.createElement('td');
            tBrowser.textContent = rec.browser || '-';
            tr.appendChild(tBrowser);

            const tSource = document.createElement('td');
            tSource.textContent = rec.source || '-';
            tr.appendChild(tSource);

            tbody.appendChild(tr);
          }

          el('showing').textContent = pageSlice.length;
          el('pageInfo').textContent = page + ' / ' + maxPage;
          el('count').textContent = total + ' entries';
        }

        function renderStats() {
          if (!allEntries.length) {
            el('statsArea').style.display = 'none';
            el('uniqueOrigins').textContent = '0';
            el('uniqueIPs').textContent = '0';
            el('timeRange').textContent = '—';
            return;
          }
          el('statsArea').style.display = 'flex';
          el('uniqueOrigins').textContent = uniq(filtered.map(e => e.origin)).length;
          el('uniqueIPs').textContent = uniq(filtered.map(e => e.ip)).length;

          const times = filtered.map(e => new Date(e.time)).filter(d => !isNaN(d));
          if (times.length) {
            const min = new Date(Math.min.apply(null, times));
            const max = new Date(Math.max.apply(null, times));
            el('timeRange').textContent = min.toLocaleString() + ' — ' + max.toLocaleString();
          } else {
            el('timeRange').textContent = '—';
          }
        }

        // CSV export of currently filtered view
        function exportCSV() {
          if (!filtered.length) {
            alert('No entries to export.');
            return;
          }
          const rows = [['time','ip','origin','referer','device','os','browser','source']];
          for (const r of filtered) {
            rows.push([r.time, r.ip, r.origin, r.referer, r.device, r.os, r.browser, r.source].map(csvSafe));
          }
          const csv = rows.map(r => r.join(',')).join('\\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'analytics-export.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }

        // helpers for escaping / csv
        function escapeHtml(s) {
          if (!s) return '';
          return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function csvSafe(s) {
          if (s === null || s === undefined) return '\"\"';
          const str = String(s).replace(/\"/g, '\"\"');
          return '\"' + str + '\"';
        }

        // simple column sort attachments
        document.querySelectorAll('#entriesTable thead th[data-key]').forEach(th => {
          th.addEventListener('click', function () {
            const k = this.getAttribute('data-key');
            if (sortKey === k) sortDir = -sortDir;
            else { sortKey = k; sortDir = (k === 'time') ? -1 : 1; }
            // update header arrow
            document.querySelectorAll('#entriesTable thead th[data-key]').forEach(h => {
              h.textContent = h.getAttribute('data-key') === sortKey ? (h.getAttribute('data-key') + (sortDir === -1 ? ' ▾' : ' ▴')) : h.getAttribute('data-key');
            });
            sortFiltered();
            renderTable();
          });
        });

        // wire up pagination & controls
        el('prevPage').addEventListener('click', function () { if (page > 1) { page--; renderTable(); } });
        el('nextPage').addEventListener('click', function () {
          const max = Math.max(1, Math.ceil(filtered.length / pageSize));
          if (page < max) { page++; renderTable(); }
        });

        el('pageSize').addEventListener('change', function () {
          pageSize = parseInt(this.value, 10) || 50;
          page = 1;
          renderTable();
        });

        // filter inputs
        ['textSearch','fromDate','toDate','deviceFilter','osFilter','browserFilter','sourceFilter'].forEach(id => {
          el(id).addEventListener('input', function () {
            page = 1;
            applyFilters();
          });
        });

        // fetch / export buttons
        el('fetchBtn').addEventListener('click', fetchEntries);
        el('csvBtn').addEventListener('click', exportCSV);

        // initial render
        renderTable();
      </script>
    </div>
  `));
});


function genSlug(len = 4) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}