const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';

/**
 * QA de segurança (Bloco 6) — fail-fast: em produção (NODE_ENV=production),
 * a API não deve subir apontando o CORS silenciosamente para localhost.
 * Fora de produção, mantém o fallback de desenvolvimento por conveniência
 * (comportamento equivalente ao antigo
 * `process.env.FRONTEND_URL || 'http://localhost:5173'`).
 *
 * Mesmo padrão de `assertJwtSecretConfigured`: usada apenas no bootstrap
 * real (`main.ts`, antes de `NestFactory.create`). Os testes e2e não
 * chamam `bootstrap()`, então não são afetados por esta checagem. Nunca
 * loga (nem inclui na mensagem de erro) o valor da variável.
 */
export function resolveFrontendUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const frontendUrl = env.FRONTEND_URL;
  const hasValue =
    typeof frontendUrl === 'string' && frontendUrl.trim().length > 0;

  if (env.NODE_ENV === 'production') {
    if (!hasValue) {
      throw new Error(
        'FRONTEND_URL é obrigatório em produção (NODE_ENV=production) e não pode estar vazio. Defina a variável de ambiente antes de iniciar a API.',
      );
    }

    return frontendUrl as string;
  }

  return hasValue ? (frontendUrl as string) : DEFAULT_DEV_FRONTEND_URL;
}
