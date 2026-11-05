/**
 * Dipanggil oleh Jest SEBELUM modul server mana pun diimpor,
 * sehingga config/env.js membaca nilai test, bukan .env pengembangan.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-unit'
process.env.JWT_EXPIRES_IN = '1h'
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/kilasfakta_test'
// Pastikan semua integrasi 3rd-party dinonaktifkan di test (dipakai via mock).
delete process.env.NEWS_API_KEY
delete process.env.CURRENTS_API_KEY
delete process.env.GEMINI_API_KEY
delete process.env.GOOGLE_CLIENT_ID

export {}
