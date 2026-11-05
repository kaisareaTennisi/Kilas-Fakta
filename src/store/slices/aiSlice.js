import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

/**
 * aiSlice — interaksi AI (Gemini) via backend: verifikasi & ringkasan klaim.
 * Backend endpoint: POST /news/summarize { title, text, url }
 * Respons: { success, summary: { points: [...], verdict?, model? } }
 */

export const analyzeClaim = createAsyncThunk(
  'ai/analyze',
  async ({ title, text, url }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/news/summarize', {
        title: title || undefined,
        text,
        url: url || undefined,
      })
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

const initialState = {
  // Riwayat percakapan ala chat: { role: 'user'|'assistant', text, points, verdict, createdAt }
  messages: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
}

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    clearConversation(state) {
      state.messages = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeClaim.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        // Simpan klaim user sebagai bubble "user" agar tampil di chat.
        const arg = action.meta.arg || {}
        state.messages.push({
          role: 'user',
          text: arg.text || '',
          createdAt: new Date().toISOString(),
        })
      })
      .addCase(analyzeClaim.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const summary = action.payload?.summary || {}
        state.messages.push({
          role: 'assistant',
          text: summary.text || null,
          points: Array.isArray(summary.points) ? summary.points : [],
          verdict: summary.verdict || null,
          model: summary.model || 'gemini',
          createdAt: new Date().toISOString(),
        })
      })
      .addCase(analyzeClaim.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Analisis gagal. Coba lagi.'
      })
  },
})

export const { clearConversation } = aiSlice.actions

export const selectAIMessages = (state) => state.ai.messages

export default aiSlice.reducer
