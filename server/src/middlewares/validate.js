/**
 * Request Validation Middleware
 * - requiredFields: semua field wajib ada & tidak kosong.
 * - requireAny     : minimal satu field terisi (untuk /news/summarize).
 * Field dianggap "kosong" bila undefined/null atau string whitespace saja.
 */
const isMissing = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '')

export const requiredFields = (fields, message) => (req, res, next) => {
  const body = req.body || {}
  const missing = fields.filter((field) => isMissing(body[field]))

  if (missing.length > 0) {
    const err = new Error(message)
    err.statusCode = 400
    return next(err)
  }
  return next()
}

export const requireAny = (fields, message) => (req, res, next) => {
  const body = req.body || {}
  const hasAny = fields.some((field) => !isMissing(body[field]))

  if (!hasAny) {
    const err = new Error(message)
    err.statusCode = 400
    return next(err)
  }
  return next()
}