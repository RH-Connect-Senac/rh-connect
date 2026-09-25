import { isEmail } from 'class-validator';

/**
 * Normalização de e-mail para o cadastro de Candidato (Fluxo 01 / Prompt 02).
 *
 * Ordem exigida (decisão de produto final): trim → lowercase → validar
 * sintaxe → exigir domínio gmail.com → usar o e-mail normalizado exato.
 *
 * - trim();
 * - lowercase();
 * - sintaxe validada com `isEmail` do `class-validator` (usa `validator.js`
 *   por baixo, sem depender de `ValidationPipe({ transform: true })`, que
 *   continua desligado globalmente);
 * - domínio restrito a exatamente "gmail.com";
 * - "+" na parte local é PRESERVADO — o RH Connect trata
 *   "lucas+senac@gmail.com" e "lucas@gmail.com" como dois e-mails
 *   DISTINTOS, nunca equivalentes. Não há remoção nem rejeição de "+";
 * - pontos na parte local também são preservados.
 *
 * Retorna o e-mail normalizado (trim + lowercase, com "+"/pontos intactos),
 * ou `null` quando o valor não é um e-mail Gmail sintaticamente válido. Esta
 * é a ÚNICA função de normalização e validação de sintaxe/domínio de e-mail
 * do cadastro: é usada tanto pelo validador (`@IsGmailEmail`) quanto
 * diretamente dentro de `AuthService.register()`.
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
  const domain = trimmed.slice(atIndex + 1);

  // Domínio.
  if (domain !== 'gmail.com') {
    return null;
  }

  // "+" e pontos na parte local são preservados como estão — o valor
  // normalizado é usado exatamente assim para persistir/buscar.
  return trimmed;
}

/**
 * Normalização/validação de e-mail para o LOGIN (Fluxo 01 / Prompt 03).
 *
 * Segue exatamente a mesma regra do cadastro (decisão de produto final:
 * "+" é preservado e NUNCA tratado como equivalente ao e-mail base), para
 * que Cadastro e Login nunca divirjam: trim → lowercase → validar sintaxe →
 * exigir domínio gmail.com → usar o e-mail normalizado exato → (o resultado
 * é usado para buscar o usuário).
 *
 * O Login atende os três perfis (CANDIDATE, EVALUATOR, ADMIN) e exige
 * `gmail.com` da mesma forma que o cadastro — não há suporte a outros
 * domínios no Login. Isso mantém coerência com o cadastro, que só cria
 * contas `@gmail.com`: qualquer conta técnica/seed criada diretamente no
 * banco com outro domínio não consegue autenticar por aqui.
 *
 * - trim() + lowercase() sempre — inclusive para aceitar whitespace externo
 *   (ex.: " lucas@gmail.com "), já que a ValidationPipe global não usa
 *   `transform: true` e o valor chega bruto no DTO;
 * - sintaxe validada com `isEmail` do `class-validator` (mesma biblioteca
 *   usada no cadastro) — rejeita, por exemplo, "a@@gmail.com";
 * - domínio restrito a exatamente "gmail.com" (mesma regra do cadastro) —
 *   qualquer outro domínio sintaticamente válido (ex.: "usuario@hotmail.com",
 *   "usuario@rhconnect.com") é inválido para Login;
 * - "+" e pontos na parte local são PRESERVADOS — uma conta cadastrada
 *   literalmente como "lucas+senac@gmail.com" só autentica com esse mesmo
 *   endereço exato; "lucas@gmail.com" NÃO autentica essa conta, e
 *   vice-versa. Não há equivalência entre os dois.
 *
 * Retorna `null` quando o valor não é um e-mail Gmail sintaticamente válido
 * — essa é a ÚNICA validação de sintaxe/domínio do Login, usada tanto pelo
 * validador do `LoginDto` (`@IsLoginEmail`) quanto diretamente dentro de
 * `AuthService.login()`, para que validação e busca nunca divirjam.
 *
 * NÃO aplica trim() à senha — a senha nunca passa por esta função. NÃO
 * aplica a política de limite de 72 bytes do cadastro — Login apenas
 * autentica contas já existentes, não gera novos hashes de senha aqui.
 */
export function normalizeLoginEmail(rawEmail: unknown): string | null {
  if (typeof rawEmail !== 'string') {
    return null;
  }

  const trimmed = rawEmail.trim().toLowerCase();

  if (trimmed.length === 0) {
    return null;
  }

  if (!isEmail(trimmed)) {
    return null;
  }

  const atIndex = trimmed.lastIndexOf('@');
  const domain = trimmed.slice(atIndex + 1);

  if (domain !== 'gmail.com') {
    return null;
  }

  // "+" e pontos na parte local são preservados — o valor normalizado é
  // usado exatamente assim para buscar o usuário.
  return trimmed;
}
