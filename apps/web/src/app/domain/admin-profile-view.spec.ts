import { describe, expect, it } from "vitest";
import {
  ADMIN_NOT_INFORMED,
  ADMIN_PROFILE_DECLARATION_MESSAGES,
  ADMIN_PROFILE_EMPTY_MESSAGES,
  buildAdminProfileView,
} from "./admin-profile-view";
import type { ProfessionalProfile } from "./professional-profile";

function makeProfile(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    professionalTitle: null,
    professionalArea: null,
    professionalSubarea: null,
    desiredPosition: null,
    professionalLevel: null,
    contractType: null,
    professionalSummary: null,
    educations: [],
    courses: [],
    experiences: [],
    technicalSkills: [],
    behavioralSkills: [],
    declarations: { noCourses: false, noExperience: false, noTechnicalSkills: false },
    isComplete: false,
    isInterviewReady: false,
    missingSections: ["objective", "education"],
    missingObjectiveFields: [],
    updatedAt: "",
    ...overrides,
  } as ProfessionalProfile;
}

describe("buildAdminProfileView", () => {
  it("perfil vazio: 'Não informado' e mensagens reais de ausência de dados", () => {
    const view = buildAdminProfileView(makeProfile());

    expect(view.objective.every((item) => item.value === ADMIN_NOT_INFORMED)).toBe(true);
    expect(view.summary).toBe(ADMIN_NOT_INFORMED);
    expect(view.educationsEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.educations);
    expect(view.coursesEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.courses);
    expect(view.experiencesEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.experiences);
    expect(view.technicalSkillsEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.technicalSkills);
  });

  it("não exibe Localização (cidade/UF)", () => {
    const labels = buildAdminProfileView(makeProfile()).objective.map((item) => item.label);
    expect(labels).toEqual([
      "Área",
      "Subárea",
      "Cargo desejado",
      "Senioridade",
      "Tipo de contrato",
      "Título profissional",
    ]);
    expect(JSON.stringify(buildAdminProfileView(makeProfile()))).not.toMatch(/Localiza/);
  });

  it("usa os rótulos existentes para área, subárea, senioridade, contrato e formação", () => {
    const view = buildAdminProfileView(
      makeProfile({
        professionalTitle: "Dev",
        professionalArea: "information-technology",
        professionalSubarea: "frontend-development",
        desiredPosition: "Dev React",
        professionalLevel: "JUNIOR",
        contractType: "CLT",
        professionalSummary: "Resumo",
        educations: [
          { id: 1, degree: "ADS", educationInstitution: "Senac", academicLevel: "TECNOLOGO", status: "EM_ANDAMENTO", startDate: "2024-02", endDate: "2026-12" },
        ],
        isComplete: true,
        missingSections: [],
      }),
    );

    const byLabel = Object.fromEntries(view.objective.map((item) => [item.label, item.value]));
    expect(byLabel["Área"]).toBe("Tecnologia da Informação");
    expect(byLabel["Subárea"]).toBe("Desenvolvimento Front-end");
    expect(byLabel["Senioridade"]).toBe("Júnior");
    expect(byLabel["Tipo de contrato"]).toBe("CLT");
    expect(byLabel["Cargo desejado"]).toBe("Dev React");
    expect(byLabel["Título profissional"]).toBe("Dev");
    expect(view.educations[0].title).toBe("ADS");
    expect(view.educations[0].period).toBe("02/2024 · previsão 12/2026");
    expect(view.isComplete).toBe(true);
    expect(view.missingSectionLabels).toEqual([]);
  });

  it("cursos e experiências: período e carga horária formatados", () => {
    const view = buildAdminProfileView(
      makeProfile({
        courses: [
          { id: 2, courseName: "Node", courseInstitution: "Alura", workloadHours: 40, status: "CONCLUIDO", startDate: "2023-02", completedAt: "2023-05" },
        ],
        experiences: [
          { id: 3, companyName: "Acme", jobRole: "Dev", startDate: "2022-01", endDate: null, isCurrent: true, description: "Fez coisas" },
        ],
      }),
    );

    expect(view.courses[0]).toMatchObject({ title: "Node", subtitle: "Alura · 40h", period: "02/2023 – 05/2023" });
    expect(view.experiences[0]).toMatchObject({ title: "Dev · Acme", period: "01/2022 – Atual", description: "Fez coisas" });
    expect(view.coursesEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.courses);
  });

  it("declarações explícitas no lugar de 'Nenhum ... cadastrado'", () => {
    const view = buildAdminProfileView(
      makeProfile({ declarations: { noCourses: true, noExperience: true, noTechnicalSkills: true } }),
    );

    expect(view.coursesEmptyMessage).toBe("O candidato declarou não possuir cursos complementares.");
    expect(view.experiencesEmptyMessage).toBe(ADMIN_PROFILE_DECLARATION_MESSAGES.experiences);
    expect(view.technicalSkillsEmptyMessage).toBe(ADMIN_PROFILE_DECLARATION_MESSAGES.technicalSkills);
    expect(view.educationsEmptyMessage).toBe(ADMIN_PROFILE_EMPTY_MESSAGES.educations);
  });

  it("completude vem do Back: seções pendentes rotuladas, sem recalcular", () => {
    const view = buildAdminProfileView(makeProfile({ missingSections: ["objective", "behavioralSkills"] }));
    expect(view.isComplete).toBe(false);
    expect(view.missingSectionLabels).toEqual(["Objetivo profissional", "Competências comportamentais"]);
  });
});
