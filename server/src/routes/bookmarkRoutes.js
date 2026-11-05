import { Router } from 'express'
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../controllers/bookmarkController.js'
import authenticate from '../middlewares/auth.js'
import { requiredFields } from '../middlewares/validate.js'

const router = Router()

// Semua rute bookmark diproteksi JWT.
router.use(authenticate)

router.get('/', listBookmarks)
router.post('/', requiredFields(['newsId'], 'newsId wajib diisi.'), createBookmark)
router.patch('/:id', updateBookmark)
router.delete('/:id', deleteBookmark)

export default router
