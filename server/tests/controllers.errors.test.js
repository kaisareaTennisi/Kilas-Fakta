/**
 * Branch-coverage tests untuk error-path controller (auth, news, bookmarks).
 * Lapisan model & service di-mock supaya arm `catch (error) { next(error) }`
 * dan helper `fail(...)` di setiap controller benar-benar tereksekusi.
 */
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { jest } from '@jest/globals'

const modelMocks = {
  User: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
  Bookmark: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
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
const { analyzeFact } = await import('../src/services/geminiService.js')
const { createApp } = await import('../src/app.js')
const config = (await import('../src/config/env.js')).default

const app = createApp()

const authHeaders = () => {
  const token = jwt.sign({ id: 'u1' }, config.jwt.secret)
  return { Authorization: `Bearer ${token}` }
}

beforeEach(() => {
  jest.resetAllMocks()
  // Middleware auth mengambil user via User.findByPk
  User.findByPk.mockResolvedValue({ id: 'u1', name: 'Tester', email: 't@t.dev' })
})

describe('authController — error & guard paths', () => {
  it('register: email sudah terdaftar → 409', async () => {
    User.findOne.mockResolvedValue({ id: 'sudah-ada' })
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@a.dev', password: 'rahasia123' })
    expect(res.status).toBe(409)
    expect(User.create).not.toHaveBeenCalled()
  })

  it('register: kegagalan database → 500', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockRejectedValue(new Error('db down'))
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@a.dev', password: 'rahasia123' })
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })

  it('login: password salah → 401', async () => {
    User.findOne.mockResolvedValue({
      id: 'u9',
      email: 'a@a.dev',
      password: await bcrypt.hash('benar', 4),
    })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.dev', password: 'salah' })
    expect(res.status).toBe(401)
  })

  it('login: kegagalan database → 500', async () => {
    User.findOne.mockRejectedValue(new Error('db down'))
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.dev', password: 'rahasia123' })
    expect(res.status).toBe(500)
  })

  it('googleLogin: idToken tidak dikirim → 400', async () => {
    const res = await request(app).post('/api/auth/google').send({})
    expect(res.status).toBe(400)
  })

  it('googleLogin: idToken tidak valid (verify gagal) → 401', async () => {
    verifyGoogleIdToken.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'token-rusak' })
    expect(res.status).toBe(401)
  })

  it('googleLogin: kegagalan tak terduga → 500 (catch arm)', async () => {
    verifyGoogleIdToken.mockRejectedValue(new Error('network down'))
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'token-ok' })
    expect(res.status).toBe(500)
  })
})

describe('newsController — error & guard paths', () => {
  it('GET /news: service gagal → 500 (catch arm)', async () => {
    fetchNews.mockRejectedValue(new Error('upstream down'))
    const res = await request(app).get('/api/news')
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })

  it('GET /news/:id/summary: artikel tidak ditemukan → 404 (helper fail)', async () => {
    fetchNews.mockResolvedValue([])
    const res = await request(app).get('/api/news/sample-404/summary')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('GET /news/:id/summary: kegagalan service → 500 (catch arm)', async () => {
    fetchNews.mockRejectedValue(new Error('boom'))
    const res = await request(app).get('/api/news/sample-1/summary')
    expect(res.status).toBe(500)
  })

  it('POST /news/summarize: teks kosong → 400 (helper fail)', async () => {
    const res = await request(app).post('/api/news/summarize').send({ text: '  ' })
    expect(res.status).toBe(400)
  })

  it('POST /news/summarize: analyzeFact gagal → 500 (catch arm)', async () => {
    analyzeFact.mockRejectedValue(new Error('gemini down'))
    const res = await request(app).post('/api/news/summarize').send({ text: 'klaim berita' })
    expect(res.status).toBe(500)
  })
})

describe('bookmarkController — error paths (diproteksi JWT)', () => {
  it('GET /bookmarks: kegagalan query → 500 (catch arm)', async () => {
    Bookmark.findAll.mockRejectedValue(new Error('db down'))
    const res = await request(app).get('/api/bookmarks').set(authHeaders())
    expect(res.status).toBe(500)
  })

  it('POST /bookmarks: kegagalan insert → 500 (catch arm)', async () => {
    Bookmark.findOne.mockResolvedValue(null)
    Bookmark.create.mockRejectedValue(new Error('db down'))
    const res = await request(app)
      .post('/api/bookmarks')
      .set(authHeaders())
      .send({ newsId: 'n1', title: 'T' })
    expect(res.status).toBe(500)
  })

  it('PATCH /bookmarks/:id: id bukan UUID → 404 tanpa menyentuh DB', async () => {
    const res = await request(app)
      .patch('/api/bookmarks/sample-1')
      .set(authHeaders())
      .send({ userNotes: 'x' })
    expect(res.status).toBe(404)
    expect(Bookmark.findOne).not.toHaveBeenCalled()
  })

  it('PATCH /bookmarks/:id: bookmark milik user lain → 404 (helper fail)', async () => {
    Bookmark.findOne.mockResolvedValue(null)
    const res = await request(app)
      .patch('/api/bookmarks/9e64e66a-114f-4676-9db2-ada065b7642f')
      .set(authHeaders())
      .send({ userNotes: 'x' })
    expect(res.status).toBe(404)
  })

  it('PATCH /bookmarks/:id: kegagalan database → 500 (catch arm)', async () => {
    Bookmark.findOne.mockRejectedValue(new Error('db down'))
    const res = await request(app)
      .patch('/api/bookmarks/9e64e66a-114f-4676-9db2-ada065b7642f')
      .set(authHeaders())
      .send({ userNotes: 'x' })
    expect(res.status).toBe(500)
  })

  it('DELETE /bookmarks/:id: id bukan UUID → 404', async () => {
    const res = await request(app)
      .delete('/api/bookmarks/sample-1')
      .set(authHeaders())
    expect(res.status).toBe(404)
  })

  it('DELETE /bookmarks/:id: kegagalan database → 500 (catch arm)', async () => {
    Bookmark.findOne.mockRejectedValue(new Error('db down'))
    const res = await request(app)
      .delete('/api/bookmarks/9e64e66a-114f-4676-9db2-ada065b7642f')
      .set(authHeaders())
    expect(res.status).toBe(500)
  })
})

