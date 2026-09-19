import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getDispatches,
  createDispatchRecord,
  getAlertStatuses,
  updateAlertStatus
} from '../services/databaseService.js'

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const { alertId } = req.query
    const dispatches = await getDispatches(alertId)
    res.json(dispatches)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const dispatch = await createDispatchRecord(req.body)
    res.status(201).json(dispatch)
  } catch (err) {
    next(err)
  }
})

router.get('/alerts/status', async (req, res, next) => {
  try {
    const statuses = await getAlertStatuses()
    res.json(statuses)
  } catch (err) {
    next(err)
  }
})

router.put('/alerts/:alertId/status', async (req, res, next) => {
  try {
    const { alertId } = req.params
    const { status } = req.body
    const result = await updateAlertStatus(alertId, status)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
