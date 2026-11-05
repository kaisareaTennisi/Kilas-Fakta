import request from 'supertest'
import { jest } from '@jest/globals'
import { createApp } from '../src/app.js'
import sequelize from '../src/config/database.js'
import { notFound, errorHandler } from '../src/middlewares/errorHandler.js'

/** Mock res minimal untuk unit test middleware error. */
const mockRes = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn((payload) => {
    res.body = payload
    return res
  })
  return res
}

describe('App (integrasi tingkat aplikasi)', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
  })

  it('GET /api/health — 200 & payload sehat', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toMatch(/sehat/)
    expect(typeof res.body.uptime).toBe('number')
    expect(res.body.env).toBe('test')
  })

  it('Rute tidak dikenal — 404 dari notFound handler', async () => {
    const res = await request(app).get('/api/tidak-ada')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/Rute tidak ditemukan/)
    expect(res.body.message).toContain('/api/tidak-ada')
  })

  it('Body JSON rusak — 400 (entity.parse.failed)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "rusak"')

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/JSON/)
  })

  it('Content-Type application/json tanpa body — tetap lanjut (req.body {})', async () => {
    const res = await request(app).post('/api/auth/login')
    expect(res.status).toBe(400) // validasi field kosong, bukan crash
    expect(res.body.success).toBe(false)
  })
})

describe('Middlewares errorHandler & notFound (unit)', () => {
  it('notFound — 404 memuat method & url', () => {
    const res = mockRes()
    notFound({ method: 'DELETE', originalUrl: '/api/xyz' }, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.body.message).toContain('DELETE /api/xyz')
  })

  it('entity.parse.failed — dipetakan ke 400', () => {
    const res = mockRes()
    errorHandler({ type: 'entity.parse.failed' }, {}, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body.message).toMatch(/JSON/)
  })

  it('SequelizeUniqueConstraintError — dipetakan ke 409', () => {
    const res = mockRes()
    errorHandler({ name: 'SequelizeUniqueConstraintError' }, {}, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body.message).toMatch(/sudah digunakan/)
  })

  it('SequelizeValidationError — 400 dengan gabungan pesan', () => {
    const res = mockRes()
    const err = {
      name: 'SequelizeValidationError',
      errors: [{ message: 'Email tidak valid' }, { message: 'Nama wajib diisi' }],
    }
    errorHandler(err, {}, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body.message).toBe('Email tidak valid, Nama wajib diisi')
  })

  it('SequelizeDatabaseError — 500 dengan pesan generik', () => {
    const res = mockRes()
    errorHandler({ name: 'SequelizeDatabaseError' }, {}, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body.message).toMatch(/database/)
  })

  it('Error dengan statusCode custom — dipakai apa adanya', () => {
    const res = mockRes()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    errorHandler({ statusCode: 418, message: 'Teh hangat' }, {}, res)
    expect(res.status).toHaveBeenCalledWith(418)
    expect(res.body.message).toBe('Teh hangat')
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('Error tanpa statusCode — 500 & dicatat ke console', () => {
    const res = mockRes()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    errorHandler(new Error('meledak'), {}, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body.message).toBe('meledak')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('Error kosong — fallback pesan internal server', () => {
    const res = mockRes()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    errorHandler(null, {}, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body.message).toMatch(/internal server/)
    consoleSpy.mockRestore()
  })
})
