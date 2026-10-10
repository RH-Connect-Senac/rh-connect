import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EvaluatorEvaluationContent,
  type EvaluationFormUi,
  type EvaluationScreenState,
  type SaveFeedback,
} from "./evaluator-evaluation-content";
import {
  emptyForm,
  formFromDraft,
  isDirty,
  validateForm,
  type EvaluationDraft,
} from "../domain/evaluator-evaluation-form";
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
    requirements: ["Pacote Office"],
    location: "Três Lagoas/MS",
    contractType: null,
    workMode: "HYBRID",
  },
  questions: [
    { id: "q1", position: 1, type: "TECHNICAL", text: "Como organiza agendas?", answer: "Resposta 1\nlinha 2", answeredAt: null },
  ],
};

const emptyDraft: EvaluationDraft = {
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: {},
  summary: null,
  overallScore: null,
  updatedAt: null,
};

const savedDraft: EvaluationDraft = {
  ...emptyDraft,
  criteriaScores: { clarity: 8, coherence: 7.5 },
  summary: "Linha 1\nLinha 2",
  overallScore: 7.8,
  updatedAt: "2026-10-10T10:00:00.000Z",
};

const noop = () => undefined;

function ui(draft: EvaluationDraft, over: Partial<EvaluationFormUi> = {}): EvaluationFormUi {
  const form = formFromDraft(draft);
  const saved = formFromDraft(draft);
  return {
    form,
    validation: validateForm(form, draft.criteriaScores),
    dirty: isDirty(form, saved),
    saving: false,
    feedback: null as SaveFeedback,
    onScoreChange: noop,
    onSummaryChange: noop,
    onSave: noop,
    ...over,
  };
}

function render(state: EvaluationScreenState, formUi: EvaluationFormUi = ui(emptyDraft)) {
  return renderToStaticMarkup(
    createElement(EvaluatorEvaluationContent, { state, ui: formUi, onBack: noop, onRetry: noop }),
  );
}

const ready = (draft: EvaluationDraft): EvaluationScreenState => ({ status: "ready", interview, draft });

describe("tela real de avaliação (apresentação)", () => {
  it("loading", () => {
    const html = render({ status: "loading" });
    expect(html).toContain("Carregando entrevista e avaliação...");
    expect(html).toContain('role="status"');
  });

  it("erro: mensagem segura com tentar novamente", () => {
    const html = render({ status: "error", message: "Não foi possível carregar a avaliação. Tente novamente." });
    expect(html).toContain("Não foi possível carregar a avaliação");
    expect(html).toContain("Tentar novamente");
  });

  it("404: entrevista indisponível, sem formulário de notas", () => {
    const html = render({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
    expect(html).toContain("Entrevista não encontrada ou indisponível");
    expect(html).not.toContain("Salvar rascunho");
    expect(html).not.toContain("criterion-clarity");
  });

  it("mostra vaga, pergunta e resposta reais (o candidato fica no cabeçalho da tela)", () => {
    const html = render(ready(emptyDraft));
    for (const text of ["Secretária Comercial", "Clínica Exemplo", "Três Lagoas/MS", "Híbrido", "Como organiza agendas?", "Resposta 1\nlinha 2"]) {
      expect(html).toContain(text);
    }
  });

  it("os 7 critérios aparecem com chaves e rótulos corretos", () => {
    const html = render(ready(emptyDraft));
    const pairs: Array<[string, string]> = [
      ["clarity", "Clareza"],
      ["coherence", "Coerência"],
      ["objectivity", "Objetividade"],
      ["domain_knowledge", "Domínio"],
      ["organization", "Organização"],
      ["requirements_alignment", "Aderência aos requisitos"],
      ["examples", "Capacidade de exemplificar"],
    ];
    for (const [key, label] of pairs) {
      expect(html).toContain(`data-criterion="${key}"`);
      expect(html).toContain(`id="criterion-${key}"`);
      expect(html).toContain(`>${label}</label>`);
    }
    expect((html.match(/data-criterion=/g) ?? []).length).toBe(7);
  });

  it("rascunho existente: valores, comentário e nota geral do servidor reaparecem", () => {
    const html = render(ready(savedDraft), ui(savedDraft));
    expect(html).toMatch(/id="criterion-clarity"[^>]*value="8"/);
    expect(html).toMatch(/id="criterion-coherence"[^>]*value="7.5"/);
    expect(html).toMatch(/id="criterion-objectivity"[^>]*value=""/);
    expect(html).toContain("Linha 1\nLinha 2");
    expect(html).toContain("7,8");
    expect(html).toContain("Calculada pelo servidor");
    expect(html).toMatch(/data-testid="overall-label">Média parcial</);
  });

  it("sem rascunho: campos vazios, nota geral '—' e contador 0/2000", () => {
    const html = render(ready(emptyDraft));
    expect(html).toContain("—");
    expect(html).toContain("0/2000");
    expect(html).toMatch(/id="criterion-clarity"[^>]*value=""/);
  });

  it("contador usa o tamanho em caracteres do comentário", () => {
    const form = { ...emptyForm(), summary: "abc\ndef" };
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toContain("7/2000");
  });

  it("alteração não salva mostra PRÉVIA da média (mesma regra do Back)", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "8";
    form.scores.coherence = "7";
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toContain("7,5");
    expect(html).toMatch(/data-testid="overall-label">Prévia</);
    expect(html).toMatch(/data-testid="overall-value">7,5</);
  });

  it("nota inválida mostra erro e bloqueia o botão salvar", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "11";
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toContain("A nota deve estar entre 0 e 10.");
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
  });

  it("nota negativa também bloqueia e mostra erro", () => {
    const form = { ...emptyForm() };
    form.scores.coherence = "-1";
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toContain("Use um número de 0 a 10");
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
  });

  it("decimal e 0/10 deixam o botão salvar habilitado", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "7,5";
    form.scores.coherence = "0";
    form.scores.objectivity = "10";
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
    expect(html).toContain(">Salvar rascunho</button>");
  });

  it("comentário acima de 2000 mostra erro e bloqueia salvar", () => {
    const form = { ...emptyForm(), summary: "a".repeat(2001) };
    const html = render(ready(emptyDraft), ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toContain("no máximo 2000 caracteres");
    expect(html).toContain("2001/2000");
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
  });

  it("sem alterações o botão salvar fica desabilitado", () => {
    const html = render(ready(savedDraft), ui(savedDraft));
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
  });

  it("salvando: botão desabilitado ('Salvando...') e campos travados — sem duplo clique", () => {
    const form = formFromDraft(savedDraft);
    form.scores.clarity = "9";
    const html = render(ready(savedDraft), ui(savedDraft, { form, validation: validateForm(form, savedDraft.criteriaScores), dirty: true, saving: true }));
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-busy="true"[^>]*>Salvando\.\.\.<\/button>/);
    expect(html).toMatch(/id="criterion-clarity"[^>]*disabled/);
  });

  it("sucesso mostra 'Rascunho salvo' no texto discreto de status", () => {
    const html = render(ready(savedDraft), ui(savedDraft, { syncStatus: "saved" }));
    expect(html).toMatch(/data-sync="saved"[^>]*>Rascunho salvo</);
  });

  it("erro de save mantém os valores digitados e mostra mensagem segura", () => {
    const form = formFromDraft(savedDraft);
    form.scores.clarity = "9";
    form.summary = "Texto novo\nainda não salvo";
    const html = render(
      ready(savedDraft),
      ui(savedDraft, {
        form,
        validation: validateForm(form, savedDraft.criteriaScores),
        dirty: true,
        feedback: { kind: "error", message: "Não foi possível salvar o rascunho. Tente novamente." },
      }),
    );
    expect(html).toContain("Não foi possível salvar o rascunho. Tente novamente.");
    expect(html).toMatch(/id="criterion-clarity"[^>]*value="9"/);
    expect(html).toContain("Texto novo\nainda não salvo");
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Salvar rascunho<\/button>/);
  });

  it("quebras de linha do comentário são preservadas no campo", () => {
    const html = render(ready(savedDraft), ui(savedDraft));
    expect(html).toMatch(/<textarea[^>]*>Linha 1\nLinha 2<\/textarea>/);
  });

  it("conclusão NÃO está ligada: botão 'Concluir avaliação' desabilitado e com aviso", () => {
    const html = render(ready(savedDraft), ui(savedDraft));
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Concluir avaliação<\/button>/);
    expect(html).toContain("será liberada na próxima etapa");
  });
});

// ─── Fase 5C.3-UX: uma pergunta por vez, controles clicáveis, painel sticky ───

const interview3: EvaluatorInterviewDetail = {
  ...interview,
  context: { ...interview.context, requirements: ["Pacote Office"], activities: ["Agendar consultas"], contractType: "PJ" },
  questions: [
    { id: "q1", position: 1, type: "TECHNICAL", text: "Pergunta UM", answer: "Resposta UM\nsegunda linha\n\nquarta", answeredAt: "2026-10-09T10:00:00.000Z" },
    { id: "q2", position: 2, type: "BEHAVIORAL", text: "Pergunta DOIS", answer: "Resposta DOIS", answeredAt: null },
    { id: "q3", position: 3, type: "CAREER", text: "Pergunta TRÊS", answer: null, answeredAt: null },
  ],
};

function renderAt(index: number, formUi: EvaluationFormUi = ui(emptyDraft), source = interview3, draft = emptyDraft) {
  return renderToStaticMarkup(
    createElement(EvaluatorEvaluationContent, {
      state: { status: "ready", interview: source, draft },
      ui: formUi,
      questionIndex: index,
      onQuestionChange: noop,
      onBack: noop,
      onRetry: noop,
    }),
  );
}

function hasText(node: any, text: string): boolean {
  if (typeof node === "string") return node === text;
  if (Array.isArray(node)) return node.some((child) => hasText(child, text));
  return node && typeof node === "object" ? hasText(node.props?.children, text) : false;
}

function findAll(node: any, predicate: (n: any) => boolean, found: any[] = []): any[] {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, predicate, found));
    return found;
  }
  if (predicate(node)) found.push(node);
  findAll(node.props?.children, predicate, found);
  return found;
}

describe("uma pergunta por vez", () => {
  it("mostra somente a pergunta atual e a resposta real dela", () => {
    const html = renderAt(0);
    expect(html).toContain("Pergunta UM");
    expect(html).toContain("Resposta UM");
    expect(html).not.toContain("Pergunta DOIS");
    expect(html).not.toContain("Resposta DOIS");
    expect(html).not.toContain("Pergunta TRÊS");
  });

  it("'Questão X de Y' acompanha o índice", () => {
    expect(renderAt(0)).toMatch(/data-testid="question-progress">Questão 1 de 3</);
    expect(renderAt(1)).toMatch(/data-testid="question-progress">Questão 2 de 3</);
    expect(renderAt(2)).toMatch(/data-testid="question-progress">Questão 3 de 3</);
  });

  it("tipo da pergunta, resposta em destaque e data da resposta", () => {
    const html = renderAt(0);
    expect(html).toContain("Técnica");
    expect(html).toContain("bg-blue-50");
    expect(html).toContain("Resposta do candidato");
    expect(html).toContain("Respondida em");
    expect(renderAt(1)).toContain("Comportamental");
  });

  it("preserva as quebras de linha da resposta", () => {
    const html = renderAt(0);
    expect(html).toContain("Resposta UM\nsegunda linha\n\nquarta");
    expect(html).toMatch(/whitespace-pre-wrap[^"]*"[^>]*>Resposta UM\nsegunda/);
  });

  it("pergunta sem resposta mostra aviso, nunca texto inventado", () => {
    const html = renderAt(2);
    expect(html).toContain("Sem resposta registrada.");
    expect(html).not.toContain("Respondida em");
  });

  it("Anterior fica bloqueado na primeira; Próxima fica bloqueada na última", () => {
    expect(renderAt(0)).toMatch(/<button[^>]*\sdisabled=""[^>]*>(?:<svg[^>]*>.*?<\/svg>)?Anterior<\/button>/);
    expect(renderAt(0)).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Próxima/);
    expect(renderAt(2)).toMatch(/<button[^>]*\sdisabled=""[^>]*>Próxima/);
    expect(renderAt(2)).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>(?:<svg[^>]*>.*?<\/svg>)?Anterior/);
    const middle = renderAt(1);
    expect(middle).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Próxima/);
    expect(middle).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>(?:<svg[^>]*>.*?<\/svg>)?Anterior/);
  });

  it("há um indicador numerado por pergunta e só o atual é destacado", () => {
    const html = renderAt(1);
    expect((html.match(/data-question-index=/g) ?? []).length).toBe(3);
    expect((html.match(/aria-current="true"/g) ?? []).length).toBe(1);
    expect(html).toMatch(/data-question-index="1"[^>]*aria-current="true"/);
  });

  it("clicar nos indicadores / Anterior / Próxima chama onQuestionChange com o índice certo", () => {
    const calls: number[] = [];
    const tree = EvaluatorEvaluationContent({
      state: { status: "ready", interview: interview3, draft: emptyDraft },
      ui: ui(emptyDraft),
      questionIndex: 1,
      onQuestionChange: (i: number) => calls.push(i),
      onBack: noop,
    }) as any;
    // QuestionPanel é componente: expande a árvore chamando-o com suas props.
    const panelEl = findAll(tree, (n) => typeof n.type === "function" && n.type.name === "QuestionPanel")[0];
    const panel = panelEl.type(panelEl.props) as any;
    const buttons = findAll(panel, (n) => n.type === "button");
    const byIndex = (i: number) => buttons.find((b: any) => b.props["data-question-index"] === i);
    byIndex(0).props.onClick();
    byIndex(2).props.onClick();
    const prev = buttons.find((b: any) => hasText(b.props.children, "Anterior"));
    const next = buttons.find((b: any) => hasText(b.props.children, "Próxima"));
    prev.props.onClick();
    next.props.onClick();
    expect(calls).toEqual([0, 2, 0, 2]);
  });

  it("navegar entre perguntas não mexe no formulário (notas e comentário seguem iguais)", () => {
    const form = formFromDraft(savedDraft);
    const formUi = ui(savedDraft, { form });
    const a = renderAt(0, formUi);
    const b = renderAt(2, formUi);
    for (const html of [a, b]) {
      expect(html).toMatch(/id="criterion-clarity"[^>]*value="8"/);
      expect(html).toContain("Linha 1\nLinha 2");
    }
  });

  it("sem perguntas: aviso e nenhuma navegação", () => {
    const html = renderAt(0, ui(emptyDraft), { ...interview3, questions: [] });
    expect(html).toContain("Nenhuma pergunta registrada.");
    expect(html).not.toContain("data-question-index");
  });
});

describe("contexto da vaga compacto", () => {
  it("mostra título e dados reais em chips; requisitos/atividades em blocos expansíveis", () => {
    const html = renderAt(0);
    expect(html).toContain("Secretária Comercial");
    for (const chip of ["Clínica Exemplo", "Três Lagoas/MS", "Híbrido", "PJ"]) expect(html).toContain(chip);
    expect(html).toMatch(/<details[^>]*>\s*<summary[^>]*>Requisitos \(1\)/);
    expect(html).toMatch(/<details[^>]*>\s*<summary[^>]*>Atividades \(1\)/);
    expect(html).toContain("Pacote Office");
  });

  it("não ocupa a tela com resumo longo: o texto do resumo da vaga não é renderizado", () => {
    const html = renderAt(0, ui(emptyDraft), { ...interview3, context: { ...interview3.context, summary: "RESUMO LONGO DA VAGA" } });
    expect(html).not.toContain("RESUMO LONGO DA VAGA");
  });
});

describe("painel de critérios clicável", () => {
  it("cada critério tem botões 1–10 e as 7 chaves canônicas", () => {
    const html = renderAt(0);
    expect((html.match(/data-score="/g) ?? []).length).toBe(70);
    for (const key of ["clarity", "coherence", "objectivity", "domain_knowledge", "organization", "requirements_alignment", "examples"]) {
      expect(html).toContain(`data-criterion="${key}"`);
    }
  });

  it("clicar numa nota chama onScoreChange(chave canônica, texto da nota)", () => {
    const calls: Array<[string, string]> = [];
    const formUi = ui(emptyDraft, { onScoreChange: (k: string, v: string) => calls.push([k, v]) } as any);
    const tree = EvaluatorEvaluationContent({
      state: { status: "ready", interview: interview3, draft: emptyDraft },
      ui: formUi,
      questionIndex: 0,
      onBack: noop,
    }) as any;
    const formEl = findAll(tree, (n) => typeof n.type === "function" && n.type.name === "EvaluationForm")[0];
    const form = formEl.type(formEl.props) as any;
    const buttons = findAll(form, (n) => n.type === "button" && n.props["data-score"] !== undefined);
    expect(buttons).toHaveLength(70);
    const pick = (criterion: string, n: number) =>
      buttons.find((b: any) => b.props["aria-label"] === `${criterion}: nota ${n}`);
    pick("Clareza", 8).props.onClick();
    pick("Capacidade de exemplificar", 10).props.onClick();
    expect(calls).toEqual([["clarity", "8"], ["examples", "10"]]);
  });

  it("a nota escolhida preenche os botões até ela e marca a seleção exata", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "8";
    const html = renderAt(0, ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    const clarity = html.slice(html.indexOf('data-criterion="clarity"'), html.indexOf('data-criterion="coherence"'));
    expect(clarity).toMatch(/aria-pressed="true"[^>]*aria-label="Clareza: nota 8"/);
    expect((clarity.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    expect((clarity.match(/bg-green-500/g) ?? []).length).toBe(8);
    expect(clarity).toContain("8/10");
  });

  it("decimal continua suportado: 7,5 preenche 1–7, mostra 7,5/10 e nenhum botão fica 'exato'", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "7,5";
    const html = renderAt(0, ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    const clarity = html.slice(html.indexOf('data-criterion="clarity"'), html.indexOf('data-criterion="coherence"'));
    expect(clarity).toContain("7,5/10");
    expect((clarity.match(/bg-blue-500/g) ?? []).length).toBe(7);
    expect(clarity).not.toContain('aria-pressed="true"');
    expect(clarity).toMatch(/id="criterion-clarity"[^>]*value="7,5"/);
  });

  it("0 é aceito pelo campo complementar (nenhum botão preenchido)", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "0";
    const html = renderAt(0, ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    const clarity = html.slice(html.indexOf('data-criterion="clarity"'), html.indexOf('data-criterion="coherence"'));
    expect(clarity).toContain("0/10");
    expect(clarity).not.toMatch(/bg-(green|blue|amber)-500/);
  });

  it("contagem de critérios avaliados e média parcial", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "8";
    form.scores.coherence = "7";
    form.scores.objectivity = "6";
    const html = renderAt(0, ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(html).toMatch(/data-testid="scored-count">3\/7 critérios avaliados/);
    expect(html).toMatch(/data-testid="overall-value">7,0</);
    expect(html).toMatch(/data-testid="overall-label">Prévia</);
  });

  it("sem alterações, a média vem do servidor (7,8) e é rotulada 'Média parcial'", () => {
    const html = renderAt(0, ui(savedDraft), interview3, savedDraft);
    expect(html).toMatch(/data-testid="overall-label">Média parcial</);
    expect(html).toMatch(/data-testid="overall-value">7,8</);
  });

  it("comentário rotulado como 'Comentário do avaliador', com contador", () => {
    const html = renderAt(0, ui(savedDraft));
    expect(html).toContain("Comentário do avaliador");
    expect(html).toMatch(/id="evaluation-summary"/);
    expect(html).toContain("/2000");
  });

  it("botões de nota ficam travados enquanto salva", () => {
    const form = formFromDraft(savedDraft);
    form.scores.clarity = "9";
    const html = renderAt(0, ui(savedDraft, { form, validation: validateForm(form, savedDraft.criteriaScores), dirty: true, saving: true }));
    const buttons = html.match(/<button[^>]*data-score="\d+"[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(70);
    expect(buttons.every((b) => /\sdisabled=""/.test(b))).toBe(true);
  });

  it("layout: painel lateral sticky no desktop, pergunta à esquerda e critérios depois no mobile", () => {
    const html = renderAt(0);
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_380px]");
    expect(html).toContain("xl:sticky");
    expect(html).toContain("xl:overflow-y-auto");
    
    expect(html).not.toMatch(/overflow-x-scroll/);
  });
});

describe("indicação de alterações não salvas", () => {
  it("aparece discreta só quando há alterações pendentes", () => {
    const form = { ...emptyForm() };
    form.scores.clarity = "8";
    const dirtyHtml = renderAt(0, ui(emptyDraft, { form, validation: validateForm(form, {}), dirty: true }));
    expect(dirtyHtml).toMatch(/data-testid="unsaved-indicator"[^>]*>\s*Alterações não salvas\s*</);
    expect(renderAt(0, ui(savedDraft), interview3, savedDraft)).not.toContain("unsaved-indicator");
  });

  it("avisa quando as alterações foram recuperadas do navegador", () => {
    const form = formFromDraft(savedDraft);
    form.scores.clarity = "9";
    const html = renderAt(0, ui(savedDraft, { form, validation: validateForm(form, savedDraft.criteriaScores), dirty: true, restoredFromLocal: true }), interview3, savedDraft);
    expect(html).toContain("recuperadas deste navegador");
    expect(html).toMatch(/id="criterion-clarity"[^>]*value="9"/);
  });

  it("a ação de voltar leva à fila", () => {
    expect(renderAt(0)).toContain("Voltar para a fila");
    expect(renderAt(0)).not.toContain("Voltar para a entrevista");
  });
});

describe("estados visuais do autosave", () => {
  const dirtyUi = (over: Partial<EvaluationFormUi>) => {
    const form = formFromDraft(savedDraft);
    form.scores.clarity = "9";
    return ui(savedDraft, { form, validation: validateForm(form, savedDraft.criteriaScores), dirty: true, ...over });
  };

  it("salvando", () => {
    const html = renderAt(0, dirtyUi({ syncStatus: "saving", saving: true }), interview3, savedDraft);
    expect(html).toMatch(/data-sync="saving"[^>]*>Salvando\.\.\./);
  });

  it("autosave concluído mostra 'Rascunho salvo'", () => {
    const html = renderAt(0, ui(savedDraft, { syncStatus: "saved", lastSave: "auto" }), interview3, savedDraft);
    expect(html).toMatch(/data-sync="saved"[^>]*>Rascunho salvo</);
    expect(html).not.toContain("Salvo automaticamente");
  });

  it("falha do autosave: alterações salvas neste dispositivo (sem banner de erro)", () => {
    const html = renderAt(0, dirtyUi({ syncStatus: "failed", lastSave: "auto" }), interview3, savedDraft);
    expect(html).toMatch(/data-sync="failed"[^>]*>Alterações salvas neste dispositivo/);
    expect(html).not.toContain('role="alert"');
  });

  it("save manual concluído mostra o MESMO texto 'Rascunho salvo' (sem destaque extra)", () => {
    const html = renderAt(0, ui(savedDraft, { syncStatus: "saved", lastSave: "manual" }), interview3, savedDraft);
    expect(html).toMatch(/data-sync="saved"[^>]*>Rascunho salvo</);
    expect(html).not.toContain("Rascunho salvo.");
    expect(html).not.toContain('role="status"');
  });

  it("depois que o aviso some (status exibido 'clean') não resta texto de sucesso", () => {
    const html = renderAt(0, ui(savedDraft, { syncStatus: "clean", lastSave: "auto" }), interview3, savedDraft);
    expect(html).not.toContain("Rascunho salvo");
    expect(html).not.toContain("unsaved-indicator");
  });

  it("'Alterações não salvas' e 'Alterações salvas neste dispositivo' não dependem de timer (sempre renderizadas enquanto o status vale)", () => {
    expect(renderAt(0, dirtyUi({ syncStatus: "dirty" }), interview3, savedDraft)).toContain("Alterações não salvas");
    expect(renderAt(0, dirtyUi({ syncStatus: "invalid" }), interview3, savedDraft)).toContain("Alterações não salvas");
    expect(renderAt(0, dirtyUi({ syncStatus: "failed" }), interview3, savedDraft)).toContain("Alterações salvas neste dispositivo");
  });

  it("não há mais outros textos de sucesso (somente os 4 estados)", () => {
    for (const status of ["dirty", "saving", "saved", "failed"] as const) {
      const html = renderAt(0, dirtyUi({ syncStatus: status }), interview3, savedDraft);
      expect(html).not.toMatch(/Tudo salvo|Rascunho atualizado|Salvo automaticamente|Rascunho salvo\./);
    }
  });

  it("limpo: nenhum texto de sincronização", () => {
    expect(renderAt(0, ui(savedDraft), interview3, savedDraft)).not.toContain("unsaved-indicator");
  });
});
