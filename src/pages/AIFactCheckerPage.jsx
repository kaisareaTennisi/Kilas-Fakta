import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  Bot,
  Eraser,
  HelpCircle,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { analyzeClaim, clearConversation } from '../store/slices/aiSlice'

// Contoh klaim yang bisa langsung dicoba user
const EXAMPLE_CLAIMS = [
  'Vaksin COVID-19 mengandung chip mikro yang dapat melacak lokasi seseorang.',
  'Pemerintah resmi menaikkan harga BBM sebesar 50% mulai bulan depan.',
  'Minum kopi setiap hari terbukti menyebabkan gagal jantung pada orang dewasa sehat.',
]

// Hilangkan bullet di depan poin agar konsisten saat dirender sebagai <li>
const stripBullet = (s) => String(s).replace(/^\s*[-*•]\s*/, '')

const timeLabel = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Warna & ikon badge verdict berdasarkan kata kunci
const verdictMeta = (verdict) => {
  const v = String(verdict || '').toLowerCase()
  if (/(hoaks|hoax|keliru|salah|false|misleading)/.test(v)) {
    return { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle }
  }
  if (/(ragu|unclear|dubit|perlu verifi)/.test(v)) {
    return { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: HelpCircle }
  }
  return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ShieldCheck }
}

// Renderer markdown sederhana: **tebal** + baris baru
function RichText({ text }) {
  const lines = String(text).split('\n').filter((line) => line.trim() !== '')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <p key={i}>
          {line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-slate-900">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  )
}

export default function AIFactCheckerPage() {
  const dispatch = useDispatch()
  const messages = useSelector((state) => state.ai.messages)
  const status = useSelector((state) => state.ai.status)
  const error = useSelector((state) => state.ai.error)

  const [title, setTitle] = useState('')
  const [claim, setClaim] = useState('')
  const [claimError, setClaimError] = useState(null)
  const bottomRef = useRef(null)
  const loading = status === 'loading'

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, status])

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = claim.trim()
    if (text.length < 10) {
      setClaimError('Tulis klaim minimal 10 karakter agar AI bisa menganalisis.')
      return
    }
    setClaimError(null)
    // Bubble "user" otomatis ditambahkan oleh aiSlice saat pending.
    dispatch(analyzeClaim({ title: title.trim() || undefined, text }))
    setClaim('')
  }

  const handleClear = () => {
    if (loading) return
    dispatch(clearConversation())
  }

  const hasMessages = messages.length > 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          AI Fact-Checker
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Kirim klaim berita — AI akan memverifikasi, meringkas, dan memberi verdict.
        </p>
      </header>

      {/* Riwayat percakapan */}
      <div className="mb-4 space-y-4">
        {!hasMessages && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <Bot className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Belum ada percakapan. Tulis klaim di bawah atau coba salah satu contoh.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {EXAMPLE_CLAIMS.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setClaimError(null)
                    setClaim(example)
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 sm:text-sm"
                >
                  “{example}”
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-sm text-white shadow-sm sm:max-w-[75%]">
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className="mt-1 text-right text-[10px] text-indigo-200">
                    {timeLabel(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          }

          const meta = verdictMeta(msg.verdict)
          const VerdictIcon = meta.Icon
          return (
            <div key={idx} className="flex justify-start">
              <div className="w-full max-w-[95%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-4 shadow-sm sm:max-w-[85%] sm:px-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                    <Bot className="h-4 w-4" />
                    KilasFakta AI
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {msg.model} · {timeLabel(msg.createdAt)}
                  </span>
                </div>

                {msg.verdict && (
                  <span
                    className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.cls}`}
                  >
                    <VerdictIcon className="h-3.5 w-3.5" />
                    {msg.verdict}
                  </span>
                )}

                {msg.text && <RichText text={msg.text} />}

                {msg.points.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                    {msg.points.map((point, i) => (
                      <li key={i}>{stripBullet(point)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}

        {/* Bubble "sedang menganalisis" */}
        {loading && (
          <div className="flex justify-start">
            <div className="animate-bounce-dot inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="ml-1.5 text-xs text-slate-500">AI sedang menganalisis…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Form input */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 sm:p-4"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul berita (opsional)"
          disabled={loading}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Tulis klaim atau kutipan berita yang ingin diverifikasi…"
            rows={3}
            disabled={loading}
            className="w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          />
          <div className="flex gap-2">
            {hasMessages && (
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                title="Hapus percakapan"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50"
              >
                <Eraser className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Analisis</span>
            </button>
          </div>
        </div>
        {claimError && <p className="px-1 text-xs text-rose-600">{claimError}</p>}
      </form>
    </div>
  )
}
