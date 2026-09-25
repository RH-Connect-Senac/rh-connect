import { IsString } from 'class-validator';
import { IsLoginEmail } from '../validators/login-email.validator';

export class LoginDto {
  // @IsEmail() sozinho validaria o valor BRUTO (a ValidationPipe global não
  // usa `transform: true`), rejeitando e-mails com whitespace externo que
  // são válidos após o trim (ex.: " lucas@gmail.com "). Por isso a sintaxe
  // é validada dentro de `normalizeLoginEmail` (já com trim+lowercase
  // aplicados) — mesma abordagem usada no cadastro com `@IsGmailEmail`.
  // Login exige domínio gmail.com, igual ao cadastro: contas @rhconnect.com
  // ou de qualquer outro domínio não autenticam. "+" na parte local é
  // PRESERVADO (nunca removido/rejeitado) — "usuario+tag@gmail.com" só
  // autentica a conta cadastrada com esse endereço exato, nunca a conta
  // "usuario@gmail.com".
  @IsLoginEmail({ message: 'Use um e-mail válido do Gmail, no formato nome@gmail.com.' })
  email: string;

  @IsString()
  password: string;
}
