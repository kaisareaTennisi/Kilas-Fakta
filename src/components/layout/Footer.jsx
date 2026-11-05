import { Newspaper, ShieldCheck, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white">
              <Newspaper className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">
              Kilas<span className="text-indigo-600">Fakta</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Portal berita modern dengan ringkasan AI dan pemverifikasi fakta untuk
            membantu Anda mencerna informasi lebih cepat dan cerdas.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Navigasi
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><a href="/" className="transition hover:text-indigo-600">Beranda</a></li>
            <li><a href="/ai-fact-checker" className="transition hover:text-indigo-600">AI Fact-Checker</a></li>
            <li><a href="/bookmarks" className="transition hover:text-indigo-600">Bookmark</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Teknologi
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Ringkasan &amp; verifikasi via Google Gemini
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Sumber: NewsAPI via backend terverifikasi
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} KilasFakta — Hacktiv8 Individual Project.
      </div>
    </footer>
  )
}
