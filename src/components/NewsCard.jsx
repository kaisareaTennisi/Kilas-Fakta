import { useDispatch, useSelector } from 'react-redux'
import { Bookmark, CalendarDays, Sparkles } from 'lucide-react'
import { saveBookmark } from '../store/slices/bookmarkSlice'
import { selectAuthUser } from '../store/slices/authSlice'
import { useToast } from '../context/toast'
import { formatDate } from '../utils/format'

const CATEGORY_COLORS = {
  nasional: 'bg-blue-100 text-blue-700',
  ekonomi: 'bg-amber-100 text-amber-700',
  teknologi: 'bg-violet-100 text-violet-700',
  olahraga: 'bg-emerald-100 text-emerald-700',
  hiburan: 'bg-pink-100 text-pink-700',
  internasional: 'bg-sky-100 text-sky-700',
}

export default function NewsCard({ article, onSummarize }) {
  const dispatch = useDispatch()
  const user = useSelector(selectAuthUser)
  const isBookmarked = useSelector((state) =>
    state.bookmarks.items.some((b) => b.newsId === article.id),
  )
  const toast = useToast()

  const categoryClass =
    CATEGORY_COLORS[article.category] || 'bg-slate-100 text-slate-600'

  const handleBookmark = () => {
    if (!user) {
      toast('Masuk dulu untuk menyimpan artikel.', 'info')
      return
    }
    if (isBookmarked) {
      toast('Artikel sudah ada di bookmark.', 'info')
      return
    }
    dispatch(saveBookmark({ article, notes: '' }))
      .unwrap()
      .then(() => toast('Berhasil disimpan ke bookmark.', 'success'))
      .catch((msg) => toast(String(msg), 'error'))
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Gambar / placeholder gradient */}
      <div className="relative h-40 w-full bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt={article.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="px-4 text-center text-sm font-semibold uppercase tracking-widest text-white/80">
              {article.category || 'KilasFakta'}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleBookmark}
          className={`absolute right-3 top-3 rounded-full p-2 shadow transition ${
            isBookmarked
              ? 'bg-indigo-600 text-white'
              : 'bg-white/90 text-slate-600 hover:bg-white hover:text-indigo-600'
          }`}
          title={isBookmarked ? 'Tersimpan di bookmark' : 'Simpan ke bookmark'}
          aria-label="Simpan ke bookmark"
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Isi kartu */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold capitalize ${categoryClass}`}>
            {article.category || 'umum'}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">{article.source}</span>
        </div>

        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-indigo-700">
          {article.url ? (
            <a href={article.url} target="_blank" rel="noreferrer">
              {article.title}
            </a>
          ) : (
            article.title
          )}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
          {article.description}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(article.publishedAt)}
          </span>
          <button
            type="button"
            onClick={() => onSummarize?.(article)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ringkas AI
          </button>
        </div>
      </div>
    </article>
  )
}
