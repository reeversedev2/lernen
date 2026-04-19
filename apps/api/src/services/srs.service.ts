import type { SRSStatus } from '@lernen/shared'
import { Types } from 'mongoose'
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs'
import { type ISRSCard, SRSCard } from '../models/srs-card.model.js'
import { VocabularyItem } from '../models/vocabulary-item.model.js'

// FSRS instance with fuzz enabled so intervals aren't perfectly predictable
const f = fsrs({ enable_fuzz: true, maximum_interval: 365 })

// Map our 4-button UI rating (0=Again, 1=Hard, 2=Good, 3=Easy) → FSRS Rating
const UI_TO_FSRS: Record<number, Rating> = {
  0: Rating.Again,
  1: Rating.Hard,
  2: Rating.Good,
  3: Rating.Easy,
}

function fsrsStateToSRSStatus(state: State, scheduledDays: number): SRSStatus {
  if (state === State.New) return 'new'
  if (state === State.Learning || state === State.Relearning) return 'learning'
  if (scheduledDays >= 21) return 'mastered'
  return 'review'
}

export async function getDueCards(userId: string, limit = 20): Promise<ISRSCard[]> {
  const now = new Date()
  return SRSCard.find({
    userId: new Types.ObjectId(userId),
    dueDate: { $lte: now },
  })
    .sort({ dueDate: 1 })
    .limit(limit)
    .populate('vocabularyItemId')
}

export async function submitReview(
  userId: string,
  cardId: string,
  uiRating: 0 | 1 | 2 | 3,
): Promise<{ card: ISRSCard; xpEarned: number; newStatus: SRSStatus }> {
  const card = await SRSCard.findOne({
    _id: new Types.ObjectId(cardId),
    userId: new Types.ObjectId(userId),
  })
  if (!card) throw new Error('Card not found')

  const now = new Date()
  const rating = UI_TO_FSRS[uiRating] ?? Rating.Again

  // Reconstruct FSRS card from stored state
  const fsrsCard = createEmptyCard(card.dueDate)
  fsrsCard.stability = card.stability
  fsrsCard.difficulty = card.difficulty
  fsrsCard.elapsed_days = card.elapsedDays
  fsrsCard.scheduled_days = card.scheduledDays
  fsrsCard.reps = card.reps
  fsrsCard.lapses = card.lapses
  fsrsCard.state = card.fsrsState as State
  if (card.lastReviewedAt) fsrsCard.last_review = card.lastReviewedAt

  const scheduling = f.repeat(fsrsCard, now)
  const ratingKey = rating as Rating.Again | Rating.Hard | Rating.Good | Rating.Easy
  const next = scheduling[ratingKey].card
  const intervalBefore = card.intervalDays

  const scheduledDays = next.scheduled_days
  const newStatus = fsrsStateToSRSStatus(next.state, scheduledDays)

  const reviewHistory = [
    ...card.reviewHistory,
    {
      reviewedAt: now,
      rating: uiRating,
      intervalBefore,
      intervalAfter: scheduledDays,
    },
  ].slice(-10)

  // Update all fields
  card.stability = next.stability
  card.difficulty = next.difficulty
  card.elapsedDays = next.elapsed_days
  card.scheduledDays = scheduledDays
  card.reps = next.reps
  card.lapses = next.lapses
  card.fsrsState = next.state
  card.intervalDays = scheduledDays
  card.repetitionCount = next.reps
  card.dueDate = next.due
  card.status = newStatus
  card.lastReviewedAt = now
  card.lastRating = uiRating
  card.reviewHistory = reviewHistory
  await card.save()

  // XP: reward graduating from learning → review, and reaching mastered
  const previousStatus = card.status
  let xpEarned = 0
  if (previousStatus === 'learning' && newStatus === 'review') xpEarned = 10
  else if (newStatus === 'mastered' && previousStatus !== 'mastered') xpEarned = 25

  return { card, xpEarned, newStatus }
}

export async function getSRSStats(userId: string) {
  const now = new Date()
  const [total, mastered, learning, newCards, dueToday] = await Promise.all([
    SRSCard.countDocuments({ userId: new Types.ObjectId(userId) }),
    SRSCard.countDocuments({ userId: new Types.ObjectId(userId), status: 'mastered' }),
    SRSCard.countDocuments({ userId: new Types.ObjectId(userId), status: 'learning' }),
    SRSCard.countDocuments({ userId: new Types.ObjectId(userId), status: 'new' }),
    SRSCard.countDocuments({ userId: new Types.ObjectId(userId), dueDate: { $lte: now } }),
  ])
  return { total, mastered, learning, new: newCards, dueToday }
}

export async function ensureSRSCardsForUser(userId: string): Promise<void> {
  const allVocab = await VocabularyItem.find({})
  const existingCards = await SRSCard.find({ userId: new Types.ObjectId(userId) })
  const existingVocabIds = new Set(existingCards.map((c) => c.vocabularyItemId.toString()))

  const emptyCard = createEmptyCard()
  const newCards = allVocab
    .filter((v) => !existingVocabIds.has(v._id.toString()))
    .map((v) => ({
      userId: new Types.ObjectId(userId),
      vocabularyItemId: v._id,
      stability: emptyCard.stability,
      difficulty: emptyCard.difficulty,
      elapsedDays: emptyCard.elapsed_days,
      scheduledDays: emptyCard.scheduled_days,
      reps: emptyCard.reps,
      lapses: emptyCard.lapses,
      fsrsState: emptyCard.state,
      dueDate: emptyCard.due,
      status: 'new' as SRSStatus,
    }))

  if (newCards.length > 0) {
    await SRSCard.insertMany(newCards, { ordered: false }).catch(() => {})
  }
}
