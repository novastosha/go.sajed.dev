import { Hono } from 'hono'
import { type Env } from './types'

const app = new Hono<{ Bindings: Env }>()

function extractSlug(req: Request): string | null {
  try {
    const url = new URL(req.url)
    const host = url.hostname
    const pathname = url.pathname || '/'

    if (host === 'go.sajed.dev') {
      return pathname.replace(/^\//, '')
    }

    if ((host === 'sajed.dev' || host.endsWith('.sajed.dev')) && pathname.startsWith('/go/')) {
      return pathname.replace(/^\/go\/?/, '')
    }

    return null
  } catch (e) {
    return null
  }
}


import { router, ShortenedEntry } from "./endpoints/manage/router";
import { RedirectStatusCode } from 'hono/utils/http-status'
app.route('/manage', router)

app.get("/qr/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!slug) {
    return c.text("Slug is required", 400);
  }

  const entryRaw = await c.env.SHORTENER_KV.get("short:" + slug);
  if (!entryRaw) {
    return c.text("Slug not found", 404);
  }

  const entry: ShortenedEntry = JSON.parse(entryRaw);
  const shortUrl = `https://go.sajed.dev/${entry.slug}?utm_source=qr`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(shortUrl)}`;
  const resp = await fetch(qrUrl);
  const blob = await resp.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return c.body(new Uint8Array(arrayBuffer), 200, { "Content-Type": "image/png" });
});

app.get('*', async (c) => {
  const req = c.req.raw
  const slug = extractSlug(req)

  if (slug === null || slug.length === 0) {
    return c.redirect('https://sajed.dev', 301)
  }

  const url = new URL(req.url)
  const qs = url.search // includes leading '?' or ''


  const entryData = await c.env.SHORTENER_KV.get("short:" + slug)
  if (!entryData) {
    return c.text('Not found', 404)
  }

  const entry = JSON.parse(entryData) as ShortenedEntry
  if (!entry || !entry.dest) {
    return c.text('Not found', 404)
  }

  let analytics = await getAnalytics(req, url, c.env, slug);
  if (analytics.slug !== '') {
    await c.env.SHORTENER_KV.put(`analytics:${slug}:${Date.now()}`, JSON.stringify(analytics), { expirationTtl: 60 * 60 * 24 * 90 }) // keep for 90 days
  }

  if (entry.expiry) {
    const now = new Date()
    const exp = new Date(entry.expiry)
    if (exp < now) {
      await c.env.SHORTENER_KV.delete("short:" + slug)

      const list = await c.env.SHORTENER_KV.list({ prefix: `analytics:${slug}:` })
      await Promise.all(list.keys.map(k => c.env.SHORTENER_KV.delete(k.name)))

      return c.redirect('https://sajed.dev/404', 302)
    }
  }

  // Redirect to destination
  let final = entry.dest + qs
  let code_int: RedirectStatusCode = 302; // 301 
  //if (entry.expiry){
  //  code_int = 302;
  //}
  return c.redirect(final, code_int)
})

type AnalyticDataRecord = {
  slug: string;
  time: string;
  origin: string;
  device: string;
  os: string;
  browser: string;
  source: string;
};

const EMPTY_RECORD: AnalyticDataRecord = {
  slug: '',
  time: '',
  origin: '',
  device: '',
  os: '',
  browser: '',
  source: ''
};

async function getAnalytics(req: Request, url: URL, env: any, slug: string): Promise<AnalyticDataRecord> {
  const userAgent = req.headers.get('User-Agent') || ''

  if (!userAgent.includes("Bot") && !userAgent.includes("bot") && !userAgent.includes("BOT")) {
    return EMPTY_RECORD
  }

  let apiRequest = await fetch(`https://api.ipgeolocation.io/v2/user-agent?apiKey=${env.IPGEO_API_KEY}`, {
    headers: {
      'User-Agent': userAgent
    }
  });


  let device = (() => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile')) return 'Mobile'
    if (ua.includes('tablet')) return 'Tablet'
    return 'Desktop'
  })()
  let os = (() => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('windows')) return 'Windows'
    if (ua.includes('macintosh') || ua.includes('mac os x')) return 'MacOS'
    if (ua.includes('linux')) return 'Linux'
    if (ua.includes('android')) return 'Android'
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
    return 'Unknown'
  })()

  let browser = (() => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('edg')) return 'Edge'
    if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
    return 'Unknown'
  })()

  let response: { device: { name: string; type: string; brand: string }; operating_system: { name: string; version_major: string; }; name: string; type: string; version_major: string } = await apiRequest.json()
  if (response && apiRequest.ok) {
    if (response.device.type == response.device.name) {
      device = response.device.type + (response.device.brand ? " " + response.device.brand : "")
    } else {
      device = response.device.type + " " + response.device.name
    }
    browser = response.name + " " + response.type
    os = response.operating_system.name + " " + response.operating_system.version_major
  }

  const origin = req.headers.get('Origin') || url.origin || url.hostname || 'unknown'
  const time = new Date().toISOString()
  const utm_source = url.searchParams.get('utm_source') || 'No source'

  const record: AnalyticDataRecord = {
    slug,
    time,
    origin,
    device,
    os,
    browser,
    source: utm_source
  }
  return record
}


export default {
  fetch: app.fetch,
}
