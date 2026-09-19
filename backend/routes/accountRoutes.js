import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getAccounts } from '../controllers/accountController.js'

const router = express.Router()

router.get('/', authenticate, getAccounts)

export default router
