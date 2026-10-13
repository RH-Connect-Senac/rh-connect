import { beforeEach, describe, expect, it } from "vitest";
import {
  ANSWER_DRAFTS_KEY,
  INTERVIEW_URL_PREFILL_KEY,
  clearAnswerDraft,
  clearAnswerDraftsForInterview,
  clearInterviewUrlPrefill,
  deriveHighestReachedIndex,
  getQuestionNavState,
  isQuestionNavigable,
  type QuestionNavState,
  getAnswerDraft,
  normalizeInterviewAnswer,
  peekInterviewUrlPrefill,
  resolveLinkCopyEffect,
  shouldShowCopiedLinkNotice,
  resolveAnswerText,
  resolveInitialQuestionIndex,
  resolveRestoredAnswer,
  saveAnswerDraft,
  storeInterviewUrlPrefill,
  type AnswerDraftScope,
  type StorageLike,
} from "./interview-ux-state";

function memoryStorage(): StorageLike & { dump(): Record<string, string> } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    dump: () => Object.fromEntries(data),
  };
}

const scope = (overrides: Partial<AnswerDraftScope> = {}): AnswerDraftScope => ({
  candidateId: "cand-1",
  interviewId: "int-A",
  questionId: "q-3",
  ...overrides,
});

let storage: ReturnType<typeof memoryStorage>;
beforeEach(() => {
  storage = memoryStorage();
});

describe("quebras de linha da resposta", () => {
  it("preserva parágrafos: não vira uma linha só", () => {
    const text = "Primeiro parágrafo.\nSegundo parágrafo.";
    expect(normalizeInterviewAnswer(text)).toBe(text);
    expect(normalizeInterviewAnswer(text)).not.toBe("Primeiro parágrafo. Segundo parágrafo.");
  });
  it("CRLF com linha em branco vira LF duplo", () => {
    expect(normalizeInterviewAnswer("linha 1\r\n\r\nlinha 2")).toBe("linha 1\n\nlinha 2");
  });
  it("preserva linha em branco entre parágrafos", () => {
    expect(normalizeInterviewAnswer("a\n\nb")).toBe("a\n\nb");
  });
  it("unifica CRLF/CR em LF sem transformar em espaço", () => {
    expect(normalizeInterviewAnswer("a\r\nb\rc")).toBe("a\nb\nc");
  });
  it("é idempotente (salvar/reler/restaurar não altera o texto)", () => {
    const once = normalizeInterviewAnswer("x\r\n\r\ny");
    expect(normalizeInterviewAnswer(once)).toBe(once);
  });
  it("o rascunho em edição guarda as quebras e as devolve após reload", () => {
    const storage = memoryStorage();
    const text = "Linha 1\nLinha 2";
    saveAnswerDraft(scope(), normalizeInterviewAnswer(text), "", storage);
    expect(resolveAnswerText("", getAnswerDraft(scope(), storage)).text).toBe(text);
  });
});

describe("pergunta reaberta após reload", () => {
  it("restaura a pergunta salva quando a página é recarregada na etapa de respostas", () => {
    expect(resolveInitialQuestionIndex({ restoredIndex: 2, urlIndex: 0, questionCount: 5 })).toBe(2);
  });
  it("ao chegar de outra tela vale o ?question= (revisão/retomar)", () => {
    expect(resolveInitialQuestionIndex({ urlIndex: 3, questionCount: 5 })).toBe(3);
  });
  it("sem nada salvo começa na primeira e sempre respeita o intervalo", () => {
    expect(resolveInitialQuestionIndex({ urlIndex: 0, questionCount: 5 })).toBe(0);
    expect(resolveInitialQuestionIndex({ restoredIndex: 9, urlIndex: 0, questionCount: 5 })).toBe(4);
    expect(resolveInitialQuestionIndex({ restoredIndex: -2, urlIndex: 0, questionCount: 5 })).toBe(0);
    expect(resolveInitialQuestionIndex({ restoredIndex: 2, urlIndex: 0, questionCount: 0 })).toBe(0);
  });
});

describe("Copiar link na Nova entrevista", () => {
  const A = "https://www.empregare.com/pt-br/vaga-a_1";
  const B = "https://www.empregare.com/pt-br/vaga-b_2";
  it("sempre coloca a URL copiada no input, mesmo havendo outra (A -> B -> A)", () => {
    expect(resolveLinkCopyEffect(A, null).nextUrl).toBe(A);
    expect(resolveLinkCopyEffect(B, A).nextUrl).toBe(B);
    expect(resolveLinkCopyEffect(A, B).nextUrl).toBe(A);
  });
  it("contexto de OUTRA vaga é invalidado (exige nova análise)", () => {
    expect(resolveLinkCopyEffect(B, A).invalidateContext).toBe(true);
  });
  it("a mesma URL da vaga carregada mantém o contexto", () => {
    expect(resolveLinkCopyEffect(A, A).invalidateContext).toBe(false);
    expect(resolveLinkCopyEffect(A, `  ${A} `).invalidateContext).toBe(false);
  });
  it("sem contexto carregado não há o que invalidar", () => {
    expect(resolveLinkCopyEffect(A, undefined).invalidateContext).toBe(false);
    expect(resolveLinkCopyEffect(A, "").invalidateContext).toBe(false);
  });
});

describe("prefill da URL ao copiar a vaga (sessionStorage)", () => {
  it("registra a URL copiada e a nova entrevista consegue usá-la", () => {
    storeInterviewUrlPrefill("https://www.empregare.com/pt-br/vaga-x_1", storage);
    expect(peekInterviewUrlPrefill(storage)).toBe("https://www.empregare.com/pt-br/vaga-x_1");
  });
  it("ler não remove (seguro com render duplo); limpar remove", () => {
    storeInterviewUrlPrefill("https://a.example.com/v", storage);
    peekInterviewUrlPrefill(storage);
    expect(peekInterviewUrlPrefill(storage)).not.toBeNull();
    clearInterviewUrlPrefill(storage);
    expect(peekInterviewUrlPrefill(storage)).toBeNull();
  });
  it("só aceita http(s); ignora valores inválidos e usa chave separada do rascunho do wizard", () => {
    storeInterviewUrlPrefill("javascript:alert(1)", storage);
    storeInterviewUrlPrefill("não é url", storage);
    expect(peekInterviewUrlPrefill(storage)).toBeNull();
    storeInterviewUrlPrefill("https://a.example.com/v", storage);
    expect(Object.keys(storage.dump())).toEqual([INTERVIEW_URL_PREFILL_KEY]);
    expect(INTERVIEW_URL_PREFILL_KEY).not.toContain("interview-draft");
  });
  it("sem storage disponível não lança", () => {
    expect(() => storeInterviewUrlPrefill("https://a.example.com/v", null)).not.toThrow();
    expect(peekInterviewUrlPrefill(null)).toBeNull();
  });
});

describe("rascunho da resposta em edição", () => {
  it("o texto em edição pode ser restaurado após reload", () => {
    saveAnswerDraft(scope(), "meu texto ainda não enviado", "", storage);
    const draft = getAnswerDraft(scope(), storage);
    expect(resolveAnswerText("", draft)).toEqual({ text: "meu texto ainda não enviado", source: "draft" });
  });

  it("a chave é por candidato + entrevista + pergunta", () => {
    saveAnswerDraft(scope(), "x", "", storage);
    expect(getAnswerDraft(scope({ questionId: "q-4" }), storage)).toBeNull();
    expect(getAnswerDraft(scope({ candidateId: "cand-2" }), storage)).toBeNull();
    expect(getAnswerDraft(scope({ interviewId: "int-B" }), storage)).toBeNull();
  });

  it("a resposta do Back tem prioridade sobre rascunho antigo", () => {
    saveAnswerDraft(scope(), "rascunho velho", "versão 1", storage);
    const draft = getAnswerDraft(scope(), storage);
    // O servidor mudou desde que o rascunho nasceu (ex.: salvo em outra aba).
    expect(resolveAnswerText("versão 2 mais nova", draft)).toEqual({ text: "versão 2 mais nova", source: "server" });
    // Sem evidência de edição posterior: usa o Back.
    expect(resolveAnswerText("versão 1", null)).toEqual({ text: "versão 1", source: "server" });
  });

  it("rascunho igual ao que o Back já tem não é guardado nem usado", () => {
    saveAnswerDraft(scope(), "igual ", "igual", storage);
    expect(getAnswerDraft(scope(), storage)).toBeNull();
  });

  it("edição em cima de uma resposta já salva é recuperável", () => {
    saveAnswerDraft(scope(), "salva + edição", "salva", storage);
    expect(resolveAnswerText("salva", getAnswerDraft(scope(), storage)).source).toBe("draft");
  });

  it("mantém a base original enquanto o usuário continua digitando", () => {
    saveAnswerDraft(scope(), "a", "base", storage);
    saveAnswerDraft(scope(), "ab", "base", storage);
    expect(getAnswerDraft(scope(), storage)?.base).toBe("base");
  });

  it("falha de API: o rascunho NÃO é limpo (só a confirmação do Back o limpa)", () => {
    saveAnswerDraft(scope(), "texto que falhou ao salvar", "", storage);
    // (nenhuma chamada a clearAnswerDraft quando a API falha)
    expect(getAnswerDraft(scope(), storage)?.text).toBe("texto que falhou ao salvar");
  });

  it("confirmação do Back limpa o rascunho daquela pergunta", () => {
    saveAnswerDraft(scope(), "t", "", storage);
    saveAnswerDraft(scope({ questionId: "q-4" }), "u", "", storage);
    clearAnswerDraft(scope(), storage);
    expect(getAnswerDraft(scope(), storage)).toBeNull();
    expect(getAnswerDraft(scope({ questionId: "q-4" }), storage)?.text).toBe("u");
  });

  it("envio final limpa todos os rascunhos daquela entrevista (e remove a chave se vazio)", () => {
    saveAnswerDraft(scope(), "t", "", storage);
    saveAnswerDraft(scope({ questionId: "q-4" }), "u", "", storage);
    clearAnswerDraftsForInterview("cand-1", "int-A", storage);
    expect(getAnswerDraft(scope(), storage)).toBeNull();
    expect(storage.dump()[ANSWER_DRAFTS_KEY]).toBeUndefined();
  });

  it("rascunhos de entrevista antiga não vazam para uma nova vaga", () => {
    saveAnswerDraft(scope({ interviewId: "int-old" }), "velho", "", storage);
    saveAnswerDraft(scope({ interviewId: "int-keep" }), "outra", "", storage);
    clearAnswerDraftsForInterview("cand-1", "int-old", storage);
    expect(getAnswerDraft(scope({ interviewId: "int-new" }), storage)).toBeNull();
    expect(getAnswerDraft(scope({ interviewId: "int-old" }), storage)).toBeNull();
    expect(getAnswerDraft(scope({ interviewId: "int-keep" }), storage)?.text).toBe("outra");
    // sem interviewId nada é apagado
    clearAnswerDraftsForInterview("cand-1", undefined, storage);
    expect(getAnswerDraft(scope({ interviewId: "int-keep" }), storage)).not.toBeNull();
  });

  it("descarta rascunhos expirados (storage não cresce indefinidamente)", () => {
    const t0 = 1_000_000;
    saveAnswerDraft(scope(), "velho", "", storage, t0);
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    expect(getAnswerDraft(scope(), storage, t0 + eightDays)).toBeNull();
  });

  it("storage corrompido ou indisponível não quebra", () => {
    storage.setItem(ANSWER_DRAFTS_KEY, "{lixo");
    expect(getAnswerDraft(scope(), storage)).toBeNull();
    expect(() => saveAnswerDraft(scope(), "x", "", null)).not.toThrow();
  });
});

describe("aviso de link preenchido (Copiar link)", () => {
  const copied = "https://www.empregare.com/pt-br/vaga-a_1";

  it("aparece quando o campo contém a URL copiada", () => {
    expect(shouldShowCopiedLinkNotice(copied, copied)).toBe(true);
  });

  it("não aparece para URL digitada/colada (nada copiado)", () => {
    expect(shouldShowCopiedLinkNotice(null, copied)).toBe(false);
    expect(shouldShowCopiedLinkNotice(undefined, copied)).toBe(false);
    expect(shouldShowCopiedLinkNotice("", "")).toBe(false);
  });

  it("some se o usuário editar ou limpar o campo", () => {
    expect(shouldShowCopiedLinkNotice(copied, copied + "x")).toBe(false);
    expect(shouldShowCopiedLinkNotice(copied, "")).toBe(false);
    expect(shouldShowCopiedLinkNotice(copied, "https://outra.com/vaga")).toBe(false);
  });
});

describe("painel Progresso: navegação x resposta", () => {
  const COUNT = 5;
  // answers: índices com resposta válida; current: pergunta aberta; stored: maior alcançada guardada.
  const states = (input: { current: number; answers: number[]; stored?: number }): QuestionNavState[] => {
    const highestReached = deriveHighestReachedIndex({
      storedHighest: input.stored,
      currentIndex: input.current,
      answeredIndexes: input.answers,
      questionCount: COUNT,
    });
    return Array.from({ length: COUNT }, (_, index) =>
      getQuestionNavState({ index, currentIndex: input.current, highestReached, answered: input.answers.includes(index) }),
    );
  };
  const clickable = (list: QuestionNavState[]) => list.map(isQuestionNavigable);

  it("P1 e P2 respondidas, P3 atual: P4 e P5 seguem bloqueadas", () => {
    const list = states({ current: 2, answers: [0, 1] });
    expect(list).toEqual(["ANSWERED", "ANSWERED", "CURRENT", "LOCKED", "LOCKED"]);
    expect(clickable(list)).toEqual([true, true, true, false, false]);
  });

  it("a pergunta atual é clicável, mesmo vazia", () => {
    const list = states({ current: 0, answers: [] });
    expect(list[0]).toBe("CURRENT");
    expect(isQuestionNavigable(list[0])).toBe(true);
  });

  it("apagar a resposta de pergunta já visitada: Pendente, clicável, NUNCA volta a Bloqueada", () => {
    // estava na P3 (alcançada), voltou à P1 e apagou a resposta
    const list = states({ current: 0, answers: [1], stored: 2 });
    expect(list).toEqual(["CURRENT", "ANSWERED", "VISITED_PENDING", "LOCKED", "LOCKED"]);
    // saiu da P1 vazia, indo para a P2
    const leaving = states({ current: 1, answers: [], stored: 2 });
    expect(leaving[0]).toBe("VISITED_PENDING");
    expect(isQuestionNavigable(leaving[0])).toBe(true);
  });

  it("resposta posterior continua acessível com uma anterior Pendente", () => {
    const list = states({ current: 2, answers: [1], stored: 2 });
    expect(list[0]).toBe("VISITED_PENDING");
    expect(list[1]).toBe("ANSWERED");
    expect(clickable(list).slice(0, 3)).toEqual([true, true, true]);
  });

  it("pergunta futura nunca alcançada continua bloqueada", () => {
    const list = states({ current: 0, answers: [], stored: 0 });
    expect(list.slice(1)).toEqual(["LOCKED", "LOCKED", "LOCKED", "LOCKED"]);
    expect(clickable(list)).toEqual([true, false, false, false, false]);
  });

  it("F5: o maior índice guardado mantém as já alcançadas acessíveis (e as futuras bloqueadas)", () => {
    const list = states({ current: 1, answers: [], stored: 3 });
    expect(list).toEqual(["VISITED_PENDING", "CURRENT", "VISITED_PENDING", "VISITED_PENDING", "LOCKED"]);
  });

  it("rascunho antigo sem o valor guardado: as respondidas contam como alcançadas", () => {
    expect(deriveHighestReachedIndex({ currentIndex: 0, answeredIndexes: [0, 1, 2], questionCount: COUNT })).toBe(3);
  });

  it("F5: com Q1 e Q2 oficiais, a Q3 (sem resposta) fica acessível mesmo com índice local antigo", () => {
    expect(deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes: [0, 1], questionCount: COUNT })).toBe(2);
    const list = states({ current: 0, answers: [0, 1], stored: 0 });
    expect(list[2]).not.toBe("LOCKED");
    expect(list[3]).toBe("LOCKED");
  });

  it("highestReached local antigo nunca reduz o progresso derivado do servidor", () => {
    expect(deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes: [0, 1, 2], questionCount: COUNT })).toBe(3);
    expect(deriveHighestReachedIndex({ storedHighest: 4, currentIndex: 0, answeredIndexes: [0], questionCount: COUNT })).toBe(4);
  });

  it("rascunho remoto só da Q3 libera a Q3 mas não a conta como respondida", () => {
    const highest = deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes: [0, 1], draftedIndexes: [2], questionCount: COUNT });
    expect(highest).toBe(2);
    const list = states({ current: 0, answers: [0, 1], stored: 0 });
    expect(list.filter((state) => state === "ANSWERED").length).toBe(1);
    expect(list[1]).toBe("ANSWERED");
    expect(list[2]).toBe("VISITED_PENDING");
  });

  it("valor guardado inválido ou fora do intervalo é saneado", () => {
    expect(deriveHighestReachedIndex({ storedHighest: 99, currentIndex: 0, answeredIndexes: [], questionCount: COUNT })).toBe(4);
    expect(deriveHighestReachedIndex({ storedHighest: -3, currentIndex: 1, answeredIndexes: [], questionCount: COUNT })).toBe(1);
    expect(deriveHighestReachedIndex({ storedHighest: 1.5, currentIndex: 0, answeredIndexes: [], questionCount: COUNT })).toBe(0);
  });

  it("alcançada não é respondida: o contador usa só respostas válidas", () => {
    const list = states({ current: 0, answers: [1], stored: 2 });
    expect(list.filter((state) => state === "ANSWERED").length).toBe(1);
  });
});

describe("precedência ao abrir a pergunta: oficial > rascunho local > rascunho do Back", () => {
  const noRemote = { text: null, version: 0 };

  it("guarda a versão do rascunho do Back conhecida na edição (baseVersion)", () => {
    saveAnswerDraft(scope(), "texto", "", storage, 1_000, 4);
    expect(getAnswerDraft(scope(), storage, 1_000)?.baseVersion).toBe(4);
    // sem baseVersion (rascunhos antigos) continua válido
    saveAnswerDraft(scope({ questionId: "q-9" }), "texto", "", storage, 1_000);
    expect(getAnswerDraft(scope({ questionId: "q-9" }), storage, 1_000)?.baseVersion).toBeUndefined();
  });

  it("outro dispositivo: sem cópia local, o rascunho do Back é restaurado", () => {
    const resolved = resolveRestoredAnswer({
      official: null,
      remote: { text: "texto do dispositivo A", version: 3 },
      local: null,
    });
    expect(resolved).toEqual({ text: "texto do dispositivo A", source: "remote-draft", discardLocal: false });
  });

  it("sem rascunho nenhum vale a resposta oficial", () => {
    expect(resolveRestoredAnswer({ official: "oficial", remote: noRemote, local: null })).toEqual({
      text: "oficial",
      source: "official",
      discardLocal: false,
    });
  });

  it("rascunho do Back igual à resposta oficial é ignorado", () => {
    const resolved = resolveRestoredAnswer({ official: "mesmo", remote: { text: "mesmo ", version: 2 }, local: null });
    expect(resolved.source).toBe("official");
  });

  it("cópia local MAIS NOVA (mesma versão do Back, texto diferente) é preservada", () => {
    saveAnswerDraft(scope(), "offline mais novo", "", storage, 1_000, 3);
    const resolved = resolveRestoredAnswer({
      official: "",
      remote: { text: "último que o Back recebeu", version: 3 },
      local: getAnswerDraft(scope(), storage, 1_000),
    });
    expect(resolved).toEqual({ text: "offline mais novo", source: "local-draft", discardLocal: false });
  });

  it("cópia local VELHA (outro dispositivo salvou depois) é descartada e o Back vence", () => {
    saveAnswerDraft(scope(), "meu texto velho", "", storage, 1_000, 3);
    const resolved = resolveRestoredAnswer({
      official: "",
      remote: { text: "texto do outro dispositivo", version: 5 },
      local: getAnswerDraft(scope(), storage, 1_000),
    });
    expect(resolved).toEqual({ text: "texto do outro dispositivo", source: "remote-draft", discardLocal: true });
  });

  it("rascunho local de uma resposta oficial que mudou é velho: vale a oficial", () => {
    saveAnswerDraft(scope(), "rascunho velho", "versão 1", storage, 1_000, 0);
    const resolved = resolveRestoredAnswer({
      official: "versão 2 mais nova",
      remote: noRemote,
      local: getAnswerDraft(scope(), storage, 1_000),
    });
    expect(resolved).toEqual({ text: "versão 2 mais nova", source: "official", discardLocal: true });
  });

  it("rascunho local sem baseVersion (legado) só vale se o Back não tem rascunho", () => {
    saveAnswerDraft(scope(), "legado", "", storage, 1_000);
    const local = getAnswerDraft(scope(), storage, 1_000);
    expect(resolveRestoredAnswer({ official: "", remote: noRemote, local }).source).toBe("local-draft");
    expect(resolveRestoredAnswer({ official: "", remote: { text: "do Back", version: 2 }, local }).source).toBe("remote-draft");
  });

  it("rascunho remoto limpo (confirmado/limpo em outro dispositivo) descarta cópia local velha", () => {
    saveAnswerDraft(scope(), "antigo", "", storage, 1_000, 2);
    const resolved = resolveRestoredAnswer({
      official: "",
      remote: { text: null, version: 4 },
      local: getAnswerDraft(scope(), storage, 1_000),
    });
    expect(resolved.source).toBe("official");
    expect(resolved.discardLocal).toBe(true);
  });

  it("rascunho NUNCA vira resposta: o estado de navegação depende só da resposta oficial", () => {
    // Pergunta já alcançada, com rascunho local/remoto mas sem resposta oficial => pendente.
    expect(
      getQuestionNavState({ index: 1, currentIndex: 2, highestReached: 2, answered: false }),
    ).toBe("VISITED_PENDING");
    expect(
      getQuestionNavState({ index: 1, currentIndex: 2, highestReached: 2, answered: true }),
    ).toBe("ANSWERED");
  });
});
