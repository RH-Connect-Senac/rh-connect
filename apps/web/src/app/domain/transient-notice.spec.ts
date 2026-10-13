import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Scheduler } from "./evaluator-autosave";
import { TRANSIENT_NOTICE_MS, TransientNotice } from "./transient-notice";

function fakeScheduler() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; fn: () => void }>();
  const scheduler: Scheduler = {
    set: (fn, ms) => {
      const id = nextId++;
      tasks.set(id, { at: now + ms, fn });
      return id;
    },
    clear: (handle) => void tasks.delete(handle as number),
  };
  return {
    scheduler,
    pendingTimers: () => tasks.size,
    advance(ms: number) {
      now += ms;
      for (const [id, task] of [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)) {
        if (task.at <= now && tasks.has(id)) {
          tasks.delete(id);
          task.fn();
        }
      }
    },
  };
}

function setup() {
  const clock = fakeScheduler();
  const seen: string[] = [];
  const notice = new TransientNotice((m) => seen.push(m), { scheduler: clock.scheduler });
  return { clock, seen, notice };
}

describe("TransientNotice (sucesso da atribuição do Admin)", () => {
  it("usa ~4 segundos", () => {
    expect(TRANSIENT_NOTICE_MS).toBe(4000);
  });

  it("o sucesso aparece na hora", () => {
    const { notice, seen } = setup();
    notice.show("Entrevista atribuída a Camila Dias.");
    expect(notice.current()).toBe("Entrevista atribuída a Camila Dias.");
    expect(seen).toEqual(["Entrevista atribuída a Camila Dias."]);
  });

  it("some sozinho depois do tempo, e não antes", () => {
    const { notice, clock } = setup();
    notice.show("ok");
    clock.advance(TRANSIENT_NOTICE_MS - 1);
    expect(notice.current()).toBe("ok");
    clock.advance(1);
    expect(notice.current()).toBe("");
    expect(clock.pendingTimers()).toBe(0);
  });

  it("nova mensagem atualiza o texto e reinicia o timer", () => {
    const { notice, clock, seen } = setup();
    notice.show("A");
    clock.advance(3000);
    notice.show("B");
    expect(notice.current()).toBe("B");
    expect(clock.pendingTimers()).toBe(1);
    clock.advance(3000); // 6s desde A, 3s desde B
    expect(notice.current()).toBe("B");
    clock.advance(1000);
    expect(notice.current()).toBe("");
    expect(seen).toEqual(["A", "B", ""]);
  });

  it("mesma mensagem repetida também reinicia a contagem", () => {
    const { notice, clock } = setup();
    notice.show("A");
    clock.advance(3000);
    notice.show("A");
    clock.advance(3000);
    expect(notice.current()).toBe("A");
    clock.advance(1000);
    expect(notice.current()).toBe("");
  });

  it("clear esconde na hora e cancela o timer", () => {
    const { notice, clock } = setup();
    notice.show("A");
    notice.clear();
    expect(notice.current()).toBe("");
    expect(clock.pendingTimers()).toBe(0);
  });

  it("destroy (desmontar) cancela o timer pendente e ignora usos posteriores", () => {
    const { notice, clock, seen } = setup();
    notice.show("A");
    notice.destroy();
    expect(clock.pendingTimers()).toBe(0);
    clock.advance(10000);
    notice.show("B");
    notice.clear();
    expect(clock.pendingTimers()).toBe(0);
    expect(seen).toEqual(["A"]);
  });

  it("guards: tela do Admin usa o aviso só para sucesso; erro segue persistente; sem lógica extra", () => {
    const admin = readFileSync(new URL("../components/admin-screens.tsx", import.meta.url), "utf8");
    const start = admin.indexOf("export function AdminAssignScreen");
    const end = admin.indexOf("// ─── Screen: Cargos e Áreas");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const screen = admin.slice(start, end);
    expect(screen).toContain("new TransientNotice(setAssignNotice)");
    expect(screen).toContain("notice.destroy()");
    expect(screen).toContain("noticeRef.current?.show(`Entrevista atribuída a ${evaluator.name}.`)");
    expect(screen).toContain("setAssignError(result.message)");
    expect(screen).not.toMatch(/setAssignNotice\(`/);
    // request, releitura silenciosa da fila (4.2) e limpeza de seleção
    expect(screen).toContain("assignInterviewToEvaluator(selected, evaluator.id)");
    expect(screen).toContain("setSelected(null);");
    expect(screen).toContain("void live.refresh({ supersede: true });");
    const source = readFileSync(new URL("./transient-notice.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });
});
