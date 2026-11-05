export default {
  testEnvironment: 'node',
  // Kode server menggunakan ESM murni — tanpa transform.
  transform: {},
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/teardown.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  // index.js & scripts hanya titik hidup proses (bukan logika bisnis) — dikecualikan
  collectCoverageFrom: ['src/**/*.js', '!src/index.js', '!src/scripts/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Hacktiv8 requirement: minimal 90% coverage
  coverageThreshold: {
    global: { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
  testTimeout: 30000,
  clearMocks: true,
}
