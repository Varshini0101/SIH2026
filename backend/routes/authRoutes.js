import express from 'express'
import { login, verifyPasskey } from '../controllers/authController.js'

const router = express.Router()

router.post('/login', login)
router.post('/verify-passkey', verifyPasskey)

export default router
