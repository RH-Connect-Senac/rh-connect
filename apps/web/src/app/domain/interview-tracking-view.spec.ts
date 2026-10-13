import { describe, expect, it } from "vitest";
import {
  buildTrackingView,
  HUMAN_RESULT_DEADLINE_NOTICE,
  describeTrackingFailure,
  resolveSubmitDestination,
  formatTrackingDate,
  type TrackingInterview,
} from "./interview-tracking-view";

const SUBMITTED = "2026-10-12T13:00:00.000Z";
const ASSIGNED = "2026-10-13T01:00:00.000Z";
const COMPLETED = "2026-10-13T03:28:52.775Z";

function interview(overrides: Partial<TrackingInterview> = {}): TrackingInterview {
  return {
    status: "PENDING_ASSIGNMENT",
    evaluationMode: "HUMAN",
    createdAt: "2026-10-12T12:00:00.000Z",
    submittedAt: SUBMITTED,
    assignedAt: null,
    completedAt: null,
    ...overrides,
  };
}

const states = (view: ReturnType<typeof buildTrackingView>) => view.steps.map((s) => `${s.key}:${s.state}`);

describe("acompanhamento HUMAN (6A.2)", () => {
  it("PENDING_ASSIGNMENT: enviada concluída, atribuição pendente, avaliação futura, sem resultado", () => {
    const view = buildTrackingView(interview());
    expect(view.kind).toBe("pending-assignment");
    expect(view.badgeLabel).toBe("Aguardando atribuição");
    expect(states(view)).toEqual(["submitted:done", "assigned:current", "evaluation:upcoming", "result:upcoming"]);
    expect(view.primaryCta).toBe("back-to-history");
    expect(view.description).toMatch(/aguardando a atribuição/i);
    expect(view.description).toMatch(/resultado ainda não está disponível/i);
  });

  it("ASSIGNED: enviada e atribuída concluídas, avaliação em andamento", () => {
    const view = buildTrackingView(interview({ status: "ASSIGNED", assignedAt: ASSIGNED }));
    expect(view.kind).toBe("assigned");
    expect(states(view)).toEqual(["submitted:done", "assigned:done", "evaluation:current", "result:upcoming"]);
    expect(view.steps[1].date).toBe(formatTrackingDate(ASSIGNED));
    expect(view.primaryCta).toBe("back-to-history");
    expect(view.description).toMatch(/resultado ainda não está disponível/i);
  });

  it("ASSIGNED sem assignedAt: não inventa data nem nome de avaliador", () => {
    const view = buildTrackingView(interview({ status: "ASSIGNED", assignedAt: null }));
    expect(view.steps[1].state).toBe("done");
    expect(view.steps[1].date).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/avaliador [A-ZÁ-Ú]/);
  });

  it("COMPLETED: tudo concluído, usa completedAt real e oferece o CTA do resultado", () => {
    const view = buildTrackingView(
      interview({ status: "COMPLETED", assignedAt: ASSIGNED, completedAt: COMPLETED }),
    );
    expect(view.kind).toBe("completed");
    expect(view.badgeTone).toBe("success");
    expect(states(view)).toEqual(["submitted:done", "assigned:done", "evaluation:done", "result:done"]);
    expect(view.steps[2].date).toBe(formatTrackingDate(COMPLETED));
    expect(view.primaryCta).toBe("view-result");
    expect(view.primaryCtaLabel).toBe("Ver resultado");
  });

  it("aviso de 72h: aparece em HUMAN PENDING_ASSIGNMENT e ASSIGNED", () => {
    expect(HUMAN_RESULT_DEADLINE_NOTICE).toBe("O resultado ficará disponível em até 72 horas após o envio da entrevista.");
    for (const status of ["PENDING_ASSIGNMENT", "ASSIGNED"] as const) {
      const view = buildTrackingView(interview({ status }));
      expect(view.deadlineNotice).toBe(HUMAN_RESULT_DEADLINE_NOTICE);
      expect(view.deadlineNotice).toContain("72 horas");
    }
  });

  it("aviso de 72h: não aparece em COMPLETED, CANCELLED, IN_PROGRESS nem em AI", () => {
    const cases: Partial<TrackingInterview>[] = [
      { status: "COMPLETED", assignedAt: ASSIGNED, completedAt: COMPLETED },
      { status: "CANCELLED" },
      { status: "IN_PROGRESS", evaluationMode: null, submittedAt: null },
      { status: "PENDING_AI_EVALUATION", evaluationMode: "AI" },
      { status: "PENDING_ASSIGNMENT", evaluationMode: "AI" },
      { status: "ASSIGNED", evaluationMode: null },
    ];
    for (const overrides of cases) {
      const view = buildTrackingView(interview(overrides));
      expect(view.deadlineNotice).toBeNull();
      expect(JSON.stringify(view)).not.toMatch(/72|horas/);
    }
  });

  it("o aviso é só informativo: sem contagem regressiva nem bloqueio do resultado", () => {
    const view = buildTrackingView(interview({ status: "COMPLETED", submittedAt: "2000-01-01T00:00:00.000Z", completedAt: COMPLETED }));
    expect(view.primaryCta).toBe("view-result");
  });
});

describe("outros estados (6A.2)", () => {
  it("CANCELLED: estado claro, sem linha do tempo e sem CTA de resultado", () => {
    const view = buildTrackingView(interview({ status: "CANCELLED" }));
    expect(view.kind).toBe("cancelled");
    expect(view.steps).toEqual([]);
    expect(view.primaryCta).toBe("back-to-history");
  });

  it("CANCELLED vale também para IA", () => {
    expect(buildTrackingView(interview({ status: "CANCELLED", evaluationMode: "AI" })).kind).toBe("cancelled");
  });

  it("IN_PROGRESS: não finge envio; oferece retomar", () => {
    const view = buildTrackingView(interview({ status: "IN_PROGRESS", evaluationMode: null, submittedAt: null }));
    expect(view.kind).toBe("in-progress");
    expect(view.steps).toEqual([]);
    expect(view.primaryCta).toBe("resume-interview");
    expect(view.description).toMatch(/ainda não foi enviada/i);
  });

  it("AI + PENDING_AI_EVALUATION: processamento, sem prazo, sem tratar como HUMAN", () => {
    const view = buildTrackingView(interview({ status: "PENDING_AI_EVALUATION", evaluationMode: "AI" }));
    expect(view.kind).toBe("pending-ai");
    expect(view.badgeLabel).toBe("Aguardando avaliação por IA");
    expect(states(view)).toEqual(["submitted:done", "processing:current", "result:upcoming"]);
    expect(view.primaryCta).toBe("back-to-history");
    expect(JSON.stringify(view)).not.toMatch(/atribu|avaliador|72|horas/i);
  });

  it("combinações sem suporte (IA concluída legada, HUMAN com status de IA, modo nulo) não viram resultado", () => {
    for (const overrides of [
      { status: "COMPLETED", evaluationMode: "AI" },
      { status: "PENDING_AI_EVALUATION", evaluationMode: "HUMAN" },
      { status: "ASSIGNED", evaluationMode: null },
    ] as Partial<TrackingInterview>[]) {
      const view = buildTrackingView(interview(overrides));
      expect(view.kind).toBe("unsupported");
      expect(view.primaryCta).toBe("back-to-history");
    }
  });

  it("o CTA de resultado só existe para HUMAN + COMPLETED", () => {
    const statuses = ["IN_PROGRESS", "PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED", "CANCELLED"] as const;
    const modes = ["HUMAN", "AI", null] as const;
    for (const status of statuses) {
      for (const evaluationMode of modes) {
        const view = buildTrackingView(interview({ status, evaluationMode }));
        expect(view.primaryCta === "view-result").toBe(status === "COMPLETED" && evaluationMode === "HUMAN");
      }
    }
  });
});

describe("formatTrackingDate / falhas", () => {
  it("data ausente ou inválida vira null (nunca 'Invalid Date')", () => {
    expect(formatTrackingDate(null)).toBeNull();
    expect(formatTrackingDate(undefined)).toBeNull();
    expect(formatTrackingDate("")).toBeNull();
    expect(formatTrackingDate("não é data")).toBeNull();
    expect(formatTrackingDate(SUBMITTED)).toMatch(/\d/);
  });

  it("404 mostra 'não encontrada para a conta'; não oferece tentar de novo", () => {
    const failure = describeTrackingFailure("not_found", "qualquer");
    expect(failure.title).toMatch(/não encontramos/i);
    expect(failure.description).toMatch(/sua conta/i);
    expect(failure.canRetry).toBe(false);
  });

  it("sessão expirada/sem permissão repassa a mensagem amigável, sem retry", () => {
    const failure = describeTrackingFailure("unauthorized", "Sua sessão expirou. Entre novamente para continuar.");
    expect(failure.description).toBe("Sua sessão expirou. Entre novamente para continuar.");
    expect(failure.canRetry).toBe(false);
  });

  it("erro de servidor/rede permite tentar novamente e usa a mensagem já sanitizada", () => {
    const failure = describeTrackingFailure("error", "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    expect(failure.canRetry).toBe(true);
    expect(failure.description).toMatch(/conexão/);
  });
});

describe("destino após o submit (6A.2)", () => {
  it("HUMAN confirmado pelo backend (PENDING_ASSIGNMENT) vai direto ao acompanhamento", () => {
    expect(resolveSubmitDestination({ status: "PENDING_ASSIGNMENT", evaluationMode: "HUMAN" })).toBe("status");
  });

  it("HUMAN já adiantado (ASSIGNED/COMPLETED, reenvio idempotente) também vai ao acompanhamento", () => {
    expect(resolveSubmitDestination({ status: "ASSIGNED", evaluationMode: "HUMAN" })).toBe("status");
    expect(resolveSubmitDestination({ status: "COMPLETED", evaluationMode: "HUMAN" })).toBe("status");
  });

  it("AI mantém o destino existente (tela de envio), sem virar comportamento HUMAN", () => {
    expect(resolveSubmitDestination({ status: "PENDING_AI_EVALUATION", evaluationMode: "AI" })).toBe("success");
    expect(resolveSubmitDestination({ status: "PENDING_ASSIGNMENT", evaluationMode: "AI" })).toBe("success");
  });

  it("sem confirmação de HUMAN pelo backend não vai ao acompanhamento", () => {
    expect(resolveSubmitDestination({ status: "IN_PROGRESS", evaluationMode: "HUMAN" })).toBe("success");
    expect(resolveSubmitDestination({ status: "CANCELLED", evaluationMode: "HUMAN" })).toBe("success");
    expect(resolveSubmitDestination({ status: "PENDING_ASSIGNMENT", evaluationMode: null })).toBe("success");
  });
});
