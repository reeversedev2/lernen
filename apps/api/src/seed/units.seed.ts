import type { Types } from 'mongoose'
import { CurriculumUnit } from '../models/curriculum-unit.model.js'

export const unitData = [
  {
    weekNumber: 1,
    cefrLevel: 'A1' as const,
    title: 'Greetings & Introductions',
    description:
      'Learn how to greet people, introduce yourself, and use basic courtesy phrases in German.',
    vocabularyTheme: 'Greetings, Introductions & Basic Phrases',
    grammarFocus: 'Articles (der, die, das) and Personal Pronouns (ich, du, er, sie)',
    estimatedMinutes: 90,
    order: 1,
  },
  {
    weekNumber: 2,
    cefrLevel: 'A1' as const,
    title: 'Family & Daily Life',
    description: 'Talk about your family members and describe everyday activities.',
    vocabularyTheme: 'Family Members & Daily Routines',
    grammarFocus: 'Present Tense Conjugation (sein, haben, regular verbs)',
    estimatedMinutes: 100,
    order: 2,
  },
  {
    weekNumber: 3,
    cefrLevel: 'A1' as const,
    title: 'Food & Shopping',
    description: 'Navigate restaurants, markets, and shops with confidence.',
    vocabularyTheme: 'Food, Drinks & Shopping Vocabulary',
    grammarFocus: 'Accusative Case (direct objects)',
    estimatedMinutes: 110,
    order: 3,
  },
  {
    weekNumber: 4,
    cefrLevel: 'A1' as const,
    title: 'Places & Transport',
    description: 'Get around the city, ask for directions, and use public transport.',
    vocabularyTheme: 'Places in the City & Transport',
    grammarFocus: 'Dative Case Introduction (prepositions: in, an, auf)',
    estimatedMinutes: 120,
    order: 4,
  },
]

export async function seedUnits(): Promise<Map<number, Types.ObjectId>> {
  const unitIdMap = new Map<number, Types.ObjectId>()

  for (const data of unitData) {
    const existing = await CurriculumUnit.findOne({ weekNumber: data.weekNumber })
    if (existing) {
      unitIdMap.set(data.weekNumber, existing._id as Types.ObjectId)
      continue
    }

    const unit = await CurriculumUnit.create(data)
    unitIdMap.set(data.weekNumber, unit._id as Types.ObjectId)
    console.log(`Created unit: ${data.title}`)
  }

  return unitIdMap
}
