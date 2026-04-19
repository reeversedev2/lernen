import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IUserStageProgress extends Document {
  userId: Types.ObjectId
  stageId: Types.ObjectId
  stars: 0 | 1 | 2 | 3
  totalCompletions: number
  totalPassingCompletions: number
  averageScore: number
  unlockedAt: Date
  masteredAt: Date | null
}

const UserStageProgressSchema = new Schema<IUserStageProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
  stars: { type: Number, enum: [0, 1, 2, 3], default: 0 },
  totalCompletions: { type: Number, default: 0 },
  totalPassingCompletions: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  unlockedAt: { type: Date, default: () => new Date() },
  masteredAt: { type: Date, default: null },
})

UserStageProgressSchema.index({ userId: 1, stageId: 1 }, { unique: true })
UserStageProgressSchema.index({ userId: 1 })

export const UserStageProgress =
  (mongoose.models.UserStageProgress as mongoose.Model<IUserStageProgress>) ??
  mongoose.model<IUserStageProgress>('UserStageProgress', UserStageProgressSchema)
