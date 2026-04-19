import type { CefrLevel, Exercise, ExerciseDifficulty } from '@lernen/shared'
import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IExerciseSet extends Document {
  stageId: Types.ObjectId
  cefrLevel: CefrLevel
  topic: string
  difficulty: ExerciseDifficulty
  exercises: Exercise[]
  timesServed: number
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
    acceptedAnswers: [{ type: String }],
    wrongFeedback: { type: String },
    correctFeedback: { type: String },
    hint: { type: String },
    explanation: { type: String },
    passage: { type: String },
  },
  { _id: false },
)

const ExerciseSetSchema = new Schema<IExerciseSet>(
  {
    stageId: { type: Schema.Types.ObjectId, ref: 'Stage', required: true },
    cefrLevel: { type: String, enum: ['A1', 'A1.2', 'A2', 'B1'], required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    exercises: [ExerciseSchema],
    timesServed: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

ExerciseSetSchema.index({ stageId: 1, difficulty: 1 })

export const ExerciseSet =
  (mongoose.models.ExerciseSet as mongoose.Model<IExerciseSet>) ??
  mongoose.model<IExerciseSet>('ExerciseSet', ExerciseSetSchema)
