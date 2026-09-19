import mongoose from 'mongoose'

const predictionSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, index: true },
    suspiciousAccount: { type: String, required: true },
    locationName: { type: String, required: true },
    atmId: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    predictionScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    explanation: { type: String, required: true },
    sortedRank: { type: Number, default: 1 }
  },
  { timestamps: true }
)

export default mongoose.model('Prediction', predictionSchema)
