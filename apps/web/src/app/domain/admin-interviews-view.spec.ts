import { describe, expect, it } from "vitest";
import type { AdminInterviewListItem } from "../services/admin-interviews-service";
import {
  adminInterviewEvaluatorName,
  adminInterviewReferenceDate,
  adminInterviewScoreTone,
  buildCandidateTimeline,
  filterAdminInterviews,
  formatAdminInterviewScore,
  formatAdminInterviewShortId,
  getAdminInterviewStatusLabel,
  getAdminInterviewStatusTone,
  pickCandidateInterview,
  summarizeAdminInterviews,
} from "./admin-interviews-view";

const ID_A = "1a2b3c4d-0000-4000-8000-000000000001";
const ID_B = "5e6f7a8b-0000-4000-8000-000000000002";
const ID_C = "9c0d1e2f-0000-4000-8000-000000000003";

function make(overrides: Partial<AdminInterviewListItem> = {}): AdminInterviewListItem {
  return {
    id: ID_A,
    status: "PENDING_ASSIGNMENT",
    evaluationMode: "HUMAN",
    jobTitle: "Analista de Dados",
    jobCompany: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    submittedAt: "2026-03-02T10:00:00.000Z",
    assignedAt: null,
    candidate: { id: 7, name: "Maria Souza", email: "maria@example.com" },
    evaluator: null,
    evaluation: null,
    ...overrides,
  };
}

describe("status visual (7A.1)", () => {
  it("mapeia cada status real para o rótulo definido", () => {
    expect(getAdminInterviewStatusLabel(make({ status: "PENDING_ASSIGNMENT" }))).toBe("Aguardando atribuição");
    expect(getAdminInterviewStatusLabel(make({ status: "ASSIGNED" }))).toBe("Atribuída");
    expect(getAdminInterviewStatusLabel(make({ status: "COMPLETED" }))).toBe("Concluída");
    expect(getAdminInterviewStatusLabel(make({ status: "PENDING_AI_EVALUATION", evaluationMode: "AI" }))).toBe(
      "Aguardando avaliação por IA",
    );
  });

  it("ASSIGNED com rascunho de avaliação vira 'Em avaliação'; concluída não", () => {
    const draft = { status: "DRAFT" as const, overallScore: null, completedAt: null };
    expect(getAdminInterviewStatusLabel(make({ status: "ASSIGNED", evaluation: draft }))).toBe("Em avaliação");
    expect(
      getAdminInterviewStatusLabel(
        make({ status: "COMPLETED", evaluation: { status: "COMPLETED", overallScore: 8, completedAt: "2026-03-03T10:00:00.000Z" } }),
      ),
    ).toBe("Concluída");
  });

  it("tons por status", () => {
    expect(getAdminInterviewStatusTone(make({ status: "PENDING_ASSIGNMENT" }))).toBe("warning");
    expect(getAdminInterviewStatusTone(make({ status: "ASSIGNED" }))).toBe("info");
    expect(getAdminInterviewStatusTone(make({ status: "COMPLETED" }))).toBe("success");
  });
});

describe("cards e busca", () => {
  const items = [
    make({ id: ID_A }),
    make({ id: ID_B, status: "ASSIGNED", evaluation: { status: "DRAFT", overallScore: null, completedAt: null } }),
    make({ id: ID_C, status: "ASSIGNED" }),
    make({ id: ID_A, status: "COMPLETED", evaluation: { status: "COMPLETED", overallScore: 9, completedAt: "2026-03-03T10:00:00.000Z" } }),
  ];

  it("conta exatamente os rótulos visuais", () => {
    expect(summarizeAdminInterviews(items)).toEqual({ pendingAssignment: 1, inEvaluation: 1, completed: 1 });
    expect(summarizeAdminInterviews([])).toEqual({ pendingAssignment: 0, inEvaluation: 0, completed: 0 });
  });

  it("filtra por candidato e vaga sem diferenciar maiúsculas", () => {
    const list = [
      make({ candidate: { id: 1, name: "João Lima", email: "j@x.com" }, jobTitle: "Designer" }),
      make({ candidate: { id: 2, name: "Ana Paula", email: "a@x.com" }, jobTitle: "Engenheiro" }),
    ];
    expect(filterAdminInterviews(list, "JOÃO")).toHaveLength(1);
    expect(filterAdminInterviews(list, "engenh")).toHaveLength(1);
    expect(filterAdminInterviews(list, "  ")).toHaveLength(2);
    expect(filterAdminInterviews(list, "zzz")).toHaveLength(0);
  });

  it("não busca por e-mail", () => {
    const list = [make({ candidate: { id: 1, name: "João", email: "segredo@x.com" } })];
    expect(filterAdminInterviews(list, "segredo")).toHaveLength(0);
  });
});

describe("apresentação", () => {
  it("ID abreviado é só visual", () => {
    expect(formatAdminInterviewShortId(ID_A)).toBe("#1A2B3C4D");
  });

  it("data de referência: envio, com fallback para criação", () => {
    expect(adminInterviewReferenceDate(make())).toBe("2026-03-02T10:00:00.000Z");
    expect(adminInterviewReferenceDate(make({ submittedAt: null }))).toBe("2026-03-01T10:00:00.000Z");
  });

  it("nota vem pronta; ausência vira traço", () => {
    expect(formatAdminInterviewScore(8)).toBe("8.0");
    expect(formatAdminInterviewScore(7.5)).toBe("7.5");
    expect(formatAdminInterviewScore(null)).toBe("—");
    expect(formatAdminInterviewScore(undefined)).toBe("—");
    expect(adminInterviewScoreTone(8)).toBe("success");
    expect(adminInterviewScoreTone(7.9)).toBe("info");
  });

  it("avaliador ausente vira traço", () => {
    expect(adminInterviewEvaluatorName(make())).toBe("—");
    expect(adminInterviewEvaluatorName(make({ evaluator: { id: 1, userId: 2, name: "Carlos" } }))).toBe("Carlos");
  });
});

describe("pickCandidateInterview", () => {
  const mine1 = make({ id: ID_A, submittedAt: "2026-03-02T10:00:00.000Z" });
  const mine2 = make({ id: ID_B, submittedAt: "2026-04-02T10:00:00.000Z" });
  const other = make({ id: ID_C, candidate: { id: 99, name: "Outro", email: "o@x.com" }, submittedAt: "2026-05-01T10:00:00.000Z" });

  it("seleciona a entrevista pedida quando é do candidato", () => {
    expect(pickCandidateInterview([mine1, mine2], "7", ID_A)?.id).toBe(ID_A);
  });

  it("sem interviewId, usa a mais recente do candidato", () => {
    expect(pickCandidateInterview([mine1, mine2], "7", undefined)?.id).toBe(ID_B);
  });

  it("interviewId de outro candidato cai na mais recente do próprio candidato", () => {
    expect(pickCandidateInterview([mine1, mine2, other], "7", ID_C)?.id).toBe(ID_B);
  });

  it("nunca devolve entrevista de terceiros", () => {
    expect(pickCandidateInterview([other], "7", ID_C)).toBeNull();
    expect(pickCandidateInterview([], "7", undefined)).toBeNull();
  });

  it("candidato inválido ou ausente não seleciona nada", () => {
    expect(pickCandidateInterview([mine1], undefined, undefined)).toBeNull();
    expect(pickCandidateInterview([mine1], "abc", undefined)).toBeNull();
  });
});

describe("buildCandidateTimeline", () => {
  it("só inclui timestamps reais", () => {
    expect(buildCandidateTimeline({}, null)).toEqual([]);
    expect(buildCandidateTimeline({ createdAt: "2026-01-01T00:00:00.000Z", onboardingCompletedAt: null }, null)).toEqual([
      { icon: "account", label: "Cadastro criado", at: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("não inventa atribuição nem conclusão ausentes", () => {
    const events = buildCandidateTimeline({}, make());
    expect(events.map((e) => e.icon)).toEqual(["created", "submitted"]);
  });

  it("entrevista concluída gera todos os marcos reais", () => {
    const events = buildCandidateTimeline(
      { createdAt: "2026-01-01T00:00:00.000Z", onboardingCompletedAt: "2026-01-02T00:00:00.000Z" },
      make({
        status: "COMPLETED",
        assignedAt: "2026-03-03T10:00:00.000Z",
        evaluator: { id: 1, userId: 2, name: "Carlos" },
        evaluation: { status: "COMPLETED", overallScore: 8, completedAt: "2026-03-04T10:00:00.000Z" },
      }),
    );
    expect(events.map((e) => e.icon)).toEqual(["account", "onboarding", "created", "submitted", "assigned", "completed"]);
  });
});
