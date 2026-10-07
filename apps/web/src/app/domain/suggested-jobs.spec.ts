import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUGGESTED_JOB_AREA,
  SUGGESTED_JOBS,
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

  it("não inventa dados ausentes (empresa do Analista de DP/RH e níveis não informados)", () => {
    const analyst = SUGGESTED_JOBS.find((job) => job.id === "rh-analista-dp-rh-175209");
    expect(analyst?.company).toBeUndefined();
    const academic = SUGGESTED_JOBS.find((job) => job.id === "sec-secretario-academico-174994");
    expect(academic?.level).toBeUndefined();
    const sicoob = SUGGESTED_JOBS.find((job) => job.id === "ti-desenvolvedor-aplicacoes-179347");
    expect(sicoob?.modality).toBeUndefined();
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
      "ti-desenvolvedor-aplicacoes-179347",
    ]);
  });
});
