// Google ID token verification and our own session-cookie signing.
// The session is a stateless signed JWT (HS256, SESSION_SECRET) rather than
// a sessions table: simpler, and revoking everyone by rotating the secret
// is an acceptable tradeoff for a casual daily-puzzle game (see
// .claude/BACKEND_IDEA.md / DECISIONS.md for the "long session" call).

import { jwtVerify, SignJWT, createRemoteJWKSet } from 'jose'

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 24 * 60 * 60

export async function verifyGoogleCredential(credential, clientId) {
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  })
  return { sub: payload.sub, email: payload.email }
}

function secretKey(secret) {
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(userId, secret) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey(secret))
}

export async function verifySessionToken(token, secret) {
  const { payload } = await jwtVerify(token, secretKey(secret))
  return payload.uid
}
