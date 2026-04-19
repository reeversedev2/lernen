import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IExerciseAttempt extends Document {
  userId: Types.ObjectId
  lessonId: Types.ObjectId
  exerciseId: string
  exerciseType: string
  grammarConceptId?: Types.ObjectId
  vocabularyItemId?: Types.ObjectId
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  attemptedAt: Date
  timeSpentMs: number
}

const ExerciseAttemptSchema = new Schema<IExerciseAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  exerciseId: { type: String, required: true },
  exerciseType: { type: String, required: true },
  grammarConceptId: { type: Schema.Types.ObjectId, ref: 'GrammarConcept' },
  vocabularyItemId: { type: Schema.Types.ObjectId, ref: 'VocabularyItem' },
  userAnswer: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  attemptedAt: { type: Date, default: () => new Date() },
  timeSpentMs: { type: Number, required: true },
})

ExerciseAttemptSchema.index({ userId: 1, lessonId: 1 })

export const ExerciseAttempt =
  (mongoose.models.ExerciseAttempt as mongoose.Model<IExerciseAttempt>) ??
  mongoose.model<IExerciseAttempt>('ExerciseAttempt', ExerciseAttemptSchema)
