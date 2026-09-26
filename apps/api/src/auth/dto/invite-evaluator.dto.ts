import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsGmailEmail } from '../validators/gmail-email.validator';

export class InviteEvaluatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  // Prompt 13 (C2): antes usava `@IsEmail()` genérico, sem restrição de
  // domínio e sem normalização — inconsistente com Cadastro/Login, que usam
  // `@IsGmailEmail` (mesma regra: trim → lowercase → gmail.com → preserva
  // "+" e pontos). Reaproveita o MESMO validador, sem criar implementação
  // paralela. O contrato de Cadastro/Login não foi alterado.
  @IsGmailEmail({
    message: 'Use um e-mail válido do Gmail, no formato nome@gmail.com.',
  })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  specialization?: string;
}
