import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import { User } from '../models/index.js'

/**
 * Authentication Middleware — memvalidasi JWT yang dikirim lewat header
 * `Authorization: Bearer <token>` lalu menempelkan user pada req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Tidak ada token. Silakan masuk terlebih dahulu.',
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, config.jwt.secret)
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa.',
      })
    }

    const user = await User.findByPk(decoded.id)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan.',
      })
    }

    req.user = user
    req.userId = user.id
    return next()
  } catch (error) {
    return next(error)
  }
}

export default authenticate