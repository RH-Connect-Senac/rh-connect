import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MaterialRecommendation } from "../../services/candidate-interviews-service";
import { buildRecommendedMaterialsView } from "../../domain/candidate-report-materials-view";
import { RecommendedMaterialsSection, recommendedMaterialToCardData } from "./recommended-materials-section";

const options = { hasInternalMaterial: (slug: string) => slug === "como-se-apresentar-em-entrevistas" };

function rec(overrides: Partial<MaterialRecommendation> = {}): MaterialRecommendation {
  return {
    position: 1,
    source: "RH_CONNECT",
    title: "Como se apresentar em entrevistas",
    resourceType: "Leitura",
    area: "GERAL",
    matchedNeed: "domain_knowledge",
    matchKind: "general_preparation",
    reason: "Complementa sua preparação geral para entrevistas.",
    availability: "IN_APP",
    internalSlug: "como-se-apresentar-em-entrevistas",
    directLinkAvailable: false,
    url: null,
    coverUrl: null,
    ...overrides,
  };
}

const cachola = (overrides: Partial<MaterialRecommendation> = {}) =>
  rec({
    position: 2,
    source: "CACHOLA",
    title: "Comunicação em entrevistas",
    resourceType: "Curso",
    matchedNeed: "requirements_alignment",
    matchKind: "secondary",
    reason: "Também contribui para alinhar sua experiência à vaga.",
    internalSlug: null,
    availability: "AVAILABLE",
    directLinkAvailable: true,
    url: "https://cachola.example.com/curso",
    coverUrl: null,
    ...overrides,
  });

const orango = (overrides: Partial<MaterialRecommendation> = {}) =>
  cachola({ position: 3, source: "ORANGO", title: "Storytelling para entrevistas", url: "https://orango.example.com/x", ...overrides });

function html(items: MaterialRecommendation[], onNavigate: (path: string) => void = () => {}) {
  return renderToStaticMarkup(
    createElement(RecommendedMaterialsSection, { view: buildRecommendedMaterialsView(items, options), onNavigate }),
  );
}

describe("RecommendedMaterialsSection (R6)", () => {
  it("I. lista vazia não renderiza a seção (nem título, nem aviso de vazio)", () => {
    expect(html([])).toBe("");
    expect(renderToStaticMarkup(createElement(RecommendedMaterialsSection, { view: null, onNavigate: () => {} }))).toBe("");
  });

  it("título e subtexto da seção, com região rotulada", () => {
    const out = html([rec()]);
    expect(out).toContain("Materiais recomendados para você");
    expect(out).toContain("Selecionados com base no seu desempenho nesta entrevista.");
    expect(out).toContain('aria-labelledby="recommended-materials-title"');
    expect(out).toContain('id="recommended-materials-title"');
  });

  it("J. mostra título, fonte, tipo do material e motivo de cada card", () => {
    const out = html([rec(), cachola(), orango()]);
    for (const text of [
      "Como se apresentar em entrevistas",
      "Comunicação em entrevistas",
      "Storytelling para entrevistas",
      "RH Connect",
      "Cachola · Parceiro",
      "Orango · Parceiro",
      "Leitura",
      "Curso",
      "Complementa sua preparação geral para entrevistas.",
      "Também contribui para alinhar sua experiência à vaga.",
    ]) {
      expect(out).toContain(text);
    }
  });

  it("K. matchedNeed, matchKind, position e identificadores técnicos não aparecem como texto", () => {
    const out = html([rec(), cachola(), orango()]);
    for (const technical of ["domain_knowledge", "requirements_alignment", "general_preparation", "matchedNeed", "matchKind", "position", "internalSlug", "RH_CONNECT", "CACHOLA", "ORANGO", "AVAILABLE", "IN_APP"]) {
      expect(out).not.toContain(technical);
    }
    // o slug só existe na navegação (não é exibido nem vai para o HTML)
    expect(out).not.toContain("/candidate/materials/");
  });

  it("E. RH Connect IN_APP tem botão de ação interna e dispara a navegação para a rota real", () => {
    const onNavigate = vi.fn();
    const out = html([rec()], onNavigate);
    expect(out).toContain("Abrir material");
    expect(out).toMatch(/<button[^>]*>Abrir material/);
    expect(out).not.toContain('target="_blank"');

    const view = buildRecommendedMaterialsView([rec()], options)!;
    const data = recommendedMaterialToCardData(view.cards[0], onNavigate);
    data.action!.onClick();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/candidate/materials/como-se-apresentar-em-entrevistas");
  });

  it("F/L. externo AVAILABLE vira link real em nova aba com noopener noreferrer e texto acessível", () => {
    const out = html([cachola(), orango()]);
    const anchors = out.match(/<a [^>]*>/g) ?? [];
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener noreferrer"');
    }
    expect(out).toContain('href="https://cachola.example.com/curso"');
    expect(out).toContain('href="https://orango.example.com/x"');
    expect(out).toContain("Acessar na Cachola");
    expect(out).toContain("Acessar no Orango");
    expect(out).toContain("(abre em nova aba)");
  });

  it("G. UNAVAILABLE continua visível, com aviso em texto e sem link nem botão", () => {
    const out = html([cachola({ availability: "UNAVAILABLE", url: null, directLinkAvailable: false })]);
    expect(out).toContain("Comunicação em entrevistas");
    expect(out).toContain("Também contribui para alinhar sua experiência à vaga.");
    expect(out).toContain("Conteúdo indisponível no momento");
    expect(out).not.toContain("<a ");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("Acessar na Cachola");
  });

  it("H. UNKNOWN continua visível com aviso neutro, sem afirmar indisponibilidade e sem ação", () => {
    const out = html([cachola({ availability: "UNKNOWN", url: null, directLinkAvailable: false })]);
    expect(out).toContain("Comunicação em entrevistas");
    expect(out).toContain("Cachola · Parceiro");
    expect(out).toContain("Não foi possível verificar o acesso agora");
    expect(out).not.toMatch(/indispon/i);
    expect(out).not.toContain("<a ");
    expect(out).not.toContain("<button");
  });

  it("aviso não depende só de cor: ícone decorativo (aria-hidden) + texto", () => {
    const out = html([cachola({ availability: "UNAVAILABLE", url: null })]);
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(out).toContain("Conteúdo indisponível no momento");
  });

  it("M. sem coverUrl o card renderiza sem <img> (fallback visual do card editorial)", () => {
    const out = html([rec(), cachola({ coverUrl: null })]);
    expect(out).not.toContain("<img");
    expect(out).toContain("Comunicação em entrevistas");
  });

  it("capa existente é decorativa (alt vazio) e URL insegura não vira <img>", () => {
    const withCover = html([cachola({ coverUrl: "https://cachola.example.com/capa.png" })]);
    expect(withCover).toContain("https://cachola.example.com/capa.png");
    expect(withCover).toMatch(/<img[^>]*alt=""/);
    const unsafe = html([cachola({ coverUrl: "javascript:alert(1)" })]);
    expect(unsafe).not.toContain("<img");
    expect(unsafe).not.toContain("javascript:");
  });

  it("N. até 3 cards em grade responsiva (1 → 2 → 3 colunas), sem carrossel nem scroll horizontal, na ordem recebida", () => {
    const out = html([
      orango({ position: 1, title: "Primeiro (Orango)" }),
      rec({ position: 2, title: "Segundo (RH)" }),
      cachola({ position: 3, title: "Terceiro (Cachola)", availability: "UNKNOWN", url: null }),
    ]);
    expect(out).toContain("grid-cols-1");
    expect(out).toContain("sm:grid-cols-2");
    expect(out).toContain("xl:grid-cols-3");
    expect(out).not.toMatch(/overflow-x|snap-x|carousel/i);
    expect((out.match(/<li /g) ?? []).length).toBe(3);
    const order = ["Primeiro (Orango)", "Segundo (RH)", "Terceiro (Cachola)"].map((title) => out.indexOf(title));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index > -1)).toBe(true);
  });

  it("cards têm min-w-0 para não estourar a largura em telas estreitas", () => {
    expect(html([rec()])).toContain('class="min-w-0"');
  });

  it("área específica aparece de forma discreta; geral não", () => {
    expect(html([rec({ area: "TI" })])).toContain("Tecnologia");
    expect(html([rec({ area: "GERAL" })])).not.toMatch(/Tecnologia|Recursos Humanos|Secretariado/);
  });
});
