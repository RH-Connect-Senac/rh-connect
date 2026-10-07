import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./candidate-profile-service";

const profilePayload = {
  professionalTitle: "Dev",
  professionalArea: "information-technology",
  professionalSubarea: "frontend-development",
  desiredPosition: "Dev React",
  professionalLevel: "JUNIOR",
  contractType: "CLT",
  professionalSummary: "Resumo",
  educations: [
    { id: 1, degree: "ADS", educationInstitution: "Senac", academicLevel: "TECNOLOGO", status: "CONCLUIDO", startDate: "2020-02", endDate: "2023-12" },
  ],
  courses: [{ id: 2, courseName: "Node", courseInstitution: null, workloadHours: 40, completedAt: null }],
  experiences: [],
  technicalSkills: [{ id: 3, name: "React" }],
  behavioralSkills: [{ id: 4, name: "Empatia" }],
  declarations: { noCourses: false, noExperience: true, noTechnicalSkills: false },
  isComplete: true,
  isInterviewReady: true,
  missingSections: [],
  missingObjectiveFields: [],
  updatedAt: "2026-10-06T12:00:00.000Z",
};

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("candidate-profile-service (API real)", () => {
  const fetchMock = vi.fn();
  const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    fetchMock.mockReset();
    Object.values(storage).forEach((fn) => fn.mockReset());
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /candidate/profile com cookies e parse do perfil", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, profilePayload));
    const result = await api.getCandidateProfile();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/candidate\/profile$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isComplete).toBe(true);
      expect(result.data.educations[0].startDate).toBe("2020-02");
      expect(result.data.technicalSkills).toEqual([{ id: 3, name: "React" }]);
      expect(result.data.declarations.noExperience).toBe(true);
    }
  });

  it("PATCH do objetivo envia JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, profilePayload));
    await api.updateCandidateObjective({ professionalTitle: "Dev", professionalArea: null });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ professionalTitle: "Dev", professionalArea: null });
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it.each([
    ["addEducation", () => api.addEducation({ degree: "a", educationInstitution: "b", academicLevel: "GRADUACAO", status: "EM_ANDAMENTO", startDate: "2024-01", endDate: null }), "POST", /\/educations$/],
    ["updateEducation", () => api.updateEducation(5, { degree: "a", educationInstitution: "b", academicLevel: "GRADUACAO", status: "EM_ANDAMENTO", startDate: "2024-01", endDate: null }), "PATCH", /\/educations\/5$/],
    ["removeEducation", () => api.removeEducation(5), "DELETE", /\/educations\/5$/],
    ["addCourse", () => api.addCourse({ courseName: "a", courseInstitution: null, workloadHours: null, completedAt: null }), "POST", /\/courses$/],
    ["updateCourse", () => api.updateCourse(6, { courseName: "a", courseInstitution: null, workloadHours: null, completedAt: null }), "PATCH", /\/courses\/6$/],
    ["removeCourse", () => api.removeCourse(6), "DELETE", /\/courses\/6$/],
    ["addExperience", () => api.addExperience({ companyName: "a", jobRole: "b", startDate: "2024-01", endDate: null, isCurrent: true, description: null }), "POST", /\/experiences$/],
    ["updateExperience", () => api.updateExperience(7, { companyName: "a", jobRole: "b", startDate: "2024-01", endDate: null, isCurrent: true, description: null }), "PATCH", /\/experiences\/7$/],
    ["removeExperience", () => api.removeExperience(7), "DELETE", /\/experiences\/7$/],
    ["addSkill", () => api.addSkill("TECHNICAL", "React"), "POST", /\/skills$/],
    ["removeSkill", () => api.removeSkill(8), "DELETE", /\/skills\/8$/],
    ["declareNone courses", () => api.declareNone("courses"), "PUT", /\/declarations\/courses$/],
    ["removeDeclaration courses", () => api.removeDeclaration("courses"), "DELETE", /\/declarations\/courses$/],
    ["declareNone experience", () => api.declareNone("experience"), "PUT", /\/declarations\/experience$/],
    ["removeDeclaration experience", () => api.removeDeclaration("experience"), "DELETE", /\/declarations\/experience$/],
    ["declareNone technicalSkills", () => api.declareNone("technicalSkills"), "PUT", /\/declarations\/technical-skills$/],
    ["removeDeclaration technicalSkills", () => api.removeDeclaration("technicalSkills"), "DELETE", /\/declarations\/technical-skills$/],
  ])("%s usa o endpoint correto", async (_name, call, method, pathPattern) => {
    fetchMock.mockResolvedValue(jsonResponse(200, profilePayload));
    const result = await call();
    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(pathPattern);
    expect(init.method).toBe(method);
  });

  it("addSkill envia type e name", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, profilePayload));
    await api.addSkill("BEHAVIORAL", "Empatia");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type: "BEHAVIORAL", name: "Empatia" });
  });

  it("400: devolve as mensagens da API", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: ["Campo A inválido.", "Campo B inválido."] }));
    const result = await api.addCourse({ courseName: "a", courseInstitution: null, workloadHours: null, completedAt: null });
    expect(result).toEqual({ ok: false, reason: "invalid", message: "Campo A inválido. Campo B inválido." });
  });

  it("409: devolve a mensagem de conflito", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { message: "Essa habilidade já foi adicionada." }));
    const result = await api.addSkill("TECHNICAL", "React");
    expect(result).toEqual({ ok: false, reason: "conflict", message: "Essa habilidade já foi adicionada." });
  });

  it("404: reason not_found", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Curso não encontrado." }));
    const result = await api.removeCourse(99);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("5xx: mensagem padrão, sem vazar detalhe", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "stack trace secreto" }));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).not.toContain("secreto");
    }
  });

  it("falha de rede: reason network", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network");
  });

  it("401 renova a sessão uma vez e repete a requisição", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(200)) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, profilePayload));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("401 sem refresh possível: sessão expirada", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unauthorized");
  });

  it("resposta malformada vira erro (não quebra a tela)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { foo: "bar" }));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(false);
  });

  it("perfil vazio de candidato novo é interpretado corretamente", async () => {
    const empty = {
      ...profilePayload,
      professionalTitle: null, professionalArea: null, professionalSubarea: null,
      desiredPosition: null, professionalLevel: null, contractType: null, professionalSummary: null,
      educations: [], courses: [], technicalSkills: [], behavioralSkills: [],
      declarations: { noCourses: false, noExperience: false, noTechnicalSkills: false },
      isComplete: false,
      isInterviewReady: false,
      missingSections: ["objective", "education", "courses", "experience", "technicalSkills", "behavioralSkills"],
      missingObjectiveFields: ["professionalTitle"],
    };
    fetchMock.mockResolvedValue(jsonResponse(200, empty));
    const result = await api.getCandidateProfile();
    expect(result.ok && result.data.missingSections).toHaveLength(6);
  });

  it("nunca lê nem grava localStorage", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, profilePayload));
    await api.getCandidateProfile();
    await api.addSkill("TECHNICAL", "React");
    await api.declareNone("courses");
    Object.values(storage).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it("isInterviewReady vem separado de isComplete (objetivo pronto, perfil incompleto)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...profilePayload,
        isComplete: false,
        isInterviewReady: true,
        missingSections: ["education", "behavioralSkills"],
        missingObjectiveFields: [],
      }),
    );
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isComplete).toBe(false);
      expect(result.data.isInterviewReady).toBe(true);
      expect(result.data.missingObjectiveFields).toEqual([]);
    }
  });

  it("payload sem isInterviewReady é inválido (contrato exige o campo)", async () => {
    const { isInterviewReady: _omitted, ...withoutFlag } = profilePayload;
    fetchMock.mockResolvedValue(jsonResponse(200, withoutFlag));
    const result = await api.getCandidateProfile();
    expect(result.ok).toBe(false);
  });
});
