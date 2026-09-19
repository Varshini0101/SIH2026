import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getTransactions, getTransactionById } from '../controllers/transactionController.js'

const router = express.Router()

router.get('/', authenticate, getTransactions)
router.get('/:id', authenticate, getTransactionById)

export default router
