const JWT_COOKIE_NAME = 'access_token'

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd'}`

const JWT_EXPIRES_IN_DEFAULT : JwtDuration = '15m'

function toMs(expiresIn: string): number {
  const value = Number.parseFloat(expiresIn)
  if (Number.isNaN(value)) {
    return 15 * 60 * 1000
  }
  const unit = expiresIn.replace(/[\d.]/g, '').trim().toLowerCase()
  const multiplier : Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
  return value * (multiplier[unit] ?? 60 * 1000)
}

const jwtExpiresInMs = (expiresIn : string = JWT_EXPIRES_IN_DEFAULT): number => toMs(expiresIn)

export { JWT_COOKIE_NAME, JWT_EXPIRES_IN_DEFAULT, jwtExpiresInMs }
export type { JwtDuration }