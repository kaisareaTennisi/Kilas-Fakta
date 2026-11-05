import axios from 'axios'
import config from '../config/env.js'

/**
 * newsService — integrasi 3rd-party News API.
 * Prioritas: NewsAPI.org → Currents API → data contoh (mode dev/demo),
 * sehingga UI tetap berfungsi tanpa API key.
 */

const NEWS_API_BASE = 'https://newsapi.org/v2'
const CURRENTS_BASE = 'https://api.currentsapi.services/v1'

// Kategori frontend (Indonesia) → kategori API eksternal
const CATEGORY_MAP = {
  umum: null,
  nasional: null,
  politik: 'politics',
  ekonomi: 'business',
  teknologi: 'technology',
  olahraga: 'sports',
  hiburan: 'entertainment',
  sains: 'science',
  internasional: 'world',
}

/** Data contoh untuk mode dev tanpa API key (fallback demo). */
export const SAMPLE_NEWS = [
  {
    id: 'sample-1',
    title: 'Gempa Berkekuatan 5,6 SR Guncang Wilayah Sumatera Barat',
    description:
      'Badan Meteorologi memastikan tidak ada potensi tsunami dari gempa yang berpusat di kedalaman 60 km.',
    imageUrl: '',
    source: 'Antara',
    category: 'nasional',
    publishedAt: new Date().toISOString(),
    url: '',
  },
  {
    id: 'sample-2',
    title: 'Rupiah Menguat ke Level Terkuat dalam Lima Bulan Terakhir',
    description:
      'Nilai tukar rupiah ditutup menguat seiring meningkatnya kepercayaan investor asing.',
    imageUrl: '',
    source: 'Bisnis Indonesia',
    category: 'ekonomi',
    publishedAt: new Date().toISOString(),
    url: '',
  },
  {
    id: 'sample-3',
    title: 'Startup Lokal Luncurkan Model AI Penjawab Pertanyaan Medis',
    description:
      'Teknologi ini dilatih dengan data literatur medis berbahasa Indonesia.',
    imageUrl: '',
    source: 'TechNode',
    category: 'teknologi',
    publishedAt: new Date().toISOString(),
    url: '',
  },
]

export const normalizeArticle = (item, category = 'umum') => ({
  id: item.id || item.url || `${category}-${item.title}`,
  title: item.title || 'Tanpa Judul',
  description: item.description || item.content || item.snippet || '',
  imageUrl: item.imageUrl || item.image_url || item.urlToImage || '',
  source: (item.source && (item.source.name || item.source)) || 'News API',
  category: item.category || category,
  publishedAt: item.publishedAt || item.published_at || item.date || '',
  url: item.url || '',
})

/** Ambil berita dari NewsAPI.org (top-headlines / everything). */
export async function fetchFromNewsApi({ category, q } = {}) {
  const cat = CATEGORY_MAP[category] || null

  let endpoint
  const params = { apiKey: config.newsApiKey }

  if (q) {
    endpoint = `${NEWS_API_BASE}/everything`
    params.q = q
    params.language = 'id'
    params.pageSize = 12
  } else {
    endpoint = `${NEWS_API_BASE}/top-headlines`
    params.country = 'id'
    if (cat) params.category = cat
    params.pageSize = 12
  }

  const { data } = await axios.get(endpoint, { params, timeout: 12000 })
  return (data.articles || []).map((a) => normalizeArticle(a, category || 'umum'))
}

/** Ambil berita dari Currents API (fallback kedua). */
export async function fetchFromCurrents({ category, q } = {}) {
  const cat = CATEGORY_MAP[category]
  let endpoint = `${CURRENTS_BASE}/latest-news`
  if (q) endpoint = `${CURRENTS_BASE}/search`

  const params = {
    apiKey: config.currentsApiKey,
    language: 'id',
    ...(q ? { keywords: q } : {}),
    ...(cat ? { category: [cat] } : {}),
  }

  const { data } = await axios.get(endpoint, { params, timeout: 12000 })
  return (data.news || []).map((a) => normalizeArticle(a, category || 'umum'))
}

/**
 * Fungsi utama: NewsAPI (bila ada key) → Currents (bila ada key) →
 * data contoh. Di produksi, bila kedua sumber gagal → 502.
 */
export async function fetchNews({ category = 'umum', q = '' } = {}) {
  let result = null
  let lastError = null

  if (config.newsApiKey) {
    try {
      result = await fetchFromNewsApi({ category, q })
    } catch (err) {
      lastError = err
    }
  }

  if ((!result || result.length === 0) && config.currentsApiKey) {
    try {
      result = await fetchFromCurrents({ category, q })
    } catch (err) {
      lastError = err
    }
  }

  if (!result || result.length === 0) {
    if (config.nodeEnv === 'production' && lastError) {
      const error = new Error(
        'Gagal mengambil berita dari sumber eksternal. Coba lagi nanti.',
      )
      error.statusCode = 502
      throw error
    }

    let sample = SAMPLE_NEWS.map((a) => ({ ...a }))
    if (category && category !== 'umum') {
      sample = sample.filter((a) => a.category === category)
    }
    if (q) {
      sample = sample.filter((a) =>
        a.title.toLowerCase().includes(q.toLowerCase()),
      )
    }
    result = sample
  }

  return result
}

export default fetchNews
