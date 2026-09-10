import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    return false
  }
  const derived = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export { hashPassword, verifyPassword }