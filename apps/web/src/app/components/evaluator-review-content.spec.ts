import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CONFIRM_DESCRIPTION,
  CONFIRM_TITLE,
  CompleteConfirmDialog,
  EvaluatorReviewContent,
  EvaluatorSuccessContent,
  barPercent,
  completionErrorText,
  type ReviewScreenState,
  type ReviewUi,
} from "./evaluator-review-content";
import type { CompletionSnapshot } from "../domain/evaluator-completion-flow";
import { EVALUATION_CRITERIA, type EvaluationDraft } from "../domain/evaluator-evaluation-form";
import type { EvaluatorInterviewDetail } from "../services/evaluator-interviews-service";

const ID = "11111111-1111-4111-8111-111111111111";

const interview: EvaluatorInterviewDetail = {
  id: ID,
  status: "ASSIGNED",
  evaluationMode: "HUMAN",
  assignedAt: "2026-10-09T15:00:00.000Z",
  submittedAt: "2026-10-09T14:00:00.000Z",
  candidate: { name: "Maria Candidata", professionalTitle: "Secretária", city: "Brasília", state: "DF" },
  context: {
    sourceUrl: null,
    title: "Secretária Comercial",
    company: "Clínica Exemplo",
    summary: null,
    activities: [],
    requirements: [],
    location: null,
    contractType: null,
    workMode: null,
  },
  questions: [
    { id: "q1", position: 1, type: "TECHNICAL", text: "Como organiza agendas?", answer: "Calendário compartilhado", answeredAt: null },
    { id: "q2", position: 2, type: "BEHAVIORAL", text: "Conte um desafio.", answer: null, answeredAt: null },
  ],
};

function scores(value: number) {
  const out: EvaluationDraft["criteriaScores"] = {};
  for (const c of EVALUATION_CRITERIA) out[c.key] = value;
  return out;
}

const fullDraft: EvaluationDraft = {
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: { ...scores(8), clarity: 9 },
  summary: "Linha 1\nLinha 2",
  overallScore: 8.1,
  updatedAt: null,
};
const incompleteDraft: EvaluationDraft = { ...fullDraft, criteriaScores: { clarity: 8 }, summary: null };

const idle: CompletionSnapshot = { phase: "idle", result: null, error: null };

function makeUi(over: Partial<ReviewUi> = {}, completion: CompletionSnapshot = idle): ReviewUi {
  return {
    completion,
    onBackToEdit: vi.fn(),
    onBackToQueue: vi.fn(),
    onRequestConfirm: vi.fn(),
    onCancelConfirm: vi.fn(),
    onConfirm: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

const ready = (draft: EvaluationDraft = fullDraft): ReviewScreenState => ({ status: "ready", interview, draft });

function render(state: ReviewScreenState, ui: ReviewUi = makeUi()) {
  return renderToStaticMarkup(createElement(EvaluatorReviewContent, { state, ui }));
}

// Caminha pela árvore de elementos (props.children), expandindo componentes de função.
function walk(node: ReactNode, visit: (el: ReactElement) => void) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!isValidElement(node)) return;
  visit(node);
  const props = node.props as { children?: ReactNode };
  walk(props.children, visit);
}
function expand(node: ReactNode): ReactNode {
  if (isValidElement(node) && typeof node.type === "function") {
    return (node.type as (p: unknown) => ReactNode)(node.props);
  }
  return node;
}
function treeOf(state: ReviewScreenState, ui: ReviewUi) {
  return expand(createElement(EvaluatorReviewContent, { state, ui }));
}
function findAll(root: ReactNode, pred: (el: ReactElement) => boolean) {
  const found: ReactElement[] = [];
  walk(root, (el) => pred(el) && found.push(el));
  return found;
}
const textOf = (node: ReactNode): string =>
  Array.isArray(node)
    ? node.map(textOf).join("")
    : typeof node === "string" || typeof node === "number"
      ? String(node)
      : isValidElement(node)
        ? textOf((node.props as { children?: ReactNode }).children)
        : "";

describe("revisão: estados", () => {
  it("loading / 404 / erro com tentar novamente", () => {
    expect(render({ status: "loading" })).toContain("Carregando revisão");
    const nf = render({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
    expect(nf).toContain("Entrevista não encontrada ou indisponível");
    expect(nf).not.toContain("Concluir avaliação");
    const err = render({ status: "error", message: "Falha ao carregar" });
    expect(err).toContain("Falha ao carregar");
    expect(err).toContain("Tentar novamente");
  });
});

describe("revisão: conteúdo real", () => {
  const html = render(ready());
  it("título, candidato · vaga e empresa", () => {
    expect(html).toContain("Revisar avaliação");
    expect(html).toContain("Maria Candidata · Secretária Comercial");
    expect(html).toContain("Clínica Exemplo");
  });
  it("média final prevista (conferência) e aviso de que o servidor calcula", () => {
    expect(html).toContain("Média prevista");
    expect(html).not.toContain("Média final");
    expect(html).toMatch(/data-testid="review-average"[^>]*>8,1</);
    expect(html).toContain("calculada pelo servidor");
  });
  it("os 7 critérios com suas notas", () => {
    for (const c of EVALUATION_CRITERIA) {
      expect(html).toContain(c.label);
      expect(html).toContain(`data-criterion="${c.key}"`);
    }
    expect(html).toMatch(/data-testid="review-score-clarity"[^>]*>9\/10</);
    expect(html).toMatch(/data-testid="review-score-coherence"[^>]*>8\/10</);
  });
  it("comentário preservado e perguntas/respostas compactas", () => {
    expect(html).toContain("Linha 1\nLinha 2");
    expect(html).toContain("Perguntas e respostas");
    expect(html).toContain("Como organiza agendas?");
    expect(html).toContain("Calendário compartilhado");
    expect(html).toContain("Sem resposta registrada.");
  });
  it("botões Voltar e editar e Concluir avaliação habilitados", () => {
    expect(html).toContain("Voltar e editar");
    expect(html).toMatch(/<button[^>]*data-action="complete"[^>]*>Concluir avaliação<\/button>/);
    expect(html).not.toMatch(/<button[^>]*data-action="complete"[^>]*\sdisabled=""/);
  });
  it("não renderiza campos editáveis (revisão é só leitura)", () => {
    expect(html).not.toMatch(/<input|<textarea/);
  });
});

describe("revisão: rascunho incompleto", () => {
  it("avisa e desabilita Concluir", () => {
    const html = render(ready(incompleteDraft));
    expect(html).toContain("A avaliação está incompleta");
    expect(html).toMatch(/<button[^>]*data-action="complete"[^>]*\sdisabled=""/);
    expect(html).toContain("Sem comentário.");
  });
});

describe("revisão: ações", () => {
  it("Concluir só PEDE a confirmação (não confirma)", () => {
    const ui = makeUi();
    const [btn] = findAll(treeOf(ready(), ui), (el) => (el.props as { "data-action"?: string })["data-action"] === "complete");
    (btn.props as { onClick: () => void }).onClick();
    expect(ui.onRequestConfirm).toHaveBeenCalledTimes(1);
    expect(ui.onConfirm).not.toHaveBeenCalled();
  });
  it("Voltar e editar dispara onBackToEdit", () => {
    const ui = makeUi();
    const [btn] = findAll(treeOf(ready(), ui), (el) => (el.props as { "data-action"?: string })["data-action"] === "back-to-edit");
    (btn.props as { onClick: () => void }).onClick();
    expect(ui.onBackToEdit).toHaveBeenCalledTimes(1);
  });
  it("enviando: botão 'Concluindo...' desabilitado e Voltar e editar desabilitado", () => {
    const html = render(ready(), makeUi({}, { phase: "submitting", result: null, error: null }));
    expect(html).toMatch(/<button[^>]*data-action="complete"[^>]*\sdisabled=""[^>]*>Concluindo\.\.\.<\/button>/);
    expect(html).toMatch(/<button[^>]*data-action="back-to-edit"[^>]*\sdisabled=""/);
  });
});

describe("diálogo de confirmação", () => {
  const dialog = (over: Partial<Parameters<typeof CompleteConfirmDialog>[0]> = {}) => {
    const props = { open: true, submitting: false, onCancel: vi.fn(), onConfirm: vi.fn(), ...over };
    return { props, tree: CompleteConfirmDialog(props) };
  };
  it("texto exato do título e da descrição", () => {
    expect(CONFIRM_TITLE).toBe("Concluir avaliação?");
    expect(CONFIRM_DESCRIPTION).toBe(
      "Após a conclusão, esta avaliação será finalizada e não poderá mais ser editada.",
    );
    const { tree } = dialog();
    const text = textOf(tree);
    expect(text).toContain(CONFIRM_TITLE);
    expect(text).toContain(CONFIRM_DESCRIPTION);
    expect(text).toContain("Cancelar");
    expect(text).toContain("Concluir avaliação");
  });
  it("aberto só quando phase=confirming|submitting", () => {
    for (const [phase, open] of [["idle", false], ["confirming", true], ["submitting", true], ["error", false]] as const) {
      const tree = treeOf(ready(), makeUi({}, { phase, result: null, error: null }));
      const [d] = findAll(tree, (el) => el.type === CompleteConfirmDialog);
      expect((d.props as { open: boolean }).open).toBe(open);
    }
  });
  it("Confirmar chama onConfirm uma vez e impede o fechamento automático", () => {
    const { props, tree } = dialog();
    const [action] = findAll(tree, (el) => textOf(el) === "Concluir avaliação" && "onClick" in (el.props as object) && !("title" in (el.props as object)));
    const preventDefault = vi.fn();
    (action.props as { onClick: (e: { preventDefault: () => void }) => void }).onClick({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });
  it("Cancelar chama onCancel e não confirma", () => {
    const { props, tree } = dialog();
    const [cancel] = findAll(tree, (el) => textOf(el) === "Cancelar");
    (cancel.props as { onClick: () => void }).onClick();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
  it("fechar (Esc/overlay) cancela; durante o envio NÃO fecha", () => {
    const idleDlg = dialog();
    (idleDlg.tree.props as { onOpenChange: (o: boolean) => void }).onOpenChange(false);
    expect(idleDlg.props.onCancel).toHaveBeenCalledTimes(1);

    const sending = dialog({ submitting: true });
    (sending.tree.props as { onOpenChange: (o: boolean) => void }).onOpenChange(false);
    expect(sending.props.onCancel).not.toHaveBeenCalled();
  });
  it("enviando: 'Concluindo...' com Cancelar e Confirmar desabilitados e sem novo onConfirm", () => {
    const { props, tree } = dialog({ submitting: true });
    expect(textOf(tree)).toContain("Concluindo...");
    const buttons = findAll(tree, (el) => "disabled" in (el.props as object));
    expect(buttons.length >= 2).toBe(true);
    expect(buttons.every((b) => (b.props as { disabled: boolean }).disabled === true)).toBe(true);
    const [action] = findAll(tree, (el) => textOf(el) === "Concluindo...");
    (action.props as { onClick: (e: { preventDefault: () => void }) => void }).onClick({ preventDefault: () => undefined });
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});

describe("erros da conclusão", () => {
  const withError = (reason: NonNullable<CompletionSnapshot["error"]>["reason"], message = "msg do servidor") =>
    render(ready(), makeUi({}, { phase: "error", result: null, error: { reason, message } }));

  it("400: mostra a mensagem e mantém Voltar e editar", () => {
    const html = withError("invalid", "Preencha todos os critérios.");
    expect(html).toContain("Preencha todos os critérios.");
    expect(html).toContain("Voltar e editar");
  });
  it("404: mensagem segura e opção de voltar para a fila", () => {
    const html = withError("not_found", "qualquer coisa");
    expect(html).toContain("Entrevista não encontrada ou indisponível.");
    expect(html).not.toContain("qualquer coisa");
    expect(html).toContain('data-action="back-to-queue"');
  });
  it("409: explica que o estado mudou e oferece voltar para a fila", () => {
    const html = withError("conflict");
    expect(html).toContain("O estado desta avaliação mudou");
    expect(html).toContain('data-action="back-to-queue"');
  });
  it("500/rede: mantém a revisão, mostra erro e permite tentar de novo (Concluir habilitado)", () => {
    const html = withError("error", "Não foi possível concluir a avaliação. Tente novamente.");
    expect(html).toContain("Não foi possível concluir a avaliação");
    expect(html).toContain("Voltar e editar");
    expect(html).not.toMatch(/<button[^>]*data-action="complete"[^>]*\sdisabled=""/);
    expect(html).not.toContain('data-action="back-to-queue"');
  });
  it("completionErrorText mapeia cada tipo", () => {
    expect(completionErrorText({ reason: "invalid", message: "m" })).toEqual({ message: "m", hint: "edit" });
    expect(completionErrorText({ reason: "error", message: "m" }).hint).toBe("retry");
    expect(completionErrorText({ reason: "unauthorized", message: "m" }).hint).toBe("retry");
  });
});

describe("tela de sucesso", () => {
  const info = {
    interviewId: ID,
    candidateName: "Maria Candidata",
    jobTitle: "Secretária Comercial",
    overallScore: 7.8,
    completedAt: "2026-10-10T13:00:00.000Z",
  };
  const render2 = (i: typeof info | null, onBack = vi.fn()) =>
    renderToStaticMarkup(createElement(EvaluatorSuccessContent, { info: i, onBackToQueue: onBack }));

  it("título, mensagem com o candidato, nota e data do POST", () => {
    const html = render2(info);
    expect(html).toContain("Avaliação concluída");
    expect(html).toContain("A avaliação de Maria Candidata foi concluída com sucesso.");
    expect(html).toMatch(/data-testid="success-score"[^>]*>7,8</);
    expect(html).toContain("Média final");
    expect(html).toContain("Concluída em");
    expect(html).toContain("Voltar para a fila");
  });
  it("sem nota/data no response: não inventa valores", () => {
    const html = render2({ ...info, overallScore: null, completedAt: null });
    expect(html).not.toContain("success-score");
    expect(html).not.toContain("Concluída em");
  });
  it("sem contexto (recarregou): fallback seguro com volta à fila", () => {
    const html = render2(null);
    expect(html).toContain("Avaliação concluída");
    expect(html).toContain("Resultado indisponível");
    expect(html).toContain("Voltar para a fila");
  });
  it("Voltar para a fila dispara a navegação", () => {
    const onBack = vi.fn();
    const tree = expand(createElement(EvaluatorSuccessContent, { info, onBackToQueue: onBack }));
    const [btn] = findAll(tree, (el) => el.type === "button");
    (btn.props as { onClick: () => void }).onClick();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("revisão: linguagem visual (barras e resumo)", () => {
  const html = render(ready());
  it("card 'Resumo da avaliação' com os 7 critérios e uma barra por critério", () => {
    expect(html).toContain("Resumo da avaliação");
    for (const c of EVALUATION_CRITERIA) expect(html).toContain(`data-testid="review-bar-${c.key}"`);
    expect((html.match(/role="progressbar"/g) ?? []).length).toBe(7);
  });
  it("a largura de cada barra reflete a nota real", () => {
    expect(html).toMatch(/data-testid="review-bar-clarity"[^>]*data-percent="90"[^>]*style="width:90%"/);
    expect(html).toMatch(/data-testid="review-bar-coherence"[^>]*data-percent="80"[^>]*style="width:80%"/);
    expect(barPercent(null)).toBe(0);
    expect(barPercent(0)).toBe(0);
    expect(barPercent(7.5)).toBe(75);
    expect(barPercent(10)).toBe(100);
    expect(barPercent(15)).toBe(100);
  });
  it("barra acessível: valor em texto, não só cor", () => {
    expect(html).toMatch(/role="progressbar"[^>]*aria-valuenow="9"/);
    expect(html).toContain('aria-valuetext="9/10"');
    const none = render(ready({ ...fullDraft, criteriaScores: { clarity: 8 } }));
    expect(none).toContain('aria-valuetext="sem nota"');
  });
  it("sem pesos/percentuais fictícios no texto", () => {
    const text = html.replace(/<[^>]*>/g, " ");
    expect(text).not.toMatch(/\d\s?%/);
    expect(text.toLowerCase()).not.toContain("peso");
  });
  it("média em destaque com '/ 10' e aviso de conferência", () => {
    expect(html).toMatch(/data-testid="review-average"[^>]*>8,1<\/span><span[^>]*> \/ 10</);
    expect(html).toContain("A média exibida é apenas para conferência. A nota final é calculada pelo servidor ao concluir.");
  });
  it("comentário é só leitura (sem input/textarea) e perguntas são <details> fechados", () => {
    expect(html).toContain('data-testid="review-summary"');
    expect(html).not.toMatch(/<textarea|<input/);
    expect((html.match(/<details/g) ?? []).length).toBe(2);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain("Resposta do candidato");
    expect(html).toContain("Pergunta 1:");
  });
});

describe("revisão: comentário em bloco de leitura", () => {
  const html = render(ready());
  it("faixa lateral azul + fundo suave, sem textarea/input", () => {
    expect(html).toMatch(/data-testid="review-comment-block"/);
    expect(html).toMatch(/border-l-4[^"]*border-l-primary[^"]*bg-blue-50/);
    expect(html).not.toMatch(/<textarea|<input|contenteditable/);
  });
  it("preserva quebras de linha (pre-wrap) e o texto completo", () => {
    expect(html).toMatch(/whitespace-pre-wrap[^"]*"[^>]*data-testid="review-summary"/);
    expect(html).toContain("Linha 1\nLinha 2");
  });
});
