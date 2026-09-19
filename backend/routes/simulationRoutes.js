import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getSimulationState,
  startSimulation,
  pauseSimulation,
  setSimulationSpeed,
  resetSimulation,
  tickSimulation,
  replayCase
} from '../services/simulationService.js'

const router = express.Router()
router.use(authenticate)
router.get('/state', (req, res) => res.json(getSimulationState()))
router.post('/start', (req, res) => res.json(startSimulation()))
router.post('/pause', (req, res) => res.json(pauseSimulation()))
router.post('/reset', (req, res) => res.json(resetSimulation()))
router.post('/speed', (req, res) => res.json(setSimulationSpeed(req.body?.speed)))
router.post('/tick', (req, res) => res.json(tickSimulation()))
router.post('/case/:caseId', (req, res) => res.json(replayCase(req.params.caseId)))

export default router
