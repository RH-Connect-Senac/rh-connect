import { isUuid } from "../services/candidate-interviews-service";

/** Lista de materiais do candidato (rota real). */
export const MATERIALS_LIST_PATH = "/candidate/materials";
/** Prefixo da rota real do relatório do candidato: `/candidate/reports/:id`. */
export const CANDIDATE_REPORT_PATH_PREFIX = "/candidate/reports/";

export type MaterialDetailOrigin = {
  /** Caminho interno JÁ validado e normalizado para onde o botão de voltar leva. */
  path: string;
  label: string;
};

/** Acesso direto, origem ausente ou inválida: comportamento histórico (lista de materiais). */
export const DEFAULT_MATERIAL_DETAIL_ORIGIN: MaterialDetailOrigin = {
  path: MATERIALS_LIST_PATH,
  label: "Voltar para Materiais",
};

/**
 * Converte o `location.state.from` do detalhe do material em uma origem de retorno conhecida e
 * segura (mesmo padrão de `resolveLegalOrigin`). Só duas origens são aceitas, ambas por caminho
 * interno exato: a lista de materiais e o relatório de um candidato (`/candidate/reports/<uuid>`).
 * Qualquer outra coisa (URL externa, `//host`, caminho arbitrário, UUID inválido, tipo errado)
 * cai no padrão. Query e hash são descartados: o destino é sempre reconstruído, nunca repassado.
 */
export function resolveMaterialDetailOrigin(from: unknown): MaterialDetailOrigin {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) {
    return DEFAULT_MATERIAL_DETAIL_ORIGIN;
  }

  let url: URL;
  try {
    url = new URL(from, "http://origin.invalid");
  } catch {
    return DEFAULT_MATERIAL_DETAIL_ORIGIN;
  }
  if (url.origin !== "http://origin.invalid") return DEFAULT_MATERIAL_DETAIL_ORIGIN;

  if (url.pathname === MATERIALS_LIST_PATH) {
    return DEFAULT_MATERIAL_DETAIL_ORIGIN;
  }

  if (url.pathname.startsWith(CANDIDATE_REPORT_PATH_PREFIX)) {
    const interviewId = url.pathname.slice(CANDIDATE_REPORT_PATH_PREFIX.length);
    if (isUuid(interviewId)) {
      return { path: `${CANDIDATE_REPORT_PATH_PREFIX}${interviewId}`, label: "Voltar ao resultado" };
    }
  }

  return DEFAULT_MATERIAL_DETAIL_ORIGIN;
}
