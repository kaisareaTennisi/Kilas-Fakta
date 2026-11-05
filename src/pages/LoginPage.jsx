import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { GoogleLogin } from '@react-oauth/google'
import { AlertCircle, LogIn, Newspaper } from 'lucide-react'
import {
  clearAuthError,
  googleLogin,
  login,
  selectAuthUser,
} from '../store/slices/authSlice'
import { useToast } from '../context/toast'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const user = useSelector(selectAuthUser)
  const { isLoading, error } = useSelector((state) => state.auth)

  const [form, setForm] = useState({ email: '', password: '' })

  // Sudah login? Langsung ke beranda.
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  // Bersihkan error saat meninggalkan halaman.
  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      toast('Email dan password wajib diisi.', 'error')
      return
    }
    try {
      await dispatch(login(form)).unwrap()
      toast('Login berhasil. Selamat datang kembali!', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      toast(err?.message || 'Login gagal.', 'error')
    }
  }

  const handleGoogle = async (response) => {
    if (!response?.credential) {
      toast('Kredensial Google tidak diterima.', 'error')
      return
    }
    try {
      await dispatch(googleLogin(response.credential)).unwrap()
      toast('Login dengan Google berhasil.', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      toast(err?.message || 'Login Google gagal.', 'error')
    }
  }

  const inputClasses =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Branding */}
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-lg">
            <Newspaper className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Kilas<span className="text-indigo-600">Fakta</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">Masuk ke akun Anda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Untuk membaca ringkasan berita dan mengelola bookmark.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          {/* Pembatas */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              atau
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Google Sign-In */}
          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogle} onError={() => toast('Login Google dibatalkan.', 'error')} locale="id" />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Belum punya akun?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
