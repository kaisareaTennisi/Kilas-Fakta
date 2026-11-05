import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Bookmark, LogOut, Menu, Newspaper, Sparkles, X } from 'lucide-react'
import { logout, selectAuthUser } from '../../store/slices/authSlice'
import { getInitial } from '../../utils/format'

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: Newspaper },
  { to: '/ai-fact-checker', label: 'AI Fact-Checker', icon: Sparkles },
  { to: '/bookmarks', label: 'Bookmark', icon: Bookmark },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    setOpen(false)
    navigate('/login')
  }

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow">
            <Newspaper className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Kilas<span className="text-indigo-600">Fakta</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClasses}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / login */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {getInitial(user.name || user.email)}
                </span>
                <span className="max-w-28 truncate text-sm font-medium text-slate-700">
                  {user.name || user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Masuk
            </Link>
          )}
        </div>

        {/* Tombol menu mobile */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Buka menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Nav mobile */}
      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={linkClasses}
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-slate-200 pt-3">
              {user ? (
                <>
                  <p className="px-3 pb-2 text-sm text-slate-500">
                    Masuk sebagai{' '}
                    <span className="font-semibold text-slate-800">
                      {user.name || user.email}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
