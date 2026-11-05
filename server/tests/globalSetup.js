import pg from 'pg'

/**
 * globalSetup Jest — pastikan database test tersedia sebelum suite berjalan.
 * Menggunakan koneksi ke db "postgres" default untuk CREATE DATABASE.
 */
export default async () => {
  const client = new pg.Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
  })
  try {
    await client.connect()
    await client.query('CREATE DATABASE kilasfakta_test')
  } catch (error) {
    // 42P04 = database already exists — aman diabaikan.
    if (error.code !== '42P04') {
      // Jika PostgreSQL belum berjalan sama sekali, suite tetap gagal jelas.
      // eslint-disable-next-line no-console
      console.error('[globalSetup] Gagal menyiapkan database test:', error.message)
    }
  } finally {
    try {
      await client.end()
    } catch {
      /* noop */
    }
  }
}
