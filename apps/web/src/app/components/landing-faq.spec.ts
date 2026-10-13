import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FAQ_PRIVACY_LINK_LABEL, FaqAnswer, LANDING_FAQ_ITEMS, LandingFaq } from "./landing-faq";
import { ROUTER_BASENAME } from "../router/routes";

// FAQ da Landing: conteúdo, acessibilidade básica e link para a Política de Privacidade.
const read = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

type TreeElement = { props: { children?: unknown; [key: string]: unknown } };
function collect(node: unknown, predicate: (el: TreeElement) => boolean, found: TreeElement[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, predicate, found));
  } else if (node && typeof node === "object" && "props" in node) {
    const element = node as TreeElement;
    if (predicate(element)) found.push(element);
    collect(element.props.children, predicate, found);
  }
  return found;
}

describe("LandingFaq: conteúdo", () => {
  it("tem exatamente 6 perguntas, com ids únicos e respostas preenchidas", () => {
    expect(LANDING_FAQ_ITEMS).toHaveLength(6);
    expect(new Set(LANDING_FAQ_ITEMS.map((item) => item.id)).size).toBe(6);
    for (const item of LANDING_FAQ_ITEMS) {
      expect(item.question.endsWith("?")).toBe(true);
      expect(item.answer.length).toBeGreaterThan(40);
    }
  });

  it("as perguntas aprovadas, na ordem", () => {
    expect(LANDING_FAQ_ITEMS.map((item) => item.question)).toEqual([
      "Como começo a usar o RH Connect?",
      "Posso responder digitando ou falando?",
      "O RH Connect substitui uma entrevista de emprego real?",
      "Posso fazer mais de uma entrevista e acompanhar minha evolução?",
      "Que materiais posso encontrar na plataforma?",
      "Como meus dados são tratados?",
    ]);
  });

  it("não promete o que o produto ainda não define ou não faz", () => {
    const all = LANDING_FAQ_ITEMS.map((item) => `${item.question} ${item.answer}`).join(" ").toLowerCase();
    for (const forbidden of ["18 anos", "maior de idade", "gratuit", "grátis", "preço", "r$", "prazo", "horas", "vídeo", "áudio", "gravaç", "grava ", "treinamento de ia", "recomendad", "chamada"]) {
      expect(all).not.toContain(forbidden);
    }
  });

  it("materiais citam Cachola e Orango; ditado é opcional (\"quando disponível\")", () => {
    const byId = Object.fromEntries(LANDING_FAQ_ITEMS.map((item) => [item.id, item.answer]));
    expect(byId["materiais"]).toContain("Cachola");
    expect(byId["materiais"]).toContain("Orango");
    expect(byId["digitar-ou-falar"]).toContain("Quando disponível");
  });
});

describe("LandingFaq: marcação", () => {
  const html = renderToStaticMarkup(createElement(LandingFaq, { onNavigate: vi.fn() }));

  it("seção #faq com cabeçalho e 6 gatilhos, todos fechados", () => {
    expect(html).toContain('id="faq"');
    expect(html).toContain("Ficou com alguma dúvida?");
    expect(html).toContain("Perguntas frequentes");
    expect((html.match(/<button/g) ?? []).length).toBe(6);
    expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(6);
    expect(html).not.toContain('aria-expanded="true"');
    expect(html).not.toContain('data-state="open"');
  });

  it("usa o accordion do Radix (aria-controls nos gatilhos)", () => {
    expect((html.match(/aria-controls=/g) ?? []).length).toBe(6);
  });
});

describe("FaqAnswer: link para a Política de Privacidade", () => {
  const privacy = LANDING_FAQ_ITEMS.find((item) => item.id === "dados")!;

  it("a resposta sobre dados contém o link real para a rota de privacidade", () => {
    const html = renderToStaticMarkup(createElement(FaqAnswer, { answer: privacy.answer, onNavigate: vi.fn() }));
    expect(html).toContain(`href="${ROUTER_BASENAME}/privacy"`);
    expect(html).toContain(`>${FAQ_PRIVACY_LINK_LABEL}</a>`);
  });

  it("clique comum navega para a página legal; Ctrl/Cmd não interceptam", () => {
    const onNavigate = vi.fn();
    const [link] = collect(FaqAnswer({ answer: privacy.answer, onNavigate }), (el) => typeof el.props.href === "string");
    const click = link.props.onClick as (event: unknown) => void;

    const preventDefault = vi.fn();
    click({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith("privacy");

    onNavigate.mockClear();
    click({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: true, shiftKey: false, altKey: false, preventDefault: vi.fn() });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("respostas sem a Política de Privacidade não ganham link", () => {
    const html = renderToStaticMarkup(createElement(FaqAnswer, { answer: LANDING_FAQ_ITEMS[0].answer, onNavigate: vi.fn() }));
    expect(html).not.toContain("<a");
  });
});

describe("Landing: posição do FAQ, âncoras e footer", () => {
  const LANDING = code(read("landing-screen.tsx"));
  const FOOTER = code(read("landing-footer.tsx"));
  const FAQ = code(read("landing-faq.tsx"));

  it("FAQ entra depois de 'Para quem é' e antes do CTA central", () => {
    const forWho = LANDING.indexOf('id="para-quem"');
    const faq = LANDING.indexOf("<LandingFaq");
    const cta = LANDING.indexOf("Comece a se preparar agora");
    expect(forWho).toBeGreaterThan(-1);
    expect(faq).toBeGreaterThan(forWho);
    expect(cta).toBeGreaterThan(faq);
    expect(LANDING.match(/<LandingFaq/g)).toHaveLength(1);
  });

  it("header continua com as 4 âncoras originais (sem FAQ)", () => {
    const header = LANDING.slice(LANDING.indexOf("<header"), LANDING.indexOf("</header>"));
    expect(header).not.toContain("#faq");
    for (const anchor of ["#como-funciona", "#beneficios", "#para-quem", "#sobre"]) expect(header).toContain(anchor);
  });

  it("seções com âncora compensam o header sticky (scroll-mt)", () => {
    for (const id of ["como-funciona", "beneficios", "para-quem", "sobre"]) {
      const tag = LANDING.slice(LANDING.indexOf(`id="${id}"`), LANDING.indexOf(">", LANDING.indexOf(`id="${id}"`) + 10) + 40);
      expect(tag).toContain("scroll-mt");
    }
    const faqSection = FAQ.slice(FAQ.indexOf('id="faq"'), FAQ.indexOf('id="faq"') + 160);
    expect(faqSection).toContain("scroll-mt");
  });

  it("footer ganha 'Perguntas frequentes' apontando para #faq, sem remover os demais", () => {
    expect(FOOTER).toContain('{ label: "Perguntas frequentes", sectionId: "faq" }');
    for (const label of ["Como funciona", "Benefícios", "Sobre o projeto", "Termos de uso", "Privacidade", "Contato"]) {
      expect(FOOTER).toContain(label);
    }
  });

  it("o link de Privacidade reutiliza a navegação do footer (sem duplicar a regra)", () => {
    expect(FAQ).toContain("navigateToLegalPage");
    expect(FAQ).not.toContain("pendingLegalTopPath");
    expect(FOOTER).toContain("export function navigateToLegalPage");
  });

  it("não adiciona dependência de animação: só o accordion do Radix", () => {
    const accordion = code(read("ui/accordion.tsx"));
    expect(accordion).toContain("@radix-ui/react-accordion");
    expect(accordion).toContain("motion-reduce");
  });
});
