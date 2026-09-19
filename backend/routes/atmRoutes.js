import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getATMLocations } from '../services/databaseService.js'

const router = express.Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const locations = await getATMLocations()
    return res.json(locations)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load ATM locations' })
  }
})

export default router
