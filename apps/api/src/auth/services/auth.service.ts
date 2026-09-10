import {
  BadRequestException, ConflictException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, JwtPayload, LoginResult } from '../auth.types';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { hashPassword, verifyPassword } from '../password';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto : RegisterDto): Promise<AuthUser> {
    const name = dto?.name?.trim()
    const email = dto?.email?.trim().toLowerCase()
    const password = dto?.password

    if (!name) throw new BadRequestException('Nome é obrigatório.')
    if (!email || !EMAIL_REGEX.test(email)) throw new BadRequestException('Forneça um e-mail válido.')
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
    }

    try {
      const stored = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password),
          role: 'CANDIDATE',
        },
      })
      return this.toPublicUser(stored)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este e-mail já está cadastrado.')
      }
      throw error
    }
  }

  async login(dto : LoginDto): Promise<LoginResult> {
    const email = dto?.email?.trim().toLowerCase()
    const password = dto?.password

    if (!email || !password) throw new UnauthorizedException('Credenciais inválidas.')

    const stored = await this.prisma.user.findUnique({ where: { email } })
    if (!stored || !verifyPassword(password, stored.passwordHash)) {
      throw new UnauthorizedException('Credenciais inválidas.')
    }

    const accessToken = await this.signAccessToken(stored)
    return { user: this.toPublicUser(stored), accessToken }
  }

  async getById(id : string): Promise<AuthUser> {
    const stored = await this.prisma.user.findUnique({ where: { id } })
    if (!stored) throw new UnauthorizedException('Sessão inválida.')
    return this.toPublicUser(stored)
  }

  async signAccessToken(user : AuthUser): Promise<string> {
    const payload : JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return this.jwtService.signAsync(payload)
  }

  private toPublicUser(user : User): AuthUser {
    const { passwordHash: _passwordHash, createdAt: _createdAt, updatedAt: _updatedAt, ...publicUser } = user
    return publicUser
  }
}