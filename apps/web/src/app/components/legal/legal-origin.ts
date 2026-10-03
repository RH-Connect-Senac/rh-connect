export const SETTINGS_PATH = "/candidate/settings";
export const REGISTER_PATH = "/register";

/** Abas das Configurações do candidato que podem ser restauradas via `?tab=`. */
export const SETTINGS_TAB_KEYS = [
  "conta",
  "senha",
  "notif",
  "privacidade",
  "consentimentos",
  "dados",
  "excluir",
] as const;

export type SettingsTabKey = (typeof SETTINGS_TAB_KEYS)[number];

export function isSettingsTabKey(value: string | null | undefined): value is SettingsTabKey {
  return typeof value === "string" && (SETTINGS_TAB_KEYS as readonly string[]).includes(value);
}

export type LegalOrigin = {
  /** Caminho interno normalizado para onde o botão de retorno leva. */
  path: string;
  label: string;
};

/**
 * Converte o `location.state.from` em uma origem de retorno conhecida e segura.
 * Apenas origens internas permitidas geram ação contextual; qualquer outro valor
 * (Landing, ausência de origem, caminhos arbitrários) resulta em `null`.
 */
export function resolveLegalOrigin(from: unknown): LegalOrigin | null {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(from, "http://origin.invalid");
  } catch {
    return null;
  }

  if (url.pathname === REGISTER_PATH) {
    return { path: REGISTER_PATH, label: "Voltar para criar conta" };
  }

  if (url.pathname === SETTINGS_PATH) {
    const tab = url.searchParams.get("tab");
    return {
      path: isSettingsTabKey(tab) && tab !== "conta" ? `${SETTINGS_PATH}?tab=${tab}` : SETTINGS_PATH,
      label: "Voltar para Configurações",
    };
  }

  return null;
}
