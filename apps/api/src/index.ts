import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import Fastify from 'fastify'
import { config } from './config/index.js'
import { connectDatabase } from './db/connection.js'
import { initScheduledJobs } from './queue/index.js'
import { adminRoutes } from './routes/admin.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { debugRoutes } from './routes/debug.routes.js'
import { exercisesRoutes } from './routes/exercises.routes.js'
import { lessonRoutes } from './routes/lessons.routes.js'
import { progressRoutes } from './routes/progress.routes.js'
import { srsRoutes } from './routes/srs.routes.js'
import { stagesRoutes } from './routes/stages.routes.js'
import { seedStages } from './seeds/stages.seed.js'
import { warmOllamaModel } from './services/llm.service.js'

const fastify = Fastify({
  ignoreTrailingSlash: true,
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

// Register plugins
fastify.register(fastifyCors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:80',
    'http://localhost',
    'http://paandupi.local:8080',
    'http://paandupi.local',
  ],
  credentials: true,
})

fastify.register(fastifyCookie, {
  secret: config.JWT_SECRET,
})

fastify.register(fastifyJwt, {
  secret: config.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
})

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error)

  if (
    error.message.includes('already in use') ||
    error.message.includes('Invalid email or password')
  ) {
    return reply.status(400).send({ error: 'Bad Request', message: error.message })
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.name, message: error.message })
  }

  return reply
    .status(500)
    .send({ error: 'Internal Server Error', message: 'An unexpected error occurred' })
})

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' })
fastify.register(dashboardRoutes, { prefix: '/api/dashboard' })
fastify.register(srsRoutes, { prefix: '/api/srs' })
fastify.register(lessonRoutes, { prefix: '/api/lessons' })
fastify.register(progressRoutes, { prefix: '/api/progress' })
fastify.register(exercisesRoutes, { prefix: '/api/exercises' })
fastify.register(debugRoutes, { prefix: '/api/debug/queue' })
fastify.register(adminRoutes, { prefix: '/api/admin' })
fastify.register(stagesRoutes, { prefix: '/api/stages' })

fastify.get('/api/curriculum', async (request, reply) => {
  try {
    await (request as unknown as { jwtVerify: () => Promise<void> }).jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }
  const { userId } = request.user as { userId: string }
  const { getCurriculumWithProgress } = await import('./services/curriculum.service.js')
  return getCurriculumWithProgress(userId)
})

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Start
const start = async () => {
  await connectDatabase()
  await seedStages()

  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' })
    console.log(`API running on port ${config.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }

  // Warm the Ollama model into RAM so the first job doesn't pay cold-load cost
  setTimeout(() => {
    warmOllamaModel().catch((err) =>
      console.warn('[ollama] Warm-up failed (Ollama may not be ready yet):', err),
    )
  }, 5000)

  // Init queue jobs after the server is up — errors here should never kill the API
  setTimeout(() => {
    initScheduledJobs().catch((err) => console.error('[queue] Failed to init scheduled jobs:', err))
  }, 8000)
}

start()
