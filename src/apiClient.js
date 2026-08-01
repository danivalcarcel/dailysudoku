// Thin fetch wrapper shared by auth.js and sync.js: always sends the
// session cookie and parses JSON, never throws on a non-2xx response.

export async function apiRequest(path, options) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}
