import mongoose, { type Document, Schema } from 'mongoose'

export interface IUser extends Document {
  email: string
  passwordHash: string
  displayName: string
  createdAt: Date
  totalXp: number
  streakCount: number
  streakLastActivityDate: Date | null
  streakFreezeCount: number
  currentUnitIndex: number
  dailyGoalMinutes: number
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    totalXp: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    streakLastActivityDate: { type: Date, default: null },
    streakFreezeCount: { type: Number, default: 2 },
    currentUnitIndex: { type: Number, default: 0 },
    dailyGoalMinutes: { type: Number, default: 30 },
  },
  { timestamps: true },
)

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', UserSchema)
