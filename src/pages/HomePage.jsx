import { Loader2, SearchX, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import NewsCard from '../components/NewsCard'
import SummaryModal from '../components/SummaryModal'
import sampleNews from '../data/sampleNews'
import { CATEGORIES, fetchNews, setCategory } from '../store/slices/newsSlice'

export default function HomePage() {
  const dispatch = useDispatch()
  const {
    articles,
    category,
    searchQuery,
    isLoading,
    error,
  } = useSelector((state) => state.news)

  const [selectedId, setSelectedId] = useState(null)

  // Ambil berita asli dari API setiap filter/search berubah.
  useEffect(() => {
    dispatch(
      fetchNews({
        category,
        q: searchQuery || undefined,
      }),
    )
  }, [dispatch, category, searchQuery])

  // Gabungkan: kita tetap tampilkan sampel bila API gagal/tidak ada data.
  const list = useMemo(() => {
    if (articles.length > 0) return articles
    let base = sampleNews
    if (category && category !== 'umum') {
      base = base.filter((a) => a.category === category)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      base = base.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q),
      )
    }
    return base
  }, [articles, category, searchQuery])

  const selectedArticle = useMemo(
    () => list.find((a) => String(a.id) === String(selectedId)) || null,
    [list, selectedId],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero kecil */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Ringkasan Berita dalam Sekejap
        </h1>
        <p className="text-slate-500">
          KilasFakta merangkum berita terkini menjadi poin-poin fakta penting
          dengan bantuan AI.
        </p>
      </div>

      {/* Filter kategori */}
      <div className="scrollbar-thin -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => {
              dispatch(setCategory(cat.key))
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              category === cat.key
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && articles.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
          <Loader2 size={36} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Memuat berita terbaru…</p>
        </div>
      )}

      {/* Error (dengan fallback sampel) */}
      {error && articles.length === 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Sparkles size={16} className="shrink-0" />
          <p>
            {error} Menampilkan <strong>berita contoh</strong> untuk saat ini.
          </p>
        </div>
      )}

      {/* Grid berita */}
      {!isLoading && list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-500">
          <SearchX size={40} className="text-slate-300" />
          <p className="text-sm font-medium">
            Tidak ada berita yang cocok dengan pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onOpenSummary={setSelectedId}
            />
          ))}
        </div>
      )}

      {/* Modal ringkasan AI */}
      {selectedArticle && (
        <SummaryModal
          article={selectedArticle}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}