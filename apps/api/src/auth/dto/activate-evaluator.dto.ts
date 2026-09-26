import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

export class ActivateEvaluatorDto {
  @IsString()
  @IsNotEmpty()
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
