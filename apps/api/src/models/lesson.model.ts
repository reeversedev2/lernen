import type { LessonContent, LessonType } from '@lernen/shared'
import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface ILesson extends Document {
  stageId?: Types.ObjectId
  type: LessonType
  title: string
  orderInUnit: number
  estimatedMinutes: number
  content: LessonContent
  isAiGenerated?: boolean
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
    grammarConceptId: { type: Schema.Types.ObjectId, ref: 'GrammarConcept' },
    vocabularyItemId: { type: Schema.Types.ObjectId, ref: 'VocabularyItem' },
  },
  { _id: false },
)

const LessonSchema = new Schema<ILesson>({
  stageId: { type: Schema.Types.ObjectId, ref: 'Stage' },
  type: { type: String, enum: ['grammar', 'vocabulary', 'mixed'], required: true },
  title: { type: String, required: true },
  orderInUnit: { type: Number, required: true },
  estimatedMinutes: { type: Number, required: true },
  isAiGenerated: { type: Boolean, default: false },
  content: {
    explanation: {
      markdown: String,
      examples: [
        {
          german: String,
          english: String,
          annotation: String,
        },
      ],
    },
    vocabularyItemIds: [{ type: Schema.Types.ObjectId, ref: 'VocabularyItem' }],
    exercises: [ExerciseSchema],
  },
})

export const Lesson =
  (mongoose.models.Lesson as mongoose.Model<ILesson>) ??
  mongoose.model<ILesson>('Lesson', LessonSchema)
