import { BookmarkX, Loader2, Pencil, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useToast } from '../context/toast'
import {
  deleteBookmark,
  fetchBookmarks,
  updateBookmark,
} from '../store/slices/bookmarkSlice'
import { formatDate } from '../utils/format'

export default function BookmarksPage() {
  const dispatch = useDispatch()
  const toast = useToast()
  const { items, isLoading } = useSelector((state) => state.bookmarks)

  // id bookmark yang sedang dalam mode edit catatan
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    dispatch(fetchBookmarks())
  }, [dispatch])

  const startEdit = (bookmark) => {
    setEditingId(bookmark.id)
    setDraft(bookmark.userNotes || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft('')
  }

  const handleSaveNotes = async (bookmark) => {
    if (draft.trim() !== (bookmark.userNotes || '')) {
      setSavingId(bookmark.id)
      try {
        await dispatch(
          updateBookmark({ id: bookmark.id, userNotes: draft.trim() }),
        ).unwrap()
        toast.success('Catatan berhasil diperbarui.')
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Gagal memperbarui catatan.')
      } finally {
        setSavingId(null)
      }
    }
    cancelEdit()
  }

  const handleDelete = async (bookmark) => {
    if (!window.confirm('Yakin ingin menghapus bookmark ini?')) return
    setDeletingId(bookmark.id)
    try {
      await dispatch(deleteBookmark(bookmark.id)).unwrap()
      toast.success('Bookmark berhasil dihapus.')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus bookmark.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Bookmark Saya
        </h1>
        <p className="text-slate-500">
          Koleksi berita dan ringkasan yang Anda simpan, lengkap dengan catatan
          pribadi.
        </p>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
          <Loader2 size={36} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Memuat bookmark…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <BookmarkX size={44} className="text-slate-300" />
          <p className="font-semibold text-slate-700">Belum ada bookmark</p>
          <p className="max-w-sm text-sm text-slate-500">
            Klik tombol <strong>Ringkas AI</strong> pada berita mana pun lalu
            pilih <em>Simpan ke Bookmark</em> untuk mulai membuat koleksi
            Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((bookmark) => (
            <article
              key={bookmark.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
            >
              {/* Gambar */}
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                {bookmark.imageUrl ? (
                  <img
                    src={bookmark.imageUrl}
                    alt={bookmark.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-100 via-violet-100 to-slate-100 text-slate-300">
                    <BookmarkX size={40} />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold capitalize text-slate-700 backdrop-blur">
                  {bookmark.category || 'Umum'}
                </span>
              </div>

              {/* Konten */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-600">
                    {bookmark.source || 'KilasFakta'}
                  </span>
                  {bookmark.publishedAt && (
                    <>
                      <span>•</span>
                      <span>{formatDate(bookmark.publishedAt)}</span>
                    </>
                  )}
                </div>

                <h3 className="line-clamp-2 font-bold leading-snug text-slate-900">
                  {bookmark.title}
                </h3>

                {/* Ringkasan AI yang tersimpan (jika ada) */}
                {bookmark.summary && (
                  <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                    <span className="mb-1 block font-bold">Ringkasan AI</span>
                    {bookmark.summary}
                  </p>
                )}

                {/* Catatan pribadi */}
                <div className="mt-auto space-y-2 pt-3">
                  {editingId === bookmark.id ? (
                    <>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Tulis catatan pribadi…"
                        className="w-full resize-none rounded-xl border border-blue-300 bg-blue-50/50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(bookmark)}
                          disabled={savingId === bookmark.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {savingId === bookmark.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Save size={13} />
                          )}
                          Simpan
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {bookmark.userNotes ? (
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                          📝 <span className="font-semibold">Catatan:</span>{' '}
                          {bookmark.userNotes}
                        </p>
                      ) : (
                        <p className="text-xs italic text-slate-400">
                          Belum ada catatan pribadi.
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(bookmark)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          <Pencil size={13} /> Edit Catatan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bookmark)}
                          disabled={deletingId === bookmark.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === bookmark.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}