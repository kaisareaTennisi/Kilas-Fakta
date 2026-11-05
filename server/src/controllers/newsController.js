import { fetchNews, SAMPLE_NEWS } from '../services/newsService.js'
import { analyzeFact, summarizeText } from '../services/geminiService.js'

/**
 * newsController — proxy News API + integrasi Gemini (ringkasan & fact-check).
 * Kontrak frontend:
 * - GET  /news              → { success, data: { articles } }
 * - GET  /news/:id/summary  → { success, data: { summary: <string>, title } }
 * - POST /news/summarize    → { success, summary: { text, points, verdict, model } }
 */

const fail = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

/** GET /news?category=teknologi&q=... */
export const getNews = async (req, res, next) => {
  try {
    const { category = 'umum', q = '' } = req.query || {}
    const articles = await fetchNews({ category, q })

    return res.json({
      success: true,
      message: 'Daftar berita berhasil diambil.',
      data: { articles },
    })
  } catch (error) {
    return next(error)
  }
}

/** Cari artikel sampel/demo berdasarkan id (untuk mode tanpa API key). */
const findSampleById = (id) => SAMPLE_NEWS.find((a) => String(a.id) === String(id)) || null

/**
 * Resolusi artikel berdasarkan id:
 * 1) cari pada data contoh (mode demo tanpa API key), lalu
 * 2) cari pada feed aktif (NewsAPI/Currents atau data contoh) agar id dari
 *    halaman Home tetap bisa diringkas.
 * Mengembalikan null bila artikel tidak ditemukan di sumber mana pun.
 */
const resolveArticle = async (id) => {
  const sample = findSampleById(id)
  if (sample) return sample

  const articles = await fetchNews({})
  return (articles || []).find((a) => String(a.id) === String(id)) || null
}

/** GET /news/:id/summary — ringkasan string untuk SummaryModal. */
export const getSummary = async (req, res, next) => {
  try {
    const { id } = req.params || {}

    if (!id) fail(400, 'Parameter id artikel wajib ada.')

    const article = await resolveArticle(id)
    if (!article) {
      fail(404, 'Artikel tidak ditemukan di sumber berita aktif.')
    }

    const summary = await summarizeText(`${article.title || ''}. ${article.description || ''}`)

    return res.json({
      success: true,
      message: 'Ringkasan berhasil dibuat.',
      data: { summary, title: article.title || '' },
    })
  } catch (error) {
    return next(error)
  }
}

/** POST /news/summarize { title?, text, url? } — fact-check Gemini untuk aiSlice. */
export const summarize = async (req, res, next) => {
  try {
    const { title = '', text = '', url = '' } = req.body || {}

    if (!String(text).trim()) {
      fail(400, 'Teks klaim wajib diisi (kirim melalui body { text }).')
    }

    const summary = await analyzeFact({ title, text, url })

    return res.json({
      success: true,
      message: 'Analisis berhasil dibuat.',
      summary,
    })
  } catch (error) {
    return next(error)
  }
}
