import mongoose, { type Document, Schema, type Types } from 'mongoose'

export interface IGrammarConcept extends Document {
  name: string
  cefrLevel: 'A1' | 'A2' | 'B1'
  explanationMarkdown: string
  ruleSummary: string
  examples: Array<{ german: string; english: string; annotation: string }>
  unitId: Types.ObjectId
}

const GrammarConceptSchema = new Schema<IGrammarConcept>({
  name: { type: String, required: true },
  cefrLevel: { type: String, enum: ['A1', 'A2', 'B1'], required: true },
  explanationMarkdown: { type: String, required: true },
  ruleSummary: { type: String, required: true },
  examples: [
    {
      german: { type: String, required: true },
      english: { type: String, required: true },
      annotation: { type: String, required: true },
    },
  ],
  unitId: { type: Schema.Types.ObjectId, ref: 'CurriculumUnit', required: true },
})

export const GrammarConcept =
  (mongoose.models.GrammarConcept as mongoose.Model<IGrammarConcept>) ??
  mongoose.model<IGrammarConcept>('GrammarConcept', GrammarConceptSchema)
