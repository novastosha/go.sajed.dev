import { Hono } from 'hono'
import { Context } from 'hono'
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
app.route('/manage', router)

app.get('*', async (c) => {
  const req = c.req.raw
  const slug = extractSlug(req)

  if (slug === null) {
    return c.text('Not found', 404)
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
  if (entry.expiry) {
    const now = new Date()
    const exp = new Date(entry.expiry)
    if (exp < now) {
      // remove form kv
      await c.env.SHORTENER_KV.delete("short:" + slug)

      return c.text('Link expired', 410)
    }
  }

  // Redirect to destination
  let final = entry.dest + qs
  return c.redirect(final, 301)
})

export default {
  fetch: app.fetch,
}
