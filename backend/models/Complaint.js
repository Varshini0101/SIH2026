import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true, trim: true },
    complaintDate: { type: Date, required: true },
    fraudType: { type: String, required: true },
    fraudAmount: { type: Number, required: true },
    victimIdentifier: { type: String, required: true },
    suspectedAccount: { type: String, required: true },
    status: {
      type: String,
      enum: ['NEW', 'UNDER_INVESTIGATION', 'HIGH_RISK', 'RESOLVED'],
      default: 'NEW'
    },
    location: { type: String, required: true },
    description: { type: String, required: true },
    relatedAccounts: [{ type: String }]
  },
  { timestamps: true }
)

export default mongoose.model('Complaint', complaintSchema)
