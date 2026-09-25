import { Equals, MaxLength } from 'class-validator';
import { IsNotBlank } from '../validators/is-not-blank.validator';
import { IsGmailEmail } from '../validators/gmail-email.validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

export class RegisterDto {
  @IsNotBlank({ message: 'Informe o nome completo.' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres.' })
  name: string;

  // @IsEmail() sozinho validaria o valor BRUTO (a ValidationPipe global não
  // usa `transform: true`), rejeitando entradas com whitespace externo que
  // são válidas após o trim exigido pela decisão D5 (ex.: " nome@gmail.com").
  // Por isso a sintaxe (via `isEmail` do class-validator) é validada DENTRO
  // de `normalizeGmailEmail`, já depois do trim+lowercase — uma única regra
  // coerente, usada tanto aqui quanto em `AuthService.register()`. "+" na
  // parte local é PRESERVADO (decisão de produto final): "nome+tag@gmail.com"
  // é aceito e persistido exatamente assim, nunca tratado como equivalente
  // a "nome@gmail.com".
  @IsGmailEmail({
    message: 'Use um e-mail válido do Gmail, no formato nome@gmail.com.',
  })
  email: string;

  @IsStrongPassword({
    message:
      'A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.',
  })
  password: string;

  @Equals(true, {
    message:
      'É necessário aceitar os Termos de uso e a Política de privacidade.',
  })
  termsAccepted: boolean;
}
