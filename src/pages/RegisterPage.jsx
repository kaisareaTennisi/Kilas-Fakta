import { useGoogleLogin } from '@react-oauth/google'
import { Loader2, Newspaper, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../context/toast'
import { googleLogin, register } from '../store/slices/authSlice'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, isLoading, error } = useSelector((state) => state.auth)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  // Jika sudah login (mis. dari Google), arahkan ke beranda.
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Semua kolom wajib diisi.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter.')
      return
    }
    try {
      await dispatch(
        register({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      ).unwrap()
      toast.success('Akun berhasil dibuat. Selamat bergabung!')
      navigate('/', { replace: true })
    } catch {
      // error ditampilkan lewat toast di useEffect(error)
    }
  }

  const handleGoogle = useGoogleLogin({
    onSuccess: async (res) => {
      const token = res?.credential || res?.code
      try {
        await dispatch(googleLogin(token)).unwrap()
        toast.success('Berhasil mendaftar dengan Google!')
      } catch {
        // error ditampilkan lewat toast di useEffect(error)
      }
    },
    onError: () => toast.error('Gagal mendaftar menggunakan Google.'),
    flow: 'implicit',
  })

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md">
            <Newspaper size={22} />
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Kilas
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Fakta
            </span>
          </span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">Daftar Akun</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat akun untuk menyimpan bookmark dan ringkasan AI Anda.
          </p>

          {/* Tombol Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <GoogleIcon />
            Daftar dengan Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            atau
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Form register */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Nama Lengkap
              </label>
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Nama Anda"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="nama@email.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Kata Sandi
              </label>
              <input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              Daftar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}