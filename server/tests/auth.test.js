import request from 'supertest'
import createApp from '../src/app.js'
import sequelize from '../src/config/database.js'
import { uniqueEmail } from './helpers.js'

/** Build ID token Google "palsu" (payload didekode lokal di mode dev). */
const fakeGoogleToken = ({ sub = 'sub-123', email, name = 'Ayu Google', picture = '' } = {}) => {
  const payload = Buffer.from(
    JSON.stringify({ sub, email, name, picture }),
  ).toString('base64url')
  return `header.${payload}.signature`
}

describe('Auth API (integrasi)', () => {
  let app
  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
  })

  describe('POST /api/auth/register', () => {
    it('201 — registrasi sukses mengembalikan token & user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi', email: uniqueEmail(), password: 'rahasia123' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.token).toBe('string')
      expect(res.body.user).toMatchObject({ name: 'Budi', provider: 'credentials' })
      expect(res.body.user).not.toHaveProperty('password')
    })

    it('400 — bila field wajib kosong (middleware validasi)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: '', password: '' })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('400 — password terlalu pendek', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi', email: uniqueEmail(), password: '123' })
      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/minimal 6 karakter/)
    })

    it('409 — email sudah terdaftar', async () => {
      const email = uniqueEmail()
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi', email, password: 'rahasia123' })

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi Lagi', email: email.toUpperCase(), password: 'rahasia123' })

      expect(res.status).toBe(409)
      expect(res.body.message).toMatch(/sudah terdaftar/)
    })
  })

  describe('POST /api/auth/login', () => {
    it('200 — kredensial valid mengembalikan token', async () => {
      const email = uniqueEmail()
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi', email, password: 'rahasia123' })

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'rahasia123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.token).toBe('string')
    })

    it('400 — field kosong', async () => {
      const res = await request(app).post('/api/auth/login').send({})
      expect(res.status).toBe(400)
    })

    it('401 — password salah', async () => {
      const email = uniqueEmail()
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Budi', email, password: 'rahasia123' })

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password-salah' })
      expect(res.status).toBe(401)
    })

    it('401 — email tidak terdaftar', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'tak-ada@test.dev', password: 'rahasia123' })
      expect(res.status).toBe(401)
      expect(res.body.message).toMatch(/salah/)
    })

    it('401 — user Google (tanpa password) tidak bisa login via password', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: fakeGoogleToken({ email: 'google-only@test.dev' }) })
      expect(res.status).toBe(200)

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'google-only@test.dev', password: 'rahasia123' })
      expect(res2.status).toBe(401)
    })
  })

  describe('POST /api/auth/google', () => {
    it('201/200 — akun baru dibuat dari payload ID Token', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: fakeGoogleToken({ email: 'google-1@test.dev', name: 'Ayu' }) })

      expect(res.status).toBe(200)
      expect(res.body.user).toMatchObject({
        email: 'google-1@test.dev',
        name: 'Ayu',
        provider: 'google',
      })
      expect(typeof res.body.token).toBe('string')
    })

    it('200 — login Google kedua memakai akun yang sama (bukan duplikat)', async () => {
      const token = fakeGoogleToken({ sub: 'sub-777', email: 'google-2@test.dev' })
      const first = await request(app).post('/api/auth/google').send({ idToken: token })
      const second = await request(app).post('/api/auth/google').send({ idToken: token })

      expect(first.body.user.id).toBe(second.body.user.id)
      expect(second.body.message).toMatch(/berhasil/)
    })

    it('400 — idToken kosong (validasi middleware)', async () => {
      const res = await request(app).post('/api/auth/google').send({})
      expect(res.status).toBe(400)
    })

    it('401 — token tanpa email', async () => {
      const payload = Buffer.from(JSON.stringify({ name: 'Tanpa Email' })).toString('base64url')
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: `header.${payload}.sig` })
      expect(res.status).toBe(401)
    })

    it('401 — token format rusak', async () => {
      const res = await request(app).post('/api/auth/google').send({ idToken: 'bukan-token' })
      expect(res.status).toBe(401)
    })
  })
})
