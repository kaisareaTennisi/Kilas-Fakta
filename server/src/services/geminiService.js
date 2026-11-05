import config from '../config/env.js'

/**
 * geminiService — integrasi Google Gemini untuk fact-check & ringkasan.
 * - Jika GEMINI_API_KEY kosong → dipakai "local heuristic engine" (offline,
 *   deterministik) sehingga API tetap berfungsi untuk demo tanpa API key.
 * - Verdict yang dihasilkan selalu mengandung kata kunci yang dipahami
 *   frontend: FAKTA / RAGU — Perlu Verifikasi / HOAKS.
 */

const enabled = () => Boolean(config.gemini.apiKey)

const apiKey = () => config.gemini.apiKey

const modelName = () => config.gemini.model

/** Ekstrak objek JSON dari balasan model (termasuk yang dibungkus code fence). */
export const extractJson = (raw) => {
  if (!raw || typeof raw !== 'string') return null
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export const buildFactCheckPrompt = ({ title = '', text = '', url = '' } = {}) => `
Anda adalah asisten verifikasi fakta KilasFakta. Analisis klaim berita berikut.

Judul: ${title || '(tanpa judul)'}
Konten/klaim: ${text || '(lihat judul)'}
Sumber: ${url || '(tidak ada)'}

Balas HANYA dengan JSON valid tanpa penjelasan lain, dengan struktur:
{
  "verdict": "FAKTA" | "RAGU — Perlu Verifikasi" | "HOAKS",
  "summary": "ringkasan 1-2 kalimat dalam Bahasa Indonesia",
  "points": ["poin analisis 1", "poin analisis 2", "poin analisis 3"]
}
Gunakan "RAGU — Perlu Verifikasi" bila bukti tidak cukup, dan "HOAKS" bila terdapat
indikasi kuat misinformasi.`.trim()

/** Pemisah kalimat sederhana untuk mode lokal. */
const splitSentences = (input) => {
  const clean = String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
  return (clean.match(/[^.!?]+[.!?]*/g) || [clean])
    .map((s) => s.trim())
    .filter(Boolean)
}

const HOAX_RE =
  /hoaks|bohong|tipu|palsu|hoax|desas|desus|kabar burung|belum terkonfirmasi|menyesatkan|bantah/i
const DOUBT_RE = /diduga|dugaan|isu|mungkin|kabarnya|bocor|viral|heboh|sumber tak resmi/i

/** Mesin heuristik lokal — fallback saat Gemini tidak tersedia. */
export const localFactCheck = ({ title = '', text = '', url = '' } = {}) => {
  const combined = `${title} ${text}`
  let verdict = 'FAKTA — Tidak Ada Indikasi Misinformasi'
  if (HOAX_RE.test(combined)) verdict = 'HOAKS'
  else if (DOUBT_RE.test(combined)) verdict = 'RAGU — Perlu Verifikasi'

  const sentences = splitSentences(text || title)
  const points = sentences.slice(0, 3).map((s) => (s.length > 160 ? `${s.slice(0, 157)}…` : s))
  if (points.length === 0) points.push('Konten tidak memuat pernyataan yang cukup untuk dianalisis.')
  if (url) points.push(`Sumber yang direferensikan: ${url}`)

  return {
    text:
      sentences.slice(0, 2).join(' ') ||
      'Konten tidak memuat pernyataan yang cukup untuk dianalisis.',
    points,
    verdict,
    model: 'local-heuristic',
  }
}

/** Ringkasan string sederhana (mode lokal). */
export const localSummarize = (input = '') => {
  const sentences = splitSentences(input)
  return sentences.slice(0, 3).join(' ') || 'Konten tidak memuat kalimat yang dapat diringkas.'
}

/** Panggil Gemini; gagal atau tidak aktif → heuristik lokal. */
export const analyzeFact = async ({ title = '', text = '', url = '' } = {}) => {
  if (!enabled()) return localFactCheck({ title, text, url })

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey())
    const model = genAI.getGenerativeModel({ model: modelName() })
    const result = await model.generateContent(buildFactCheckPrompt({ title, text, url }))
    const parsed = extractJson(result?.response?.text?.())
    if (!parsed) throw new Error('Respons Gemini bukan JSON yang valid.')

    const points = Array.isArray(parsed.points) ? parsed.points.map(String).slice(0, 5) : []
    return {
      text: String(parsed.summary || parsed.text || ''),
      points: points.length > 0 ? points : localFactCheck({ title, text }).points,
      verdict: String(parsed.verdict || 'RAGU — Perlu Verifikasi'),
      model: modelName(),
    }
  } catch {
    return localFactCheck({ title, text, url })
  }
}

/** Ringkasan teks via Gemini; gagal/tidak aktif → lokal. */
export const summarizeText = async (input = '') => {
  if (!enabled()) return localSummarize(input)

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey())
    const model = genAI.getGenerativeModel({ model: modelName() })
    const result = await model.generateContent(
      `Ringkas konten berita berikut menjadi 2-3 kalimat padat dalam Bahasa Indonesia:\n\n${input}`,
    )
    const summary = result?.response?.text?.()
    return summary && summary.trim() ? summary.trim() : localSummarize(input)
  } catch {
    return localSummarize(input)
  }
}
