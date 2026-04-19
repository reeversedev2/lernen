import type { CefrLevel } from '@lernen/shared'
import mongoose, { type Document, Schema } from 'mongoose'

export interface ICurriculumUnit extends Document {
  weekNumber: number
  cefrLevel: CefrLevel
  title: string
  description: string
  vocabularyTheme: string
  grammarFocus: string
  estimatedMinutes: number
  order: number
}

const CurriculumUnitSchema = new Schema<ICurriculumUnit>({
  weekNumber: { type: Number, required: true },
  cefrLevel: { type: String, enum: ['A1', 'A1.2', 'A2', 'B1'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  vocabularyTheme: { type: String, required: true },
  grammarFocus: { type: String, required: true },
  estimatedMinutes: { type: Number, required: true },
  order: { type: Number, required: true },
})

export const CurriculumUnit =
  (mongoose.models.CurriculumUnit as mongoose.Model<ICurriculumUnit>) ??
  mongoose.model<ICurriculumUnit>('CurriculumUnit', CurriculumUnitSchema)
