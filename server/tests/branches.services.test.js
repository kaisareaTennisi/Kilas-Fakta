/**
 * Branch-coverage pelengkap untuk layer service & config.
 * Fokus: nilai default parameter, cabang `??`/`||` yang belum tersentuh,
 * optional chaining, serta jalur "tanpa argumen" / "data kosong".
 * axios, @google/generative-ai, dan google-auth-library di-mock penuh agar
 * suite ini cepat, deterministik, dan tidak memanggil jaringan.
 */
import { jest } from '@jest/globals'

process.env.NODE_ENV = 'test'

await jest.unstable_mockModule('axios', () => ({ default: { get: jest.fn() } }))

const generateContentMock = jest.fn()
await jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: () => ({ generateContent: generateContentMock }),
  })),
}))

await jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}))

const axios = (await import('axios')).default
const gemini = await import('../src/services/geminiService.js')
const news = await import('../src/services/newsService.js')
const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
const { createConnection } = await import('../src/config/database.js')
const { env } = await import('../src/config/env.js')

const setEnv = (key, value) => {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

const geminiJson = (obj) => ({ response: { text: () => JSON.stringify(obj) } })

describe('config — cabang default parameter', () => {
  it('env() memakai fallback default "" saat hanya diberi key', () => {
    setEnv('KILASFAKTA_TIDAK_ADA', undefined)
    expect(env('KILASFAKTA_TIDAK_ADA')).toBe('')
    expect(env('KILASFAKTA_TIDAK_ADA', 'cadangan')).toBe('cadangan')
  })

  it('createConnection() tanpa argumen memakai komponen dari env', () => {
    const connection = createConnection()
    expect(connection).toBeTruthy()
    expect(typeof connection.query).toBe('function')
  })
})

describe('geminiService — cabang pelengkap', () => {
  beforeEach(() => {
    generateContentMock.mockReset()
    setEnv('GEMINI_API_KEY', undefined)
    setEnv('GEMINI_MODEL', undefined)
  })

  it('extractJson: tipe non-string dan kurung tidak lengkap', () => {
    expect(gemini.extractJson(123)).toBeNull()
    expect(gemini.extractJson({ a: 1 })).toBeNull()
    expect(gemini.extractJson('{"a":1')).toBeNull()
    expect(gemini.extractJson('}teks{')).toBeNull()
    expect(gemini.extractJson('   ')).toBeNull()
  })

  it('extractJson: JSON berkurung lengkap tapi sintaks rusak → null', () => {
    expect(gemini.extractJson('{"verdict":}')).toBeNull()
    expect(gemini.extractJson('{"a":1,}')).toBeNull()
  })

  it('buildFactCheckPrompt tanpa argumen memakai placeholder', () => {
    const prompt = gemini.buildFactCheckPrompt()
    expect(prompt).toContain('(tanpa judul)')
    expect(prompt).toContain('(lihat judul)')
    expect(prompt).toContain('(tidak ada)')
  })

  it('localFactCheck memakai default parameter & fallback judul', () => {
    const empty = gemini.localFactCheck()
    expect(empty.verdict).toMatch(/FAKTA/)
    expect(empty.text).toContain('tidak memuat pernyataan')
    expect(empty.points[0]).toContain('tidak memuat pernyataan')
  })

  it('localFactCheck memotong kalimat > 160 karakter', () => {
    const long = `${'kata '.repeat(60)}akhir.`
    const out = gemini.localFactCheck({ text: long })
    expect(out.points[0].endsWith('…')).toBe(true)
    expect(out.points[0].length).toBeLessThanOrEqual(158)
  })

  it('localSummarize memakai default parameter', () => {
    expect(gemini.localSummarize()).toContain('tidak memuat kalimat')
  })

  it('analyzeFact tanpa argumen memakai heuristik lokal', async () => {
    const out = await gemini.analyzeFact()
    expect(out.model).toBe('local-heuristic')
    expect(generateContentMock).not.toHaveBeenCalled()
  })

  it('analyzeFact memakai GEMINI_MODEL lalu jatuh ke nilai default', async () => {
    setEnv('GEMINI_API_KEY', 'kunci')
    setEnv('GEMINI_MODEL', 'gemini-custom')
    generateContentMock.mockResolvedValueOnce(geminiJson({ verdict: 'FAKTA', summary: 'S', points: ['p'] }))
    expect((await gemini.analyzeFact({ text: 'x' })).model).toBe('gemini-custom')

    setEnv('GEMINI_MODEL', undefined)
    generateContentMock.mockResolvedValueOnce(geminiJson({ verdict: 'FAKTA', summary: 'S', points: ['p'] }))
    expect((await gemini.analyzeFact({ text: 'x' })).model).toBe('gemini-1.5-flash')
  })

  it('analyzeFact: JSON minim lalu fallback poin/verdict lokal', async () => {
    setEnv('GEMINI_API_KEY', 'kunci')
    generateContentMock.mockResolvedValueOnce({ response: { text: () => '{"text":"hanya teks"}' } })
    const out = await gemini.analyzeFact({ text: 'Kabar hoaks menyebar luas.' })
    expect(out.text).toBe('hanya teks')
    expect(out.verdict).toBe('RAGU — Perlu Verifikasi')
    expect(out.points.length).toBeGreaterThan(0)
  })

  it('analyzeFact: points bukan array & ringkasan kosong', async () => {
    setEnv('GEMINI_API_KEY', 'kunci')
    generateContentMock.mockResolvedValueOnce({ response: { text: () => '{"points":"bukan array"}' } })
    expect((await gemini.analyzeFact({ text: 'Konten.' })).text).toBe('')
  })

  it('analyzeFact: respons tanpa struktur Gemini jatuh ke heuristik lokal', async () => {
    setEnv('GEMINI_API_KEY', 'kunci')
    generateContentMock.mockResolvedValueOnce({})
    const out = await gemini.analyzeFact({ text: 'Pemerintah resmi mengumumkan kebijakan baru.' })
    expect(out.model).toBe('local-heuristic')
  })

  it('summarizeText: default parameter, mode lokal, dan respons kosong', async () => {
    expect(await gemini.summarizeText()).toContain('tidak memuat kalimat')

    setEnv('GEMINI_API_KEY', 'kunci')
    generateContentMock.mockResolvedValueOnce({ response: { text: () => 'Ringkasan Gemini.' } })
    expect(await gemini.summarizeText('Satu. Dua.')).toBe('Ringkasan Gemini.')

    generateContentMock.mockResolvedValueOnce({ response: { text: () => '   ' } })
    expect(await gemini.summarizeText('Satu. Dua. Tiga.')).toBe('Satu. Dua. Tiga.')
  })
})

describe('newsService — cabang pelengkap', () => {
  beforeEach(() => {
    axios.get.mockReset()
    process.env.NODE_ENV = 'test'
    setEnv('NEWS_API_KEY', undefined)
    setEnv('CURRENTS_API_KEY', undefined)
  })

  it('normalizeArticle: kategori default & source berupa string', () => {
    const out = news.normalizeArticle({ title: 'T', source: 'Antara' })
    expect(out.category).toBe('umum')
    expect(out.source).toBe('Antara')
    expect(out.id).toContain('umum-')
  })

  it('normalizeArticle mengambil description & tanggal dari field alternatif', () => {
    const fromContent = news.normalizeArticle({
      title: 'T',
      content: 'isi konten',
      published_at: '2026-01-01',
    })
    expect(fromContent.description).toBe('isi konten')
    expect(fromContent.publishedAt).toBe('2026-01-01')

    const fromSnippet = news.normalizeArticle({ title: 'T', snippet: 'potongan', date: '2026-02-02' })
    expect(fromSnippet.description).toBe('potongan')
    expect(fromSnippet.publishedAt).toBe('2026-02-02')
  })

  it('fetchFromNewsApi tanpa argumen + respons tanpa articles', async () => {
    setEnv('NEWS_API_KEY', 'kunci')
    axios.get.mockResolvedValueOnce({ data: { articles: [{ title: 'A' }] } })
    const list = await news.fetchFromNewsApi()
    expect(list[0].category).toBe('umum')

    axios.get.mockResolvedValueOnce({ data: {} })
    expect(await news.fetchFromNewsApi()).toEqual([])
  })

  it('fetchFromCurrents tanpa argumen + respons tanpa news', async () => {
    setEnv('CURRENTS_API_KEY', 'kunci')
    axios.get.mockResolvedValueOnce({ data: { news: [{ title: 'C' }] } })
    const list = await news.fetchFromCurrents()
    expect(list[0].category).toBe('umum')

    axios.get.mockResolvedValueOnce({ data: {} })
    expect(await news.fetchFromCurrents()).toEqual([])
  })

  it('fetchNews tanpa argumen memakai default category & q', async () => {
    const result = await news.fetchNews()
    expect(result[0].id).toBe('sample-1')
  })
})

describe('googleService — cabang pelengkap', () => {
  const makeIdToken = (payload) =>
    `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`

  beforeEach(() => {
    setEnv('GOOGLE_CLIENT_ID', undefined)
  })

  it('payload bukan objek / null → 401', async () => {
    const primitive = `header.${Buffer.from('5').toString('base64url')}.signature`
    await expect(verifyGoogleIdToken(primitive)).rejects.toMatchObject({ statusCode: 401 })
    await expect(verifyGoogleIdToken('header.bukan-json.sig')).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('googleId jatuh ke google_id lalu email, name diturunkan dari email', async () => {
    const byGoogleId = await verifyGoogleIdToken(makeIdToken({ google_id: 'gid-1', email: 'A@B.com' }))
    expect(byGoogleId.googleId).toBe('gid-1')
    expect(byGoogleId.name).toBe('A')

    const byEmail = await verifyGoogleIdToken(makeIdToken({ email: 'C@D.com', name: 'Nama' }))
    expect(byEmail.googleId).toBe('C@D.com')
    expect(byEmail.email).toBe('c@d.com')
    expect(byEmail.name).toBe('Nama')
  })

  it('client ID placeholder diperlakukan sebagai mode dev', async () => {
    setEnv('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com')
    const out = await verifyGoogleIdToken(makeIdToken({ sub: 'sub-1', email: 'dev@test.dev' }))
    expect(out.email).toBe('dev@test.dev')
  })
})

