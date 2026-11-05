import request from 'supertest'
import sequelize from '../src/config/database.js'
import createApp from '../src/app.js'

/** Helper bersama semua suite integrasi: app supertest + DB test tersinkron. */
export const makeRequest = async () => {
  await sequelize.sync({ force: true })
  const app = createApp()
  return request(app)
}

export const registerUser = async (req, overrides = {}) => {
  const body = {
    name: 'Budi Tester',
    email: `budi${Math.floor(Math.random() * 100000)}@test.dev`,
    password: 'rahasia123',
    ...overrides,
  }
  const res = await req.post('/api/auth/register').send(body)
  return { res, body }
}

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export const uniqueEmail = (prefix = 'user') =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.dev`
