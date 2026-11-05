import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import { User } from '../models/index.js'
import { verifyGoogleIdToken } from '../services/googleService.js'

/**
 * authController — registrasi, login (JWT), dan Google Sign-In.
 * Respons selalu: { success, message, token, user }
 */

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  provider: user.googleId ? 'google' : 'credentials',
})

const fail = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

/** POST /auth/register { name, email, password } */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      fail(400, 'Nama, email, dan password wajib diisi.')
    }
    if (String(password).length < 6) {
      fail(400, 'Password minimal 6 karakter.')
    }

    const existing = await User.findOne({
      where: { email: String(email).toLowerCase() },
    })
    if (existing) {
      fail(409, 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.')
    }

    const hashed = await bcrypt.hash(String(password), 10)
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashed,
    })

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      token: signToken(user),
      user: serializeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

/** POST /auth/login { email, password } */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      fail(400, 'Email dan password wajib diisi.')
    }

    const user = await User.findOne({
      where: { email: String(email).toLowerCase().trim() },
    })
    if (!user || !user.password) {
      fail(401, 'Email atau password salah.')
    }

    const isMatch = await bcrypt.compare(String(password), user.password)
    if (!isMatch) {
      fail(401, 'Email atau password salah.')
    }

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token: signToken(user),
      user: serializeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /auth/google { idToken }
 * Frontend @react-oauth/google mengirim credential (ID Token) yang
 * diverifikasi lewat googleService.verifyGoogleIdToken().
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body || {}

    if (!idToken) {
      fail(400, 'idToken wajib diisi (kirim melalui body { idToken }).')
    }

    const profile = await verifyGoogleIdToken(idToken)

    // Guard: verifikasi bisa "sukses" tapi tidak membawa profil yang layak.
    if (!profile || !profile.email) {
      fail(401, 'Token Google tidak valid atau sudah kedaluwarsa.')
    }

    const [user, created] = await User.findOrCreate({
      where: { email: profile.email },
      defaults: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        avatar: profile.avatar || null,
        password: null,
      },
    })

    if (!created && profile.googleId && user.googleId !== profile.googleId) {
      user.googleId = profile.googleId
      user.avatar = profile.avatar || user.avatar
      await user.save()
    }

    return res.json({
      success: true,
      message: created ? 'Login Google berhasil (akun baru dibuat).' : 'Login Google berhasil.',
      token: signToken(user),
      user: serializeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}
