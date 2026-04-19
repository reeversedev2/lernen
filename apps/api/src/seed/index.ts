import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import mongoose from 'mongoose'
import { config } from '../config/index.js'
import { seedGrammar } from './grammar.seed.js'
import { seedLessons } from './lessons.seed.js'
import { seedUnits } from './units.seed.js'
import { seedVocabulary } from './vocabulary.seed.js'

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(config.MONGODB_URI)
  console.log('Connected!')

  console.log('\n=== Seeding Database ===\n')

  const unitIdMap = await seedUnits()
  await seedVocabulary(unitIdMap)
  await seedGrammar(unitIdMap)
  await seedLessons(unitIdMap)

  console.log('\n=== Seeding Complete ===\n')
  await mongoose.disconnect()
  process.exit(0)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
