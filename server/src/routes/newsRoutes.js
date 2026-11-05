import { Router } from 'express'
import { getNews, getSummary, summarize } from '../controllers/newsController.js'
import { requireAny } from '../middlewares/validate.js'

const router = Router()

router.get('/', getNews)
router.post('/summarize', requireAny(['text', 'title'], 'Teks klaim wajib diisi (kirim melalui body { text }).'), summarize)
router.get('/:id/summary', getSummary)

export default router
