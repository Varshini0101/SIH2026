import mongoose from 'mongoose'

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true },
    accountType: { type: String, default: 'SAVINGS' },
    status: { type: String, enum: ['ACTIVE', 'FROZEN', 'CLOSED'], default: 'ACTIVE' },
    balance: { type: Number, default: 0 },
    owner: { type: String, required: true },
    riskBand: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    relatedComplaintIds: [{ type: String }],
    relatedTransactionCount: { type: Number, default: 0 },
    totalTransactionAmount: { type: Number, default: 0 },
    suspiciousActivity: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export default mongoose.model('Account', accountSchema)
