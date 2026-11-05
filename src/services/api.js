import axios from 'axios'

// Instance axios terpusat: semua request API lewat sini.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const TOKEN_KEY = 'kf_token'
export const USER_KEY = 'kf_user'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// Suntikkan token JWT ke setiap request jika ada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Ubah error axios menjadi pesan ramah untuk user.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Waktu tunggu habis. Coba lagi.'))
    }
    if (!error.response) {
      return Promise.reject(
        new Error(
          'Tidak dapat terhubung ke server. Pastikan backend berjalan di port 5000.',
        ),
      )
    }
    const { status, data } = error.response
    const message = data?.message
    if (status === 401) {
      return Promise.reject(
        new Error(message || 'Sesi berakhir. Silakan login kembali.'),
      )
    }
    if (status === 403) {
      return Promise.reject(new Error(message || 'Akses ditolak.'))
    }
    if (status === 429) {
      return Promise.reject(
        new Error(message || 'Terlalu banyak permintaan. Coba beberapa saat lagi.'),
      )
    }
    return Promise.reject(new Error(message || 'Terjadi kesalahan. Coba lagi.'))
  },
)

export default api
