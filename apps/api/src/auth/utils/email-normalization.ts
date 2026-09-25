import { isEmail } from 'class-validator';

/**
 * Normalização de e-mail para o cadastro de Candidato (Fluxo 01 / Prompt 02).
 *
 * Ordem exigida pela decisão D5: trim → lowercase → validar domínio/sintaxe
 * → remover +tag → persistir.
 *
 * - trim();
 * - lowercase();
 * - sintaxe validada com `isEmail` do `class-validator` (usa `validator.js`
 *   por baixo, sem depender de `ValidationPipe({ transform: true })`, que
 *   continua desligado globalmente) — aplicada ANTES de remover o "+tag",
 *   pois "nome+tag@gmail.com" é sintaticamente válido;
 * - domínio restrito a exatamente "gmail.com";
 * - remove o sufixo "+tag" da parte local (somente para gmail.com);
 * - pontos na parte local NÃO são removidos;
 * - se a parte local ficar vazia após remover o "+tag" (ex.: "+tag@gmail.com"),
 *   o e-mail é inválido.
 *
 * Retorna o e-mail normalizado, ou `null` quando o valor não é um e-mail
 * Gmail válido segundo essas regras. Esta é a ÚNICA função de normalização
 * e validação de sintaxe/domínio de e-mail do cadastro: é usada tanto pelo
 * validador (`@IsGmailEmail`) quanto diretamente dentro de
 * `AuthService.register()`.
 */
export function normalizeGmailEmail(rawEmail: unknown): string | null {
  if (typeof rawEmail !== 'string') {
    return null;
  }

  // trim + lowercase — o valor chega bruto (sem whitespace removido) tanto
  // na validação quanto no service, porque a ValidationPipe global não usa
  // `transform: true`.
  const trimmed = rawEmail.trim().toLowerCase();

  if (trimmed.length === 0) {
    return null;
  }

  // Sintaxe (rejeita, por exemplo, "a@@gmail.com").
  if (!isEmail(trimmed)) {
    return null;
  }

  const atIndex = trimmed.lastIndexOf('@');
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  // Domínio.
  if (domain !== 'gmail.com') {
    return null;
  }

  const plusIndex = localPart.indexOf('+');
  const cleanLocal = plusIndex >= 0 ? localPart.slice(0, plusIndex) : localPart;

  if (cleanLocal.length === 0) {
    return null;
  }

  return `${cleanLocal}@${domain}`;
}
