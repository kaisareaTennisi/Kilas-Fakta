import { Router } from 'express'
import { register, login, googleLogin } from '../controllers/authController.js'
import { requiredFields } from '../middlewares/validate.js'

const router = Router()

router.post('/register', requiredFields(['name', 'email', 'password'], 'Nama, email, dan password wajib diisi.'), register)
router.post('/login', requiredFields(['email', 'password'], 'Email dan password wajib diisi.'), login)
router.post('/google', requiredFields(['idToken'], 'idToken wajib diisi (kirim melalui body { idToken }).'), googleLogin)

export default router
