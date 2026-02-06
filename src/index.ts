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

    if ((host === 'sjd.my')) {
      return pathname.replace(/^\//, '')
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

  const url = new URL(req.url)
  if (url.hostname === "dash.sjd.my") {
    return c.redirect(`https://go.sajed.dev/manage`, 301)
  }

  if (url.hostname.startsWith("puzzle.") || url.hostname.startsWith("pzl.")) {
    const puzzleSlug = url.pathname.replace(/^\//, '').trim();
    return c.redirect(`https://sajed.dev/puzzle${puzzleSlug ? `?puzzle=${puzzleSlug}` : ''}`, 301)
  }

  if (url.hostname.startsWith("blog.") || url.hostname.startsWith("blg.")) {
    const blogSlug = url.pathname.replace(/^\//, '').trim();

    if (blogSlug === "manage") {
      return c.redirect(`https://sajed.dev/blog/manage`, 301)
    }

    return c.redirect(`https://sajed.dev/blog${blogSlug ? `/?post=${blogSlug}` : ''}`, 301)
  }

  if (url.hostname === "dash.blog." || url.hostname === "dash.blg.") {
    return c.redirect(`https://sajed.dev/blog/manage`, 301)
  }
  

  const slug = extractSlug(req)

  if (slug === null || slug.length === 0) {
    return c.redirect('https://sajed.dev', 301)
  }

  const qs = url.search // includes leading '?' or ''


  const entryData = await c.env.SHORTENER_KV.get("short:" + slug)
  if (!entryData) {
    return c.text('Not found', 404)
  }

  const entry = JSON.parse(entryData) as ShortenedEntry
  if (!entry || !entry.dest) {
    return c.text('Not found', 404)
  }

  if (entry.expiry) {
    const now = new Date()
    const exp = new Date(entry.expiry)
    if (exp < now) {
      await c.env.SHORTENER_KV.delete("short:" + slug)

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



export default {
  fetch: app.fetch,
}
