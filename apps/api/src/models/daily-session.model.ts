import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IDailySession extends Document {
  userId: Types.ObjectId
  sessionDate: string
  startedAt: Date
  endedAt: Date | null
  totalMinutes: number
  xpEarned: number
  srsCardsReviewed: number
  newVocabularyCount: number
  exercisesCompleted: number
  qualifiesForStreak: boolean
}

const DailySessionSchema = new Schema<IDailySession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sessionDate: { type: String, required: true },
  startedAt: { type: Date, default: () => new Date() },
  endedAt: { type: Date, default: null },
  totalMinutes: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  srsCardsReviewed: { type: Number, default: 0 },
  newVocabularyCount: { type: Number, default: 0 },
  exercisesCompleted: { type: Number, default: 0 },
  qualifiesForStreak: { type: Boolean, default: false },
})

DailySessionSchema.index({ userId: 1, sessionDate: 1 }, { unique: true })

export const DailySession =
  (mongoose.models.DailySession as mongoose.Model<IDailySession>) ??
  mongoose.model<IDailySession>('DailySession', DailySessionSchema)
