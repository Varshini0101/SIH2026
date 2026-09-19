import mongoose from 'mongoose'

const atmLocationSchema = new mongoose.Schema(
  {
    locationId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['ATM', 'POS'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    zone: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
  },
  { timestamps: true }
)

export default mongoose.model('ATMLocation', atmLocationSchema)
