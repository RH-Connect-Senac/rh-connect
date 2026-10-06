import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminCandidateProfile } from "./admin-candidates-service";

const profilePayload = {
  professionalTitle: "Dev",
  professionalArea: "information-technology",
  professionalSubarea: "frontend-development",
  desiredPosition: "Dev React",
  professionalLevel: "JUNIOR",
  contractType: "CLT",
  professionalSummary: "Resumo",
  educations: [],
  courses: [],
  experiences: [],
  technicalSkills: [{ id: 3, name: "React" }],
  behavioralSkills: [],
  declarations: { noCourses: true, noExperience: false, noTechnicalSkills: false },
  isComplete: false,
  missingSections: ["education"],
  missingObjectiveFields: [],
  updatedAt: "2026-10-06T12:00:00.000Z",
};

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getAdminCandidateProfile", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama GET /admin/candidates/:id/profile (nunca /candidate/profile) com cookies", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, profilePayload));
    const result = await getAdminCandidateProfile("7");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/candidates\/7\/profile$/);
    expect(String(url)).not.toMatch(/\/candidate\/profile/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.technicalSkills).toEqual([{ id: 3, name: "React" }]);
      expect(result.data.declarations.noCourses).toBe(true);
      expect(result.data.missingSections).toEqual(["education"]);
    }
  });

  it("id não numérico vira not_found sem chamar a API", async () => {
    const result = await getAdminCandidateProfile("abc");
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 -> not_found", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "x" }));
    expect(await getAdminCandidateProfile("7")).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("403 -> forbidden", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "x" }));
    expect(await getAdminCandidateProfile("7")).toMatchObject({ ok: false, reason: "forbidden" });
  });

  it("401 tenta refresh uma vez e, se falhar, retorna unauthorized", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401));
    const result = await getAdminCandidateProfile("7");

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(result).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  it("401 com refresh ok repete a chamada", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, profilePayload));
    const result = await getAdminCandidateProfile("7");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
  });

  it("5xx -> error com mensagem do perfil", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));
    const result = await getAdminCandidateProfile("7");
    expect(result).toMatchObject({ ok: false, reason: "error" });
    if (!result.ok) expect(result.message).toMatch(/perfil profissional/i);
  });

  it("falha de rede -> error", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    const result = await getAdminCandidateProfile("7");
    expect(result).toMatchObject({ ok: false, reason: "error" });
    if (!result.ok) expect(result.message).toMatch(/conectar/i);
  });

  it("resposta fora do contrato -> error (sem usar formato antigo)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { areaId: "x", formations: [] }));
    expect(await getAdminCandidateProfile("7")).toMatchObject({ ok: false, reason: "error" });
  });
});
