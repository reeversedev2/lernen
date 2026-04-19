import type { CefrLevel, StageWorld } from '@lernen/shared'
import mongoose, { type Document, Schema } from 'mongoose'

export interface IStage extends Document {
  order: number
  theme: string
  emoji: string
  description: string
  cefrLevel: CefrLevel
  worldName: StageWorld
  unlockRequirement: number // order of prerequisite stage (0 = always unlocked)
}

const StageSchema = new Schema<IStage>({
  order: { type: Number, required: true, unique: true },
  theme: { type: String, required: true },
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  cefrLevel: { type: String, enum: ['A1', 'A1.2', 'A2', 'B1'], required: true },
  worldName: {
    type: String,
    enum: ['Das Dorf', 'Die Stadt', 'Die Welt', 'Das Leben'],
    required: true,
  },
  unlockRequirement: { type: Number, default: 0 },
})

export const Stage =
  (mongoose.models.Stage as mongoose.Model<IStage>) ?? mongoose.model<IStage>('Stage', StageSchema)
