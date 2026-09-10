type RegisterDto = {
  name : string
  email : string
  password : string
}

type LoginDto = {
  email : string
  password : string
}

export type { RegisterDto, LoginDto }