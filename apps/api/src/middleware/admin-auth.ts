import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config/index.js'

export async function adminAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // EventSource cannot send custom headers — accept credentials via ?auth= query param as fallback
  const queryAuth = (request.query as Record<string, string>)?.auth
  const authorization = queryAuth ? `Basic ${queryAuth}` : request.headers.authorization

  if (!authorization?.startsWith('Basic ')) {
    reply
      .status(401)
      .header('WWW-Authenticate', 'Basic realm="Admin"')
      .send({ error: 'Unauthorized', message: 'Admin credentials required' })
    return
  }

  const base64 = authorization.slice('Basic '.length)
  const decoded = Buffer.from(base64, 'base64').toString('utf-8')
  const colon = decoded.indexOf(':')
  const username = decoded.slice(0, colon)
  const password = decoded.slice(colon + 1)

  if (username !== config.ADMIN_USERNAME || password !== config.ADMIN_PASSWORD) {
    reply
      .status(401)
      .header('WWW-Authenticate', 'Basic realm="Admin"')
      .send({ error: 'Unauthorized', message: 'Invalid admin credentials' })
  }
}
