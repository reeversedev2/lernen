import crypto from 'node:crypto'
import type { LoginInput, RegisterInput } from '@lernen/shared'
import { type IUser, User } from '../models/user.model.js'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const inputHash = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(inputHash, 'hex'))
}

export async function registerUser(input: RegisterInput): Promise<IUser> {
  const existing = await User.findOne({ email: input.email.toLowerCase() })
  if (existing) {
    throw new Error('Email already in use')
  }

  const passwordHash = hashPassword(input.password)
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    displayName: input.displayName,
  })

  return user
}

export async function loginUser(input: LoginInput): Promise<IUser> {
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (!user) {
    throw new Error('Invalid email or password')
  }

  const valid = verifyPassword(input.password, user.passwordHash)
  if (!valid) {
    throw new Error('Invalid email or password')
  }

  return user
}

export async function getUserById(id: string): Promise<IUser | null> {
  return User.findById(id)
}
