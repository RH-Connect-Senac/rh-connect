import { describe, expect, it } from "vitest";
import type { ConsolidatedMaterialRecommendation } from "../services/candidate-material-recommendations-service";
import {
  buildConsolidatedRecommendationsView,
  toConsolidatedPanelState,
} from "./candidate-material-recommendations-view";
import { MATERIAL_UNAVAILABLE_NOTICE, MATERIAL_UNKNOWN_NOTICE } from "./candidate-report-materials-view";

const options = { hasInternalMaterial: (slug: string) => slug === "como-se-apresentar-em-entrevistas" };

function rec(overrides: Partial<ConsolidatedMaterialRecommendation> = {}): ConsolidatedMaterialRecommendation {
  return {
    source: "RH_CONNECT",
    title: "Como se apresentar em entrevistas",
    resourceType: "Leitura",
    area: "GERAL",
    reason: "Complementa sua preparação geral.",
    recommendationCount: 3,
    internalSlug: "como-se-apresentar-em-entrevistas",
    availability: "IN_APP",
    directLinkAvailable: false,
    url: null,
    coverUrl: null,
    ...overrides,
  };
}

const cachola = (overrides: Partial<ConsolidatedMaterialRecommendation> = {}) =>
  rec({
    source: "CACHOLA",
    title: "Comunicação em entrevistas",
    resourceType: "Curso",
    internalSlug: null,
    availability: "AVAILABLE",
    directLinkAvailable: true,
    url: "https://cachola.example.com/curso",
    ...overrides,
  });
const orango = (overrides: Partial<ConsolidatedMaterialRecommendation> = {}) =>
  cachola({ source: "ORANGO", title: "Storytelling", url: "https://orango.example.com/x", ...overrides });

const first = (item: ConsolidatedMaterialRecommendation) => buildConsolidatedRecommendationsView([item], options)!.cards[0];

describe("buildConsolidatedRecommendationsView (R7B)", () => {
  it("vazio/ausente -> null (o painel mostra o estado vazio discreto)", () => {
    expect(buildConsolidatedRecommendationsView([], options)).toBeNull();
    expect(buildConsolidatedRecommendationsView(null, options)).toBeNull();
    expect(buildConsolidatedRecommendationsView(undefined, options)).toBeNull();
  });

  it("E. RH Connect IN_APP + slug -> CTA interno 'Abrir material' para a rota real", () => {
    const card = first(rec());
    expect(card.sourceLabel).toBe("RH Connect");
    expect(card.action).toEqual({ kind: "internal", label: "Abrir material", path: "/candidate/materials/como-se-apresentar-em-entrevistas" });
  });

  it("RH Connect com slug desconhecido não inventa rota: leva à área de Materiais", () => {
    expect(first(rec({ internalSlug: "nao-existe" })).action).toEqual({ kind: "internal", label: "Ir para Materiais", path: "/candidate/materials" });
  });

  it("F. Cachola AVAILABLE + URL -> CTA externo", () => {
    const card = first(cachola());
    expect(card.sourceLabel).toBe("Cachola · Parceiro");
    expect(card.external).toBe(true);
    expect(card.action).toEqual({ kind: "external", label: "Acessar na Cachola", href: "https://cachola.example.com/curso" });
  });

  it("G. Orango AVAILABLE + URL -> CTA externo", () => {
    expect(first(orango()).action).toEqual({ kind: "external", label: "Acessar no Orango", href: "https://orango.example.com/x" });
  });

  it("H. externo AVAILABLE sem link direto ou sem URL -> aviso, sem CTA", () => {
    for (const item of [cachola({ directLinkAvailable: false }), cachola({ url: null }), orango({ url: null })]) {
      const { action } = first(item);
      expect(action.kind).toBe("none");
      if (action.kind === "none") expect(action.notice.text).toMatch(/^Este conteúdo abre pela plataforma (Cachola|Orango)\.$/);
    }
  });

  it("URL com esquema perigoso nunca vira CTA", () => {
    expect(first(cachola({ url: "javascript:alert(1)" })).action.kind).toBe("none");
  });

  it("I. UNKNOWN -> aviso neutro em texto, sem CTA e sem afirmar indisponibilidade", () => {
    for (const item of [rec({ availability: "UNKNOWN" }), cachola({ availability: "UNKNOWN" })]) {
      const { action } = first(item);
      expect(action).toEqual({ kind: "none", notice: { text: MATERIAL_UNKNOWN_NOTICE, tone: "unknown" } });
      expect(JSON.stringify(action)).not.toMatch(/indispon/i);
    }
  });

  it("UNAVAILABLE defensivo: segue a semântica da R6 (card visível, aviso, sem CTA, não quebra)", () => {
    const card = first(cachola({ availability: "UNAVAILABLE" }));
    expect(card.action).toEqual({ kind: "none", notice: { text: MATERIAL_UNAVAILABLE_NOTICE, tone: "unavailable" } });
  });

  it("R. sem coverUrl -> coverUrl null; capa http(s) é usada e esquema inseguro é descartado", () => {
    expect(first(rec()).coverUrl).toBeNull();
    expect(first(cachola({ coverUrl: "https://c.example.com/a.webp" })).coverUrl).toBe("https://c.example.com/a.webp");
    expect(first(cachola({ coverUrl: "data:image/png;base64,AAA" })).coverUrl).toBeNull();
  });

  it("D/T. recommendationCount fica no view model; título, motivo e tipo são o histórico recebido", () => {
    const card = first(rec({ recommendationCount: 5 }));
    expect(card.recommendationCount).toBe(5);
    expect(card.title).toBe("Como se apresentar em entrevistas");
    expect(card.reason).toBe("Complementa sua preparação geral.");
    expect(card.typeLabel).toBe("Leitura");
  });

  it("S. preserva ordem e quantidade (sem ranking, sem slice, sem completar)", () => {
    const items = Array.from({ length: 9 }, (_, index) => cachola({ title: `Item ${9 - index}`, recommendationCount: index + 1 }));
    const view = buildConsolidatedRecommendationsView(items, options)!;
    expect(view.cards.map((card) => card.title)).toEqual(items.map((entry) => entry.title));
    expect(view.cards).toHaveLength(9);
    expect(new Set(view.cards.map((card) => card.key)).size).toBe(9);
  });

  it("U. nenhum identificador técnico nas chaves do card", () => {
    const keys = Object.keys(first(rec()));
    expect(keys.sort()).toEqual(["action", "areaLabel", "coverUrl", "external", "key", "reason", "recommendationCount", "source", "sourceLabel", "title", "typeLabel"].sort());
  });
});

describe("estado do painel (R7B)", () => {
  it("traduz loading/erro/pronto", () => {
    expect(toConsolidatedPanelState({ status: "loading" }, options)).toEqual({ status: "loading" });
    expect(toConsolidatedPanelState({ status: "error", message: "m" }, options)).toEqual({ status: "error", message: "m" });
    const ready = toConsolidatedPanelState({ status: "ready", value: [rec()] }, options);
    expect(ready.status === "ready" && ready.view?.cards).toHaveLength(1);
    expect(toConsolidatedPanelState({ status: "ready", value: [] }, options)).toEqual({ status: "ready", view: null });
  });
});
