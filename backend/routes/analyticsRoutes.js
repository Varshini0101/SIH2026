import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getDashboardStats, getRiskAnalysis } from '../controllers/analyticsController.js'

const router = express.Router()

router.get('/dashboard', authenticate, getDashboardStats)
router.get('/risk-analysis', authenticate, getRiskAnalysis)

export default router
