import { Hono } from 'hono'
import { Context } from 'hono'
import { type Env } from './types'

const app = new Hono<{ Bindings: Env }>()


const BASE_REDIRECT = "https://sajed.dev/redirect?"

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

/**
 * Main route: catch-all; we will extract slug based on host/path and redirect.
 * Use a 302 (temporary) by default; change to 301 if you want permanent.
 */
// Use the manage/router.ts
import { router } from "./endpoints/manage/router";
app.route('/manage', router)

app.get('*', async (c) => {
  const req = c.req.raw
  const slug = extractSlug(req)

  if (slug === null) {
    return c.text('Not found', 404)
  }

  const url = new URL(req.url)
  const qs = url.search // includes leading '?' or ''


  try {
    // @ts-ignore - LINKS binding may not exist in development
    const kv = c.env?.LINKS
    if (kv && typeof kv.get === 'function') {
      // if you stored JSON or plain URL. We assume plain URL string.
      const dest = await (kv.get as KVNamespace).get<string>(slug)
      if (dest) {
        // If dest already contains a query, we append current qs only if present
        const redirectUrl = qs && !dest.includes('?') ? dest + qs : dest
        return c.redirect(redirectUrl, 302)
      }
    }
  } catch (err) {
    // Continue to fallback; don't fail hard on KV errors.
    console.warn('KV lookup failure', err)
  }


  const suffix = slug ? encodeURI(slug) : ''
  const target = BASE_REDIRECT.endsWith('/') || suffix === '' ? BASE_REDIRECT + suffix : BASE_REDIRECT + '/' + suffix
  const final = qs ? target + qs : target

  return c.redirect(final, 302)
})

export default {
  fetch: app.fetch,
}
