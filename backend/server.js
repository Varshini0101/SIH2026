import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import authRoutes from './routes/authRoutes.js'
import complaintRoutes from './routes/complaintRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import accountRoutes from './routes/accountRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import predictionRoutes from './routes/predictionRoutes.js'
import atmRoutes from './routes/atmRoutes.js'
import simulationRoutes from './routes/simulationRoutes.js'
import moneyTrailRoutes from './routes/moneyTrailRoutes.js'
import riskIntelligenceRoutes from './routes/riskIntelligenceRoutes.js'
import dispatchRoutes from './routes/dispatchRoutes.js'
import { connectDatabase } from './services/databaseService.js'
import { authenticate } from './middleware/authMiddleware.js'
import { generateAtmRankingForCase } from './services/predictionService.js'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') })
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_sih_2026'


const app = express()
const PORT = process.env.PORT || 5000
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', process.env.CLIENT_URL].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Cybercrime intelligence API running' })
})

app.get('/api/prediction/:caseId', authenticate, (req, res) => {
  try {
    const { caseId } = req.params
    const result = generateAtmRankingForCase(caseId)

    if (!result.rankedCandidates || result.rankedCandidates.length === 0) {
      return res.status(404).json({
        caseId,
        rankedCandidates: [],
        totalCandidates: 0,
        timeToCashout: result.timeToCashout || null,
        predictionSummary: result.predictionSummary || {
          cashOutRisk: 'UNKNOWN',
          predictedTimeWindow: 'Unavailable',
          confidence: 'UNKNOWN',
          topLocation: null,
          topLocationsCount: 0
        },
        message: 'No rankable ATM candidates available for this case.'
      })
    }

    return res.json(result)
  } catch (error) {
    console.error('Member 3 prediction endpoint error:', error)
    return res.status(500).json({ message: 'Failed to load Member 3 ATM ranking for this case.' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/atm-locations', atmRoutes)
app.use('/api/simulation', simulationRoutes)
app.use('/api/money-trail', moneyTrailRoutes)
app.use('/api/risk-intelligence', riskIntelligenceRoutes)
app.use('/api/dispatches', dispatchRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

const startServer = async () => {
  const dbReady = await connectDatabase()
  if (!dbReady) {
    console.warn('MongoDB unavailable; continuing in demo fallback mode')
  }

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
}

startServer()
