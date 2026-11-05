import sequelize, { createConnection } from './config/database.js'
import config from './config/env.js'
import createApp from './app.js'
import { User, Bookmark } from './models/index.js'

/**
 * Sinkronisasi skema database (create table bila belum ada).
 * Dipisah agar skrip sync (npm run db:sync) & Jest bisa memanggilnya.
 */
export const syncDatabase = async (connection = sequelize) => {
  await connection.authenticate()
  await User.init(User.getAttributes(), { sequelize: connection, modelName: 'User', tableName: 'users' })
  return connection.sync()
}

export const startServer = async ({ port = config.port, connection = sequelize } = {}) => {
  await connection.authenticate()
  await connection.sync()
  const app = createApp()
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 KilasFakta API berjalan di http://localhost:${port} (env: ${config.nodeEnv})`)
  })
  return { app, server }
}

// Jalankan hanya bila file ini dieksekusi langsung (bukan diimpor test).
const isDirectRun = process.argv[1] && process.argv[1].endsWith('index.js')

if (isDirectRun && config.nodeEnv !== 'test') {
  startServer().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Gagal menjalankan server:', err.message)
    process.exit(1)
  })
}

export default startServer
