import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

const fallbackId = (obj) => {
  const seed = obj.title || obj.url || JSON.stringify(obj)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return `bookmark-${Math.abs(hash)}`
}

/** Normalisasi daftar bookmark dari backend (bisa memuat objek berita di dalamnya). */
export const normalizeBookmarks = (payload) => {
  const p = payload?.data ?? payload ?? {}
  const raw = p.bookmarks ?? p.data ?? (Array.isArray(p) ? p : [])
  if (!Array.isArray(raw)) return []
  return raw.map((b) => {
    const news = b.news ?? b.article ?? b
    const id = b.id ?? b._id ?? news.id ?? news._id ?? fallbackId(b)
    return {
      id,
      newsId: String(b.newsId ?? news.id ?? news._id ?? id),
      title: news.title || b.title || 'Tanpa Judul',
      description:
        news.description || news.content || b.description || b.content || '',
      imageUrl: news.imageUrl || news.image_url || b.imageUrl || b.image_url || '',
      source:
        (news.source && (news.source.name || news.source)) ||
        b.source ||
        'KilasFakta',
      category: news.category || b.category || 'umum',
      publishedAt: news.publishedAt || news.published_at || b.date || '',
      userNotes: b.userNotes || b.notes || '',
      summary: b.summary || '', // ringkasan AI yang ikut tersimpan (jika ada)
      url: news.url || b.url || '',
    }
  })
}

const buildBookmarkItem = (article, notes = '') => ({
  id: `local-${article.id}`,
  newsId: String(article.id),
  title: article.title || 'Tanpa Judul',
  description: article.description || '',
  imageUrl: article.imageUrl || '',
  source: article.source || 'KilasFakta',
  category: article.category || 'umum',
  publishedAt: article.publishedAt || '',
  userNotes: notes,
  summary: '',
  url: article.url || '',
})

// ---------- Async Thunks ----------

export const fetchBookmarks = createAsyncThunk(
  'bookmarks/fetchBookmarks',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/bookmarks')
      return data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal memuat bookmark.',
      )
    }
  },
)

export const saveBookmark = createAsyncThunk(
  'bookmarks/saveBookmark',
  async ({ article, notes = '' }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/bookmarks', {
        newsId: article?.id,
        title: article?.title,
        description: article?.description,
        imageUrl: article?.imageUrl,
        source: article?.source,
        category: article?.category,
        publishedAt: article?.publishedAt,
        url: article?.url,
        userNotes: notes,
      })
      return { article, notes, response: data }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal menyimpan bookmark.',
      )
    }
  },
)

export const updateBookmark = createAsyncThunk(
  'bookmarks/updateBookmark',
  async ({ id, userNotes }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/bookmarks/${id}`, { userNotes })
      return { id, userNotes, response: data }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal memperbarui catatan.',
      )
    }
  },
)

export const deleteBookmark = createAsyncThunk(
  'bookmarks/deleteBookmark',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/bookmarks/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal menghapus bookmark.',
      )
    }
  },
)
// ---------- Slice ----------

const initialState = {
  items: [],
  isLoading: false,
  error: null,
}

const bookmarkSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    clearBookmarks(state) {
      state.items = []
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = normalizeBookmarks(action.payload)
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      .addCase(saveBookmark.pending, (state) => {
        state.error = null
      })
      .addCase(saveBookmark.fulfilled, (state, action) => {
        const { article, notes } = action.payload
        const exists = state.items.some((b) => String(b.newsId) === String(article?.id))
        if (exists) return

        // Jika backend membalas objek bookmark lengkap, pakai id aslinya.
        const res = action.payload.response
        const saved = res?.bookmark ?? res?.data ?? res
        if (saved && (saved.id || saved._id)) {
          const normalized = normalizeBookmarks([saved])[0]
          state.items.unshift({
            // keep: gunakan id server bila ada, fallback dari normalize
            ...normalized,
            id: saved.id ?? saved._id ?? normalized.id ?? `local-${article?.id}`,
            newsId: String(saved.newsId ?? article?.id),
            userNotes: notes || normalized.userNotes,
          })
        } else {
          state.items.unshift(buildBookmarkItem(article, notes))
        }
      })
      .addCase(saveBookmark.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(updateBookmark.fulfilled, (state, action) => {
        const { id, userNotes } = action.payload
        state.items = state.items.map((b) =>
          b.id === id ? { ...b, userNotes } : b,
        )
      })
      .addCase(updateBookmark.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload)
      })
      .addCase(deleteBookmark.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { clearBookmarks } = bookmarkSlice.actions
export default bookmarkSlice.reducer