import { OAuth2Client } from 'google-auth-library'
import config from '../config/env.js'

/**
 * googleService — verifikasi Google ID Token untuk endpoint Google Sign-In.
 * - Bila GOOGLE_CLIENT_ID dikonfigurasi ( produksi) → token diverifikasi penuh
 *   melalui google-auth-library.
 * - Bila belum dikonfigurasi (dev/demo) → payload token didekode lokal sehingga
 *   alur tetap bisa diuji; JANGAN dipakai di produksi tanpa client ID resmi.
 */

const decodeIdTokenPayload = (idToken) => {
  try {
    const parts = String(idToken).split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

const fail = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

/**
 * Verifikasi ID Token Google.
 * @returns {{ googleId: string, email: string, name: string, avatar?: string }}
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    fail(400, 'idToken wajib diisi (kirim melalui body { idToken }).')
  }

  const clientId = config.googleClientId
  const isConfigured = clientId && !String(clientId).includes('YOUR_GOOGLE_CLIENT_ID')

  let payload = null
  if (isConfigured) {
    try {
      const client = new OAuth2Client(clientId)
      const ticket = await client.verifyIdToken({ idToken, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      fail(401, 'Token Google tidak valid atau sudah kedaluwarsa.')
    }
  } else {
    // Mode dev tanpa client ID: dekode payload tanpa verifikasi tanda tangan.
    payload = decodeIdTokenPayload(idToken)
  }

  if (!payload?.email) fail(401, 'Token Google tidak memuat email yang valid.')

  return {
    googleId: String(payload.sub || payload.google_id || payload.email),
    email: String(payload.email).toLowerCase(),
    name: payload.name || String(payload.email).split('@')[0],
    avatar: payload.picture || null,
  }
}

export default verifyGoogleIdToken
