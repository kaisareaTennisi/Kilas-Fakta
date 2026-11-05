import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import config from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import newsRoutes from './routes/newsRoutes.js'
import bookmarkRoutes from './routes/bookmarkRoutes.js'
import { notFound, errorHandler } from './middlewares/errorHandler.js'

/**
 * createApp() dipisah dari proses listen agar supertest/Jest bisa
 * memakai app tanpa membuka port sungguhan.
 */
export const createApp = () => {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.clientUrl, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'))
  }

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'KilasFakta API sehat.',
      uptime: process.uptime(),
      env: config.nodeEnv,
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/news', newsRoutes)
  app.use('/api/bookmarks', bookmarkRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

export default createApp
