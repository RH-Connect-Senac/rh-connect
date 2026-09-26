/**
 * QA de segurança (Bloco 6): antes, o Swagger era montado
 * incondicionalmente no bootstrap. Agora só é habilitado quando alguém
 * decide isso explicitamente via `ENABLE_SWAGGER=true` — nunca com base
 * apenas em `NODE_ENV`, e sem nenhum fallback que exponha a documentação
 * por acidente. Qualquer outro valor (ausente, vazio, "1", "TRUE", etc.) é
 * tratado como desabilitado.
 */
export function shouldEnableSwagger(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.ENABLE_SWAGGER === 'true';
}
