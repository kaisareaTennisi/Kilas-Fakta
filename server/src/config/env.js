import 'dotenv/config'

const env = (key, fallback = '') => process.env[key] ?? fallback

export { env }

// Field yang bisa berubah saat runtime (utamanya di test) dibuat sebagai
// getter supaya selalu membaca nilai process.env terbaru.
const config = {
  get port() {
    return Number(env('PORT', '5000'))
  },
  get nodeEnv() {
    return env('NODE_ENV', 'development')
  },
  get clientUrl() {
    return env('CLIENT_URL', 'http://localhost:5173')
  },
  get databaseUrl() {
    return env('DATABASE_URL', '')
  },
  get db() {
    return {
      host: env('DB_HOST', 'localhost'),
      port: Number(env('DB_PORT', '5432')),
      name: env('DB_NAME', 'kilasfakta'),
      user: env('DB_USER', 'postgres'),
      password: env('DB_PASSWORD', 'postgres'),
    }
  },
  get jwt() {
    return {
      secret: env('JWT_SECRET', 'kilasfakta-dev-secret-please-change'),
      expiresIn: env('JWT_EXPIRES_IN', '7d'),
    }
  },
  get newsApiKey() {
    return env('NEWS_API_KEY', '')
  },
  get currentsApiKey() {
    return env('CURRENTS_API_KEY', '')
  },
  gemini: {
    get apiKey() {
      return env('GEMINI_API_KEY', '')
    },
    get model() {
      return env('GEMINI_MODEL', 'gemini-1.5-flash')
    },
  },
  get googleClientId() {
    return env('GOOGLE_CLIENT_ID', '')
  },
}

export default config