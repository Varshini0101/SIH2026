import mongoose from 'mongoose'

export const connectDatabase = async () => {
  const uri = process.env.MONGO_URI

  if (!uri || uri === 'mongodb://localhost:27017/sih_mvp') {
    console.log('MongoDB URI not configured; using in-memory demo mode.')
    return false
  }

  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected successfully')
    return true
  } catch (error) {
    console.error('MongoDB connection failed; continuing without database access')
    return false
  }
}
