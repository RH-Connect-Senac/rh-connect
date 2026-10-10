import { afterEach, describe, expect, it } from "vitest";
import { SUGGESTED_JOBS } from "../domain/suggested-jobs";
import {
  analyzeJobUrl,
  buildSuggestedJobFallbackContext,
  resolveJobContext,
  type JobInterviewContext,
} from "./interview-context-service";

const [adsJob, tiJob, rhJob] = SUGGESTED_JOBS;
const EXTERNAL_URL = "https://www.empregare.com/pt-br/vaga-qualquer-outra_999999";
const UNREADABLE =
  "Não foi possível ler os dados desta vaga. Verifique se o link ainda está disponível ou tente outra vaga.";

const realContext = (url: string): JobInterviewContext => ({
  sourceUrl: url,
  title: "Título da análise real",
  company: "Empresa real",
  summary: "Resumo real",
  requirements: ["Req real"],
});

describe("resolveJobContext (fallback das vagas sugeridas oficiais)", () => {
  it("a análise real é tentada primeiro e, se funciona, seus dados são os usados", async () => {
    const calls: string[] = [];
    const result = await resolveJobContext(tiJob.url, async (url) => {
      calls.push(url);
      return realContext(url);
    });
    expect(calls).toEqual([tiJob.url]);
    expect(result.title).toBe("Título da análise real");
  });

  it("vaga sugerida oficial + análise falhou => snapshot da PRÓPRIA vaga", async () => {
    const result = await resolveJobContext(tiJob.url, async () => {
      throw new Error("falhou");
    });
    expect(result.sourceUrl).toBe(tiJob.url);
    expect(result.title).toBe(tiJob.title);
    expect(result.company).toBe(tiJob.company);
    expect(result.location).toBe(tiJob.location);
    expect(result.workMode).toBe("ONSITE");
    expect(result.contractType).toBe("Efetivo – CLT");
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it("cada vaga oficial recebe o snapshot correspondente à sua URL (nunca o de outra)", async () => {
    for (const job of SUGGESTED_JOBS) {
      const result = await resolveJobContext(job.url, async () => {
        throw new Error("falhou");
      });
      expect(result.sourceUrl).toBe(job.url);
      expect(result.title).toBe(job.title);
    }
    const ads = buildSuggestedJobFallbackContext(adsJob.url)!;
    const rh = buildSuggestedJobFallbackContext(rhJob.url)!;
    expect(ads.title).not.toBe(rh.title);
    expect(ads.summary).not.toBe(rh.summary);
  });

  it("título ausente na resposta real também aciona o fallback (vaga encerrada)", async () => {
    const result = await resolveJobContext(rhJob.url, async () => {
      throw new Error("Não foi possível identificar o título da vaga informada.");
    });
    expect(result.title).toBe(rhJob.title);
  });

  it("URL externa que falha NÃO recebe fallback: o erro original é mantido", async () => {
    await expect(
      resolveJobContext(EXTERNAL_URL, async () => {
        throw new Error("erro original");
      }),
    ).rejects.toThrow("erro original");
  });

  it("URL de vaga oficial antiga/encerrada (fora do catálogo) não recebe fallback", async () => {
    expect(buildSuggestedJobFallbackContext("https://www.empregare.com/pt-br/vaga-estagiario-de-rh_174874")).toBeNull();
    expect(
      buildSuggestedJobFallbackContext("https://www.empregare.com/pt-br/vaga-analista-de-dp-rh-generalista-junior_175209"),
    ).toBeNull();
    await expect(
      resolveJobContext("https://www.empregare.com/pt-br/vaga-analista-de-dp-rh-generalista-junior_175209", async () => {
        throw new Error("erro original");
      }),
    ).rejects.toThrow("erro original");
  });

  it("a nova segunda vaga de RH usa só o próprio snapshot quando a análise real falha", async () => {
    const url = "https://www.empregare.com/pt-br/vaga-assistente-de-rh_168796";
    const result = await resolveJobContext(url, async () => {
      throw new Error("falhou");
    });
    expect(result.sourceUrl).toBe(url);
    expect(result.title).toBe("Assistente de RH");
    expect(result.company).toBe("Start People Consultoria de RH e Treinamentos");
    expect(result.location).toBe("Cachoeiro de Itapemirim/ES");
    expect(result.contractType).toBe("Efetivo – CLT");
    expect(result.workMode).toBe("ONSITE");
    expect(JSON.stringify(result)).not.toContain("Pontotel");
  });

  it("o fallback não é aplicado quando a análise real funciona, mesmo em URL oficial", async () => {
    const result = await resolveJobContext(adsJob.url, async (url) => realContext(url));
    expect(result.company).toBe("Empresa real");
  });
});

describe("analyzeJobUrl (requisição real + mensagem amigável)", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockFetch = (body: unknown, ok = true) => {
    const requests: { url: string; body: unknown }[] = [];
    globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
      requests.push({ url: String(input), body: init?.body ? JSON.parse(init.body) : undefined });
      return { ok, json: async () => body } as unknown as Response;
    }) as typeof fetch;
    return requests;
  };

  it("tenta o analisador real (POST job-context) antes de qualquer fallback", async () => {
    const requests = mockFetch({ title: "Título real", company: "Empresa real", summary: "r", requirements: ["x"] });
    const result = await analyzeJobUrl(tiJob.url);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("/interviews/ai/job-context");
    expect(result.title).toBe("Título real");
  });

  it("vaga oficial sem título na resposta => snapshot, em uma única requisição", async () => {
    const requests = mockFetch({ title: "" });
    const result = await analyzeJobUrl(tiJob.url);
    expect(requests).toHaveLength(1);
    expect(result.title).toBe(tiJob.title);
  });

  it("URL externa sem título => erro amigável, sem dados locais", async () => {
    mockFetch({ title: "" });
    await expect(analyzeJobUrl(EXTERNAL_URL)).rejects.toThrow(UNREADABLE);
  });

  it("URL inválida mantém a validação anterior e não faz requisição", async () => {
    const requests = mockFetch({ title: "x" });
    await expect(analyzeJobUrl("texto qualquer")).rejects.toThrow("Informe uma URL valida da vaga para analisar o contexto.");
    expect(requests).toHaveLength(0);
  });
});
