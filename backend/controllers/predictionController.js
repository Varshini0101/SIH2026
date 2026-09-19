import { generatePredictionForCase } from '../services/predictionService.js'

export const getPredictionsForCase = async (req, res) => {
  const { caseId } = req.params

  try {
    const result = generatePredictionForCase(caseId)
    return res.json(result)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to load prediction data' })
  }
}
