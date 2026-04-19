import type { SRSStatus } from '@lernen/shared'
import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface ISRSCard extends Document {
  userId: Types.ObjectId
  vocabularyItemId: Types.ObjectId
  // FSRS state fields
  stability: number // FSRS memory stability (days)
  difficulty: number // FSRS item difficulty (1–10)
  elapsedDays: number // days since last review
  scheduledDays: number // days until next scheduled review
  reps: number // total successful review count
  lapses: number // number of times card was forgotten
  fsrsState: number // 0=New, 1=Learning, 2=Review, 3=Relearning
  // Derived / UI fields (kept for backward compat)
  intervalDays: number
  easeFactor: number
  repetitionCount: number
  dueDate: Date
  status: SRSStatus
  lastReviewedAt: Date | null
  lastRating: number | null
  reviewHistory: Array<{
    reviewedAt: Date
    rating: number
    intervalBefore: number
    intervalAfter: number
  }>
}

const SRSCardSchema = new Schema<ISRSCard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vocabularyItemId: { type: Schema.Types.ObjectId, ref: 'VocabularyItem', required: true },
  // FSRS
  stability: { type: Number, default: 0 },
  difficulty: { type: Number, default: 5 },
  elapsedDays: { type: Number, default: 0 },
  scheduledDays: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  lapses: { type: Number, default: 0 },
  fsrsState: { type: Number, default: 0 }, // State.New = 0
  // Derived
  intervalDays: { type: Number, default: 1 },
  easeFactor: { type: Number, default: 2.5 },
  repetitionCount: { type: Number, default: 0 },
  dueDate: { type: Date, default: () => new Date() },
  status: { type: String, enum: ['new', 'learning', 'review', 'mastered'], default: 'new' },
  lastReviewedAt: { type: Date, default: null },
  lastRating: { type: Number, default: null },
  reviewHistory: [
    {
      reviewedAt: { type: Date, required: true },
      rating: { type: Number, required: true },
      intervalBefore: { type: Number, required: true },
      intervalAfter: { type: Number, required: true },
      _id: false,
    },
  ],
})

SRSCardSchema.index({ userId: 1, dueDate: 1 })
SRSCardSchema.index({ userId: 1, vocabularyItemId: 1 }, { unique: true })

export const SRSCard =
  (mongoose.models.SRSCard as mongoose.Model<ISRSCard>) ??
  mongoose.model<ISRSCard>('SRSCard', SRSCardSchema)
