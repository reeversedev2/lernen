import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const SRSReviewSchema = z.object({
  cardId: z.string(),
  rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
})

export const LessonCompleteSchema = z.object({
  answers: z.array(
    z.object({
      exerciseId: z.string(),
      answer: z.string(),
      timeSpentMs: z.number().int().nonnegative(),
    }),
  ),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type SRSReviewInput = z.infer<typeof SRSReviewSchema>
export type LessonCompleteInput = z.infer<typeof LessonCompleteSchema>
