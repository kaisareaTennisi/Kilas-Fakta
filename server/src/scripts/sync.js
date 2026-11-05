import sequelize from '../config/database.js'
import { User, Bookmark } from '../models/index.js'

/**
 * npm run db:sync — buat/tinjau ulang tabel users & bookmarks.
 * Aman dijalankan berkali-kali (tidak menghapus data yang ada).
 */
const run = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync()
    // eslint-disable-next-line no-console
    console.log('✅ Skema database berhasil disinkronkan.')
    await sequelize.close()
    process.exit(0)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Gagal sinkronisasi skema:', error.message)
    process.exit(1)
  }
}

run()
