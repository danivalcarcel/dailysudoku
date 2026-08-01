// Worker entry point: API routes under /api/*, everything else falls
// through to the static SPA build (env.ASSETS). Kept separate from src/
// since it runs in the Workers runtime, not the browser.

import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import {
  verifyGoogleCredential,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from './auth.js'

const app = new Hono()
const NICKNAME_RE = /^[a-zA-Z0-9_ ]{3,20}$/

async function readJsonBody(c) {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

async function requireAuth(c, next) {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: 'unauthorized' }, 401)

  try {
    c.set('userId', await verifySessionToken(token, c.env.SESSION_SECRET))
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  await next()
}

app.get('/api/health', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  ).all()
  return c.json({ ok: true, tables: results.map((r) => r.name) })
})

app.post('/api/auth/google', async (c) => {
  const body = await readJsonBody(c)
  if (!body?.credential) return c.json({ error: 'missing credential' }, 400)

  let googleUser
  try {
    googleUser = await verifyGoogleCredential(body.credential, c.env.GOOGLE_CLIENT_ID)
  } catch {
    return c.json({ error: 'invalid credential' }, 401)
  }

  await c.env.DB.prepare(
    `INSERT INTO users (google_sub, email, created_at) VALUES (?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email`,
  )
    .bind(googleUser.sub, googleUser.email, Date.now())
    .run()

  const user = await c.env.DB.prepare('SELECT id, nickname FROM users WHERE google_sub = ?')
    .bind(googleUser.sub)
    .first()

  const token = await createSessionToken(user.id, c.env.SESSION_SECRET)
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return c.json({ nickname: user.nickname, needsNickname: !user.nickname })
})

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/me', requireAuth, async (c) => {
  const user = await c.env.DB.prepare('SELECT email, nickname FROM users WHERE id = ?')
    .bind(c.get('userId'))
    .first()
  if (!user) return c.json({ error: 'unauthorized' }, 401)

  return c.json({ email: user.email, nickname: user.nickname, needsNickname: !user.nickname })
})

app.put('/api/nickname', requireAuth, async (c) => {
  const body = await readJsonBody(c)
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : ''
  if (!NICKNAME_RE.test(nickname)) return c.json({ error: 'invalid' }, 400)

  const clash = await c.env.DB.prepare(
    'SELECT id FROM users WHERE lower(nickname) = lower(?) AND id != ?',
  )
    .bind(nickname, c.get('userId'))
    .first()
  if (clash) return c.json({ error: 'taken' }, 409)

  await c.env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?')
    .bind(nickname, c.get('userId'))
    .run()

  return c.json({ nickname })
})

function parseProgressRow(row) {
  return {
    board: JSON.parse(row.board),
    notes: JSON.parse(row.notes),
    completedUnits: JSON.parse(row.completed_units),
    scored: !!row.scored,
    elapsedSeconds: row.elapsed_seconds,
    mistakes: row.mistakes,
  }
}

app.get('/api/progress/:date/:difficulty', requireAuth, async (c) => {
  const { date, difficulty } = c.req.param()
  const row = await c.env.DB.prepare(
    'SELECT board, notes, completed_units, scored, elapsed_seconds, mistakes FROM progress WHERE user_id = ? AND date = ? AND difficulty = ?',
  )
    .bind(c.get('userId'), date, difficulty)
    .first()

  return c.json({ progress: row ? parseProgressRow(row) : null })
})

app.put('/api/progress/:date/:difficulty', requireAuth, async (c) => {
  const { date, difficulty } = c.req.param()
  const body = await readJsonBody(c)
  if (!body) return c.json({ error: 'invalid body' }, 400)

  await c.env.DB.prepare(
    `INSERT INTO progress (user_id, date, difficulty, board, notes, completed_units, scored, elapsed_seconds, mistakes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date, difficulty) DO UPDATE SET
       board = excluded.board,
       notes = excluded.notes,
       completed_units = excluded.completed_units,
       scored = excluded.scored,
       elapsed_seconds = excluded.elapsed_seconds,
       mistakes = excluded.mistakes,
       updated_at = excluded.updated_at`,
  )
    .bind(
      c.get('userId'),
      date,
      difficulty,
      JSON.stringify(body.board),
      JSON.stringify(body.notes),
      JSON.stringify(body.completedUnits),
      body.scored ? 1 : 0,
      body.elapsedSeconds ?? 0,
      body.mistakes ?? 0,
      Date.now(),
    )
    .run()

  return c.json({ ok: true })
})

app.get('/api/history', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT date, points, times FROM history WHERE user_id = ?')
    .bind(c.get('userId'))
    .all()

  const history = {}
  for (const row of results) {
    history[row.date] = { points: row.points, times: JSON.parse(row.times) }
  }
  return c.json({ history })
})

app.put('/api/history/:date', requireAuth, async (c) => {
  const { date } = c.req.param()
  const body = await readJsonBody(c)
  if (!body) return c.json({ error: 'invalid body' }, 400)

  await c.env.DB.prepare(
    `INSERT INTO history (user_id, date, points, times, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       points = excluded.points,
       times = excluded.times,
       updated_at = excluded.updated_at`,
  )
    .bind(c.get('userId'), date, body.points ?? 0, JSON.stringify(body.times ?? {}), Date.now())
    .run()

  return c.json({ ok: true })
})

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
