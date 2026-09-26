/**
 * Prompt 13 (M4) — Fail-fast: a API nunca deve iniciar assinando ou
 * verificando tokens com um `JWT_SECRET` ausente ou vazio.
 *
 * Usada apenas no bootstrap real (`main.ts`, antes de `NestFactory.create`).
 * Os testes e2e NÃO chamam `bootstrap()` — eles compilam o `AppModule`
 * diretamente via `Test.createTestingModule` (ver `test/*.e2e-spec.ts`) —
 * então não são afetados por esta checagem, e nenhuma fixture/configuração
 * de teste precisou ser alterada por causa dela.
 *
 * Nunca gera um segredo automaticamente, nunca usa um valor padrão/fallback
 * e nunca loga (nem inclui na mensagem de erro) o valor da variável.
 */
export function assertJwtSecretConfigured(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const secret = env.JWT_SECRET;

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET é obrigatório e não pode estar vazio. Defina a variável de ambiente antes de iniciar a API.',
    );
  }
}
