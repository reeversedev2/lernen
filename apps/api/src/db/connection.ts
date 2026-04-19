import mongoose from 'mongoose'
import { config } from '../config/index.js'

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI)
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})
