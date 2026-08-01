// Google Identity Services (script tag in index.html) + thin fetch
// wrappers for our own session endpoints (worker/index.js).

const GOOGLE_CLIENT_ID = '748622526703-7ko765jijc1sn6kmt1vbcqmj4be9389g.apps.googleusercontent.com'

export function renderGoogleButton(el, onCredential) {
  if (!el || !window.google?.accounts?.id) return

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  })
  window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'medium' })
}

async function api(path, options) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

export function fetchMe() {
  return api('/api/me')
}

export function loginWithGoogle(credential) {
  return api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
}

export function logout() {
  return api('/api/auth/logout', { method: 'POST' })
}

export function setNickname(nickname) {
  return api('/api/nickname', { method: 'PUT', body: JSON.stringify({ nickname }) })
}
