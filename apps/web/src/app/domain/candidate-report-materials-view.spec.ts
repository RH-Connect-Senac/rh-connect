import { describe, expect, it } from "vitest";
import type { MaterialRecommendation } from "../services/candidate-interviews-service";
import {
  MATERIAL_UNAVAILABLE_NOTICE,
  MATERIAL_UNKNOWN_NOTICE,
  RECOMMENDED_MATERIALS_SUBTITLE,
  RECOMMENDED_MATERIALS_TITLE,
  buildRecommendedMaterialsView,
  internalMaterialPath,
  safeHttpUrl,
} from "./candidate-report-materials-view";

const KNOWN = new Set(["como-se-apresentar-em-entrevistas", "metodo-star-explicado"]);
const options = { hasInternalMaterial: (slug: string) => KNOWN.has(slug) };

function rec(overrides: Partial<MaterialRecommendation> = {}): MaterialRecommendation {
  return {
    position: 1,
    source: "RH_CONNECT",
    title: "Como se apresentar em entrevistas",
    resourceType: "Leitura",
    area: "GERAL",
    matchedNeed: "objectivity",
    matchKind: "primary",
    reason: "Ajuda a responder com mais objetividade.",
    availability: "IN_APP",
    internalSlug: "como-se-apresentar-em-entrevistas",
    directLinkAvailable: false,
    url: null,
    coverUrl: null,
    ...overrides,
  };
}

function external(overrides: Partial<MaterialRecommendation> = {}): MaterialRecommendation {
  return rec({
    position: 2,
    source: "CACHOLA",
    title: "Comunicação em entrevistas",
    resourceType: "Curso",
    internalSlug: null,
    availability: "AVAILABLE",
    directLinkAvailable: true,
    url: "https://cachola.example.com/curso",
    coverUrl: "https://cachola.example.com/capa.png",
    ...overrides,
  });
}

describe("materiais recomendados (R6): view model", () => {
  it("I. sem itens não há seção (null/undefined/[] não geram card vazio)", () => {
    expect(buildRecommendedMaterialsView([], options)).toBeNull();
    expect(buildRecommendedMaterialsView(undefined, options)).toBeNull();
    expect(buildRecommendedMaterialsView(null, options)).toBeNull();
  });

  it("título e subtexto da seção", () => {
    const view = buildRecommendedMaterialsView([rec()], options);
    expect(view?.title).toBe(RECOMMENDED_MATERIALS_TITLE);
    expect(view?.title).toBe("Materiais recomendados para você");
    expect(view?.subtitle).toBe(RECOMMENDED_MATERIALS_SUBTITLE);
  });

  it("J. o card carrega título, fonte, tipo e motivo históricos", () => {
    const [card] = buildRecommendedMaterialsView([rec()], options)!.cards;
    expect(card).toMatchObject({
      title: "Como se apresentar em entrevistas",
      sourceLabel: "RH Connect",
      typeLabel: "Leitura",
      reason: "Ajuda a responder com mais objetividade.",
      external: false,
    });
  });

  it("K. campos internos (position, matchedNeed, matchKind, availability, internalSlug) não chegam ao card", () => {
    const [card] = buildRecommendedMaterialsView([rec()], options)!.cards;
    const keys = Object.keys(card);
    for (const internal of ["position", "matchedNeed", "matchKind", "availability", "internalSlug", "url", "directLinkAvailable"]) {
      expect(keys).not.toContain(internal);
    }
  });

  it("E. RH_CONNECT IN_APP com internalSlug conhecido → navegação interna pela rota real", () => {
    const [card] = buildRecommendedMaterialsView([rec()], options)!.cards;
    expect(card.action).toEqual({
      kind: "internal",
      label: "Abrir material",
      path: "/candidate/materials/como-se-apresentar-em-entrevistas",
    });
  });

  it("E2. RH_CONNECT sem slug ou com slug fora do catálogo não inventa rota: leva à área de Materiais", () => {
    for (const internalSlug of [null, "slug-inexistente"]) {
      const [card] = buildRecommendedMaterialsView([rec({ internalSlug })], options)!.cards;
      expect(card.action).toEqual({ kind: "internal", label: "Ir para Materiais", path: "/candidate/materials" });
    }
  });

  it("E3. o slug é codificado na rota (nunca concatenado cru)", () => {
    expect(internalMaterialPath("a b/c")).toBe("/candidate/materials/a%20b%2Fc");
  });

  it("F. externo AVAILABLE com link direto e URL → CTA externo por fonte", () => {
    const view = buildRecommendedMaterialsView(
      [external(), external({ position: 3, source: "ORANGO", url: "http://orango.example.com/x" })],
      options,
    )!;
    expect(view.cards[0].action).toEqual({ kind: "external", label: "Acessar na Cachola", href: "https://cachola.example.com/curso" });
    expect(view.cards[0]).toMatchObject({ sourceLabel: "Cachola · Parceiro", external: true, typeLabel: "Curso" });
    expect(view.cards[1].action).toEqual({ kind: "external", label: "Acessar no Orango", href: "http://orango.example.com/x" });
    expect(view.cards[1].sourceLabel).toBe("Orango · Parceiro");
  });

  it("F2. externo AVAILABLE sem link direto ou sem URL não ganha botão (aviso neutro da plataforma)", () => {
    for (const patch of [{ directLinkAvailable: false }, { url: null }]) {
      const [card] = buildRecommendedMaterialsView([external(patch)], options)!.cards;
      expect(card.action).toEqual({ kind: "none", notice: { text: "Este conteúdo abre pela plataforma Cachola.", tone: "info" } });
    }
  });

  it("G. UNAVAILABLE permanece visível, sem CTA e com aviso discreto", () => {
    const view = buildRecommendedMaterialsView(
      [external({ availability: "UNAVAILABLE", url: null, coverUrl: null, directLinkAvailable: false })],
      options,
    )!;
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0].title).toBe("Comunicação em entrevistas");
    expect(view.cards[0].reason).toBe("Ajuda a responder com mais objetividade.");
    expect(view.cards[0].action).toEqual({ kind: "none", notice: { text: MATERIAL_UNAVAILABLE_NOTICE, tone: "unavailable" } });
    expect(MATERIAL_UNAVAILABLE_NOTICE).toBe("Conteúdo indisponível no momento");
  });

  it("G2. UNAVAILABLE nunca ganha CTA, mesmo que o payload ainda traga URL e flag de link direto", () => {
    const [card] = buildRecommendedMaterialsView([external({ availability: "UNAVAILABLE" })], options)!.cards;
    expect(card.action.kind).toBe("none");
  });

  it("H. UNKNOWN permanece visível, com aviso neutro (não afirma indisponibilidade) e sem CTA", () => {
    const [card] = buildRecommendedMaterialsView(
      [external({ availability: "UNKNOWN", url: null, coverUrl: null, directLinkAvailable: false })],
      options,
    )!.cards;
    expect(card.title).toBe("Comunicação em entrevistas");
    expect(card.action).toEqual({ kind: "none", notice: { text: MATERIAL_UNKNOWN_NOTICE, tone: "unknown" } });
    expect(MATERIAL_UNKNOWN_NOTICE).toBe("Não foi possível verificar o acesso agora");
    expect(MATERIAL_UNKNOWN_NOTICE).not.toMatch(/indispon/i);
  });

  it("H2. combinação fora do contrato (externo IN_APP) cai no aviso neutro", () => {
    const [card] = buildRecommendedMaterialsView([external({ availability: "IN_APP" })], options)!.cards;
    expect(card.action).toMatchObject({ kind: "none", notice: { tone: "unknown" } });
  });

  it("M. sem coverUrl o card existe normalmente (coverUrl null)", () => {
    const [card] = buildRecommendedMaterialsView([external({ coverUrl: null })], options)!.cards;
    expect(card.coverUrl).toBeNull();
    expect(card.title).toBeTruthy();
  });

  it("capa e link só aceitam http(s): esquemas perigosos são descartados", () => {
    const [card] = buildRecommendedMaterialsView(
      [external({ url: "javascript:alert(1)", coverUrl: "data:image/png;base64,AAAA" })],
      options,
    )!.cards;
    expect(card.coverUrl).toBeNull();
    expect(card.action.kind).toBe("none");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("//evil.example.com")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("   ")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl("https://ok.example.com/a")).toBe("https://ok.example.com/a");
  });

  it("área: rótulo discreto só para TI/RH/Secretariado; geral não vira rótulo", () => {
    const cards = buildRecommendedMaterialsView(
      [rec({ area: "TI" }), rec({ area: "RH" }), rec({ area: "SECRETARIADO" }), rec({ area: "GERAL" })],
      options,
    )!.cards;
    expect(cards.map((card) => card.areaLabel)).toEqual(["Tecnologia", "Recursos Humanos", "Secretariado", null]);
  });

  it("tipo/motivo vazios viram null (sem texto vazio no card)", () => {
    const [card] = buildRecommendedMaterialsView([rec({ resourceType: "", reason: "" })], options)!.cards;
    expect(card.typeLabel).toBeNull();
    expect(card.reason).toBeNull();
  });

  it("N. preserva a ordem recebida (já por position), independente de fonte e disponibilidade", () => {
    const view = buildRecommendedMaterialsView(
      [
        external({ position: 1, availability: "UNAVAILABLE", title: "Primeiro" }),
        rec({ position: 2, title: "Segundo" }),
        external({ position: 3, source: "ORANGO", availability: "UNKNOWN", title: "Terceiro" }),
      ],
      options,
    )!;
    expect(view.cards.map((card) => card.title)).toEqual(["Primeiro", "Segundo", "Terceiro"]);
    expect(new Set(view.cards.map((card) => card.key)).size).toBe(3);
  });

  it("renderiza no máximo o que a API enviou (não completa nem limita)", () => {
    expect(buildRecommendedMaterialsView([rec(), external()], options)!.cards).toHaveLength(2);
    expect(buildRecommendedMaterialsView([rec()], options)!.cards).toHaveLength(1);
  });
});
