import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    sourceAccount: { type: String, required: true },
    destinationAccount: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    transactionType: { type: String, enum: ['TRANSFER', 'UPI', 'IMPS', 'NEFT', 'ATM_WITHDRAWAL'], required: true },
    location: { type: String, required: true },
    status: { type: String, enum: ['SUSPICIOUS', 'CLEAR'], default: 'CLEAR' },
    riskIndicator: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    riskScore: { type: Number, default: 0 },
    atmLocationId: { type: String, default: null }
  },
  { timestamps: true }
)

export default mongoose.model('Transaction', transactionSchema)
