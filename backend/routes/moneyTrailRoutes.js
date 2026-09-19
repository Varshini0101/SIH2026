import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { buildMoneyTrailGraph, getMoneyTrailDashboard, replayIntervention } from '../services/moneyTrailService.js'

const router = express.Router()
router.use(authenticate)

router.get('/:caseId', (req, res) => res.json(getMoneyTrailDashboard(req.params.caseId)))
router.post('/:caseId/replay', (req, res) => {
  const graph = buildMoneyTrailGraph()
  const { freezeNodeId = 'mule-001', freezeAt = '2026-09-09T12:05:00Z' } = req.body || {}
  res.json({ caseId: req.params.caseId, ...replayIntervention(graph, { freezeNodeId, freezeAt }) })
})

export default router
