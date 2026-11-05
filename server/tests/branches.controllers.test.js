/**
 * Branch-coverage pelengkap untuk controller & middleware validasi.
 *
 * Dua pendekatan dipakai bersama:
 * 1) Unit-level — controller dipanggil langsung dengan objek req sintetis agar
 *    cabang defensif `req.body || {}`, `req.params || {}`, `req.query || {}`
 *    tercakup. Cabang ini tidak bisa dijangkau via HTTP karena Express selalu
 *    mengisi objek tersebut dengan nilai truthy.
 * 2) Integration-level (supertest) — jalur data: fallback field kosong,
 *    404 artikel tak dikenal, dan sinkronisasi akun Google.
 *
 * Model & service di-mock supaya suite berjalan tanpa DB dan tanpa jaringan.
 */
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { jest } from '@jest/globals'

const modelMocks = {
  User: { findOrCreate: jest.fn(), findByPk: jest.fn() },
  Bookmark: { findOrCreate: jest.fn(), findOne: jest.fn() },
}

await jest.unstable_mockModule('../src/models/index.js', () => modelMocks)

await jest.unstable_mockModule('../src/services/googleService.js', () => ({
  verifyGoogleIdToken: jest.fn(),
}))

await jest.unstable_mockModule('../src/services/newsService.js', () => ({
  fetchNews: jest.fn(),
  SAMPLE_NEWS: [],
}))

await jest.unstable_mockModule('../src/services/geminiService.js', () => ({
  analyzeFact: jest.fn(),
  summarizeText: jest.fn(),
}))

const { User, Bookmark } = await import('../src/models/index.js')
const { verifyGoogleIdToken } = await import('../src/services/googleService.js')
const { fetchNews } = await import('../src/services/newsService.js')
const { analyzeFact, summarizeText } = await import('../src/services/geminiService.js')
const authController = await import('../src/controllers/authController.js')
const newsController = await import('../src/controllers/newsController.js')
const bookmarkController = await import('../src/controllers/bookmarkController.js')
const { requireAny } = await import('../src/middlewares/validate.js')
const { createApp } = await import('../src/app.js')
const config = (await import('../src/config/env.js')).default

const app = createApp()

const authHeaders = () => ({
  Authorization: `Bearer ${jwt.sign({ id: 'u1' }, config.jwt.secret)}`,
})

/** res tiruan untuk pemanggilan controller langsung. */
const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const VALID_UUID = '9e64e66a-114f-4676-9db2-ada065b7642f'

beforeEach(() => {
  jest.resetAllMocks()
  User.findByPk.mockResolvedValue({ id: 'u1', name: 'Tester', email: 't@t.dev' })
})


describe('controller — cabang defensif req.body/params/query kosong', () => {
  it('authController.register: req.body undefined → 400', async () => {
    const next = jest.fn()
    await authController.register({ body: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('authController.login: req.body undefined → 400', async () => {
    const next = jest.fn()
    await authController.login({ body: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('authController.googleLogin: req.body undefined → 400', async () => {
    const next = jest.fn()
    await authController.googleLogin({ body: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('bookmarkController.createBookmark: req.body undefined → 400', async () => {
    const next = jest.fn()
    await bookmarkController.createBookmark({ body: undefined, userId: 'u1' }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('bookmarkController.updateBookmark: req.body undefined → hanya simpan apa adanya', async () => {
    const bookmark = { id: VALID_UUID, userNotes: 'lama', save: jest.fn().mockResolvedValue(true) }
    Bookmark.findOne.mockResolvedValue(bookmark)
    const res = mockRes()
    await bookmarkController.updateBookmark(
      { params: { id: VALID_UUID }, body: undefined, userId: 'u1' },
      res,
      jest.fn(),
    )
    expect(bookmark.save).toHaveBeenCalled()
    expect(bookmark.userNotes).toBe('lama')
    expect(res.json.mock.calls[0][0].success).toBe(true)
  })

  it('newsController.getNews: req.query undefined → kategori default', async () => {
    fetchNews.mockResolvedValue([])
    const res = mockRes()
    await newsController.getNews({ query: undefined }, res, jest.fn())
    expect(fetchNews).toHaveBeenCalledWith({ category: 'umum', q: '' })
    expect(res.json.mock.calls[0][0].data.articles).toEqual([])
  })

  it('newsController.getSummary: req.params undefined → 400', async () => {
    const next = jest.fn()
    await newsController.getSummary({ params: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('newsController.summarize: req.body undefined → 400', async () => {
    const next = jest.fn()
    await newsController.summarize({ body: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })

  it('validate.requireAny: req.body undefined → 400', () => {
    const next = jest.fn()
    requireAny(['text', 'title'], 'Teks klaim wajib diisi.')({ body: undefined }, mockRes(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
  })
})

desc -1 docs 2>/dev/nullribe('getSummary — fallback field artikel', () => {
  it('artikel tanpa description → ringkasan tetap dibuat', async () => {
    fetchNews.mockResolvedValue([{ id: 'art-1', title: 'Judul Saja' }])
    summarizeText.mockResolvedValue('Ringkasan dari Gemini.')

    const res = await request(app).get('/api/news/art-1/summary')

    expect(res.status).toBe(200)
    expect(res.body.data.summary).toBe('Ringkasan dari Gemini.')
    expect(res.body.data.title).toBe('Judul Saja')
    expect(summarizeText).toHaveBeenCalledWith('Judul Saja. ')
  })

  it('artikel tanpa title → judul kosong, ringkasan tetap dibuat', async () => {
    fetchNews.mockResolvedValue([{ id: 'art-2', description: 'Tanpa judul' }])
    summarizeText.mockResolvedValue('Ringkasan kedua.')

    const res = await request(app).get('/api/news/art-2/summary')

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('')
    expect(summarizeText).toHaveBeenCalledWith('. Tanpa judul')
  })

  it('fetchNews tidak mengembalikan array (undefined) → 404', async () => {
    fetchNews.mockResolvedValue(undefined)
    const res = await request(app).get('/api/news/art-ghost/summary')
    expect(res.status).toBe(404)
  })
})

describe('bookmarkController — fallback serialisasi', () => {
  it('source & category null → default "KilasFakta" dan "umum"', async () => {
    Bookmark.findOrCreate.mockResolvedValue([
      { id: 'b1', userId: 'u1', newsId: 'n1', title: 'Judul', source: null, category: null },
      true,
    ])

    const res = await request(app)
      .post('/api/bookmarks')
      .set(authHeaders())
      .send({ newsId: 'n1' })

    expect(res.status).toBe(201)
    expect(res.body.bookmark.source).toBe('KilasFakta')
    expect(res.body.bookmark.category).toBe('umum')
  })

  it('bookmark sudah ada (created = false) → respons idempotent 200', async () => {
    Bookmark.findOrCreate.mockResolvedValue([
      { id: 'b2', userId: 'u1', newsId: 'n1', title: 'Judul' },
      false,
    ])

    const res = await request(app)
      .post('/api/bookmarks')
      .set(authHeaders())
      .send({ newsId: 'n1' })

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('sudah ada')
  })
})

describe('auth middleware — cabang error', () => {
  it('kegagalan database saat User.findByPk → 500 (catch arm)', async () => {
    User.findByPk.mockRejectedValue(new Error('db down'))
    const res = await request(app).get('/api/bookmarks').set(authHeaders())
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })
})

describe('googleLogin — sinkronisasi akun & avatar', () => {
  const googleUser = (overrides = {}) => ({
    id: 'u2',
    email: 'g@test.dev',
    name: 'Google User',
    googleId: 'gid-lama',
    avatar: 'lama.png',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  })

  it('akun lama dengan googleId berbeda → googleId & avatar disinkronkan', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'gid-baru',
      email: 'g@test.dev',
      name: 'Google User',
      avatar: 'baru.png',
    })
    const user = googleUser()
    User.findOrCreate.mockResolvedValue([user, false])

    const res = await request(app).post('/api/auth/google').send({ idToken: 'id-token' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Login Google berhasil.')
    expect(user.googleId).toBe('gid-baru')
    expect(user.avatar).toBe('baru.png')
    expect(user.save).toHaveBeenCalled()
  })

  it('akun lama tanpa avatar Google → avatar lama dipertahankan', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'gid-baru',
      email: 'g@test.dev',
      name: 'Google User',
      avatar: null,
    })
    const user = googleUser()
    User.findOrCreate.mockResolvedValue([user, false])

    const res = await request(app).post('/api/auth/google').send({ idToken: 'id-token' })

    expect(res.status).toBe(200)
    expect(user.avatar).toBe('lama.png')
  })

  it('akun lama dengan googleId sama → tidak ada penyimpanan ulang', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'gid-lama',
      email: 'g@test.dev',
      name: 'Google User',
    })
    const user = googleUser()
    User.findOrCreate.mockResolvedValue([user, false])

    const res = await request(app).post('/api/auth/google').send({ idToken: 'id-token' })

    expect(res.status).toBe(200)
    expect(user.save).not.toHaveBeenCalled()
  })

  it('akun baru (created = true) → pesan akun baru dibuat', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'gid-1',
      email: 'baru@test.dev',
      name: 'Baru',
      avatar: 'baru.png',
    })
    User.findOrCreate.mockResolvedValue([googleUser({ googleId: 'gid-1' }), true])

    const res = await request(app).post('/api/auth/google').send({ idToken: 'id-token' })

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('akun baru dibuat')
    expect(res.body.user.provider).toBe('google')
  })
})

describe('POST /news/summarize — jalur sukses & default body', () => {
  it('body hanya berisi text → title/url default string kosong', async () => {
    analyzeFact.mockResolvedValue({ text: 'Analisis', points: [], verdict: 'FAKTA', model: 'm' })

    const res = await request(app).post('/api/news/summarize').send({ text: 'klaim' })

    expect(res.status).toBe(200)
    expect(analyzeFact).toHaveBeenCalledWith({ title: '', text: 'klaim', url: '' })
  })
})

