import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EMPTY_NEW_IDS,
  NEW_ITEM_ENTER_CLASS,
  NewItemTracker,
} from "./new-item-tracker";

const list = (...ids: string[]) => ids.map((id) => ({ id }));
const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe("NewItemTracker", () => {
  it("carga inicial não marca ninguém como novo", () => {
    const t = new NewItemTracker();
    expect(t.observe(list("A", "B", "C")).size).toBe(0);
  });

  it("refresh com os mesmos ids não marca nada", () => {
    const t = new NewItemTracker();
    t.observe(list("A", "B"));
    expect(t.observe(list("A", "B")).size).toBe(0);
  });

  it("refresh com id novo marca somente o novo", () => {
    const t = new NewItemTracker();
    t.observe(list("A", "B"));
    expect(sorted(t.observe(list("A", "B", "C")))).toEqual(["C"]);
  });

  it("dois itens novos marcam somente esses dois", () => {
    const t = new NewItemTracker();
    t.observe(list("A"));
    expect(sorted(t.observe(list("A", "B", "C")))).toEqual(["B", "C"]);
  });

  it("polling seguinte com os mesmos ids não anima novamente", () => {
    const t = new NewItemTracker();
    t.observe(list("A", "B"));
    expect(sorted(t.observe(list("A", "B", "C")))).toEqual(["C"]);
    expect(t.observe(list("A", "B", "C")).size).toBe(0);
  });

  it("item removido não é novo e, se voltar, conta como novo", () => {
    const t = new NewItemTracker();
    t.observe(list("A", "B"));
    expect(t.observe(list("A")).size).toBe(0);
    expect(sorted(t.observe(list("A", "B")))).toEqual(["B"]);
  });

  it("mesma referência de lista devolve o mesmo resultado (render duplicado)", () => {
    const t = new NewItemTracker();
    t.observe(list("A"));
    const next = list("A", "B");
    const first = t.observe(next);
    expect(sorted(first)).toEqual(["B"]);
    expect(sorted(t.observe(next))).toEqual(["B"]);
  });

  it("erro de refresh (nenhuma observação) não altera os ids conhecidos; sucesso posterior segue", () => {
    const t = new NewItemTracker();
    t.observe(list("A", "B"));
    // refresh com erro: o estado anterior é mantido e nada é observado.
    expect(sorted(t.observe(list("A", "B", "C")))).toEqual(["C"]);
    expect(sorted(t.observe(list("A", "B", "C", "D")))).toEqual(["D"]);
  });

  it("lista inicial vazia vira linha de base: o primeiro item depois dela é novo", () => {
    const t = new NewItemTracker();
    expect(t.observe([]).size).toBe(0);
    expect(sorted(t.observe(list("A")))).toEqual(["A"]);
  });

  it("EMPTY_NEW_IDS é vazio", () => {
    expect(EMPTY_NEW_IDS.size).toBe(0);
  });
});

describe("guards da microanimação", () => {
  const dir = new URL("../components/", import.meta.url);
  const read = (f: string) => readFileSync(new URL(f, dir), "utf8");
  const content = read("evaluator-real-content.tsx");
  const screens = read("evaluator-real-screens.tsx");

  it("classe só respeita movimento reduzido (motion-safe) e usa fade + 8px, sem bounce/pulse", () => {
    for (const token of NEW_ITEM_ENTER_CLASS.split(" ")) expect(token.startsWith("motion-safe:")).toBe(true);
    expect(NEW_ITEM_ENTER_CLASS).toContain("fade-in");
    expect(NEW_ITEM_ENTER_CLASS).toContain("slide-in-from-bottom-2");
    expect(NEW_ITEM_ENTER_CLASS).not.toMatch(/bounce|pulse|ping|spin|zoom|scale/);
  });

  it("a classe só é aplicada aos ids marcados como novos", () => {
    expect(content).toContain("newIds?.has(item.id)");
    expect(content).toContain("NEW_ITEM_ENTER_CLASS");
    expect(content.match(/NEW_ITEM_ENTER_CLASS/g)!.length).toBe(2); // import + uso
  });

  it("tracker é alimentado pelo estado já sincronizado, sem storage e sem mexer no polling", () => {
    expect(screens).toContain("new NewItemTracker()");
    expect(screens).toContain("observe(state.items)");
    const tracker = readFileSync(new URL("./new-item-tracker.ts", import.meta.url), "utf8");
    expect(tracker).not.toMatch(/localStorage|sessionStorage|fetch\(|setInterval|setTimeout/);
  });

  it("Dashboard e Fila recebem newIds; Em Andamento e Histórico não animam", () => {
    expect(screens.match(/newIds=\{newIds\}/g)!.length).toBe(2);
    expect(read("evaluator-active-content.tsx")).not.toContain("newIds");
    expect(read("evaluator-history-content.tsx")).not.toContain("newIds");
  });
});
