import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Switch, SwitchVisual } from "./switch";

const html = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(Switch as never, { "aria-label": "Notificações", ...props } as never));

describe("Switch (componente compartilhado)", () => {
  it("desligado: aria-checked=false, thumb à esquerda (translate-x-0) e fundo neutro", () => {
    const out = html({ checked: false });
    expect(out).toContain('aria-checked="false"');
    expect(out).toContain('data-state="unchecked"');
    expect(out).toContain("translate-x-0");
    expect(out).not.toContain("translate-x-5");
    expect(out).toContain("bg-muted-foreground/30");
  });

  it("ligado: aria-checked=true, thumb à direita (translate-x-5) e fundo primário", () => {
    const out = html({ checked: true });
    expect(out).toContain('aria-checked="true"');
    expect(out).toContain('data-state="checked"');
    expect(out).toContain("translate-x-5");
    expect(out).toContain("bg-primary");
  });

  it("é um button type=button com role=switch e nome acessível", () => {
    const out = html({ checked: false });
    expect(out.startsWith("<button")).toBe(true);
    expect(out).toContain('type="button"');
    expect(out).toContain('role="switch"');
    expect(out).toContain('aria-label="Notificações"');
    expect(html({ checked: false, "aria-label": undefined, "aria-labelledby": "rotulo" })).toContain('aria-labelledby="rotulo"');
  });

  it("tamanho fixo e thumb contido: track 44×24, shrink-0, thumb 20×20 em left-0.5 top-0.5", () => {
    const out = html({ checked: true });
    for (const cls of ["w-11", "h-6", "shrink-0", "rounded-full", "relative"]) expect(out).toContain(cls);
    for (const cls of ["absolute", "left-0.5", "top-0.5", "h-5", "w-5", "bg-white"]) expect(out).toContain(cls);
    expect(out).toContain("transition-colors");
    expect(out).toContain("transition-transform");
    expect(out).toContain("focus-visible:ring");
  });

  it("disabled: atributo presente e o callback não é chamado", () => {
    const onCheckedChange = vi.fn();
    expect(html({ checked: false, disabled: true })).toContain("disabled");
    const element = (Switch as unknown as (p: Record<string, unknown>) => { props: { onClick: () => void } })({
      checked: false,
      disabled: true,
      onCheckedChange,
    });
    element.props.onClick();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("o callback recebe o NOVO valor", () => {
    const call = (checked: boolean) => {
      const onCheckedChange = vi.fn();
      const element = (Switch as unknown as (p: Record<string, unknown>) => { props: { onClick: () => void } })({
        checked,
        onCheckedChange,
      });
      element.props.onClick();
      return onCheckedChange;
    };
    const fromOff = call(false);
    const fromOn = call(true);
    expect(fromOff.mock.calls.length).toBe(1);
    expect(fromOff.mock.calls[0][0]).toBe(true);
    expect(fromOn.mock.calls[0][0]).toBe(false);
  });
});

describe("SwitchVisual (decorativo)", () => {
  it("mesmo visual, mas sem papel, sem foco e sem botão", () => {
    for (const checked of [false, true]) {
      const out = renderToStaticMarkup(createElement(SwitchVisual, { checked }));
      expect(out.startsWith("<span")).toBe(true);
      expect(out).toContain('aria-hidden="true"');
      expect(out).not.toMatch(/role=|tabindex|<button|aria-checked|onclick/i);
      expect(out).toContain(checked ? "translate-x-5" : "translate-x-0");
      expect(out).toContain("w-11");
      expect(out).toContain("left-0.5");
      expect(out).toContain("shrink-0");
    }
  });
});

describe("source guards: os switches usam o padrão compartilhado", () => {
  const APP = join(__dirname, "..", "..");
  const read = (relative: string) =>
    readFileSync(join(APP, relative), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const evaluator = read("components/eval-screens.tsx");
  const admin = read("components/admin-screens.tsx");
  const app = read("App.tsx");

  it("Avaliador usa o Switch compartilhado, com estado atual e nomes acessíveis", () => {
    expect(evaluator).toContain('from "./ui/switch"');
    expect(evaluator).toContain("<Switch");
    expect(evaluator).toContain("setNotif(prev => ({ ...prev, [n.key]: !prev[n.key] }))");
    expect(evaluator).toContain("aria-labelledby={`eval-notif-${n.key}-label`}");
    for (const label of ["E-mail para nova avaliação na fila", "Notificação no sistema", "Resumo diário"]) {
      expect(evaluator).toContain(label);
    }
  });

  it("Candidato: o Toggle local é wrapper fino do Switch e mantém on/onToggle", () => {
    expect(app).toContain('from "./components/ui/switch"');
    expect(app).toMatch(/function Toggle\(\{ on, onToggle, label \}[^\n]*\n\s*return <Switch checked=\{on\} onCheckedChange=\{\(\) => onToggle\(\)\}/);
    expect(app).toContain("<Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))}");
  });

  it("Admin: switches só visuais (SwitchVisual, 3 usos), sem estado, clique, papel nem tab order", () => {
    expect(admin).toContain('import { SwitchVisual } from "./ui/switch"');
    expect(admin.match(/<SwitchVisual checked=\{s\.on\} \/>/g)?.length).toBe(3);
    expect(admin.match(/<SwitchVisual\b/g)?.length).toBe(3);
    expect(admin).not.toMatch(/<Switch[ >]/);
  });

  it("nenhum dos usos mantém o padrão manual antigo (sem left, w-10, translate-x-4/0.5)", () => {
    for (const source of [evaluator, admin, app]) {
      expect(source).not.toMatch(/w-10 h-6 rounded-full/);
      expect(source).not.toMatch(/absolute top-0\.5 w-5 h-5 bg-white/);
      expect(source).not.toMatch(/translate-x-4|translate-x-0\.5/);
    }
    expect(app).not.toMatch(/w-11 h-6 rounded-full relative transition-colors/);
  });

  it("o componente compartilhado não usa storage nem chamadas de rede", () => {
    const source = read("components/ui/switch.tsx");
    expect(source).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });
});
