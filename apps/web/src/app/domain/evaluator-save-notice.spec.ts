import { describe, expect, it } from "vitest";
import {
  SAVED_NOTICE_MS,
  SavedNotice,
  visibleSyncStatus,
} from "./evaluator-save-notice";
import { describeSync, type Scheduler } from "./evaluator-autosave";

// Relógio falso determinístico.
function fakeClock() {
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
    pending: () => tasks.size,
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
  const clock = fakeClock();
  const changes: boolean[] = [];
  const notice = new SavedNotice((v) => changes.push(v), { scheduler: clock.scheduler });
  return { clock, changes, notice };
}

describe("aviso 'Rascunho salvo'", () => {
  it("o tempo escolhido é 2,5 s", () => {
    expect(SAVED_NOTICE_MS).toBe(2500);
  });

  it("o mesmo texto vale para autosave e save manual", () => {
    expect(describeSync({ status: "saved", lastSave: "auto" })).toBe("Rascunho salvo");
    expect(describeSync({ status: "saved", lastSave: "manual" })).toBe("Rascunho salvo");
  });

  it("aparece ao confirmar e some depois de ~2,5 s", () => {
    const t = setup();
    t.notice.update("saved");
    expect(t.notice.isVisible()).toBe(true);
    t.clock.advance(2499);
    expect(t.notice.isVisible()).toBe(true);
    t.clock.advance(1);
    expect(t.notice.isVisible()).toBe(false);
    expect(t.changes).toEqual([true, false]);
  });

  it("fluxo completo: não salvas → salvando → salvo → some", () => {
    const t = setup();
    const shown = (status: Parameters<SavedNotice["update"]>[0]) => {
      t.notice.update(status);
      return describeSync({ status: visibleSyncStatus(status, t.notice.isVisible()) as any, lastSave: "auto" });
    };
    expect(shown("dirty")).toBe("Alterações não salvas");
    expect(shown("saving")).toBe("Salvando...");
    expect(shown("saved")).toBe("Rascunho salvo");
    t.clock.advance(2500);
    expect(describeSync({ status: visibleSyncStatus("saved", t.notice.isVisible()) as any, lastSave: "auto" })).toBeNull();
  });

  it("'Alterações não salvas' NÃO some sozinha (nenhum timer envolvido)", () => {
    const t = setup();
    t.notice.update("dirty");
    expect(t.clock.pending()).toBe(0);
    t.clock.advance(600000);
    expect(visibleSyncStatus("dirty", t.notice.isVisible())).toBe("dirty");
    expect(describeSync({ status: "dirty", lastSave: null })).toBe("Alterações não salvas");
  });

  it("'Alterações salvas neste dispositivo' NÃO some sozinha", () => {
    const t = setup();
    t.notice.update("failed");
    expect(t.clock.pending()).toBe(0);
    t.clock.advance(600000);
    expect(visibleSyncStatus("failed", t.notice.isVisible())).toBe("failed");
    expect(describeSync({ status: "failed", lastSave: "auto" })).toBe("Alterações salvas neste dispositivo");
  });

  it("'invalid' também permanece (sem timer)", () => {
    const t = setup();
    t.notice.update("invalid");
    expect(t.clock.pending()).toBe(0);
    expect(visibleSyncStatus("invalid", t.notice.isVisible())).toBe("invalid");
  });

  it("nova edição logo após o sucesso volta na hora para 'Alterações não salvas' e cancela o timer", () => {
    const t = setup();
    t.notice.update("saved");
    t.clock.advance(1000);
    t.notice.update("dirty");
    expect(t.notice.isVisible()).toBe(false);
    expect(t.clock.pending()).toBe(0);
    t.clock.advance(5000);
    expect(visibleSyncStatus("dirty", t.notice.isVisible())).toBe("dirty");
  });

  it("nova edição DEPOIS do aviso ter sumido também mostra 'Alterações não salvas'", () => {
    const t = setup();
    t.notice.update("saved");
    t.clock.advance(2500);
    t.notice.update("dirty");
    expect(describeSync({ status: "dirty", lastSave: null })).toBe("Alterações não salvas");
  });

  it("um novo sucesso reinicia a contagem", () => {
    const t = setup();
    t.notice.update("saved");
    t.clock.advance(2000);
    t.notice.update("saving");
    t.notice.update("saved");
    t.clock.advance(2000);
    expect(t.notice.isVisible()).toBe(true);
    t.clock.advance(500);
    expect(t.notice.isVisible()).toBe(false);
  });

  it("erro depois de sucesso esconde o sucesso na hora", () => {
    const t = setup();
    t.notice.update("saved");
    t.notice.update("failed");
    expect(t.notice.isVisible()).toBe(false);
  });

  it("destroy cancela o timer e silencia callbacks (sem setState após unmount)", () => {
    const t = setup();
    t.notice.update("saved");
    t.notice.destroy();
    const before = t.changes.length;
    t.clock.advance(10000);
    t.notice.update("saved");
    expect(t.changes.length).toBe(before);
    expect(t.clock.pending()).toBe(0);
  });

  it("visibleSyncStatus: 'saved' escondido vira 'clean'; o resto passa direto", () => {
    expect(visibleSyncStatus("saved", true)).toBe("saved");
    expect(visibleSyncStatus("saved", false)).toBe("clean");
    expect(visibleSyncStatus("dirty", false)).toBe("dirty");
    expect(visibleSyncStatus("failed", false)).toBe("failed");
    expect(visibleSyncStatus(undefined, false)).toBeUndefined();
  });
});
