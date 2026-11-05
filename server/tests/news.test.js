import request from 'supertest'
import createApp from '../src/app.js'
import sequelize from '../src/config/database.js'
import { authHeader, registerUser } from './helpers.js'

describe('News API (integrasi — fallback demo tanpa API key)', () => {
  let app
  let token

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
    const { res } = await registerUser(request(app))
    token = res.body.token
  })

  describe('GET /api/news', () => {
    it('200 — mengembalikan daftar artikel (data contoh)', async () => {
      const res = await request(app).get('/api/news')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.articles)).toBe(true)
      expect(res.body.data.articles.length).toBeGreaterThan(0)
      expect(res.body.data.articles[0]).toHaveProperty('title')
    })

    it('200 — filter kategori mempersempit hasil', async () => {
      const all = await request(app).get('/api/news')
      const filtered = await request(app).get('/api/news?category=teknologi')
      expect(filtered.status).toBe(200)
      filtered.body.data.articles.forEach((a) => expect(a.category).toBe('teknologi'))
      expect(filtered.body.data.articles.length).toBeLessThanOrEqual(
        all.body.data.articles.length,
      )
    })

    it('200 — pencarian q tidak menemukan apa pun tetap 200 dengan array kosong', async () => {
      const res = await request(app).get('/api/news?q=xyz-tidak-ada')
      expect(res.status).toBe(200)
      expect(res.body.data.articles).toEqual([])
    })
  })

  describe('GET /api/news/:id/summary', () => {
    it('200 — ringkasan artikel sampel', async () => {
      const res = await request(app).get('/api/news/sample-1/summary')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.data.summary).toBe('string')
      expect(res.body.data.summary.length).toBeGreaterThan(0)
    })

    it('404 — artikel news-* tidak ditemukan', async () => {
      const res = await request(app).get('/api/news/news-tidak-ada/summary')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/news/summarize (fact-check)', () => {
    it('200 — hasil analisis memuat verdict & points', async () => {
      const res = await request(app)
        .post('/api/news/summarize')
        .send({ text: 'Viral di media sosial kabarnya bumi akan gelap 3 hari.' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.summary).toHaveProperty('verdict')
      expect(res.body.summary.verdict).toMatch(/RAGU/)
      expect(Array.isArray(res.body.summary.points)).toBe(true)
      expect(res.body.summary.model).toBe('local-heuristic')
    })

    it('200 — klaim dideteksi HOAKS', async () => {
      const res = await request(app)
        .post('/api/news/summarize')
        .send({ text: 'Ini berita bohong yang menyesatkan masyarakat.' })
      expect(res.body.summary.verdict).toBe('HOAKS')
    })

    it('400 — body kosong ditolak middleware validasi', async () => {
      const res = await request(app).post('/api/news/summarize').send({})
      expect(res.status).toBe(400)
    })

    it('200 — tetap bisa dipakai tanpa login (publik)', async () => {
      const res = await request(app)
        .post('/api/news/summarize')
        .send({ title: 'Cuaca', text: 'BMKG memperkirakan hujan di Jabodetabek.' })
      expect(res.status).toBe(200)
    })

    it('200 — rute dilindungi auth? tidak — news bersifat publik', async () => {
      const res = await request(app).get('/api/news')
      expect(res.status).toBe(200)
    })

    it('200 — with token juga oke', async () => {
      const res = await request(app)
        .get('/api/news')
        .set(authHeader(token))
      expect(res.status).toBe(200)
    })
  })
})
