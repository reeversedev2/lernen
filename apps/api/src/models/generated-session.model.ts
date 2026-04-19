import type { CefrLevel, Exercise, GeneratedSessionStatus } from '@lernen/shared'
import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IGeneratedSession extends Document {
  userId: Types.ObjectId
  topic: string
  cefrLevel: CefrLevel
  exercises: Exercise[]
  status: GeneratedSessionStatus
  score?: number
  xpEarned?: number
  createdAt: Date
}

const ExerciseSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'multiple_choice',
        'fill_blank',
        'translate_de_en',
        'translate_en_de',
        'reading_comprehension',
        'speaking',
      ],
      required: true,
    },
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    hint: { type: String },
    explanation: { type: String },
    passage: { type: String },
  },
  { _id: false },
)

const GeneratedSessionSchema = new Schema<IGeneratedSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, default: '' },
    cefrLevel: { type: String, enum: ['A1', 'A1.2', 'A2', 'B1'], required: true },
    exercises: [ExerciseSchema],
    status: { type: String, enum: ['generating', 'pending', 'completed'], default: 'generating' },
    score: { type: Number },
    xpEarned: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const GeneratedSession =
  (mongoose.models.GeneratedSession as mongoose.Model<IGeneratedSession>) ??
  mongoose.model<IGeneratedSession>('GeneratedSession', GeneratedSessionSchema)
