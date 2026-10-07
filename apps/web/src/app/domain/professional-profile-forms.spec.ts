import { describe, expect, it } from "vitest";
import {
  EMPTY_COURSE_FORM,
  EMPTY_EDUCATION_FORM,
  EMPTY_EXPERIENCE_FORM,
  validateCourseForm,
  validateEducationForm,
  validateExperienceForm,
  validateSkillName,
} from "./professional-profile-forms";

const NOW = new Date(2026, 9, 6); // outubro/2026

describe("validateEducationForm", () => {
  const valid = {
    academicLevel: "TECNOLOGO" as const,
    status: "CONCLUIDO" as const,
    degree: "  Análise e Desenvolvimento de Sistemas ",
    educationInstitution: "Senac",
    startDate: "02/2020",
    endDate: "12/2023",
  };

  it("monta o payload no contrato da API (AAAA-MM, texto aparado)", () => {
    expect(validateEducationForm(valid, NOW)).toEqual({
      ok: true,
      payload: {
        degree: "Análise e Desenvolvimento de Sistemas",
        educationInstitution: "Senac",
        academicLevel: "TECNOLOGO",
        status: "CONCLUIDO",
        startDate: "2020-02",
        endDate: "2023-12",
      },
    });
  });

  it("formulário vazio não pode ser salvo (nível, situação, instituição e início)", () => {
    const result = validateEducationForm(EMPTY_EDUCATION_FORM, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["academicLevel", "educationInstitution", "startDate", "status"].sort(),
      );
    }
  });

  it("instituição e início são sempre obrigatórios", () => {
    expect(validateEducationForm({ ...valid, educationInstitution: "  " }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, startDate: "" }, NOW).ok).toBe(false);
  });

  it("curso é obrigatório, exceto em ensino fundamental e médio", () => {
    for (const level of ["TECNICO", "TECNOLOGO", "GRADUACAO", "POS_GRADUACAO", "MESTRADO", "DOUTORADO"] as const) {
      const result = validateEducationForm({ ...valid, academicLevel: level, degree: "  " }, NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(Object.keys(result.errors)).toEqual(["degree"]);
    }
    for (const level of ["ENSINO_FUNDAMENTAL", "ENSINO_MEDIO"] as const) {
      const result = validateEducationForm({ ...valid, academicLevel: level, degree: "   " }, NOW);
      expect(result.ok && result.payload.degree).toBeNull();
      expect(validateEducationForm({ ...valid, academicLevel: level }, NOW).ok).toBe(true);
    }
  });

  it("conclusão é obrigatória quando concluído", () => {
    const result = validateEducationForm({ ...valid, endDate: "" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(["endDate"]);
  });

  it("em andamento: previsão de conclusão é opcional e pode ser futura", () => {
    const empty = validateEducationForm({ ...valid, status: "EM_ANDAMENTO", endDate: "" }, NOW);
    expect(empty.ok && empty.payload.endDate).toBeNull();
    const future = validateEducationForm({ ...valid, status: "EM_ANDAMENTO", startDate: "02/2025", endDate: "12/2030" }, NOW);
    expect(future.ok && future.payload.endDate).toBe("2030-12");
  });

  it("em andamento: previsão não pode ser anterior ao início", () => {
    expect(validateEducationForm({ ...valid, status: "EM_ANDAMENTO", startDate: "06/2025", endDate: "05/2025" }, NOW).ok).toBe(false);
  });

  it("concluído com data futura é rejeitado", () => {
    expect(validateEducationForm({ ...valid, status: "CONCLUIDO", endDate: "12/2030" }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, status: "CONCLUIDO", endDate: "10/2026" }, NOW).ok).toBe(true);
  });

  it("trancado e interrompido aceitam conclusão opcional", () => {
    expect(validateEducationForm({ ...valid, status: "TRANCADO", endDate: "" }, NOW).ok).toBe(true);
    expect(validateEducationForm({ ...valid, status: "INTERROMPIDO", endDate: "12/2022" }, NOW).ok).toBe(true);
    expect(validateEducationForm({ ...valid, status: "TRANCADO", endDate: "12/2030" }, NOW).ok).toBe(false);
  });

  it("rejeita início futuro, conclusão antes do início, conclusão futura e formato inválido", () => {
    expect(validateEducationForm({ ...valid, startDate: "01/2027" }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, endDate: "01/2020" }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, endDate: "12/2028" }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, startDate: "2020-02" }, NOW).ok).toBe(false);
  });

  it("respeita o limite de 80 caracteres", () => {
    expect(validateEducationForm({ ...valid, degree: "x".repeat(80) }, NOW).ok).toBe(true);
    expect(validateEducationForm({ ...valid, degree: "x".repeat(81) }, NOW).ok).toBe(false);
    expect(validateEducationForm({ ...valid, educationInstitution: "x".repeat(81) }, NOW).ok).toBe(false);
  });
});

describe("validateCourseForm", () => {
  const base = { ...EMPTY_COURSE_FORM, courseName: "Node.js" };

  it("nome e situação são obrigatórios", () => {
    expect(validateCourseForm(EMPTY_COURSE_FORM, NOW).ok).toBe(false);
    const noStatus = validateCourseForm(base, NOW);
    expect(noStatus.ok).toBe(false);
    if (!noStatus.ok) expect(Object.keys(noStatus.errors)).toEqual(["status"]);
  });

  it("curso em andamento: data opcional", () => {
    expect(validateCourseForm({ ...base, status: "EM_ANDAMENTO" }, NOW)).toEqual({
      ok: true,
      payload: { courseName: "Node.js", courseInstitution: null, workloadHours: null, status: "EM_ANDAMENTO", startDate: null, completedAt: null },
    });
  });

  it("curso em andamento: previsão futura é permitida", () => {
    const result = validateCourseForm({ ...base, status: "EM_ANDAMENTO", completedAt: "12/2030" }, NOW);
    expect(result.ok && result.payload.completedAt).toBe("2030-12");
  });

  it("curso concluído exige data de conclusão não futura", () => {
    const missing = validateCourseForm({ ...base, status: "CONCLUIDO" }, NOW);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(Object.keys(missing.errors)).toEqual(["completedAt"]);
    expect(validateCourseForm({ ...base, status: "CONCLUIDO", completedAt: "12/2030" }, NOW).ok).toBe(false);
    const ok = validateCourseForm({ ...base, status: "CONCLUIDO", completedAt: "06/2025" }, NOW);
    expect(ok.ok && ok.payload).toMatchObject({ status: "CONCLUIDO", startDate: null, completedAt: "2025-06" });
  });

  it("curso em andamento sem início e com início (MM/AAAA -> AAAA-MM)", () => {
    const noStart = validateCourseForm({ ...base, status: "EM_ANDAMENTO", startDate: "" }, NOW);
    expect(noStart.ok && noStart.payload.startDate).toBeNull();
    const withStart = validateCourseForm({ ...base, status: "EM_ANDAMENTO", startDate: "02/2025" }, NOW);
    expect(withStart.ok && withStart.payload).toMatchObject({ startDate: "2025-02", completedAt: null });
  });

  it("curso em andamento com início e previsão futura", () => {
    const result = validateCourseForm({ ...base, status: "EM_ANDAMENTO", startDate: "02/2025", completedAt: "12/2026" }, NOW);
    expect(result.ok && result.payload).toMatchObject({ startDate: "2025-02", completedAt: "2026-12" });
  });

  it("previsão ou conclusão anterior ao início é rejeitada", () => {
    for (const status of ["EM_ANDAMENTO", "CONCLUIDO"] as const) {
      const result = validateCourseForm({ ...base, status, startDate: "02/2025", completedAt: "01/2025" }, NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(Object.keys(result.errors)).toEqual(["completedAt"]);
    }
  });

  it("início omitido ou vazio é válido quando o curso não exige início", () => {
    const omitted = { courseName: "Node.js", status: "CONCLUIDO" as const, completedAt: "06/2025" };
    const resultOmitted = validateCourseForm(omitted, NOW);
    expect(resultOmitted.ok && resultOmitted.payload).toMatchObject({ startDate: null, completedAt: "2025-06" });
    const resultEmpty = validateCourseForm({ ...omitted, startDate: "" }, NOW);
    expect(resultEmpty.ok && resultEmpty.payload).toMatchObject({ startDate: null, completedAt: "2025-06" });
    const inProgress = { courseName: "Node.js", status: "EM_ANDAMENTO" as const };
    expect(validateCourseForm(inProgress, NOW).ok).toBe(true);
    expect(validateCourseForm({ ...inProgress, startDate: "" }, NOW).ok).toBe(true);
    expect(validateCourseForm({ ...inProgress, startDate: undefined }, NOW).ok).toBe(true);
  });

  it("curso concluído com início e conclusão válidos; sem início continua válido", () => {
    const full = validateCourseForm({ ...base, status: "CONCLUIDO", startDate: "02/2023", completedAt: "02/2025" }, NOW);
    expect(full.ok && full.payload).toMatchObject({ startDate: "2023-02", completedAt: "2025-02" });
    const noStart = validateCourseForm({ ...base, status: "CONCLUIDO", completedAt: "02/2025" }, NOW);
    expect(noStart.ok && noStart.payload.startDate).toBeNull();
  });

  it("início com formato inválido é rejeitado", () => {
    const result = validateCourseForm({ ...base, status: "EM_ANDAMENTO", startDate: "2025-02" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(["startDate"]);
  });

  it("carga horária numérica e formato de data", () => {
    const result = validateCourseForm(
      { courseName: "Node.js", courseInstitution: "Alura", workloadHours: "40", status: "CONCLUIDO", completedAt: "06/2025" },
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      payload: { courseName: "Node.js", courseInstitution: "Alura", workloadHours: 40, status: "CONCLUIDO", startDate: null, completedAt: "2025-06" },
    });
    const emp = { ...base, status: "EM_ANDAMENTO" as const };
    expect(validateCourseForm({ ...emp, workloadHours: "4x" }, NOW).ok).toBe(false);
    expect(validateCourseForm({ ...emp, workloadHours: "0" }, NOW).ok).toBe(false);
    expect(validateCourseForm({ ...emp, workloadHours: "10001" }, NOW).ok).toBe(false);
    expect(validateCourseForm({ ...emp, completedAt: "2030-12" }, NOW).ok).toBe(false);
  });

  it("limites de 80 caracteres", () => {
    const emp = { ...base, status: "EM_ANDAMENTO" as const };
    expect(validateCourseForm({ ...emp, courseName: "x".repeat(81) }, NOW).ok).toBe(false);
    expect(validateCourseForm({ ...emp, courseInstitution: "x".repeat(81) }, NOW).ok).toBe(false);
  });
});

describe("validateExperienceForm", () => {
  const valid = {
    companyName: "Acme",
    jobRole: "Dev",
    startDate: "01/2022",
    endDate: "06/2023",
    isCurrent: false,
    description: "  Desenvolvimento  ",
  };

  it("experiência encerrada: payload com término", () => {
    expect(validateExperienceForm(valid, NOW)).toEqual({
      ok: true,
      payload: {
        companyName: "Acme",
        jobRole: "Dev",
        startDate: "2022-01",
        endDate: "2023-06",
        isCurrent: false,
        description: "Desenvolvimento",
      },
    });
  });

  it("trabalha atualmente: fim é ignorado/vazio no envio", () => {
    const result = validateExperienceForm({ ...valid, isCurrent: true, endDate: "06/2023" }, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.endDate).toBeNull();
  });

  it("empresa, cargo e início obrigatórios; fim obrigatório se não trabalha atualmente", () => {
    const result = validateExperienceForm(EMPTY_EXPERIENCE_FORM, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["companyName", "endDate", "jobRole", "startDate"]);
    }
    expect(validateExperienceForm({ ...valid, endDate: "" }, NOW).ok).toBe(false);
    const current = validateExperienceForm({ ...valid, isCurrent: true, endDate: "" }, NOW);
    expect(current.ok && current.payload.endDate).toBeNull();
  });

  it("rejeita término antes do início, datas futuras e limites excedidos", () => {
    expect(validateExperienceForm({ ...valid, endDate: "12/2021" }, NOW).ok).toBe(false);
    expect(validateExperienceForm({ ...valid, startDate: "01/2027", isCurrent: true }, NOW).ok).toBe(false);
    expect(validateExperienceForm({ ...valid, companyName: "x".repeat(81) }, NOW).ok).toBe(false);
    expect(validateExperienceForm({ ...valid, jobRole: "x".repeat(61) }, NOW).ok).toBe(false);
    expect(validateExperienceForm({ ...valid, description: "x".repeat(801) }, NOW).ok).toBe(false);
    expect(validateExperienceForm({ ...valid, description: "x".repeat(800) }, NOW).ok).toBe(true);
  });
});

describe("validateSkillName", () => {
  it("aceita até 60 caracteres e normaliza espaços", () => {
    expect(validateSkillName("  Node   JS ")).toEqual({ ok: true, name: "Node JS" });
    expect(validateSkillName("x".repeat(60)).ok).toBe(true);
  });

  it("rejeita vazio e acima de 60", () => {
    expect(validateSkillName("   ").ok).toBe(false);
    expect(validateSkillName("x".repeat(61)).ok).toBe(false);
  });
});

describe("datas antigas: só o piso técnico de 1900 bloqueia (now fixo = 10/2026)", () => {
  const OLD_MSG = "A data não pode ser anterior a 01/1900.";
  const FORMAT_MSG = "Use o formato MM/AAAA.";
  const VALID_OLD = ["10/1956", "09/1956", "01/1950", "01/1900"];

  const education = {
    academicLevel: "TECNOLOGO" as const,
    status: "CONCLUIDO" as const,
    degree: "ADS",
    educationInstitution: "Senac",
    startDate: "10/1956",
    endDate: "12/2023",
  };
  const experience = {
    companyName: "Acme",
    jobRole: "Dev",
    startDate: "10/1956",
    endDate: "06/2023",
    isCurrent: false,
    description: "",
  };
  const course = { ...EMPTY_COURSE_FORM, courseName: "Node.js", status: "CONCLUIDO" as const };

  const errorsOf = (r: { ok: boolean; errors?: Record<string, string | undefined> }) => (r.ok ? {} : r.errors ?? {});

  it.each(VALID_OLD)("formação com início %s é válida e o payload é o mesmo de sempre", (startDate) => {
    const [month, year] = startDate.split("/");
    const result = validateEducationForm({ ...education, startDate }, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.startDate).toBe(`${year}-${month}`);
  });

  it.each(VALID_OLD)("experiência com início %s é válida (encerrada e atual)", (startDate) => {
    expect(validateExperienceForm({ ...experience, startDate }, NOW).ok).toBe(true);
    expect(validateExperienceForm({ ...experience, startDate, isCurrent: true, endDate: "" }, NOW).ok).toBe(true);
  });

  it.each(VALID_OLD)("curso com início %s e conclusão posterior é válido", (startDate) => {
    expect(validateCourseForm({ ...course, startDate, completedAt: "10/2000" }, NOW).ok).toBe(true);
  });

  it.each(VALID_OLD)("curso sem início com conclusão %s é válido (antiguidade é só aviso)", (completedAt) => {
    expect(validateCourseForm({ ...course, completedAt }, NOW).ok).toBe(true);
  });

  it("curso em andamento sem início com previsão antiga é válido", () => {
    expect(validateCourseForm({ ...course, status: "EM_ANDAMENTO", completedAt: "01/1900" }, NOW).ok).toBe(true);
  });

  it("12/1899 e 01/1800 continuam inválidos, com mensagem de data antiga (não de formato)", () => {
    expect(errorsOf(validateEducationForm({ ...education, startDate: "12/1899" }, NOW)).startDate).toBe(OLD_MSG);
    expect(errorsOf(validateEducationForm({ ...education, startDate: "01/1800" }, NOW)).startDate).toBe(OLD_MSG);
    expect(errorsOf(validateExperienceForm({ ...experience, startDate: "12/1899" }, NOW)).startDate).toBe(OLD_MSG);
    expect(errorsOf(validateCourseForm({ ...course, startDate: "12/1899", completedAt: "10/2000" }, NOW)).startDate).toBe(OLD_MSG);
    expect(errorsOf(validateCourseForm({ ...course, completedAt: "12/1899" }, NOW)).completedAt).toBe(OLD_MSG);
  });

  it("formato inválido continua com a mensagem de formato", () => {
    expect(errorsOf(validateEducationForm({ ...education, startDate: "1956" }, NOW)).startDate).toBe(FORMAT_MSG);
    expect(errorsOf(validateEducationForm({ ...education, startDate: "13/1980" }, NOW)).startDate).toBe(FORMAT_MSG);
  });

  it("cronologia e status continuam bloqueando", () => {
    expect(errorsOf(validateCourseForm({ ...course, startDate: "10/1960", completedAt: "10/1959" }, NOW)).completedAt).toBe(
      "A conclusão não pode ser anterior ao início.",
    );
    expect(errorsOf(validateEducationForm({ ...education, endDate: "" }, NOW)).endDate).toBeTruthy();
    expect(errorsOf(validateExperienceForm({ ...experience, endDate: "" }, NOW)).endDate).toBeTruthy();
    expect(errorsOf(validateEducationForm({ ...education, startDate: "10/2027" }, NOW)).startDate).toBe("A data não pode ser futura.");
  });
});
