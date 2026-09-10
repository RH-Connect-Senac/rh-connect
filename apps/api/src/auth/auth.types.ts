type Role = 'CANDIDATE' | 'EVALUATOR' | 'ADMIN'

type AccountStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

type AuthUser = {
  id : string
  name : string
  email : string
  role : Role
  accountStatus : AccountStatus
  onboardingCompleted : boolean
}

type JwtPayload = {
  sub : string
  email : string
  role : Role
}

type LoginResult = {
  user : AuthUser
  accessToken : string
}

export type { Role, AccountStatus, AuthUser, JwtPayload, LoginResult }