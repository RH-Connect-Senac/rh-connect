import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUGGESTED_JOB_AREA,
  SUGGESTED_JOBS,
  SUGGESTED_JOB_SNAPSHOTS,
  findSuggestedJobByUrl,
  getSuggestedJobSnapshot,
  SUGGESTED_JOB_AREAS,
  getSuggestedJobsByArea,
} from "./suggested-jobs";

describe("SUGGESTED_JOBS", () => {
  it("tem exatamente 6 vagas", () => {
    expect(SUGGESTED_JOBS).toHaveLength(6);
  });

  it("tem exatamente 2 vagas por área, nas 3 áreas esperadas", () => {
    expect(SUGGESTED_JOB_AREAS.map((area) => area.label)).toEqual([
      "Tecnologia",
      "Recursos Humanos",
      "Secretariado",
    ]);
    for (const area of SUGGESTED_JOB_AREAS) {
      expect(SUGGESTED_JOBS.filter((job) => job.area === area.id)).toHaveLength(2);
    }
  });

  it("ids são únicos", () => {
    expect(new Set(SUGGESTED_JOBS.map((job) => job.id)).size).toBe(SUGGESTED_JOBS.length);
  });

  it("URLs são HTTPS e do domínio da Empregare", () => {
    for (const job of SUGGESTED_JOBS) {
      const url = new URL(job.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname === "empregare.com" || url.hostname.endsWith(".empregare.com")).toBe(true);
    }
  });

  it("não há URLs duplicadas", () => {
    expect(new Set(SUGGESTED_JOBS.map((job) => job.url)).size).toBe(SUGGESTED_JOBS.length);
  });

  it("campos obrigatórios preenchidos; opcionais ausentes nunca vazios", () => {
    for (const job of SUGGESTED_JOBS) {
      expect(job.title.trim()).not.toBe("");
      expect(job.location.trim()).not.toBe("");
      for (const optional of [job.company, job.level, job.modality]) {
        if (optional !== undefined) expect(optional.trim()).not.toBe("");
      }
    }
  });

  it("não inventa dados ausentes (nível do card de ADS e modalidade não informados)", () => {
    const secretary = SUGGESTED_JOBS.find((job) => job.id === "sec-secretaria-comercial-178376");
    expect(secretary?.title).toBe("Secretária Comercial - Três Lagoas MS");
    expect(secretary?.url).toBe("https://www.empregare.com/pt-br/vaga-secretaria-comercial-tres-lagoas-ms_178376");
    expect(secretary?.company).toBe("A KARINI P DE SENA RIBEIRO, CONSULTORIA EMPRESARIAL");
    expect(secretary?.location).toBe("Três Lagoas/MS");
    expect(secretary?.modality).toBe("Híbrido");
    expect(secretary?.level).toBe("Profissional");
    const ads = SUGGESTED_JOBS.find((job) => job.id === "ti-estagio-ads-181565");
    expect(ads?.modality).toBeUndefined();
  });

  it("não expõe salário", () => {
    for (const job of SUGGESTED_JOBS) {
      expect(Object.keys(job).some((key) => /sal[aá]rio|salary/i.test(key))).toBe(false);
    }
  });
});

describe("getSuggestedJobsByArea", () => {
  it("devolve apenas as 2 vagas da área escolhida", () => {
    for (const area of SUGGESTED_JOB_AREAS) {
      const jobs = getSuggestedJobsByArea(area.id);
      expect(jobs).toHaveLength(2);
      expect(jobs.every((job) => job.area === area.id)).toBe(true);
    }
  });

  it("a área inicial é Tecnologia", () => {
    expect(DEFAULT_SUGGESTED_JOB_AREA).toBe("TECNOLOGIA");
    expect(getSuggestedJobsByArea(DEFAULT_SUGGESTED_JOB_AREA).map((job) => job.id)).toEqual([
      "ti-estagio-ads-181565",
      "ti-assistente-ti-suporte-180562",
    ]);
  });
});

describe("segundo card de Secretariado", () => {
  it("é a Secretária Comercial e não guarda dados das vagas anteriores", () => {
    const second = getSuggestedJobsByArea("SECRETARIADO")[1];
    expect(second.url).toBe("https://www.empregare.com/pt-br/vaga-secretaria-comercial-tres-lagoas-ms_178376");
    const serialized = JSON.stringify(SUGGESTED_JOBS);
    for (const old of ["183961", "VTC LOG", "Assistente de Secretariado", "174994", "INSTITUTO MIDORI"]) {
      expect(serialized).not.toContain(old);
    }
    // O primeiro card de Secretariado continua o mesmo.
    expect(getSuggestedJobsByArea("SECRETARIADO")[0].id).toBe("sec-estagio-secretariado-182983");
  });
});

describe("vaga de RH e segunda vaga de Tecnologia atualizadas", () => {
  const serialized = () => JSON.stringify([SUGGESTED_JOBS, SUGGESTED_JOB_SNAPSHOTS]);

  it("RH: nova vaga com dados confirmados na página; a outra vaga de RH não muda", () => {
    const [first, second] = getSuggestedJobsByArea("RECURSOS_HUMANOS");
    expect(first).toEqual({
      id: "rh-estagio-rh-rands-177210",
      area: "RECURSOS_HUMANOS",
      title: "Estagio em Recursos Humanos (R&S)",
      company: "Clima Gestão",
      level: "Estágio",
      modality: "Híbrido",
      location: "Brasília/DF",
      url: "https://www.empregare.com/pt-br/vaga-estagio-em-recursos-humanos-rands_177210",
    });
    expect(second).toEqual({
      id: "rh-assistente-rh-168796",
      area: "RECURSOS_HUMANOS",
      title: "Assistente de RH",
      company: "Start People Consultoria de RH e Treinamentos",
      level: "Profissional",
      modality: "Presencial",
      location: "Cachoeiro de Itapemirim/ES",
      url: "https://www.empregare.com/pt-br/vaga-assistente-de-rh_168796",
    });
  });

  it("RH: a antiga segunda vaga (Analista de DP/RH) saiu do catálogo e dos snapshots", () => {
    for (const old of ["175209", "analista-dp-rh", "Analista de DP/RH", "Pontotel", "Domínio"]) {
      expect(serialized()).not.toContain(old);
    }
    expect(findSuggestedJobByUrl("https://www.empregare.com/pt-br/vaga-analista-de-dp-rh-generalista-junior_175209")).toBeNull();
  });

  it("RH: nada da vaga encerrada permanece", () => {
    for (const old of ["174874", "MACAW", "Lago Sul", "Estagiário de RH", "vaga-estagiario-de-rh"]) {
      expect(serialized()).not.toContain(old);
    }
  });

  it("Tecnologia: a segunda vaga é a nova; a primeira não muda", () => {
    const [first, second] = getSuggestedJobsByArea("TECNOLOGIA");
    expect(first.id).toBe("ti-estagio-ads-181565");
    expect(second).toEqual({
      id: "ti-assistente-ti-suporte-180562",
      area: "TECNOLOGIA",
      title: "Assistente de TI – Suporte Técnico e Infraestrutura - TI",
      company: "SICOOB CREDIACIL",
      level: "Operacional",
      modality: "Presencial",
      location: "Leme/SP",
      url: "https://www.empregare.com/pt-br/vaga-assistente-de-ti-suporte-tecnico-e-infra_180562",
    });
  });

  it("Tecnologia: nada da antiga segunda vaga permanece", () => {
    for (const old of ["179347", "CENTRO COOPERATIVO SICOOB", "Desenvolvedor de Aplicações", "Sistemas de Crédito"]) {
      expect(serialized()).not.toContain(old);
    }
  });
});

describe("snapshots das vagas sugeridas oficiais", () => {
  // Limites físicos do Back para o contexto da vaga (JOB_LIMITS).
  const LIMITS = { title: 80, company: 80, summary: 800, location: 60, contractType: 40, listItem: 1000, listMax: 50 };

  it("há exatamente um snapshot por vaga, com o mesmo id e a mesma URL do card", () => {
    expect(SUGGESTED_JOB_SNAPSHOTS).toHaveLength(SUGGESTED_JOBS.length);
    for (const job of SUGGESTED_JOBS) {
      const snapshot = getSuggestedJobSnapshot(job);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.id).toBe(job.id);
      expect(snapshot?.url).toBe(job.url);
    }
    expect(new Set(SUGGESTED_JOB_SNAPSHOTS.map((s) => s.id)).size).toBe(SUGGESTED_JOB_SNAPSHOTS.length);
  });

  it("uma vaga não recebe o snapshot de outra (id e URL precisam bater)", () => {
    const [a, b] = SUGGESTED_JOBS;
    expect(getSuggestedJobSnapshot({ ...a, url: b.url })).toBeNull();
    expect(getSuggestedJobSnapshot({ ...a, id: b.id })).toBeNull();
    expect(getSuggestedJobSnapshot(a)?.url).toBe(a.url);
  });

  it("cabem nos limites do Back (nunca seriam cortados nem dariam 400)", () => {
    for (const job of SUGGESTED_JOBS) {
      const snapshot = getSuggestedJobSnapshot(job)!;
      expect(job.title.length).toBeLessThanOrEqual(LIMITS.title);
      expect((job.company ?? "").length).toBeLessThanOrEqual(LIMITS.company);
      expect(job.location.length).toBeLessThanOrEqual(LIMITS.location);
      expect(snapshot.summary.length).toBeLessThanOrEqual(LIMITS.summary);
      expect(snapshot.contractType.length).toBeLessThanOrEqual(LIMITS.contractType);
      for (const list of [snapshot.activities, snapshot.requirements]) {
        expect(list.length).toBeLessThanOrEqual(LIMITS.listMax);
        for (const item of list) expect(item.length).toBeLessThanOrEqual(LIMITS.listItem);
      }
      expect(snapshot.summary.trim()).not.toBe("");
      expect(snapshot.requirements.length).toBeGreaterThan(0);
    }
  });

  it("não guardam salário", () => {
    expect(JSON.stringify(SUGGESTED_JOB_SNAPSHOTS)).not.toMatch(/R\$|sal[aá]rio|bolsa/i);
  });
});

describe("findSuggestedJobByUrl", () => {
  it("reconhece exatamente a URL de cada vaga oficial (com/sem barra final, www, query ou hash)", () => {
    for (const job of SUGGESTED_JOBS) {
      expect(findSuggestedJobByUrl(job.url)?.id).toBe(job.id);
      expect(findSuggestedJobByUrl(`  ${job.url}/  `)?.id).toBe(job.id);
      expect(findSuggestedJobByUrl(`${job.url}?utm_source=x#topo`)?.id).toBe(job.id);
      expect(findSuggestedJobByUrl(job.url.replace("www.", ""))?.id).toBe(job.id);
    }
  });

  it("URL externa, de outra vaga da Empregare, ou inválida não corresponde a nenhuma", () => {
    expect(findSuggestedJobByUrl("https://www.empregare.com/pt-br/vaga-qualquer-outra_999999")).toBeNull();
    expect(findSuggestedJobByUrl("https://www.empregare.com/pt-br/vaga-estagiario-de-rh_174874")).toBeNull();
    expect(findSuggestedJobByUrl("https://www.empregare.com/pt-br/vaga-analista-de-dp-rh-generalista-junior_175209")).toBeNull();
    expect(findSuggestedJobByUrl("https://outro-site.com/pt-br/vaga-assistente-de-ti-suporte-tecnico-e-infra_180562")).toBeNull();
    expect(findSuggestedJobByUrl("não é url")).toBeNull();
    expect(findSuggestedJobByUrl("")).toBeNull();
  });
});
