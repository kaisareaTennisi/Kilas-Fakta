import { Bookmark, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { saveBookmark } from '../store/slices/bookmarkSlice'
import { fetchSummary, resetSummary } from '../store/slices/newsSlice'
import { useToast } from '../context/toast'

/**
 * Modal popup hasil ringkasan AI.
 * - Loading spinner saat AI memproses (status dari Redux news.summaries).
 * - Setelah selesai, tampilkan poin-poin fakta penting (3–5 poin).
 * - Tombol "Simpan ke Bookmark".
 */
export default function SummaryModal({ article, onClose }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const newsId = article?.id

  const summary = useSelector((state) =>
    newsId ? state.news.summaries[newsId] : null,
  )
  const isSavingBookmark = useSelector((state) => state.bookmarks.isLoading)

  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Panggil ringkasan AI saat modal terbuka jika belum pernah di-fetch
  useEffect(() => {
    if (!newsId || !article) return
    if (!summary || summary.status === 'idle') {
      dispatch(fetchSummary(newsId))
    }
  }, [newsId, article, summary, dispatch])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSave = async () => {
    if (!article) return
    setSaving(true)
    try {
      const result = await dispatch(saveBookmark({ article, notes })).unwrap()
      const response = result?.response
      const savedId = response?.bookmark?.id || response?.data?.id || response?.id
      toast.success(
        savedId
          ? 'Berita berhasil disimpan ke Bookmark!'
          : 'Berita berhasil disimpan secara lokal.',
      )
      onClose()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menyimpan bookmark.')
    } finally {
      setSaving(false)
    }
  }

  if (!article) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ringkasan AI"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Ringkasan AI</h2>
              <p className="text-xs text-blue-100">
                Gemini merangkum fakta penting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-blue-100 transition hover:bg-white/20 hover:text-white"
            aria-label="Tutup modal"
          >
            ✕
          </button>
</div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {/* Judul berita */}
          <h3 className="mb-4 font-semibold leading-snug text-slate-800">
            {article.title}
          </h3>

          {/* Loading state */}
          {summary?.status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium">
                Gemini sedang menganalisis berita…
              </p>
              <p className="text-xs">Biasanya membutuhkan beberapa detik.</p>
            </div>
          )}

          {/* Error state */}
          {summary?.status === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {summary.error || 'Gagal membuat ringkasan. Silakan coba lagi.'}
              <button
                type="button"
                onClick={() => {
                  dispatch(resetSummary(newsId))
                  dispatch(fetchSummary(newsId))
                }}
                className="mt-3 block rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Success state */}
          {summary?.status === 'success' && (
            <div>
              {summary.summaryText && (
                <p className="mb-4 text-sm leading-relaxed text-slate-700">
                  {summary.summaryText}
                </p>
              )}
              {Array.isArray(summary.points) && summary.points.length > 0 ? (
                <ul className="space-y-2.5">
                  {summary.points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : summary.summaryText ? null : (
                <p className="text-sm text-slate-500">
                  Ringkasan berhasil dibuat, tetapi tidak ada poin yang
                  ditemukan.
                </p>
              )}

              {/* Catatan pribadi (opsional saat menyimpan) */}
              <label className="mt-5 block text-sm font-semibold text-slate-700">
                Catatan pribadi (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Tulis catatan untuk bookmark ini…"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              !summary ||
              (summary.status !== 'success' && summary.status !== 'error')
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving || isSavingBookmark ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Bookmark size={15} />
            )}
            Simpan ke Bookmark
          </button>
        </div>
      </div>
    </div>
  )
}