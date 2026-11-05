# 📘 KilasFakta REST API Documentation

Backend Express + PostgreSQL (Sequelize) untuk aplikasi **Kilas Fakta** — portal berita
dan AI fact-checker. Dokumen ini memuat seluruh endpoint, body request, format respons,
status code, serta panduan pengujian (Postman & Jest).

- **Base URL (dev):** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Autentikasi:** `Authorization: Bearer <token>` (JWT)
- **Format respons:** selalu `{ success: boolean, message?: string, ...data }`


## 📑 Daftar Endpoint

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/health` | – | Health check server |
| POST | `/auth/register` | – | Registrasi email/password |
| POST | `/auth/login` | – | Login email/password → JWT |
| POST | `/auth/google` | – | Login via Google Sign-In (ID Token) |
| GET | `/news` | – | Feed berita (filter kategori & pencarian) |
| GET | `/news/:id/summary` | – | Ringkasan satu artikel |
| POST | `/news/summarize` | – | Fact-check / ringkasan klaim via Gemini |
| GET | `/bookmarks` | ✅ | Daftar bookmark milik user |
| POST | `/bookmarks` | ✅ | Simpan artikel ke bookmark (idempotent) |
| PATCH | `/bookmarks/:id` | ✅ | Ubah catatan/kategori bookmark |
| DELETE | `/bookmarks/:id` | ✅ | Hapus bookmark |

---

## 1. GET `/health`

Cek status server.

**Respons 200**
```json
{
  "success": true,
  "message": "KilasFakta API sehat.",
  "uptime": 30.21,
  "env": "development"
}
```

---

## 2. POST `/auth/register`

**Body**
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

**Respons 201**
```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a722c539-3cd2-4cdf-9ad1-3d152a5444f5",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "avatar": null,
    "provider": "credentials"
  }
}
```

| Status | Kondisi |
|---|---|
| 400 | Field wajib kosong / password < 6 karakter |
| 409 | Email sudah terdaftar |
| 500 | Kegagalan database |

---

## 3. POST `/auth/login`

**Body**
```json
{ "email": "budi@example.com", "password": "rahasia123" }
```

**Respons 200** — format sama dengan `/auth/register` (`message: "Login berhasil."`).

| Status | Kondisi |
|---|---|
| 400 | Email/password kosong |
| 401 | Email atau password salah (juga akun Google tanpa password) |

---

## 4. POST `/auth/google`

Login/registrasi menggunakan **Google Sign-In**. Frontend (`@react-oauth/google`)
mengirim `credential` (Google ID Token) sebagai `idToken`.

**Body**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }
```

**Respons 200**
```json
{
  "success": true,
  "message": "Login Google berhasil (akun baru dibuat).",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "9f1e...",
    "name": "Budi Santoso",
    "email": "budi@gmail.com",
    "avatar": "https://lh3.googleusercontent.com/...",
    "provider": "google"
  }
}
```

**Perilaku**
- `GOOGLE_CLIENT_ID` terisi → token diverifikasi penuh via `google-auth-library`.
- `GOOGLE_CLIENT_ID` kosong/placeholder (mode demo) → payload token didekode lokal.
- Jika akun dengan email sama sudah ada, `googleId` & `avatar` akan disinkronkan.
- `message` bernilai "…(akun baru dibuat)." bila akun baru dibuat.

| Status | Kondisi |
|---|---|
| 400 | `idToken` tidak dikirim / bukan string |
| 401 | Token tidak valid, kedaluwarsa, atau tanpa email |
| 500 | Kegagalan database |

---

## 5. GET `/news`

Ambil daftar berita. Prioritas sumber: **NewsAPI.org → Currents API → data contoh**
sehingga endpoint tetap berfungsi tanpa API key (mode demo).

**Query params**

| Param | Default | Keterangan |
|---|---|---|
| `category` | `umum` | `umum`, `nasional`, `politik`, `ekonomi`, `teknologi`, `olahraga`, `hiburan`, `sains`, `internasional` |
| `q` | *(kosong)* | Kata kunci pencarian (memakai endpoint `everything`/`search`) |

**Contoh**
```
GET /api/news?category=teknologi
GET /api/news?q=pemilu%202026
```

**Respons 200**
```json
{
  "success": true,
  "message": "Daftar berita berhasil diambil.",
  "data": {
    "articles": [
      {
        "id": "sample-1",
        "title": "Pemerintah Luncurkan Program Literasi Digital Nasional",
        "description": "Program menyasar 10 juta pelajar...",
        "imageUrl": "",
        "source": "Antara News",
        "category": "teknologi",
        "publishedAt": "2026-09-11T04:00:00.000Z",
        "url": ""
      }
    ]
  }
}
```

| Status | Kondisi |
|---|---|
| 500 | Semua sumber gagal (di produksi) / kegagalan tak terduga |


---

## 6. GET `/news/:id/summary`

Ringkasan singkat (2–3 kalimat) untuk satu artikel — dipakai `SummaryModal` di
`newsSlice.fetchSummary`.

**Contoh**
```
GET /api/news/sample-3/summary
```

**Respons 200**
```json
{
  "success": true,
  "message": "Ringkasan berhasil dibuat.",
  "data": {
    "summary": "Startup lokal meluncurkan model AI penjawab pertanyaan medis. Teknologi ini dilatih dengan data literatur berbahasa Indonesia.",
    "title": "Startup Lokal Luncurkan Model AI Penjawab Pertanyaan Medis"
  }
}
```

**Perilaku**
- `id` dicari pada data contoh, lalu pada feed aktif — id apa pun dari `GET /news`
  dapat diringkas.
- `GEMINI_API_KEY` kosong → ringkasan dibuat oleh mesin heuristik lokal.

| Status | Kondisi |
|---|---|
| 400 | `id` tidak ada |
| 404 | Artikel tidak ditemukan di sumber mana pun |
| 500 | Kegagalan tak terduga |

---

## 7. POST `/news/summarize`

Fact-check / analisis klaim memakai **Gemini** (`analyzeFact`). Dipakai `aiSlice.analyzeClaim`.

**Body**
```json
{
  "title": "Judul klaim (opsional)",
  "text": "Klaim atau isi berita yang ingin diverifikasi.",
  "url": "https://sumber.example/artikel (opsional)"
}
```
> Minimal salah satu dari `text` atau `title` harus terisi (middleware `requireAny`).

**Respons 200**
```json
{
  "success": true,
  "message": "Analisis berhasil dibuat.",
  "summary": {
    "text": "Klaim ini belum memiliki bukti resmi yang memadai.",
    "points": [
      "Tidak ditemukan sumber resmi yang mengonfirmasi klaim.",
      "Narasi menyebar tanpa atribusi yang jelas.",
      "Sumber yang direferensikan: https://sumber.example/artikel"
    ],
    "verdict": "RAGU — Perlu Verifikasi",
    "model": "gemini-1.5-flash"
  }
}
```

**Nilai `verdict` yang mungkin**
| Verdict | Arti |
|---|---|
| `FAKTA — Tidak Ada Indikasi Misinformasi` | Tidak ditemukan indikasi misinformasi |
| `RAGU — Perlu Verifikasi` | Bukti belum cukup |
| `HOAKS` | Terdapat indikasi kuat misinformasi |

`model` bernilai `local-heuristic` bila `GEMINI_API_KEY` kosong atau Gemini gagal
(fallback otomatis sehingga UI tetap berfungsi).

| Status | Kondisi |
|---|---|
| 400 | `text` & `title` kosong |
| 500 | Kegagalan tak terduga |

---

## 8. GET `/bookmarks` 🔒

Daftar bookmark milik user yang sedang login (urut terbaru).

**Header:** `Authorization: Bearer <token>`

**Respons 200**
```json
{
  "success": true,
  "message": "Daftar bookmark berhasil diambil.",
  "data": {
    "bookmarks": [
      {
        "id": "f4304a7b-0d3b-43f4-a1ed-3d3416b840a9",
        "userId": "a722c539-3cd2-4cdf-9ad1-3d152a5444f5",
        "newsId": "sample-2",
        "title": "Rupiah Menguat ke Level Terkuat dalam Lima Bulan Terakhir",
        "description": "Nilai tukar rupiah ditutup menguat...",
        "imageUrl": "",
        "source": "Bisnis Indonesia",
        "category": "ekonomi",
        "publishedAt": "2026-09-11T04:00:00.000Z",
        "url": "",
        "userNotes": "monitor",
        "summary": "- poin",
        "createdAt": "2026-09-11T04:48:17.934Z",
        "updatedAt": "2026-09-11T04:48:17.934Z"
      }
    ]
  }
}
```

| Status | Kondisi |
|---|---|
| 401 | Token tidak ada / tidak valid / akun tidak ditemukan |
| 500 | Kegagalan database |


---

## 9. POST `/bookmarks` 🔒

Simpan artikel ke bookmark. **Idempotent** per pasangan `user + newsId`: bila artikel
sudah tersimpan, respons `200` mengembalikan bookmark yang ada (tanpa duplikat/409).

**Body**
```json
{
  "newsId": "sample-2",
  "title": "Rupiah Menguat ke Level Terkuat",
  "description": "Nilai tukar rupiah ditutup menguat...",
  "imageUrl": "",
  "source": "Bisnis Indonesia",
  "category": "ekonomi",
  "publishedAt": "2026-09-11T04:00:00.000Z",
  "url": "",
  "userNotes": "monitor",
  "summary": "- poin ringkasan"
}
```
> Hanya `newsId` yang wajib. Field lain memiliki default
> (`title: "Tanpa Judul"`, `source: "KilasFakta"`, `category: "umum"`, dst).

**Respons 201 (baru)**
```json
{
  "success": true,
  "message": "Berhasil disimpan ke bookmark.",
  "bookmark": { "id": "f4304...", "newsId": "sample-2", "title": "..." }
}
```

**Respons 200 (sudah ada)**
```json
{
  "success": true,
  "message": "Artikel sudah ada di bookmark.",
  "bookmark": { "id": "f4304...", "newsId": "sample-2", "title": "..." }
}
```

| Status | Kondisi |
|---|---|
| 400 | `newsId` kosong |
| 401 | Token tidak valid |
| 500 | Kegagalan database |

---

## 10. PATCH `/bookmarks/:id` 🔒

Perbarui catatan pribadi dan/atau kategori bookmark milik user.

**Body** (kirim salah satu atau keduanya)
```json
{ "userNotes": "sudah dipantau", "category": "ekonomi" }
```

**Respons 200**
```json
{
  "success": true,
  "message": "Bookmark berhasil diperbarui.",
  "bookmark": { "id": "f4304...", "userNotes": "sudah dipantau" }
}
```

| Status | Kondisi |
|---|---|
| 401 | Token tidak valid |
| 404 | `:id` bukan UUID valid, atau bookmark bukan milik user |
| 500 | Kegagalan database |

---

## 11. DELETE `/bookmarks/:id` 🔒

Hapus bookmark milik user.

**Respons 200**
```json
{ "success": true, "message": "Bookmark berhasil dihapus." }
```

| Status | Kondisi |
|---|---|
| 401 | Token tidak valid |
| 404 | `:id` bukan UUID valid, atau bookmark bukan milik user |
| 500 | Kegagalan database |

---

## 🧪 Pengujian (Jest + Supertest)

```bash
cd server
npm test              # 147 test, 9 suite
npm run test:coverage # + laporan coverage (threshold 90% di semua metrik)
```

**Hasil terakhir**

| Metrik | Coverage |
|---|---|
| Statements | **100%** (402/402) |
| Branches | **100%** (346/346) |
| Functions | **100%** (72/72) |
| Lines | **100%** (360/360) |

**Peta file test**

| File | Cakupan |
|---|---|
| `tests/app.test.js` | Bootstrap app, health check, 404 handler |
| `tests/auth.test.js` | Register, login, Google Sign-In (integrasi DB) |
| `tests/news.test.js` | Feed berita, ringkasan artikel, fact-check |
| `tests/bookmarks.test.js` | CRUD bookmark (integrasi DB + JWT) |
| `tests/config.branches.test.js` | Cabang config env & koneksi database |
| `tests/controllers.errors.test.js` | Error path controller (model di-mock) |
| `tests/branches.controllers.test.js` | Cabang defensif `req.body/params/query` kosong |
| `tests/branches.services.test.js` | Cabang service (axios/Gemini di-mock) |
| `tests/teardown.js` | Menutup pool Sequelize agar Jest keluar bersih |

> Test integrasi memakai database `kilasfakta_test` (lihat `tests/env.setup.js`)
> dan `sequelize.sync({ force: true })` di setiap suite, sehingga data uji selalu bersih.

---

## 📬 Panduan Postman

1. **Buat Environment** dengan variabel:

| Variable | Nilai |
|---|---|
| `baseUrl` | `http://localhost:5000/api` |
| `token` | *(kosongkan, diisi otomatis)* |

2. **Import Collection** (New → Collection) lalu tambahkan request berikut:

| Nama | Method & URL |
|---|---|
| Health | `GET {{baseUrl}}/health` |
| Register | `POST {{baseUrl}}/auth/register` |
| Login | `POST {{baseUrl}}/auth/login` |
| Google Login | `POST {{baseUrl}}/auth/google` |
| News | `GET {{baseUrl}}/news?category=teknologi` |
| Summary | `GET {{baseUrl}}/news/sample-1/summary` |
| Fact Check | `POST {{baseUrl}}/news/summarize` |
| List Bookmarks | `GET {{baseUrl}}/bookmarks` |
| Create Bookmark | `POST {{baseUrl}}/bookmarks` |
| Update Bookmark | `PATCH {{baseUrl}}/bookmarks/{{bookmarkId}}` |
| Delete Bookmark | `DELETE {{baseUrl}}/bookmarks/{{bookmarkId}}` |

3. **Auto-simpan token** — pada request `Login`/`Register`, buka tab **Tests** dan isi:

```javascript
const res = pm.response.json()
if (res.token) {
  pm.environment.set('token', res.token)
}
```

4. **Autentikasi** — pada request bookmark, tab **Authorization** →
   Type `Bearer Token` → Token `{{token}}`.

5. **Jalankan server** terlebih dahulu:

```bash
cd server
npm run db:sync   # membuat tabel di PostgreSQL (sekali saja / saat skema berubah)
npm run dev       # http://localhost:5000
```

---

## 🗂️ Struktur Proyek

```
server/
├── src/
│   ├── app.js                 # Setup express + middleware + routes
│   ├── index.js               # Entry point (listen + koneksi DB)
│   ├── config/
│   │   ├── env.js             # Pembacaan .env terpusat
│   │   └── database.js        # Pabrik koneksi Sequelize
│   ├── controllers/           # authController, newsController, bookmarkController
│   ├── middlewares/           # auth (JWT), validate, errorHandler
│   ├── models/                # User, Bookmark, index (asosiasi)
│   ├── routes/                # authRoutes, newsRoutes, bookmarkRoutes
│   ├── scripts/sync.js        # Sinkronisasi skema DB
│   └── services/              # newsService, geminiService, googleService
├── tests/                     # 9 suite Jest + helper/teardown
├── API_DOCS.md                # Dokumen ini
├── jest.config.js
└── package.json
```

| 500 | Kegagalan database |
