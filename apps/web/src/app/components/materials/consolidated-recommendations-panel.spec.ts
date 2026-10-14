import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ConsolidatedMaterialRecommendation } from "../../services/candidate-material-recommendations-service";
import {
  toConsolidatedPanelState,
  type ConsolidatedPanelState,
} from "../../domain/candidate-material-recommendations-view";
import { recommendedMaterialToCardData } from "./recommended-materials-section";
import { ConsolidatedRecommendationsPanel } from "./consolidated-recommendations-panel";
import { buildConsolidatedRecommendationsView } from "../../domain/candidate-material-recommendations-view";

const options = { hasInternalMaterial: (slug: string) => slug === "como-se-apresentar-em-entrevistas" };

function rec(overrides: Partial<ConsolidatedMaterialRecommendation> = {}): ConsolidatedMaterialRecommendation {
  return {
    source: "RH_CONNECT",
    title: "Como se apresentar em entrevistas",
    resourceType: "Leitura",
    area: "GERAL",
    reason: "Complementa sua preparação geral.",
    recommendationCount: 7,
    internalSlug: "como-se-apresentar-em-entrevistas",
    availability: "IN_APP",
    directLinkAvailable: false,
    url: null,
    coverUrl: null,
    ...overrides,
  };
}
const cachola = (overrides: Partial<ConsolidatedMaterialRecommendation> = {}) =>
  rec({ source: "CACHOLA", title: "Comunicação em entrevistas", resourceType: "Curso", internalSlug: null, availability: "AVAILABLE", directLinkAvailable: true, url: "https://cachola.example.com/curso", ...overrides });

const ready = (items: ConsolidatedMaterialRecommendation[]) =>
  toConsolidatedPanelState({ status: "ready", value: items }, options);

function html(state: ConsolidatedPanelState, props: { onNavigate?: (path: string) => void; onRetry?: () => void } = {}) {
  return renderToStaticMarkup(
    createElement(ConsolidatedRecommendationsPanel, { state, onNavigate: props.onNavigate ?? (() => {}), onRetry: props.onRetry }),
  );
}

// Percorre a árvore devolvida pelo componente (função pura) procurando um elemento com `onClick`.
function findClickable(node: ReactNode): ReactElement<{ onClick?: () => void }> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findClickable(child);
      if (found) return found;
    }
    return null;
  }
  const element = node as ReactElement<{ onClick?: () => void; children?: ReactNode }>;
  if (typeof element.props?.onClick === "function") return element;
  return findClickable(element.props?.children);
}

describe("ConsolidatedRecommendationsPanel (R7B)", () => {
  it("J. vazio mostra estado vazio discreto na área da grade (sem 'Nenhuma recomendação' seco)", () => {
    for (const out of [html(ready([])), html({ status: "ready", view: null })]) {
      expect(out).toContain("Suas recomendações aparecerão aqui após suas entrevistas avaliadas.");
      expect(out).toContain('role="status"');
      expect(out).not.toMatch(/<li|<ul|<button|<a |Nenhuma recomendação|Tentar novamente/);
    }
  });

  it("lista rotulada, na ordem recebida e na grade 1→2→3 colunas (sem carrossel)", () => {
    const out = html(ready([cachola({ title: "Zeta" }), rec(), cachola({ title: "Alfa" })]));
    expect(out).toContain('aria-label="Materiais recomendados para você"');
    expect(out).toContain("grid-cols-1");
    expect(out).toContain("sm:grid-cols-2");
    expect(out).toContain("xl:grid-cols-3");
    expect(out.indexOf("Zeta")).toBeGreaterThan(-1);
    expect(out.indexOf("Zeta")).toBeLessThan(out.indexOf("Como se apresentar em entrevistas"));
    expect(out.indexOf("Como se apresentar em entrevistas")).toBeLessThan(out.indexOf("Alfa"));
  });

  it("mostra todos os itens do Back (até 9), sem cortar em 2", () => {
    const items = Array.from({ length: 9 }, (_, index) => cachola({ title: `Material ${index + 1}` }));
    const out = html(ready(items));
    expect((out.match(/<li/g) ?? []).length).toBe(9);
  });

  it("card traz título, fonte, tipo e motivo; CTA externo seguro; sem texto de contagem", () => {
    const out = html(ready([cachola()]));
    expect(out).toContain("Comunicação em entrevistas");
    expect(out).toContain("Cachola · Parceiro");
    expect(out).toContain("Curso");
    expect(out).toContain("Complementa sua preparação geral.");
    expect(out).toContain("Acessar na Cachola");
    expect(out).toContain('href="https://cachola.example.com/curso"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    const text = out.replace(/<[^>]*>/g, " ");
    expect(text).not.toMatch(/recomendado em|\b7\b|entrevistas recentes/i);
  });

  it("RH Connect: CTA interno 'Abrir material' navega pela rota real", () => {
    const view = buildConsolidatedRecommendationsView([rec()], options)!;
    const onNavigate = vi.fn();
    const data = recommendedMaterialToCardData(view.cards[0], onNavigate);
    expect(data.action?.label).toBe("Abrir material");
    data.action?.onClick();
    expect(onNavigate).toHaveBeenCalledWith("/candidate/materials/como-se-apresentar-em-entrevistas");
    expect(html(ready([rec()]))).toContain("Abrir material");
  });

  it("UNKNOWN: aviso em TEXTO e sem CTA; sem capa não quebra o card", () => {
    const out = html(ready([cachola({ availability: "UNKNOWN", coverUrl: null })]));
    expect(out).toContain("Não foi possível verificar o acesso agora");
    expect(out).not.toContain("Acessar na Cachola");
    expect(out).not.toContain("<a ");
  });

  it("AVAILABLE sem link direto: aviso da plataforma, sem botão quebrado", () => {
    const out = html(ready([cachola({ directLinkAvailable: false })]));
    expect(out).toContain("Este conteúdo abre pela plataforma Cachola.");
    expect(out).not.toContain("Acessar na Cachola");
  });

  it("U. nada técnico no HTML (slug só na rota via clique, nunca como texto de ref/id)", () => {
    const out = html(ready([rec(), cachola()]));
    expect(out).not.toMatch(/material_ref|external_key|interviewId|recommendationCount|internalSlug/);
  });

  it("loading discreto: esqueletos aria-hidden e UM aviso para leitor de tela", () => {
    const out = html({ status: "loading" });
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain("Carregando suas recomendações");
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain("animate-pulse");
    expect(out).not.toContain("<h");
  });

  it("K. erro: mensagem curta, não técnica, com 'Tentar novamente'", () => {
    const out = html({ status: "error", message: "Não foi possível carregar suas recomendações agora." }, { onRetry: () => {} });
    expect(out).toContain("Não foi possível carregar suas recomendações agora.");
    expect(out).toContain("Tentar novamente");
    expect(out).not.toMatch(/Prisma|stack|Failed to fetch|500/);
    expect(html({ status: "error", message: "m" })).not.toContain("Tentar novamente");
  });

  it("retry: 'Tentar novamente' dispara onRetry exatamente uma vez por clique", () => {
    const onRetry = vi.fn();
    const tree = ConsolidatedRecommendationsPanel({
      state: { status: "error", message: "Não foi possível carregar suas recomendações agora." },
      onNavigate: () => {},
      onRetry,
    });
    const button = findClickable(tree);
    expect(button).not.toBeNull();
    button?.props.onClick?.();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("vazio e loading não oferecem retry; o vazio não depende de onRetry", () => {
    expect(findClickable(ConsolidatedRecommendationsPanel({ state: { status: "ready", view: null }, onNavigate: () => {}, onRetry: () => {} }))).toBeNull();
    expect(findClickable(ConsolidatedRecommendationsPanel({ state: { status: "loading" }, onNavigate: () => {}, onRetry: () => {} }))).toBeNull();
  });
});
