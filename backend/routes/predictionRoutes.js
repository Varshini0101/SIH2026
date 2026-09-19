import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getPredictionsForCase } from '../controllers/predictionController.js'

const router = express.Router()

router.get('/:caseId', authenticate, getPredictionsForCase)

export default router
