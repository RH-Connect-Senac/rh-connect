import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Sidebar do Avaliador: guardas estruturais contra itens de navegação duplicados.
// "Configurações" deve aparecer UMA vez na navegação de cada cópia da sidebar
// (desktop e drawer mobile); o menu da conta é outro componente e pode ter o seu.
const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SHELL = code(read("shared/profile-shell.tsx"));
const EVAL = code(read("eval-screens.tsx"));

const evalNavLabels = (): string[] => {
  const start = EVAL.indexOf("const EVAL_NAV");
  const end = EVAL.indexOf("];", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return [...EVAL.slice(start, end).matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
};

describe("Sidebar do Avaliador: navegação sem duplicidade", () => {
  it("EVAL_NAV tem exatamente 6 itens únicos, com Configurações uma vez", () => {
    const labels = evalNavLabels();
    expect(labels).toEqual([
      "Dashboard",
      "Fila de Avaliações",
      "Em Andamento",
      "Histórico",
      "Guia de Critérios",
      "Configurações",
    ]);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.filter((l) => l === "Configurações")).toHaveLength(1);
  });

  it("EvalLayout passa EVAL_NAV ao ProfileShell sem acrescentar itens", () => {
    expect(EVAL).toContain("navItems={EVAL_NAV}");
    expect(EVAL).not.toMatch(/navItems=\{\[/);
    expect(EVAL).not.toMatch(/\.\.\.EVAL_NAV/);
  });

  it("ProfileSidebarContent percorre navItems uma única vez e sem itens extras", () => {
    expect(SHELL.match(/navItems\.map\(/g) ?? []).toHaveLength(1);
    expect(SHELL).not.toContain("Configurações");
    expect(SHELL).toContain("key={item.label}");
  });

  it("ProfileShell instancia o conteúdo só duas vezes: aside desktop e drawer mobile", () => {
    expect(SHELL.match(/<ProfileSidebarContent/g) ?? []).toHaveLength(2);
    const desktop = SHELL.indexOf("lg:block");
    const drawer = SHELL.indexOf("lg:hidden", SHELL.indexOf("fixed bottom-0 left-0 top-0"));
    expect(desktop).toBeGreaterThan(-1);
    expect(drawer).toBeGreaterThan(desktop);
    // a cópia mobile é marcada como mobile e nunca recolhida
    expect(SHELL).toMatch(/collapsed=\{false\}\s*isMobile/);
  });

  it("o rodapé da conta (avatar, nome, e-mail e Sair) continua na sidebar", () => {
    expect(SHELL).toContain("account.initials");
    expect(SHELL).toContain("account.name");
    expect(SHELL).toContain("account.email");
    expect(SHELL).toContain('title="Sair"');
  });
});
