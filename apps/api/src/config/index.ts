import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '../../.env' })

const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .default('mongodb://lernen:lernen_dev_password@localhost:27017/lernen?authSource=admin'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev_jwt_secret_change_in_production'),
  JWT_REFRESH_SECRET: z.string().default('dev_refresh_secret_change_in_production'),
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen3'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin'),
  LANGUAGETOOL_URL: z.string().default('http://languagetool:8010'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
