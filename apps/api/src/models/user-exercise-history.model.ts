import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IUserExerciseHistory extends Document {
  userId: Types.ObjectId
  exerciseSetId: Types.ObjectId
  stageId: Types.ObjectId
  seenAt: Date
  completedAt: Date | null
  score: number | null
  failedExerciseIds: string[]
  reviewScheduledAt: Date | null
}

const UserExerciseHistorySchema = new Schema<IUserExerciseHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseSetId: { type: Schema.Types.ObjectId, ref: 'ExerciseSet', required: true },
  stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
  seenAt: { type: Date, default: () => new Date() },
  completedAt: { type: Date, default: null },
  score: { type: Number, default: null },
  failedExerciseIds: [{ type: String }],
  reviewScheduledAt: { type: Date, default: null },
})

UserExerciseHistorySchema.index({ userId: 1, stageId: 1 })
UserExerciseHistorySchema.index({ userId: 1, exerciseSetId: 1 }, { unique: true })
UserExerciseHistorySchema.index({ userId: 1, reviewScheduledAt: 1 })

export const UserExerciseHistory =
  (mongoose.models.UserExerciseHistory as mongoose.Model<IUserExerciseHistory>) ??
  mongoose.model<IUserExerciseHistory>('UserExerciseHistory', UserExerciseHistorySchema)
