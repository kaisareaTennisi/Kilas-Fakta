/**
 * Centralized Error Handling
 * - Semua error dari controller dilempar ke sini via next(error).
 * - Error Sequelize (UniqueConstraint, Validation) dipetakan ke status 400/409.
 * - Body JSON rusak (malformed) dipetakan ke 400.
 */

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute tidak ditemukan: ${req.method} ${req.originalUrl}`,
  })
}

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Body JSON tidak valid dari express.json()
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Format JSON pada body tidak valid.',
    })
  }

  // Error validasi/unique constraint dari Sequelize
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah digunakan. Periksa kembali input Anda.',
    })
  }
  if (err?.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: err.errors?.map((e) => e.message).join(', '),
    })
  }
  if (err?.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan database. Pastikan skema sudah disinkronkan.',
    })
  }

  // Error khusus yang dibuat controller (memiliki statusCode)
  const statusCode = err?.statusCode || 500
  const message = err?.message || 'Terjadi kesalahan internal server.'

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err)
  }

  return res.status(statusCode).json({ success: false, message })
}

export default errorHandler