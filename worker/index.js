// Worker entry point: API routes under /api/*, everything else falls
// through to the static SPA build (env.ASSETS). Kept separate from src/
// since it runs in the Workers runtime, not the browser.

import { Hono } from 'hono'

const app = new Hono()

app.get('/api/health', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  ).all()
  return c.json({ ok: true, tables: results.map((r) => r.name) })
})

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
