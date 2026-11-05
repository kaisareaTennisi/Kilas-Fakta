/**
 * Branch-coverage tests untuk config layer (database & env)
 * dan branch morgan di app.js.
 */
import request from 'supertest'
import { createConnection } from '../src/config/database.js'
import config from '../src/config/env.js'
import { createApp } from '../src/app.js'

describe('createConnection (pabrik koneksi)', () => {
  it('memakai connection string bila `url` tersedia (branch url)', () => {
    const conn = createConnection({
      url: 'postgres://user:pass@host:5432/dbx',
    })
    expect(typeof conn.authenticate).toBe('function')
    expect(conn.config.database).toBe('dbx')
  })

  it('memakai komponen override bila tanpa `url` (semua `??` sisi kiri)', () => {
    const conn = createConnection({
      host: 'host-override',
      port: 6543,
      database: 'db-override',
      username: 'user-override',
      password: 'pass-override',
    })
    expect(conn.config.host).toBe('host-override')
    expect(conn.config.port).toBe(6543)
    expect(conn.config.database).toBe('db-override')
    expect(conn.config.username).toBe('user-override')
    expect(typeof conn.authenticate).toBe('function')
  })

  it('fallback ke konfigurasi env bila komponen kosong (semua `??` sisi kanan)', () => {
    const conn = createConnection({})
    expect(conn.config.database).toBe(config.db.name)
    expect(conn.config.host).toBe(config.db.host)
    expect(conn.config.username).toBe(config.db.user)
  })
})

describe('config.env (getter runtime)', () => {
  const ENV_BACKUP = { ...process.env }

  afterEach(() => {
    process.env = { ...ENV_BACKUP }
  })

  it('nodeEnv membaca nilai terbaru dari process.env', () => {
    process.env.NODE_ENV = 'production'
    expect(config.nodeEnv).toBe('production')
  })

  it('newsApiKey & currentsApiKey — terisi bila ada, kosong bila tidak (dua sisi ??)', () => {
    process.env.NEWS_API_KEY = 'k1'
    process.env.CURRENTS_API_KEY = 'k2'
    expect(config.newsApiKey).toBe('k1')
    expect(config.currentsApiKey).toBe('k2')

    delete process.env.NEWS_API_KEY
    delete process.env.CURRENTS_API_KEY
    expect(config.newsApiKey).toBe('')
    expect(config.currentsApiKey).toBe('')
  })

  it('gemini.apiKey & googleClientId — dua sisi ??', () => {
    process.env.GEMINI_API_KEY = 'g1'
    process.env.GOOGLE_CLIENT_ID = 'cid'
    expect(config.gemini.apiKey).toBe('g1')
    expect(config.googleClientId).toBe('cid')

    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_CLIENT_ID
    expect(config.gemini.apiKey).toBe('')
    expect(config.googleClientId).toBe('')
  })

  it('field statis tersedia (port, clientUrl, databaseUrl, jwt, gemini.model)', () => {
    expect(typeof config.port).toBe('number')
    expect(typeof config.clientUrl).toBe('string')
    expect(typeof config.databaseUrl).toBe('string')
    expect(typeof config.jwt.secret).toBe('string')
    expect(typeof config.jwt.expiresIn).toBe('string')
    expect(typeof config.gemini.model).toBe('string')
    expect(config.db.port).toBe(Number(config.db.port))
  })

  it('jwt.secret, port, clientUrl, db — dua sisi ?? untuk tiap override', () => {
    process.env.JWT_SECRET = 'rahasia-test'
    process.env.PORT = '7777'
    process.env.CLIENT_URL = 'http://localhost:3999'
    process.env.DB_NAME = 'db-env-override'
    process.env.DB_HOST = 'host-env'
    process.env.DB_USER = 'user-env'
    process.env.DB_PASSWORD = 'pass-env'
    process.env.DB_PORT = '6600'
    expect(config.jwt.secret).toBe('rahasia-test')
    expect(config.port).toBe(7777)
    expect(config.clientUrl).toBe('http://localhost:3999')
    expect(config.db.name).toBe('db-env-override')
    expect(config.db.host).toBe('host-env')
    expect(config.db.user).toBe('user-env')
    expect(config.db.password).toBe('pass-env')
    expect(config.db.port).toBe(6600)

    delete process.env.JWT_SECRET
    delete process.env.PORT
    delete process.env.CLIENT_URL
    delete process.env.DB_PASSWORD
    expect(typeof config.jwt.secret).toBe('string')
    expect(config.port).toBe(5000)
  })
})

describe('app.js — branch morgan', () => {
  const ENV_BACKUP = { ...process.env }

  afterEach(() => {
    process.env = { ...ENV_BACKUP }
  })

  it('di luar env test morgan dipasang dan aplikasi tetap sehat', async () => {
    process.env.NODE_ENV = 'development'
    const devApp = createApp()
    const res = await request(devApp).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.env).toBe('development')
  })
})
