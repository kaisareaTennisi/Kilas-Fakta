/**
 * Data contoh (fallback) — dipakai saat backend/NewsAPI tidak merespons,
 * sehingga UI tetap punya konten untuk didemokan.
 * Bentuknya identik dengan respons /api/news dari backend.
 */
export const SAMPLE_CATEGORIES = [
  'nasional',
  'ekonomi',
  'teknologi',
  'olahraga',
  'hiburan',
  'internasional',
]

const iso = (daysAgo) =>
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

export const sampleNews = [
  {
    id: 'sample-1',
    title: 'Gempa 5,6 SR Mengguncang Sumatera Barat, Tak Berpotensi Tsunami',
    description:
      'BMKG memastikan gempa bermagnitudo 5,6 terjadi di darat Sumatera Barat dan tidak berpotensi tsunami. Warga diminta tetap tenang.',
    category: 'nasional',
    source: 'Antara',
    publishedAt: iso(0),
    imageUrl: '',
    url: '',
  },
  {
    id: 'sample-2',
    title: 'Rupiah Menguat ke Level Rp15.400 per Dolar AS',
    description:
      'Kepercayaan investor asing meningkat seiring surplus neraca berjalan dan imbal hasil SBN yang menarik.',
    category: 'ekonomi',
    source: 'Bisnis Indonesia',
    publishedAt: iso(1),
    imageUrl: '',
    url: '',
  },
  {
    id: 'sample-3',
    title: 'Pemerintah Percepat Transformasi Digital UMKM Nasional',
    description:
      'Program pelatihan dan onboarding platform digital ditargetkan menjangkau 30 juta UMKM hingga akhir tahun.',
    category: 'teknologi',
    source: 'Kompas',
    publishedAt: iso(2),
    imageUrl: '',
    url: '',
  },
  {
    id: 'sample-4',
    title: 'Timnas Indonesia Raih Kemenangan Penting di Kualifikasi',
    description:
      'Gol di menit-menit akhir membawa Garuda unggul 2-1 dan mempertahankan peluang melaju ke putaran berikutnya.',
    category: 'olahraga',
    source: 'Detik Sport',
    publishedAt: iso(2),
    imageUrl: '',
    url: '',
  },
  {
    id: 'sample-5',
    title: 'Festival Film Indonesia 2026 Umumkan Daftar Nominasi',
    description:
      'Sebanyak 24 film bersaing di kategori utama. Juri menyebut kualiansa sinematik industri nasional meningkat signifikan.',
    category: 'hiburan',
    source: 'CNN Indonesia',
    publishedAt: iso(3),
    imageUrl: '',
    url: '',
  },
  {
    id: 'sample-6',
    title: 'Kerja Sama bilateral Asia Tenggara Perkuat Stabilitas Kawasan',
    description:
      'Pemimpin negara sepakat memperkuat kerja sama ekonomi dan keamanan maritim di pertemuan regional tahun ini.',
    category: 'internasional',
    source: 'Republika',
    publishedAt: iso(4),
    imageUrl: '',
    url: '',
  },
]

export default sampleNews
