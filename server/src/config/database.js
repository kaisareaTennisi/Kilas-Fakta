import { Sequelize } from 'sequelize'
import config from './env.js'

/**
 * Pabrik koneksi database — dipisah agar mudah diuji:
 * - Jika `url` tersedia (mis. Supabase/Neon), pakai connection string.
 * - Jika tidak, bangun koneksi dari komponen host/port/user/password.
 */
export const createConnection = ({ url, ...db } = {}) =>
  url
    ? new Sequelize(url, { logging: false })
    : new Sequelize({
        dialect: 'postgres',
        host: db.host ?? config.db.host,
        port: db.port ?? config.db.port,
        database: db.database ?? config.db.name,
        username: db.username ?? config.db.user,
        password: db.password ?? config.db.password,
        logging: false,
      })

// Koneksi utama aplikasi (mengikuti konfigurasi env aktif)
const sequelize = createConnection({ url: config.databaseUrl })

export default sequelize
