import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getRiskIntelligence, simulateFalsePositiveCost, validateSimulationInput } from '../services/riskIntelligenceService.js'

const router = express.Router()
router.use(authenticate)

router.get('/:caseId', async (req, res) => {
  try {
    return res.json(await getRiskIntelligence(req.params.caseId))
  } catch (error) {
    console.error('Risk intelligence load failed:', error.message)
    return res.status(500).json({ message: 'Failed to calculate risk intelligence.' })
  }
})

router.post('/:caseId/simulate', (req, res) => {
  const validation = validateSimulationInput(req.body)
  if (!validation.valid) return res.status(400).json({ message: validation.message })
  return res.json(simulateFalsePositiveCost(req.body))
})

export default router
