import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

/** Daftar kategori berita yang ditampilkan di fitur filter. */
export const CATEGORIES = [
  { key: 'umum', label: 'Umum' },
  { key: 'nasional', label: 'Nasional' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'teknologi', label: 'Teknologi' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'hiburan', label: 'Hiburan' },
  { key: 'sains', label: 'Sains' },
  { key: 'internasional', label: 'Internasional' },
]

const fallbackId = (obj) => {
  const seed = obj.title || obj.url || JSON.stringify(obj)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return `news-${Math.abs(hash)}`
}

/** Normalisasi artikel dari berbagai bentuk struktur data backend. */
export const normalizeArticles = (payload) => {
  const p = payload?.data ?? payload ?? {}
  const raw = p.articles ?? p.data ?? (Array.isArray(p) ? p : [])
  if (!Array.isArray(raw)) return []
  return raw.map((a) => ({
    id: a.id ?? a._id ?? a.slug ?? fallbackId(a),
    title: a.title || a.judul || 'Tanpa Judul',
    description: a.description || a.content || a.snippet || a.deskripsi || '',
    imageUrl: a.imageUrl || a.image_url || a.urlToImage || a.thumbnail || '',
    source:
      (a.source && (a.source.name || a.source)) || a.sumber || 'KilasFakta',
    author: a.author || '',
    category:
      a.category || a.kategori || (a.source === 'sains' ? 'sains' : 'umum'),
    publishedAt: a.publishedAt || a.published_at || a.date || a.tanggal || '',
    url: a.url || '',
  }))
}

const normalizeSummaryPoints = (payload) => {
  const p = payload?.data ?? payload ?? {}
  const points =
    p.summary ?? p.points ?? p.facts ?? p.ringkasan ?? (Array.isArray(p) ? p : [])
  if (Array.isArray(points)) {
    return points
      .map((pt) =>
        typeof pt === 'string' ? pt : pt.text || pt.fact || pt.point || '',
      )
      .filter(Boolean)
  }
  if (typeof points === 'string') {
    return points
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return []
}

// ---------- Async Thunks ----------

export const fetchNews = createAsyncThunk(
  'news/fetchNews',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/news', { params })
      return data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal memuat berita. Pastikan server backend aktif.',
      )
    }
  },
)

// Memanggil endpoint ringkasan AI (Gemini) untuk satu artikel.
export const fetchSummary = createAsyncThunk(
  'news/fetchSummary',
  async (newsId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/news/${newsId}/summary`)
      const points = normalizeSummaryPoints(data)
      const raw = data?.data ?? data
      const summaryText =
        typeof raw?.summary === 'string' ? raw.summary : ''
      const title = raw?.title || ''
      return { newsId, points, summaryText, title }
    } catch (error) {
      return rejectWithValue({
        newsId,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal membuat ringkasan. Silakan coba lagi nanti.',
      })
    }
  },
)

// ---------- Slice ----------

const initialState = {
  articles: [],
  category: 'umum',
  searchQuery: '',
  isLoading: false,
  error: null,
  // Peta status ringkasan AI per artikel: { [newsId]: { status, points, summaryText, error } }
  summaries: {},
}

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setCategory(state, action) {
      state.category = action.payload
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload
    },
    resetSummary(state, action) {
      const id = action.payload
      if (id) state.summaries[id] = { status: 'idle', points: [], summaryText: '', error: null }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.isLoading = false
        state.articles = normalizeArticles(action.payload)
      })
      .addCase(fetchNews.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(fetchSummary.pending, (state, action) => {
        const id = action.meta.arg
        state.summaries[id] = {
          status: 'loading',
          points: [],
          summaryText: '',
          error: null,
        }
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        const { newsId, points, summaryText, title } = action.payload
        state.summaries[newsId] = {
          status: 'success',
          points,
          summaryText,
          title,
          error: null,
        }
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        const { newsId, message } = action.payload || {}
        if (newsId) {
          state.summaries[newsId] = {
            status: 'error',
            points: [],
            summaryText: '',
            error: message,
          }
        }
      })
  },
})

export const { setCategory, setSearchQuery, resetSummary } = newsSlice.actions
export default newsSlice.reducer