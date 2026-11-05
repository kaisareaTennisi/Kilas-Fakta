import { Bookmark, User } from '../models/index.js'

/**
 * bookmarkController — CRUD bookmark milik user (diproteksi middleware auth).
 * Kontrak frontend (bookmarkSlice):
 * - GET    /bookmarks        → { success, data: { bookmarks } }
 * - POST   /bookmarks        → { success, bookmark }   (idempotent per user+newsId)
 * - PATCH  /bookmarks/:id    → { success, bookmark }
 * - DELETE /bookmarks/:id    → { success }
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const fail = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

/** Guard: :id harus UUID valid agar tidak menembus Sequelize dengan string bebas. */
const notFoundIfInvalidId = (id) => {
  if (!UUID_RE.test(String(id))) {
    fail(404, 'Bookmark tidak ditemukan.')
  }
}

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  userId: bookmark.userId,
  newsId: bookmark.newsId,
  title: bookmark.title,
  description: bookmark.description || '',
  imageUrl: bookmark.imageUrl || '',
  source: bookmark.source || 'KilasFakta',
  category: bookmark.category || 'umum',
  publishedAt: bookmark.publishedAt,
  url: bookmark.url || '',
  userNotes: bookmark.userNotes || '',
  summary: bookmark.summary || '',
  createdAt: bookmark.createdAt,
  updatedAt: bookmark.updatedAt,
})

/** GET /bookmarks — daftar bookmark user terkini. */
export const listBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
    })

    return res.json({
      success: true,
      message: 'Daftar bookmark berhasil diambil.',
      data: { bookmarks: bookmarks.map(serializeBookmark) },
    })
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /bookmarks { newsId, title, ... , userNotes }
 * findOrCreate: jika user sudah mem-bookmark newsId yang sama,
 * kembalikan bookmark yang sudah ada (idempotent, tanpa error 409).
 */
export const createBookmark = async (req, res, next) => {
  try {
    const body = req.body || {}

    if (!body.newsId) {
      fail(400, 'newsId wajib diisi.')
    }

    const defaults = {
      title: body.title || 'Tanpa Judul',
      description: body.description || '',
      imageUrl: body.imageUrl || '',
      source: body.source || 'KilasFakta',
      category: body.category || 'umum',
      url: body.url || '',
      userNotes: body.userNotes || '',
      summary: body.summary || '',
    }
    if (body.publishedAt) defaults.publishedAt = new Date(body.publishedAt)

    const [bookmark, created] = await Bookmark.findOrCreate({
      where: { userId: req.userId, newsId: String(body.newsId) },
      defaults,
    })

    if (!created) {
      // Idempotent: kembalikan yang sudah ada (frontend menghindari duplikat).
      return res.json({
        success: true,
        message: 'Artikel sudah ada di bookmark.',
        bookmark: serializeBookmark(bookmark),
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Berhasil disimpan ke bookmark.',
      bookmark: serializeBookmark(bookmark),
    })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /bookmarks/:id { userNotes?, category? } */
export const updateBookmark = async (req, res, next) => {
  try {
    const { id } = req.params
    const { userNotes, category } = req.body || {}

    notFoundIfInvalidId(id)

    const bookmark = await Bookmark.findOne({
      where: { id, userId: req.userId },
    })
    if (!bookmark) fail(404, 'Bookmark tidak ditemukan.')

    if (userNotes !== undefined) bookmark.userNotes = userNotes
    if (category !== undefined) bookmark.category = category
    await bookmark.save()

    return res.json({
      success: true,
      message: 'Bookmark berhasil diperbarui.',
      bookmark: serializeBookmark(bookmark),
    })
  } catch (error) {
    return next(error)
  }
}

/** DELETE /bookmarks/:id */
export const deleteBookmark = async (req, res, next) => {
  try {
    const { id } = req.params

    notFoundIfInvalidId(id)

    const bookmark = await Bookmark.findOne({
      where: { id, userId: req.userId },
    })
    if (!bookmark) fail(404, 'Bookmark tidak ditemukan.')

    await bookmark.destroy()

    return res.json({
      success: true,
      message: 'Bookmark berhasil dihapus.',
    })
  } catch (error) {
    return next(error)
  }
}
