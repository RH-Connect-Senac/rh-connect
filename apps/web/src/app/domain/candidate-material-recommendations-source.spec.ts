import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const APP_TSX = code(read("App.tsx"));
const START = APP_TSX.indexOf("function MaterialsScreen(");
const END = APP_TSX.indexOf("function MaterialDetailScreen(");
const SCREEN = APP_TSX.slice(START, END);
const PANEL = code(read("components/materials/consolidated-recommendations-panel.tsx"));
const VIEW = code(read("domain/candidate-material-recommendations-view.ts"));
const SERVICE = code(read("services/candidate-material-recommendations-service.ts"));
const HOOK = code(read("hooks/use-consolidated-material-recommendations.ts"));

describe("MaterialsScreen (R7B): fonte de dados da aba Recomendados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("N. usa o endpoint real via service e NÃO usa mais `recommended: true`", () => {
    expect(SCREEN).toContain("useConsolidatedMaterialRecommendations(candidateIdentity.id)");
    expect(HOOK).toContain("getConsolidatedMaterialRecommendations()");
    expect(SCREEN).not.toMatch(/\.recommended\b/);
    expect(SCREEN).not.toContain("recomendados.");
    expect(SERVICE).toContain("/candidate/materials/recommendations");
  });

  it("a aba Recomendados é uma visão própria: retorna o painel ANTES de qualquer lista filtrada do catálogo", () => {
    const panel = SCREEN.indexOf('if (abaFiltro === "recomendados")');
    const rhCard = SCREEN.indexOf("const rhCard = ");
    const catalog = SCREEN.indexOf("filtradoOrdenado.map(rhCard)");
    expect(panel).toBeGreaterThan(-1);
    expect(rhCard).toBeGreaterThan(panel);
    expect(catalog).toBeGreaterThan(panel);
    const block = SCREEN.slice(panel, rhCard);
    expect(block).toContain("<ConsolidatedRecommendationsPanel");
    expect(block).not.toMatch(/busca|categoria|filtrado|selectedExternalSource|selectedCacholaArea|selectedOrangoCategory|sort\(|slice\(/);
  });

  it("M. busca, categoria e fonte não entram na carga nem no estado das recomendações", () => {
    const start = SCREEN.indexOf("const recommendations = ");
    const block = SCREEN.slice(start, start + SCREEN.slice(start).search(/useEffect\(\(\) => \{\s*const term/));
    expect(block).toContain("useConsolidatedMaterialRecommendations(candidateIdentity.id)");
    expect(block).not.toMatch(/busca|categoria|abaFiltro,|selectedExternalSource|selectedCacholaArea|selectedOrangoCategory/);
  });

  it("O. sem polling: carga one-shot fora do live sync, sem timer, listener ou refresh automático", () => {
    expect(SCREEN).not.toContain("useCandidateLiveResource<ConsolidatedMaterialRecommendation");
    expect(HOOK).not.toMatch(/useCandidateLiveResource|LiveResourceLoader|attach\w*Sync|candidate-live-sync/);
    for (const source of [PANEL, VIEW, SERVICE, HOOK]) {
      expect(source).not.toMatch(/setInterval|setTimeout|addEventListener|attachCandidateLiveSync|visibilitychange|WebSocket|EventSource/);
    }
  });

  it("o hook carrega uma vez no efeito (chave = candidato), recarrega só em reload e descarta resposta antiga", () => {
    expect(HOOK.match(/getConsolidatedMaterialRecommendations\(\)/g)).toHaveLength(1);
    expect(HOOK).toContain("}, [resourceKey, load]);");
    expect(HOOK).toContain("return { state, reload: load };");
    expect(HOOK).toContain("requestIdRef.current !== requestId");
    expect(HOOK).toContain("requestIdRef.current++");
    expect(HOOK).not.toMatch(/busca|categoria|abaFiltro|filtro/i);
  });

  it("não há ranking nem recorte no frontend (sem sort/slice/filter sobre a lista)", () => {
    for (const source of [PANEL, VIEW, SERVICE]) {
      expect(source).not.toMatch(/\.sort\(|\.slice\(|\.splice\(|\.reverse\(/);
    }
    expect(VIEW).not.toMatch(/\.filter\(/);
    expect(PANEL).not.toMatch(/\.filter\(/);
  });

  it("P. navegação RH Connect leva a origem Materiais (volta para Materiais)", () => {
    expect(SCREEN).toContain("routerNavigate(path, { state: { from: MATERIALS_LIST_PATH } })");
  });

  it("K/L. erro de recomendações não troca a página: hero, busca e demais seções seguem renderizadas", () => {
    const body = SCREEN.slice(SCREEN.search(/return \(\s*<AuthLayout/));
    expect(body).toContain("<MaterialsPageHeader");
    expect(body).toContain("<ContinueLearningSection");
    expect(body).toContain("<ExploreCatalogSection");
    // o estado de recomendações só é lido para montar a aba/painel, nunca para um return antecipado
    const beforeReturn = SCREEN.slice(0, SCREEN.search(/return \(\s*<AuthLayout/));
    expect(beforeReturn).not.toMatch(/recommendations\.state\.status\s*===[^\n]*\)\s*return/);
    expect(beforeReturn).not.toMatch(/if \(recommendations[^\n]*\) return/);
  });

  it("a aba Recomendados é fixa: sempre na lista, sem condição de visibilidade nem redirecionamento", () => {
    expect(SCREEN).toContain('{ id: "recomendados", label: "Recomendados" },');
    expect(SCREEN).not.toMatch(/recommendedTabVisible|isRecommendedTabVisible/);
    expect(SCREEN).not.toMatch(/\.\.\.\(\s*\w+\s*\?\s*\[\{\s*id: "recomendados"/);
    // nada volta a aba "recomendados" para "todos" automaticamente
    expect(SCREEN).not.toContain('setAbaFiltro("todos")');
    const tabs = SCREEN.indexOf('{ id: "todos", label: "Todos" }');
    expect(SCREEN.indexOf('{ id: "recomendados", label: "Recomendados" }')).toBeGreaterThan(tabs);
    expect(SCREEN.indexOf('{ id: "rh", label: "RH Connect" }')).toBeGreaterThan(SCREEN.indexOf('{ id: "recomendados"'));
  });

  it("retry: o painel recebe a recarga do hook (loading/vazio/erro ficam dentro da aba)", () => {
    expect(SCREEN).toContain("onRetry={recommendations.reload}");
    expect(SCREEN).toContain("state={recommendationsPanelState}");
  });

  it("V. catálogo geral preservado: abas, Continue aprendendo, Carregar mais e favoritos locais", () => {
    for (const marker of [
      '{ id: "todos", label: "Todos" }',
      '{ id: "rh", label: "RH Connect" }',
      '{ id: "cachola", label: "Cachola" }',
      '{ id: "orango", label: "Orango" }',
      '{ id: "historico", label: "Histórico" }',
      "Favoritos (${favoritosCount})",
      "Carregar mais",
      "handleLoadMoreTodos",
      "toggleFavorito",
      "getMaterialUserStates",
    ]) {
      expect(SCREEN).toContain(marker);
    }
  });

  it("não cria rota nova nem toca IA/Python: serviço, view e painel são limpos", () => {
    for (const source of [PANEL, VIEW, SERVICE]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|window\.open|groq|python|interview-ai/i);
    }
    expect(VIEW).not.toMatch(/fetch\(/);
    expect(PANEL).not.toMatch(/fetch\(/);
  });
});
