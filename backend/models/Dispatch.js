import mongoose from 'mongoose'

const dispatchSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, trim: true },
    alertId: { type: String, required: true, index: true },
    recipient: { type: String, required: true },
    entity: { type: String },
    fraudType: { type: String },
    riskScore: { type: Number },
    severity: { type: String },
    transactionSummary: { type: String },
    fraudRingSummary: { type: String },
    evidence: { type: String },
    investigatorNotes: { type: String },
    recommendedAction: { type: String },
    status: { type: String, default: 'Dispatched' },
    dispatchTime: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

export default mongoose.model('Dispatch', dispatchSchema)
