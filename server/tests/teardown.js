/**
 * Teardown setelah semua test di sebuah file selesai:
 * menutup pool koneksi Sequelize agar Jest bisa keluar bersih
 * (tanpa warning "Jest did not exit one second after the test run").
 */
import sequelize from '../src/config/database.js'

afterAll(async () => {
  try {
    await sequelize.close()
  } catch {
    /* pool mungkin belum pernah dibuka (suite yang memakai mock) — abaikan */
  }
})
