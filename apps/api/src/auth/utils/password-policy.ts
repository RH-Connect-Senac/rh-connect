/**
 * Política de senha D12 (Fluxo 01 / Prompt 02), fechada no plano:
 * - mínimo de 8 caracteres;
 * - pelo menos 1 letra maiúscula (Unicode-aware — letras acentuadas contam);
 * - pelo menos 1 letra minúscula (Unicode-aware — letras acentuadas contam);
 * - pelo menos 1 dígito de 0 a 9;
 * - pelo menos 1 caractere especial, definido como "não é letra Unicode,
 *   não é dígito ASCII 0-9 e não é espaço/whitespace";
 * - espaços/whitespace são permitidos, mas não contam como caractere
 *   especial;
 * - a senha NÃO passa por trim();
 * - para senha nova (cadastro), rejeita entradas acima de 72 bytes UTF-8
 *   (limite do bcrypt). Este limite NÃO é aplicado ao Login.
 */
const UPPERCASE_RE = /\p{Lu}/u;
const LOWERCASE_RE = /\p{Ll}/u;
const DIGIT_RE = /[0-9]/;
const SPECIAL_RE = /[^\p{L}0-9\s]/u;

export function passwordMeetsPolicy(password: string): boolean {
  if (typeof password !== 'string') {
    return false;
  }

  if (password.length < 8) {
    return false;
  }

  if (!UPPERCASE_RE.test(password)) {
    return false;
  }

  if (!LOWERCASE_RE.test(password)) {
    return false;
  }

  if (!DIGIT_RE.test(password)) {
    return false;
  }

  if (!SPECIAL_RE.test(password)) {
    return false;
  }

  return true;
}

export function passwordWithinByteLimit(
  password: string,
  maxBytes = 72,
): boolean {
  return (
    typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= maxBytes
  );
}
