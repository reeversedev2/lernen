import type { LessonStatus } from '@lernen/shared'
import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IUserLessonProgress extends Document {
  userId: Types.ObjectId
  lessonId: Types.ObjectId
  status: LessonStatus
  score: number
  completedAt: Date | null
  timeSpentSeconds: number
  attemptCount: number
}

const UserLessonProgressSchema = new Schema<IUserLessonProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  score: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
  timeSpentSeconds: { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 },
})

UserLessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })

export const UserLessonProgress =
  (mongoose.models.UserLessonProgress as mongoose.Model<IUserLessonProgress>) ??
  mongoose.model<IUserLessonProgress>('UserLessonProgress', UserLessonProgressSchema)
