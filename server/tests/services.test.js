/**
 * Unit tests untuk service layer (integrasi 3rd-party).
 * axios / @google/generative-ai / google-auth-library di-mock penuh
 * sehingga suite ini cepat & deterministik.
 */
import { jest } from '@jest/globals'

// ---- Mock axios (dipakai newsService) ----
await jest.unstable_mockModule('axios', () => ({
  default: { get: jest.fn() },
}))

// ---- Mock @google/generative-ai (dipakai geminiService) ----
const generateContentMock = jest.fn()
await jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: generateContentMock }),
  })),
}))

// ---- Mock google-auth-library (dipakai googleService) ----
const verifyIdTokenMock = jest.fn()
await jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}))

const setConfigured = ({ news = false, currents = false, gemini = false, google = false } = {}) => {
  if (news) process.env.NEWS_API_KEY = 'news-test-key'
  else delete process.env.NEWS_API_KEY
  if (currents) process.env.CURRENTS_API_KEY = 'currents-test-key'
  else delete process.env.CURRENTS_API_KEY
  if (gemini) process.env.GEMINI_API_KEY = 'gemini-test-key'
  else delete process.env.GEMINI_API_KEY
  if (google) process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
  else process.env.GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
}

// --- newsService ---
// PENTING: import dinamis SETELAH mock supaya modul memakai axios tiruan
// (import statis akan di-hoist di atas unstable_mockModule pada ESM).
const axios = (await import('axios')).default
const {
  fetchNews,
  fetchFromNewsApi,
  fetchFromCurrents,
  normalizeArticle,
  SAMPLE_NEWS,
} = await import('../src/services/newsService.js')

describe('newsService', () => {
  beforeEach(() => {
    axios.get.mockReset()
    process.env.NODE_ENV = 'test'
  })

  it('normalizeArticle memetakan bentuk NewsAPI.org ke bentuk frontend', () => {
    const out = normalizeArticle(
      {
        title: 'Judul Berita',
        description: 'Deskripsi',
        urlToImage: 'https://img.example/1.jpg',
        url: 'https://news.example/a',
        source: { name: 'Detik' },
        publishedAt: '2026-01-01T00:00:00Z',
      },
      'teknologi',
    )
    expect(out).toEqual({
      id: 'https://news.example/a',
      title: 'Judul Berita',
      description: 'Deskripsi',
      imageUrl: 'https://img.example/1.jpg',
      source: 'Detik',
      category: 'teknologi',
      publishedAt: '2026-01-01T00:00:00Z',
      url: 'https://news.example/a',
    })
  })

  it('normalizeArticle memakai fallback bila field hilang', () => {
    const out = normalizeArticle({ title: '' }, 'umum')
    expect(out.title).toBe('Tanpa Judul')
    expect(out.source).toBe('News API')
    expect(out.id).toContain('umum-')
  })

  it('fetchFromNewsApi: top-headlines dengan kategori terpetakan', async () => {
    setConfigured({ news: true })
    axios.get.mockResolvedValueOnce({ data: { articles: [{ title: 'A' }] } })
    const { fetchFromNewsApi } = await import('../src/services/newsService.js')
    const result = await fetchFromNewsApi({ category: 'teknologi' })
    expect(axios.get).toHaveBeenCalledWith(
      'https://newsapi.org/v2/top-headlines',
      expect.objectContaining({
        params: expect.objectContaining({ country: 'id', category: 'technology' }),
      }),
    )
    expect(result[0].title).toBe('A')
  })

  it('fetchFromNewsApi: endpoint everything saat ada query', async () => {
    setConfigured({ news: true })
    axios.get.mockResolvedValueOnce({ data: { articles: [] } })
    const { fetchFromNewsApi } = await import('../src/services/newsService.js')
    await fetchFromNewsApi({ q: 'gempa' })
    expect(axios.get).toHaveBeenCalledWith(
      'https://newsapi.org/v2/everything',
      expect.objectContaining({
        params: expect.objectContaining({ q: 'gempa', language: 'id' }),
      }),
    )
  })

  it('fetchFromCurrents: search endpoint bila ada q', async () => {
    setConfigured({ currents: true })
    axios.get.mockResolvedValueOnce({
      data: { news: [{ title: 'C', published_at: '2026-02-02' }] },
    })
    const { fetchFromCurrents } = await import('../src/services/newsService.js')
    const result = await fetchFromCurrents({ q: 'rupiah', category: 'ekonomi' })
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.currentsapi.services/v1/search',
      expect.objectContaining({
        params: expect.objectContaining({ keywords: 'rupiah', category: ['business'] }),
      }),
    )
    expect(result[0].source).toBe('News API')
  })

describe('fetchNews — rantai fallback', () => {
  it('fallback ke data contoh bila tidak ada API key', async () => {
    setConfigured({})
    const result = await fetchNews({})
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].id).toBe('sample-1')
  })

  it('filter data contoh berdasarkan kategori & query', async () => {
    setConfigured({})
    const byCat = await fetchNews({ category: 'ekonomi' })
    expect(byCat).toHaveLength(1)
    expect(byCat[0].category).toBe('ekonomi')

    const byQ = await fetchNews({ q: 'AI' })
    expect(byQ.some((a) => a.title.includes('AI'))).toBe(true)

    const none = await fetchNews({ q: 'zzz-tidak-ada' })
    expect(none).toEqual([])
  })

  it('pakai NewsAPI bila key tersedia dan hasil tidak kosong', async () => {
    setConfigured({ news: true })
    axios.get.mockResolvedValueOnce({ data: { articles: [{ title: 'Dari NewsAPI' }] } })
    const result = await fetchNews({ category: 'umum' })
    expect(result[0].title).toBe('Dari NewsAPI')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('jalan ke Currents bila NewsAPI gagal', async () => {
    setConfigured({ news: true, currents: true })
    axios.get
      .mockRejectedValueOnce(new Error('newsapi 429'))
      .mockResolvedValueOnce({ data: { news: [{ title: 'Dari Currents' }] } })
    const result = await fetchNews({})
    expect(result[0].title).toBe('Dari Currents')
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('jalan ke Currents bila NewsAPI hasil kosong', async () => {
    setConfigured({ news: true, currents: true })
    axios.get
      .mockResolvedValueOnce({ data: { articles: [] } })
      .mockResolvedValueOnce({ data: { news: [{ title: 'Currents lanjutan' }] } })
    const result = await fetchNews({})
    expect(result[0].title).toBe('Currents lanjutan')
  })

  it('fallback contoh bila kedua sumber gagal di non-production', async () => {
    setConfigured({ news: true, currents: true })
    axios.get.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('y'))
    const result = await fetchNews({})
    expect(result.length).toBeGreaterThan(0)
  })

  it('lempar 502 bila kedua sumber gagal di production', async () => {
    setConfigured({ news: true, currents: true })
    process.env.NODE_ENV = 'production'
    axios.get.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('y'))
    await expect(fetchNews({})).rejects.toMatchObject({ statusCode: 502 })
    process.env.NODE_ENV = 'test'
  })

  })

  it('SAMPLE_NEWS tersedia sebagai data demo', () => {
    expect(SAMPLE_NEWS).toHaveLength(3)
  })
})

// --- geminiService ---
describe('geminiService', () => {
  beforeEach(() => {
    generateContentMock.mockReset()
  })

  it('extractJson: JSON biasa, code fence, dan input invalid', async () => {
    const { extractJson } = await import('../src/services/geminiService.js')
    expect(extractJson('{"verdict":"FAKTA"}')).toEqual({ verdict: 'FAKTA' })
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('teks tanpa json')).toBeNull()
    expect(extractJson(null)).toBeNull()
    expect(extractJson('{pecah')).toBeNull()
  })

  it('buildFactCheckPrompt memuat judul, konten, dan instruksi verdict', async () => {
    const { buildFactCheckPrompt } = await import('../src/services/geminiService.js')
    const p = buildFactCheckPrompt({ title: 'T', text: 'K', url: 'https://u' })
    expect(p).toContain('T')
    expect(p).toContain('K')
    expect(p).toContain('https://u')
    expect(p).toContain('FAKTA')
    expect(p).toContain('HOAKS')
  })

  it('localFactCheck: klasifikasi FAKTA / RAGU / HOAKS', async () => {
    const { localFactCheck } = await import('../src/services/geminiService.js')
    expect(localFactCheck({ text: 'Pemerintah resmi mengumumkan kebijakan baru.' }).verdict).toMatch(
      /FAKTA/,
    )
    expect(
      localFactCheck({ text: 'Diduga kuat ada pelanggaran, kabarnya sedang diselidiki.' }).verdict,
    ).toMatch(/RAGU/)
    expect(localFactCheck({ text: 'Ini hoaks menyesatkan yang menyebar luas.' }).verdict).toBe(
      'HOAKS',
    )
    const withUrl = localFactCheck({ text: 'Kalimat tunggal.', url: 'https://sumber.example' })
    expect(withUrl.points.some((p) => p.includes('https://sumber.example'))).toBe(true)
    const empty = localFactCheck({})
    expect(empty.points[0]).toContain('tidak memuat pernyataan')
  })

  it('localSummarize: gabung maksimal 3 kalimat', async () => {
    const { localSummarize } = await import('../src/services/geminiService.js')
    expect(localSummarize('Satu. Dua. Tiga. Empat.')).toBe('Satu. Dua. Tiga.')
    expect(localSummarize('')).toContain('tidak memuat kalimat')
  })

  it('analyzeFact → lokal bila GEMINI_API_KEY tidak ada', async () => {
    setConfigured({ gemini: false })
    const { analyzeFact } = await import('../src/services/geminiService.js')
    const out = await analyzeFact({ text: 'Berita resmi dirilis.' })
    expect(out.model).toBe('local-heuristic')
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('analyzeFact → pakai Gemini bila key ada, JSON diparse', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () =>
          '```json\n{"verdict":"FAKTA","summary":"Ringkasan dari Gemini","points":["p1","p2"]}\n```',
      },
    })
    const { analyzeFact } = await import('../src/services/geminiService.js')
    const out = await analyzeFact({ text: 'Konten' })
    expect(out.model).toBe('gemini-1.5-flash')
    expect(out.text).toBe('Ringkasan dari Gemini')
    expect(out.points).toEqual(['p1', 'p2'])
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })

  it('analyzeFact → fallback lokal bila respons Gemini bukan JSON', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockResolvedValueOnce({ response: { text: () => 'bukan json' } })
    const { analyzeFact } = await import('../src/services/geminiService.js')
    const out = await analyzeFact({ text: 'Konten.' })
    expect(out.model).toBe('local-heuristic')
  })

  it('analyzeFact → fallback lokal bila SDK error', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockRejectedValueOnce(new Error('gemini down'))
    const { analyzeFact } = await import('../src/services/geminiService.js')
    const out = await analyzeFact({ text: 'Konten.' })
    expect(out.model).toBe('local-heuristic')
  })

  it('summarizeText → lokal bila key tidak ada', async () => {
    setConfigured({ gemini: false })
    const { summarizeText } = await import('../src/services/geminiService.js')
    const out = await summarizeText('A. B.')
    expect(out).toBe('A. B.')
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('summarizeText → pakai Gemini bila key ada', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockResolvedValueOnce({ response: { text: () => 'Ringkasan singkat.' } })
    const { summarizeText } = await import('../src/services/geminiService.js')
    expect(await summarizeText('konten panjang')).toBe('Ringkasan singkat.')
  })

  it('summarizeText → fallback lokal bila Gemini balas kosong', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockResolvedValueOnce({ response: { text: () => '  ' } })
    const { summarizeText } = await import('../src/services/geminiService.js')
    expect(await summarizeText('A. B. C.')).toBe('A. B. C.')
  })

  it('summarizeText → fallback lokal bila SDK error', async () => {
    setConfigured({ gemini: true })
    generateContentMock.mockRejectedValueOnce(new Error('down'))
    const { summarizeText } = await import('../src/services/geminiService.js')
    expect(await summarizeText('A. B.')).toBe('A. B.')
  })
})

// --- googleService ---
describe('googleService', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset()
  })

  const makeIdToken = (payload) => {
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
    return `header.${b64(payload)}.signature`
  }

  it('menolak tanpa idToken (400)', async () => {
    setConfigured({ google: true })
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    await expect(verifyGoogleIdToken('')).rejects.toMatchObject({ statusCode: 400 })
    await expect(verifyGoogleIdToken(123)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('verifikasi penuh via google-auth-library bila client ID dikonfigurasi', async () => {
    setConfigured({ google: true })
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => ({
        sub: 'google-123',
        email: 'User@Example.COM',
        name: 'Budi Google',
        picture: 'https://lh3.googleusercontent.com/a.jpg',
      }),
    })
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    const out = await verifyGoogleIdToken(makeIdToken({ email: 'x' }))
    expect(verifyIdTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'test-client-id.apps.googleusercontent.com' }),
    )
    expect(out).toEqual({
      googleId: 'google-123',
      email: 'user@example.com',
      name: 'Budi Google',
      avatar: 'https://lh3.googleusercontent.com/a.jpg',
    })
  })

  it('401 bila library Google menolak token', async () => {
    setConfigured({ google: true })
    verifyIdTokenMock.mockRejectedValueOnce(new Error('invalid token'))
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    await expect(verifyGoogleIdToken('abc.def.ghi')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('mode dev (tanpa client ID): dekode payload lokal tanpa library', async () => {
    setConfigured({ google: false })
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    const out = await verifyGoogleIdToken(
      makeIdToken({ sub: 'sub-9', email: 'dev@test.dev', name: 'Dev User' }),
    )
    expect(out.googleId).toBe('sub-9')
    expect(out.email).toBe('dev@test.dev')
    expect(out.avatar).toBeNull()
    expect(verifyIdTokenMock).not.toHaveBeenCalled()
  })

  it('token rusak → 401', async () => {
    setConfigured({ google: false })
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    await expect(verifyGoogleIdToken('bukan-token')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('payload tanpa email → 401', async () => {
    setConfigured({ google: false })
    const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
    await expect(verifyGoogleIdToken(makeIdToken({ name: 'no-email' }))).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})
