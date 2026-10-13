import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingSectionBadge } from "./landing-section-badge";

const read = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("LandingSectionBadge", () => {
  it("renderiza o texto recebido em children", () => {
    const html = renderToStaticMarkup(createElement(LandingSectionBadge, null, "Benefícios"));
    expect(html).toContain("Benefícios");
  });

  it("align center (padrão) centraliza o badge; left não centraliza", () => {
    const center = renderToStaticMarkup(createElement(LandingSectionBadge, null, "A"));
    const left = renderToStaticMarkup(createElement(LandingSectionBadge, { align: "left" }, "A"));
    expect(center).toContain("justify-center");
    expect(left).not.toContain("justify-center");
    expect(left).toContain("mb-4");
  });

  it("é texto editorial: não cria comportamento interativo", () => {
    const html = renderToStaticMarkup(createElement(LandingSectionBadge, null, "A"));
    expect(html).not.toMatch(/<(button|a)\b/);
    expect(html).not.toMatch(/role=|tabindex|aria-|onclick/i);
  });
});

describe("Landing: eyebrows usam LandingSectionBadge", () => {
  const SCREEN = code(read("landing-screen.tsx"));
  const FAQ = code(read("landing-faq.tsx"));

  it("as 5 seções usam o badge e preservam os textos", () => {
    expect(SCREEN).toContain("<LandingSectionBadge>Como funciona</LandingSectionBadge>");
    expect(SCREEN).toContain("<LandingSectionBadge>Benefícios</LandingSectionBadge>");
    expect(SCREEN).toContain('<LandingSectionBadge align="left">Relatório de desempenho</LandingSectionBadge>');
    expect(SCREEN).toContain("<LandingSectionBadge>Para quem é</LandingSectionBadge>");
    expect(FAQ).toContain("<LandingSectionBadge>Perguntas frequentes</LandingSectionBadge>");
  });

  it("Sobre o projeto mantém o eyebrow cinza e o CTA/Hero não usam badge", () => {
    expect(SCREEN).toContain("text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3");
    expect((SCREEN.match(/<LandingSectionBadge/g) ?? [])).toHaveLength(4);
  });
});
