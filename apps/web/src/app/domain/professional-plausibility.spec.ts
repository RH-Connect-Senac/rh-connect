import { describe, expect, it } from "vitest";
import {
  COURSE_DURATION_WARNING,
  EDUCATION_DURATION_WARNING,
  EXPERIENCE_DURATION_WARNING,
  COURSE_ANTIQUITY_WARNING,
  EDUCATION_ANTIQUITY_WARNING,
  EXPERIENCE_ANTIQUITY_WARNING,
  antiquityCutoffMonth,
  getCourseWarnings,
  getEducationWarnings,
  getExperienceWarnings,
  monthsBetween,
} from "./professional-plausibility";
import {
  EMPTY_COURSE_FORM,
  validateCourseForm,
  validateEducationForm,
  validateExperienceForm,
} from "./professional-profile-forms";

const NOW = new Date(2026, 9, 6); // outubro/2026 (fixo: não depende do mês de execução)

describe("monthsBetween", () => {
  it("diferença em meses entre AAAA-MM", () => {
    expect(monthsBetween("2010-10", "2025-10")).toBe(180);
    expect(monthsBetween("2010-10", "2025-11")).toBe(181);
    expect(monthsBetween("2025-12", "2026-01")).toBe(1);
    expect(monthsBetween("2026-01", "2025-12")).toBe(-1);
  });
});

describe("getEducationWarnings (> 15 anos)", () => {
  const base = {
    academicLevel: "TECNOLOGO" as const,
    status: "CONCLUIDO" as const,
    degree: "Análise e Desenvolvimento de Sistemas",
    educationInstitution: "Senac",
    startDate: "10/2010",
    endDate: "10/2025",
  };

  it("exatamente 15 anos não avisa; 15 anos + 1 mês avisa", () => {
    expect(getEducationWarnings(base, NOW)).toEqual({});
    expect(getEducationWarnings({ ...base, endDate: "11/2025" }, NOW)).toEqual({ endDate: EDUCATION_DURATION_WARNING });
  });

  it("exemplo: 10/1956 -> previsão 12/2026 (em andamento) avisa e continua salvável", () => {
    const form = { ...base, status: "EM_ANDAMENTO" as const, startDate: "10/1956", endDate: "12/2026" };
    expect(getEducationWarnings(form, NOW)).toEqual({ endDate: EDUCATION_DURATION_WARNING });
    expect(validateEducationForm(form, NOW).ok).toBe(true);
  });

  it("em andamento sem previsão compara o início com o mês atual", () => {
    const open = { ...base, status: "EM_ANDAMENTO" as const, endDate: "" };
    expect(getEducationWarnings({ ...open, startDate: "10/2011" }, NOW)).toEqual({}); // exatamente 15 anos
    expect(getEducationWarnings({ ...open, startDate: "09/2011" }, NOW)).toEqual({ endDate: EDUCATION_DURATION_WARNING });
  });

  it("datas que falham nas regras rígidas não geram warning", () => {
    expect(getEducationWarnings({ ...base, startDate: "12/1899", endDate: "10/2025" }, NOW)).toEqual({}); // abaixo do piso técnico
    expect(getEducationWarnings({ ...base, startDate: "01/1800" }, NOW)).toEqual({});
    expect(getEducationWarnings({ ...base, startDate: "10/2020", endDate: "10/2019" }, NOW)).toEqual({}); // fim antes do início
    expect(getEducationWarnings({ ...base, startDate: "10/1990", endDate: "12/2026" }, NOW)).toEqual({}); // concluído com conclusão futura
    expect(getEducationWarnings({ ...base, startDate: "1990" }, NOW)).toEqual({}); // formato
    expect(getEducationWarnings({ ...base, startDate: "", endDate: "10/2025" }, NOW)).toEqual({}); // início ausente
    expect(getEducationWarnings({ ...base, endDate: "" }, NOW)).toEqual({}); // concluído sem conclusão
  });

  it("o `now` fixo define o mês atual (03/2030)", () => {
    const later = new Date(2030, 2, 15);
    const open = { ...base, status: "EM_ANDAMENTO" as const, endDate: "" };
    expect(getEducationWarnings({ ...open, startDate: "03/2015" }, later)).toEqual({});
    expect(getEducationWarnings({ ...open, startDate: "02/2015" }, later)).toEqual({ endDate: EDUCATION_DURATION_WARNING });
  });
});

describe("getCourseWarnings (> 10 anos)", () => {
  const base = { ...EMPTY_COURSE_FORM, courseName: "Node.js", status: "CONCLUIDO" as const };

  it("exatamente 10 anos não avisa; 10 anos + 1 mês avisa", () => {
    expect(getCourseWarnings({ ...base, startDate: "10/2016", completedAt: "10/2026" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...base, startDate: "09/2016", completedAt: "10/2026" }, NOW)).toEqual({ completedAt: COURSE_DURATION_WARNING });
  });

  it("sem início não há duração: nunca avisa", () => {
    expect(getCourseWarnings({ ...base, completedAt: "10/1956" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...base, startDate: "", completedAt: "10/2025" }, NOW)).toEqual({});
    const open = { ...base, status: "EM_ANDAMENTO" as const };
    expect(getCourseWarnings({ ...open, completedAt: "12/2027" }, NOW)).toEqual({});
    expect(getCourseWarnings(open, NOW)).toEqual({});
  });

  it("em andamento sem previsão: início até o mês atual", () => {
    const open = { ...base, status: "EM_ANDAMENTO" as const, completedAt: "" };
    expect(getCourseWarnings({ ...open, startDate: "10/2016" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...open, startDate: "09/2016" }, NOW)).toEqual({ completedAt: COURSE_DURATION_WARNING });
  });

  it("em andamento com previsão futura: início até a previsão", () => {
    const open = { ...base, status: "EM_ANDAMENTO" as const };
    expect(getCourseWarnings({ ...open, startDate: "10/2020", completedAt: "10/2030" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...open, startDate: "10/2020", completedAt: "11/2030" }, NOW)).toEqual({ completedAt: COURSE_DURATION_WARNING });
  });

  it("datas que falham nas regras rígidas não geram warning", () => {
    expect(getCourseWarnings({ ...base, startDate: "12/1899", completedAt: "10/2025" }, NOW)).toEqual({}); // abaixo do piso técnico
    expect(getCourseWarnings({ ...base, completedAt: "12/1899" }, NOW)).toEqual({}); // sem início, abaixo do piso
    expect(getCourseWarnings({ ...base, startDate: "10/2020", completedAt: "10/2019" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...base, startDate: "10/2000", completedAt: "12/2026" }, NOW)).toEqual({}); // concluído futuro
    expect(getCourseWarnings({ ...base, startDate: "2000", completedAt: "10/2025" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...base, startDate: "10/2000", completedAt: "" }, NOW)).toEqual({}); // concluído sem conclusão
  });

  it("o warning não impede o salvamento", () => {
    const form = { ...base, startDate: "01/2000", completedAt: "10/2025" };
    expect(getCourseWarnings(form, NOW)).toEqual({ completedAt: COURSE_DURATION_WARNING });
    expect(validateCourseForm(form, NOW).ok).toBe(true);
  });
});

describe("getExperienceWarnings (> 50 anos)", () => {
  const base = {
    companyName: "Acme",
    jobRole: "Dev",
    startDate: "10/1976",
    endDate: "10/2026",
    isCurrent: false,
    description: "",
  };

  it("exatamente 50 anos não avisa; 50 anos + 1 mês avisa (no campo de fim)", () => {
    expect(getExperienceWarnings(base, NOW)).toEqual({});
    expect(getExperienceWarnings({ ...base, startDate: "09/1976" }, NOW)).toEqual({ endDate: EXPERIENCE_DURATION_WARNING });
  });

  it("trabalha atualmente: início até o mês atual, aviso no campo de início", () => {
    const current = { ...base, isCurrent: true, endDate: "" };
    expect(getExperienceWarnings(current, NOW)).toEqual({});
    expect(getExperienceWarnings({ ...current, startDate: "09/1976" }, NOW)).toEqual({ startDate: EXPERIENCE_DURATION_WARNING });
  });

  it("início no limite rígido de 70 anos avisa, mas continua salvável", () => {
    const form = { ...base, startDate: "10/1956" };
    expect(getExperienceWarnings(form, NOW)).toEqual({ endDate: EXPERIENCE_DURATION_WARNING });
    expect(validateExperienceForm(form, NOW).ok).toBe(true);
  });

  it("datas que falham nas regras rígidas não geram warning", () => {
    expect(getExperienceWarnings({ ...base, startDate: "12/1899" }, NOW)).toEqual({}); // abaixo do piso técnico
    expect(getExperienceWarnings({ ...base, isCurrent: true, endDate: "", startDate: "12/1899" }, NOW)).toEqual({});
    expect(getExperienceWarnings({ ...base, startDate: "10/2020", endDate: "10/2019" }, NOW)).toEqual({});
    expect(getExperienceWarnings({ ...base, endDate: "12/2026" }, NOW)).toEqual({}); // fim futuro
    expect(getExperienceWarnings({ ...base, endDate: "" }, NOW)).toEqual({}); // encerrada sem fim
    expect(getExperienceWarnings({ ...base, startDate: "1976" }, NOW)).toEqual({});
  });

  it("o `now` fixo define o mês atual (03/2030)", () => {
    const later = new Date(2030, 2, 15);
    const current = { ...base, isCurrent: true, endDate: "" };
    expect(getExperienceWarnings({ ...current, startDate: "03/1980" }, later)).toEqual({});
    expect(getExperienceWarnings({ ...current, startDate: "02/1980" }, later)).toEqual({ startDate: EXPERIENCE_DURATION_WARNING });
  });
});

describe("warnings não alteram validação nem payload", () => {
  it("payloads continuam sem qualquer campo de aviso", () => {
    const edu = validateEducationForm(
      { academicLevel: "TECNOLOGO", status: "EM_ANDAMENTO", degree: "ADS", educationInstitution: "Senac", startDate: "10/1956", endDate: "12/2026" },
      NOW,
    );
    expect(edu.ok).toBe(true);
    if (edu.ok) expect(Object.keys(edu.payload).sort()).toEqual(["academicLevel", "degree", "educationInstitution", "endDate", "startDate", "status"]);
  });
});

describe("antiguidade (> 70 anos em relação ao mês atual; now fixo = 10/2026)", () => {
  const edu = {
    academicLevel: "TECNOLOGO" as const,
    status: "CONCLUIDO" as const,
    degree: "ADS",
    educationInstitution: "Senac",
    startDate: "10/1956",
    endDate: "12/1960",
  };
  const exp = { companyName: "Acme", jobRole: "Dev", startDate: "10/1956", endDate: "12/1960", isCurrent: false, description: "" };
  const course = { ...EMPTY_COURSE_FORM, courseName: "Node.js", status: "CONCLUIDO" as const };

  it("o corte é móvel: mesmo mês, 70 anos atrás", () => {
    expect(antiquityCutoffMonth(new Date(2026, 9, 6))).toBe("1956-10");
    expect(antiquityCutoffMonth(new Date(2026, 0, 1))).toBe("1956-01");
    expect(antiquityCutoffMonth(new Date(2030, 2, 15))).toBe("1960-03");
    expect(antiquityCutoffMonth(new Date(2024, 1, 29))).toBe("1954-02");
  });

  it("10/1956 não tem aviso de antiguidade (exatamente 70 anos); 09/1956, 01/1950 e 01/1900 têm", () => {
    expect(getEducationWarnings(edu, NOW)).toEqual({});
    for (const startDate of ["09/1956", "01/1950", "01/1900"]) {
      expect(getEducationWarnings({ ...edu, startDate }, NOW)).toEqual({ startDate: EDUCATION_ANTIQUITY_WARNING });
      expect(getExperienceWarnings({ ...exp, startDate }, NOW)).toEqual({ startDate: EXPERIENCE_ANTIQUITY_WARNING });
      expect(getCourseWarnings({ ...course, startDate, completedAt: "12/1960" }, NOW)).toEqual({ startDate: COURSE_ANTIQUITY_WARNING });
    }
  });

  it("12/1899 é inválido (piso técnico): sem aviso, o erro rígido manda", () => {
    expect(getEducationWarnings({ ...edu, startDate: "12/1899" }, NOW)).toEqual({});
    expect(getExperienceWarnings({ ...exp, startDate: "12/1899" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...course, startDate: "12/1899", completedAt: "12/1960" }, NOW)).toEqual({});
  });

  it("os formulários com datas antigas continuam válidos (warning não bloqueia nem entra no payload)", () => {
    const form = { ...edu, startDate: "01/1950" };
    expect(getEducationWarnings(form, NOW)).toEqual({ startDate: EDUCATION_ANTIQUITY_WARNING });
    const result = validateEducationForm(form, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.payload).sort()).toEqual(["academicLevel", "degree", "educationInstitution", "endDate", "startDate", "status"]);
    expect(validateExperienceForm({ ...exp, startDate: "01/1950" }, NOW).ok).toBe(true);
    expect(validateCourseForm({ ...course, startDate: "01/1950", completedAt: "12/1960" }, NOW).ok).toBe(true);
  });

  it("curso sem início: conclusão/previsão antiga gera warning de antiguidade (no campo de conclusão), não erro", () => {
    expect(getCourseWarnings({ ...course, completedAt: "10/1956" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...course, completedAt: "09/1956" }, NOW)).toEqual({ completedAt: COURSE_ANTIQUITY_WARNING });
    expect(getCourseWarnings({ ...course, completedAt: "01/1900" }, NOW)).toEqual({ completedAt: COURSE_ANTIQUITY_WARNING });
    const open = { ...course, status: "EM_ANDAMENTO" as const, completedAt: "01/1950" };
    expect(getCourseWarnings(open, NOW)).toEqual({ completedAt: COURSE_ANTIQUITY_WARNING });
    expect(validateCourseForm(open, NOW).ok).toBe(true);
    expect(validateCourseForm({ ...course, completedAt: "09/1956" }, NOW).ok).toBe(true);
  });

  it("antiguidade e duração: um único aviso por registro, antiguidade vence", () => {
    // 09/1956 -> 12/2023: > 15 anos E antigo: só antiguidade (no início), sem aviso de duração no fim
    const w = getEducationWarnings({ ...edu, startDate: "09/1956", endDate: "12/2023" }, NOW);
    expect(w).toEqual({ startDate: EDUCATION_ANTIQUITY_WARNING });
    expect(w.endDate).toBeUndefined();
    // curso e experiência (inclusive atual, mesmo campo de início): uma só mensagem
    expect(getCourseWarnings({ ...course, startDate: "09/1956", completedAt: "12/2023" }, NOW)).toEqual({ startDate: COURSE_ANTIQUITY_WARNING });
    expect(getExperienceWarnings({ ...exp, startDate: "09/1956", endDate: "12/2023" }, NOW)).toEqual({ startDate: EXPERIENCE_ANTIQUITY_WARNING });
    expect(getExperienceWarnings({ ...exp, startDate: "09/1956", endDate: "", isCurrent: true }, NOW)).toEqual({ startDate: EXPERIENCE_ANTIQUITY_WARNING });
  });

  it("sem antiguidade, o aviso de duração continua funcionando", () => {
    expect(getEducationWarnings({ ...edu, startDate: "10/1956", endDate: "12/2023" }, NOW)).toEqual({ endDate: EDUCATION_DURATION_WARNING });
    expect(getCourseWarnings({ ...course, startDate: "10/1990", completedAt: "12/2023" }, NOW)).toEqual({ completedAt: COURSE_DURATION_WARNING });
    expect(getExperienceWarnings({ ...exp, startDate: "10/1956", endDate: "12/2023" }, NOW)).toEqual({ endDate: EXPERIENCE_DURATION_WARNING });
  });

  it("erro rígido vence o aviso (datas inválidas não geram warning)", () => {
    // concluída com conclusão antes do início, mesmo com início antigo
    expect(getEducationWarnings({ ...edu, startDate: "01/1950", endDate: "01/1949" }, NOW)).toEqual({});
    // concluída sem conclusão
    expect(getEducationWarnings({ ...edu, startDate: "01/1950", endDate: "" }, NOW)).toEqual({});
    // experiência encerrada sem fim
    expect(getExperienceWarnings({ ...exp, startDate: "01/1950", endDate: "" }, NOW)).toEqual({});
    // curso: conclusão antes do início e conclusão futura em concluído
    expect(getCourseWarnings({ ...course, startDate: "01/1950", completedAt: "01/1949" }, NOW)).toEqual({});
    expect(getCourseWarnings({ ...course, completedAt: "12/2027" }, NOW)).toEqual({});
    // formato inválido
    expect(getEducationWarnings({ ...edu, startDate: "1950" }, NOW)).toEqual({});
  });

  it("o corte acompanha o `now` (03/2030 -> corte 03/1960)", () => {
    const later = new Date(2030, 2, 15);
    expect(getEducationWarnings({ ...edu, startDate: "03/1960", endDate: "12/1962" }, later)).toEqual({});
    expect(getEducationWarnings({ ...edu, startDate: "02/1960", endDate: "12/1962" }, later)).toEqual({ startDate: EDUCATION_ANTIQUITY_WARNING });
  });
});
