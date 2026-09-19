import mongoose from 'mongoose'

const alertStatusSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, default: 'NEW' }
  },
  { timestamps: true }
)

export default mongoose.model('AlertStatus', alertStatusSchema)
