import request from 'supertest'
import createApp from '../src/app.js'
import sequelize from '../src/config/database.js'
import { authHeader, registerUser } from './helpers.js'

const BOOKMARK_BODY = {
  newsId: 'sample-1',
  title: 'Gempa 5,6 SR Sumatera Barat',
  description: 'Tidak ada potensi tsunami.',
  imageUrl: 'https://img.example.com/gempa.jpg',
  source: 'Antara',
  category: 'nasional',
  publishedAt: '2026-09-11T00:00:00Z',
  url: 'https://example.com/gempa',
  userNotes: 'catatan awal',
  summary: '- poin satu\n- poin dua',
}

describe('Bookmarks API (integrasi CRUD + JWT)', () => {
  let app
  let tokenA
  let tokenB

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
    tokenA = (await registerUser(request(app))).res.body.token
    tokenB = (await registerUser(request(app))).res.body.token
  })

  it('401 — tanpa token ditolak', async () => {
    const res = await request(app).get('/api/bookmarks')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/Tidak ada token/)
  })

  it('401 — token invalid ditolak', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set(authHeader('token-ngawur'))
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/tidak valid/)
  })

  it('401 — token valid tapi akun sudah dihapus', async () => {
    const { res: reg } = await registerUser(request(app))
    // Hapus user langsung dari DB untuk mensimulasikan akun yang hilang.
    const { default: User } = await import('../src/models/User.js')
    const user = await User.findOne({ where: { email: reg.body.user.email } })
    await user.destroy()

    const res = await request(app)
      .get('/api/bookmarks')
      .set(authHeader(reg.body.token))
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/tidak ditemukan/)
  })

  it('201 → 200 → list → patch → delete — siklus CRUD penuh', async () => {
    // CREATE
    const created = await request(app)
      .post('/api/bookmarks')
      .set(authHeader(tokenA))
      .send(BOOKMARK_BODY)
    expect(created.status).toBe(201)
    const id = created.body.bookmark.id
    expect(created.body.bookmark).toMatchObject({
      newsId: 'sample-1',
      userNotes: 'catatan awal',
      category: 'nasional',
    })

    // READ (list)
    const list = await request(app)
      .get('/api/bookmarks')
      .set(authHeader(tokenA))
    expect(list.status).toBe(200)
    expect(list.body.data.bookmarks).toHaveLength(1)

    // UPDATE
    const updated = await request(app)
      .patch(`/api/bookmarks/${id}`)
      .set(authHeader(tokenA))
      .send({ userNotes: 'catatan diperbarui', category: 'umum' })
    expect(updated.status).toBe(200)
    expect(updated.body.bookmark.userNotes).toBe('catatan diperbarui')
    expect(updated.body.bookmark.category).toBe('umum')

    // DELETE
    const deleted = await request(app)
      .delete(`/api/bookmarks/${id}`)
      .set(authHeader(tokenA))
    expect(deleted.status).toBe(200)
    expect(deleted.body.success).toBe(true)

    // List kembali kosong
    const empty = await request(app)
      .get('/api/bookmarks')
      .set(authHeader(tokenA))
    expect(empty.body.data.bookmarks).toHaveLength(0)
  })

  it('POST idempotent — newsId sama dikembalikan tanpa duplikat (200)', async () => {
    await request(app).post('/api/bookmarks').set(authHeader(tokenB)).send(BOOKMARK_BODY)
    const again = await request(app)
      .post('/api/bookmarks')
      .set(authHeader(tokenB))
      .send(BOOKMARK_BODY)

    expect(again.status).toBe(200)
    expect(again.body.message).toMatch(/sudah ada/)

    const list = await request(app).get('/api/bookmarks').set(authHeader(tokenB))
    expect(list.body.data.bookmarks).toHaveLength(1)
  })

  it('400 — newsId kosong', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set(authHeader(tokenA))
      .send({ title: 'Tanpa newsId' })
    expect(res.status).toBe(400)
  })

  it('404 — PATCH/DELETE id bukan UUID', async () => {
    const patch = await request(app)
      .patch('/api/bookmarks/sample-1')
      .set(authHeader(tokenA))
      .send({ userNotes: 'x' })
    expect(patch.status).toBe(404)

    const del = await request(app)
      .delete('/api/bookmarks/sample-1')
      .set(authHeader(tokenA))
    expect(del.status).toBe(404)
  })

  it('404 — bookmark milik user lain tidak bisa dilihat/diubah', async () => {
    const created = await request(app)
      .post('/api/bookmarks')
      .set(authHeader(tokenA))
      .send({ newsId: 'sample-2' })
    const id = created.body.bookmark.id

    const patched = await request(app)
      .patch(`/api/bookmarks/${id}`)
      .set(authHeader(tokenB))
      .send({ userNotes: 'nyolong' })
    expect(patched.status).toBe(404)

    const deleted = await request(app)
      .delete(`/api/bookmarks/${id}`)
      .set(authHeader(tokenB))
    expect(deleted.status).toBe(404)

    // Bila body kosong PATCH → tidak error (tidak ada perubahan)
    const noop = await request(app)
      .patch(`/api/bookmarks/${id}`)
      .set(authHeader(tokenA))
      .send({})
    expect(noop.status).toBe(200)
  })

  it('200 — bookmark baru tanpa publishedAt tetap tersimpan', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set(authHeader(tokenA))
      .send({ newsId: 'sample-3', title: 'AI Medis' })
    expect(res.status).toBe(201)
    expect(res.body.bookmark.title).toBe('AI Medis')
  })
})
