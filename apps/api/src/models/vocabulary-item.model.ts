import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IVocabularyItem extends Document {
  german: string
  article: 'der' | 'die' | 'das' | null
  wordType: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'conjunction' | 'preposition'
  english: string
  exampleGerman: string
  exampleEnglish: string
  pluralForm?: string
  verbForms?: {
    infinitive: string
    pastParticiple: string
    thirdPersonSingular: string
  }
  tags: string[]
  cefrLevel: 'A1' | 'A2' | 'B1'
  frequencyRank?: number
  unitId: Types.ObjectId
}

const VocabularyItemSchema = new Schema<IVocabularyItem>({
  german: { type: String, required: true },
  article: { type: String, enum: ['der', 'die', 'das', null], default: null },
  wordType: {
    type: String,
    enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'conjunction', 'preposition'],
    required: true,
  },
  english: { type: String, required: true },
  exampleGerman: { type: String, required: true },
  exampleEnglish: { type: String, required: true },
  pluralForm: { type: String },
  verbForms: {
    infinitive: String,
    pastParticiple: String,
    thirdPersonSingular: String,
  },
  tags: [{ type: String }],
  cefrLevel: { type: String, enum: ['A1', 'A2', 'B1'], required: true },
  frequencyRank: { type: Number },
  unitId: { type: Schema.Types.ObjectId, ref: 'CurriculumUnit', required: true },
})

export const VocabularyItem =
  (mongoose.models.VocabularyItem as mongoose.Model<IVocabularyItem>) ??
  mongoose.model<IVocabularyItem>('VocabularyItem', VocabularyItemSchema)
