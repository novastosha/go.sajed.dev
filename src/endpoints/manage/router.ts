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


function genSlug(len = 4) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}