import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE,
  getConsolidatedMaterialRecommendations,
  toConsolidatedMaterialRecommendations,
} from "./candidate-material-recommendations-service";

function item(overrides: Record<string, unknown> = {}) {
  return {
    source: "RH_CONNECT",
    title: "Como se apresentar em entrevistas",
    resourceType: "Leitura",
    area: "GERAL",
    reason: "Complementa sua preparação geral.",
    recommendationCount: 2,
    internalSlug: "como-se-apresentar-em-entrevistas",
    availability: "IN_APP",
    directLinkAvailable: false,
    url: null,
    coverUrl: null,
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("toConsolidatedMaterialRecommendations (R7B)", () => {
  it("A. resposta válida vira o modelo explícito, na ordem recebida", () => {
    const out = toConsolidatedMaterialRecommendations({
      recommendations: [
        item(),
        item({ source: "CACHOLA", title: "Curso Z", internalSlug: null, availability: "AVAILABLE", directLinkAvailable: true, url: "https://c.example.com/z", coverUrl: "https://c.example.com/z.webp", recommendationCount: 1 }),
        item({ source: "ORANGO", title: "Curso A", internalSlug: null, availability: "UNKNOWN", recommendationCount: 3 }),
      ],
    });
    expect(out.map((entry) => entry.title)).toEqual(["Como se apresentar em entrevistas", "Curso Z", "Curso A"]);
    expect(out[1]).toEqual({
      source: "CACHOLA",
      title: "Curso Z",
      resourceType: "Leitura",
      area: "GERAL",
      reason: "Complementa sua preparação geral.",
      recommendationCount: 1,
      internalSlug: null,
      availability: "AVAILABLE",
      directLinkAvailable: true,
      url: "https://c.example.com/z",
      coverUrl: "https://c.example.com/z.webp",
    });
  });

  it("B. sem recommendations, corpo inválido ou campo que não é array -> []", () => {
    for (const payload of [null, undefined, "x", 42, [], {}, { recommendations: null }, { recommendations: "x" }, { recommendations: {} }]) {
      expect(toConsolidatedMaterialRecommendations(payload)).toEqual([]);
    }
  });

  it("C. item inválido é ignorado e os válidos continuam", () => {
    const out = toConsolidatedMaterialRecommendations({
      recommendations: [
        null,
        "x",
        item({ source: "OUTRA" }),
        item({ area: "XYZ" }),
        item({ availability: "TALVEZ" }),
        item({ title: "   " }),
        item({ reason: 3 }),
        item({ recommendationCount: 0 }),
        item({ recommendationCount: 1.5 }),
        item({ recommendationCount: "2" }),
        item({ title: "Válido" }),
      ],
    });
    expect(out.map((entry) => entry.title)).toEqual(["Válido"]);
  });

  it("D. recommendationCount é preservado", () => {
    const out = toConsolidatedMaterialRecommendations({ recommendations: [item({ recommendationCount: 4 })] });
    expect(out[0].recommendationCount).toBe(4);
  });

  it("S. não reordena, não completa e não limita: devolve exatamente o que o Back mandou", () => {
    const sent = Array.from({ length: 9 }, (_, index) => item({ title: `Material ${9 - index}` }));
    expect(toConsolidatedMaterialRecommendations({ recommendations: sent }).map((entry) => entry.title)).toEqual(
      sent.map((entry) => entry.title),
    );
    expect(toConsolidatedMaterialRecommendations({ recommendations: [item()] })).toHaveLength(1);
  });

  it("U. não carrega campos extras/internos do payload", () => {
    const out = toConsolidatedMaterialRecommendations({
      recommendations: [item({ material_ref: "interno", external_key: "k", interviewId: "i", position: 1, matchedNeed: "x" })],
    });
    expect(Object.keys(out[0]).sort()).toEqual(
      ["area", "availability", "coverUrl", "directLinkAvailable", "internalSlug", "reason", "recommendationCount", "resourceType", "source", "title", "url"].sort(),
    );
  });
});

describe("getConsolidatedMaterialRecommendations (R7B)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("chama GET /candidate/materials/recommendations com cookie, sem parâmetro de candidato", async () => {
    fetchMock.mockResolvedValueOnce(json({ recommendations: [item()] }));
    const result = await getConsolidatedMaterialRecommendations();
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/candidate\/materials\/recommendations$/);
    expect(String(url)).not.toContain("?");
    expect(init).toMatchObject({ method: "GET", credentials: "include" });
  });

  it("401 renova a sessão UMA vez e repete", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({}, 200))
      .mockResolvedValueOnce(json({ recommendations: [item()] }));
    const result = await getConsolidatedMaterialRecommendations();
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("K. erro HTTP vira mensagem amigável fixa, sem texto técnico do servidor", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "PrismaClientKnownRequestError: stack boom" }, 500));
    const result = await getConsolidatedMaterialRecommendations();
    expect(result).toEqual({ ok: false, reason: "error", message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE });
    expect(JSON.stringify(result)).not.toMatch(/Prisma|stack|boom/);
  });

  it("falha de rede e JSON ilegível viram erro amigável (nunca 'sem recomendações')", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await getConsolidatedMaterialRecommendations()).toMatchObject({ ok: false, message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    expect(await getConsolidatedMaterialRecommendations()).toMatchObject({ ok: false, message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE });
  });

  it("403 após a renovação é 'unauthorized' com a mesma mensagem amigável", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 403));
    expect(await getConsolidatedMaterialRecommendations()).toEqual({
      ok: false,
      reason: "unauthorized",
      message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE,
    });
  });

  it("resposta 200 sem o campo vira lista vazia segura", async () => {
    fetchMock.mockResolvedValueOnce(json({}));
    expect(await getConsolidatedMaterialRecommendations()).toEqual({ ok: true, data: [] });
  });
});
