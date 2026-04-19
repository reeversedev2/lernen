import { LoginSchema, RegisterSchema } from '@lernen/shared'
import type { FastifyInstance } from 'fastify'
import { enqueueSessionGeneration } from '../queue/index.js'
import { loginUser, registerUser } from '../services/auth.service.js'

function serializeUser(user: {
  _id: unknown
  email: string
  displayName: string
  totalXp: number
  streakCount: number
  streakLastActivityDate: Date | null
  streakFreezeCount: number
  currentUnitIndex: number
  dailyGoalMinutes: number
  createdAt: Date
}) {
  return {
    _id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    totalXp: user.totalXp,
    streakCount: user.streakCount,
    streakLastActivityDate: user.streakLastActivityDate?.toISOString() ?? null,
    streakFreezeCount: user.streakFreezeCount,
    currentUnitIndex: user.currentUnitIndex,
    dailyGoalMinutes: user.dailyGoalMinutes,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const user = await registerUser(parsed.data)

    const accessToken = fastify.jwt.sign(
      { userId: String(user._id), email: user.email },
      { expiresIn: '15m' },
    )

    // Use a simple opaque refresh token stored in httpOnly cookie
    const refreshPayload = `${String(user._id)}:${Date.now()}`
    reply.setCookie('refreshToken', refreshPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    // Queue fills the stage pool globally — no per-user seeding needed anymore
    enqueueSessionGeneration(String(user._id)).catch(() => {})

    return { accessToken, user: serializeUser(user) }
  })

  fastify.post('/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const user = await loginUser(parsed.data)

    const accessToken = fastify.jwt.sign(
      { userId: String(user._id), email: user.email },
      { expiresIn: '15m' },
    )

    const refreshPayload = `${String(user._id)}:${Date.now()}`
    reply.setCookie('refreshToken', refreshPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return { accessToken, user: serializeUser(user) }
  })

  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken
    if (!refreshToken) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'No refresh token' })
    }

    // Extract userId from the refresh token payload
    const [userId] = refreshToken.split(':')
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token' })
    }

    const { getUserById } = await import('../services/auth.service.js')
    const user = await getUserById(userId)
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' })
    }

    const accessToken = fastify.jwt.sign(
      { userId: String(user._id), email: user.email },
      { expiresIn: '15m' },
    )

    return { accessToken }
  })

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' })
    return { success: true }
  })
}
