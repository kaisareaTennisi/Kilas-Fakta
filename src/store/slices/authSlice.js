import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export const TOKEN_KEY = 'kf_token'
export const USER_KEY = 'kf_user'

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

const persistAuth = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Normalisasi payload autentikasi dari backend.
 * Mengakomodasi berbagai bentuk respons: { token, user }, { accessToken, user },
 * { data: { token, user } }, dsb.
 */
export const normalizeAuth = (payload) => {
  const p = payload?.data ?? payload ?? {}
  const token = p.token || p.accessToken || p.access_token || null
  const user = p.user || p.userData || p.data?.user || (token ? p : null)
  return { token, user }
}

// ---------- Async Thunks ----------

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials)
      return data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal masuk. Periksa kembali email dan kata sandi Anda.',
      )
    }
  },
)

export const register = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', payload)
      return data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal mendaftar. Silakan coba lagi.',
      )
    }
  },
)

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/google', { idToken })
      return data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal masuk menggunakan Google.',
      )
    }
  },
)

// ---------- Slice ----------

const initialState = {
  user: getStoredUser(),
  token: localStorage.getItem(TOKEN_KEY),
  isLoading: false,
  error: null,
}

const handleAuthFulfilled = (state, { payload }) => {
  state.isLoading = false
  state.error = null
  const { token, user } = normalizeAuth(payload)
  state.token = token ?? state.token
  state.user = user ?? state.user
  persistAuth(token, user)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      handleAuthFulfilled(state, { payload: action.payload })
    },
    logout(state) {
      state.user = null
      state.token = null
      state.error = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, handleAuthFulfilled)
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(googleLogin.fulfilled, handleAuthFulfilled)
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  },
})

export const { setCredentials, logout, clearAuthError } = authSlice.actions

// ---------- Selectors ----------
export const selectAuthUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => Boolean(state.auth.token)

export default authSlice.reducer