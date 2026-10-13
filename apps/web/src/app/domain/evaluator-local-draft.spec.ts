import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_DRAFT_NAMESPACE,
  applyLocalDraft,
  clearLocalDraft,
  clearLocalDraftOnCompletion,
  localDraftKey,
  readLocalDraft,
  restoreForm,
  syncLocalDraft,
  writeLocalDraft,
  type StorageLike,
} from "./evaluator-local-draft";
import {
  emptyForm,
  formFromDraft,
  type EvaluationDraft,
} from "./evaluator-evaluation-form";

const USER = "user-beatriz";
const OTHER_USER = "user-carlos";
const ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const serverDraft: EvaluationDraft = {
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: { clarity: 8 },
  summary: "Do servidor",
  overallScore: 8,
  updatedAt: "2026-10-10T10:00:00.000Z",
};

const serverForm = () => formFromDraft(serverDraft);

function typed() {
  const form = serverForm();
  form.scores.clarity = "9";
  form.scores.coherence = "7,5";
  form.summary = "Digitado\nlocalmente";
  return form;
}

describe("rascunho local: chave e isolamento", () => {
  it("namespace novo e chave = namespace + userId + interviewId", () => {
    expect(LOCAL_DRAFT_NAMESPACE).toBe("rhconnect:evaluator-evaluation-draft:v1");
    expect(localDraftKey(USER, ID)).toBe(`${LOCAL_DRAFT_NAMESPACE}:${USER}:${ID}`);
  });

  it("é isolado por usuário e por entrevista", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    expect(readLocalDraft(storage, USER, ID)).not.toBeNull();
    expect(readLocalDraft(storage, OTHER_USER, ID)).toBeNull();
    expect(readLocalDraft(storage, USER, OTHER_ID)).toBeNull();
    expect(storage.data.size).toBe(1);
  });

  it("não usa o storage antigo de mocks: só chaves do namespace novo", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    expect([...storage.data.keys()].every((k) => k.startsWith(`${LOCAL_DRAFT_NAMESPACE}:`))).toBe(true);
  });

  it("sem userId (sem sessão) ou sem storage: não grava nem lê", () => {
    const storage = memoryStorage();
    expect(writeLocalDraft(storage, "", ID, typed())).toBe(false);
    expect(writeLocalDraft(null, USER, ID, typed())).toBe(false);
    expect(storage.data.size).toBe(0);
    expect(readLocalDraft(null, USER, ID)).toBeNull();
  });
});

describe("rascunho local: conteúdo gravado", () => {
  it("grava SÓ criteriaScores (texto digitado) e summary", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    const saved = JSON.parse(storage.data.get(localDraftKey(USER, ID)) as string);
    expect(Object.keys(saved).sort()).toEqual(["criteriaScores", "summary", "version"]);
    expect(saved.criteriaScores.clarity).toBe("9");
    expect(saved.criteriaScores.coherence).toBe("7,5");
    expect(saved.summary).toBe("Digitado\nlocalmente");
    expect(Object.keys(saved.criteriaScores).sort()).toEqual([
      "clarity", "coherence", "domain_knowledge", "examples", "objectivity", "organization", "requirements_alignment",
    ]);
  });

  it("não guarda candidato, vaga, perguntas, respostas, nota geral nem sessão", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    const raw = storage.data.get(localDraftKey(USER, ID)) as string;
    for (const word of ["candidate", "Maria", "context", "questions", "answer", "overallScore", "email", "token", "interview"]) {
      expect(raw).not.toContain(word);
    }
  });

  it("conteúdo corrompido ou de outro formato é ignorado", () => {
    const storage = memoryStorage();
    const key = localDraftKey(USER, ID);
    for (const raw of [
      "não é json",
      "null",
      JSON.stringify({ version: 2, criteriaScores: {}, summary: "" }),
      JSON.stringify({ version: 1, criteriaScores: { clarity: 8 }, summary: "" }),
      JSON.stringify({ version: 1, criteriaScores: [], summary: "" }),
      JSON.stringify({ version: 1, criteriaScores: {}, summary: 5 }),
    ]) {
      storage.setItem(key, raw);
      expect(readLocalDraft(storage, USER, ID)).toBeNull();
    }
  });

  it("chaves desconhecidas dentro de criteriaScores não entram", () => {
    const storage = memoryStorage();
    storage.setItem(
      localDraftKey(USER, ID),
      JSON.stringify({ version: 1, criteriaScores: { clarity: "8", hack: "10" }, summary: "x" }),
    );
    const local = readLocalDraft(storage, USER, ID);
    expect(local?.criteriaScores).toEqual({ clarity: "8" });
  });

  it("storage que lança nunca quebra a avaliação", () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("cheio"); },
      removeItem: () => { throw new Error("bloqueado"); },
    };
    expect(writeLocalDraft(broken, USER, ID, typed())).toBe(false);
    expect(readLocalDraft(broken, USER, ID)).toBeNull();
    expect(() => clearLocalDraft(broken, USER, ID)).not.toThrow();
  });
});

describe("rascunho local: criar ao alterar (syncLocalDraft)", () => {
  it("alterar uma nota cria o rascunho local", () => {
    const storage = memoryStorage();
    const form = serverForm();
    form.scores.coherence = "6";
    syncLocalDraft(storage, USER, ID, form, serverForm());
    expect(readLocalDraft(storage, USER, ID)?.criteriaScores.coherence).toBe("6");
  });

  it("alterar um decimal cria o rascunho local", () => {
    const storage = memoryStorage();
    const form = serverForm();
    form.scores.clarity = "8,5";
    syncLocalDraft(storage, USER, ID, form, serverForm());
    expect(readLocalDraft(storage, USER, ID)?.criteriaScores.clarity).toBe("8,5");
  });

  it("alterar o comentário cria o rascunho local (quebras de linha preservadas)", () => {
    const storage = memoryStorage();
    const form = serverForm();
    form.summary = "linha 1\nlinha 2";
    syncLocalDraft(storage, USER, ID, form, serverForm());
    expect(readLocalDraft(storage, USER, ID)?.summary).toBe("linha 1\nlinha 2");
  });

  it("voltar ao valor do servidor apaga o rascunho local (nada pendente)", () => {
    const storage = memoryStorage();
    const form = serverForm();
    form.scores.clarity = "5";
    syncLocalDraft(storage, USER, ID, form, serverForm());
    expect(storage.data.size).toBe(1);
    syncLocalDraft(storage, USER, ID, serverForm(), serverForm());
    expect(storage.data.size).toBe(0);
  });

  it("digitar NUNCA dispara PUT: a sincronização local não conhece a API", () => {
    const save = vi.fn();
    const storage = memoryStorage();
    const form = serverForm();
    for (const value of ["1", "12", "123", "7,5"]) {
      form.scores.clarity = value;
      syncLocalDraft(storage, USER, ID, form, serverForm());
    }
    expect(save).not.toHaveBeenCalled();
  });
});

describe("rascunho local: restaurar ao abrir", () => {
  it("aplica os campos locais POR CIMA do rascunho real do servidor", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    const result = restoreForm(storage, USER, ID, serverForm());
    expect(result.restored).toBe(true);
    expect(result.form.scores.clarity).toBe("9");
    expect(result.form.scores.coherence).toBe("7,5");
    expect(result.form.summary).toBe("Digitado\nlocalmente");
    // campos que o local não alterou continuam como o servidor devolveu
    expect(result.form.scores.objectivity).toBe("");
  });

  it("sem cópia local, o formulário é exatamente o do servidor", () => {
    const result = restoreForm(memoryStorage(), USER, ID, serverForm());
    expect(result.restored).toBe(false);
    expect(result.form).toEqual(serverForm());
  });

  it("cópia local igual ao servidor é descartada (nada a recuperar)", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, serverForm());
    const result = restoreForm(storage, USER, ID, serverForm());
    expect(result.restored).toBe(false);
    expect(storage.data.size).toBe(0);
  });

  it("a cópia de outro usuário ou de outra entrevista nunca é aplicada", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, OTHER_USER, ID, typed());
    writeLocalDraft(storage, USER, OTHER_ID, typed());
    const result = restoreForm(storage, USER, ID, serverForm());
    expect(result.restored).toBe(false);
    expect(result.form).toEqual(serverForm());
  });

  it("applyLocalDraft só mexe em notas e comentário", () => {
    const merged = applyLocalDraft(serverForm(), {
      version: 1,
      criteriaScores: { clarity: "3" },
      summary: "novo",
    });
    expect(Object.keys(merged).sort()).toEqual(["scores", "summary"]);
    expect(merged.scores.clarity).toBe("3");
    expect(merged.summary).toBe("novo");
  });
});

describe("rascunho local: limpeza", () => {
  it("limpar uma avaliação não afeta as de outra entrevista/usuário", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    writeLocalDraft(storage, USER, OTHER_ID, typed());
    writeLocalDraft(storage, OTHER_USER, ID, typed());
    clearLocalDraft(storage, USER, ID);
    expect(readLocalDraft(storage, USER, ID)).toBeNull();
    expect(readLocalDraft(storage, USER, OTHER_ID)).not.toBeNull();
    expect(readLocalDraft(storage, OTHER_USER, ID)).not.toBeNull();
  });

  it("gancho da conclusão futura apaga a cópia local em definitivo", () => {
    const storage = memoryStorage();
    writeLocalDraft(storage, USER, ID, typed());
    clearLocalDraftOnCompletion(storage, USER, ID);
    expect(storage.data.size).toBe(0);
  });

  it("emptyForm continua sem pendências e não cria cópia", () => {
    const storage = memoryStorage();
    syncLocalDraft(storage, USER, ID, emptyForm(), emptyForm());
    expect(storage.data.size).toBe(0);
  });
});
