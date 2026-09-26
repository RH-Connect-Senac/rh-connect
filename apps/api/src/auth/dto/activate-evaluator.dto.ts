import { IsHexadecimal, IsString, Length } from 'class-validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

export class ActivateEvaluatorDto {
  // QA de segurança (B5-03): o token é gerado por
  // `randomBytes(32).toString('hex')` (`AuthService.inviteEvaluator`), então
  // o contrato real de entrada é sempre uma string hexadecimal de exatamente
  // 64 caracteres. A validação anterior (`@IsString` + `@IsNotEmpty`) aceitava
  // qualquer string não vazia, deixando o formato real do token sem checagem
  // explícita no DTO. Não muda a geração do token nem o hashing (sha256)
  // usado para comparar com o banco.
  @IsString()
  @Length(64, 64, {
    message: 'Token de ativação em formato inválido.',
  })
  @IsHexadecimal({ message: 'Token de ativação em formato inválido.' })
  token: string;

  // Prompt 13 (C3): antes validava apenas `@MinLength(8)`, sem exigir a
  // política D12 (maiúscula, minúscula, dígito, caractere especial, limite
  // de 72 bytes UTF-8). Reaproveita o MESMO `@IsStrongPassword` já usado em
  // `RegisterDto.password`, sem criar implementação paralela — essa é a
  // definição de uma senha NOVA (ativação), então a mesma política de
  // cadastro se aplica. A validação do Login não foi alterada.
  @IsStrongPassword({
    message:
      'A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.',
  })
  password: string;
}
