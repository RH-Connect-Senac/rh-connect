import type { MouseEvent } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { navigateToLegalPage } from "./landing-footer";
import { ROUTER_BASENAME, getPathForScreen } from "../router/routes";

/** Texto do link para a página legal dentro da resposta sobre dados. */
export const FAQ_PRIVACY_LINK_LABEL = "Política de Privacidade";

/**
 * Perguntas da Landing. Só descrevem o que o produto já faz hoje: sem prazo de
 * feedback, preço, gravação de áudio/vídeo ou recomendação automática de materiais.
 */
export const LANDING_FAQ_ITEMS = [
  {
    id: "como-comecar",
    question: "Como começo a usar o RH Connect?",
    answer:
      "Crie sua conta, complete seu perfil e inicie uma entrevista pela plataforma. A partir daí, você poderá responder às perguntas e acompanhar seus resultados e histórico.",
  },
  {
    id: "digitar-ou-falar",
    question: "Posso responder digitando ou falando?",
    answer:
      "Sim. As respostas são registradas em texto e você pode digitá-las normalmente. Quando disponível, o recurso de ditado por voz também pode ajudar no preenchimento das respostas.",
  },
  {
    id: "substitui-entrevista-real",
    question: "O RH Connect substitui uma entrevista de emprego real?",
    answer:
      "Não. O RH Connect é uma plataforma de preparação e desenvolvimento para entrevistas. As simulações ajudam você a praticar, receber feedback e identificar pontos que podem ser aprimorados antes de processos seletivos reais.",
  },
  {
    id: "mais-de-uma-entrevista",
    question: "Posso fazer mais de uma entrevista e acompanhar minha evolução?",
    answer:
      "Sim. Suas entrevistas ficam organizadas na plataforma para que você possa consultar resultados anteriores, acompanhar seu desempenho e observar sua evolução ao longo do tempo.",
  },
  {
    id: "materiais",
    question: "Que materiais posso encontrar na plataforma?",
    answer:
      "O RH Connect reúne conteúdos próprios e materiais de parceiros como Cachola e Orango, com recursos voltados à preparação para entrevistas, comunicação, carreira e desenvolvimento profissional.",
  },
  {
    id: "dados",
    question: "Como meus dados são tratados?",
    answer: `Os dados utilizados pelo RH Connect são tratados conforme as regras e finalidades descritas na ${FAQ_PRIVACY_LINK_LABEL} da plataforma.`,
  },
] as const;

/**
 * Resposta do FAQ. Quando o texto cita a Política de Privacidade, o trecho vira um link
 * real (href para a rota existente); o clique comum usa a mesma navegação do footer, que
 * garante que a página legal abra pelo início. Ctrl/Cmd/botão do meio seguem o padrão do navegador.
 */
export function FaqAnswer({ answer, onNavigate }: { answer: string; onNavigate: (screen: "privacy") => void }) {
  const index = answer.indexOf(FAQ_PRIVACY_LINK_LABEL);
  if (index === -1) return <>{answer}</>;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateToLegalPage("privacy", onNavigate);
  };

  return (
    <>
      {answer.slice(0, index)}
      <a
        href={`${ROUTER_BASENAME}${getPathForScreen("privacy")}`}
        onClick={handleClick}
        className="rounded-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {FAQ_PRIVACY_LINK_LABEL}
      </a>
      {answer.slice(index + FAQ_PRIVACY_LINK_LABEL.length)}
    </>
  );
}

/** Seção de perguntas frequentes da Landing (accordion de coluna única, tudo fechado). */
export function LandingFaq({ onNavigate }: { onNavigate: (screen: "privacy") => void }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 bg-white px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-600">Perguntas frequentes</p>
          <h2 id="faq-title" className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Ficou com alguma dúvida?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Encontre respostas rápidas sobre o RH Connect e como utilizar a plataforma.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
        >
          {LANDING_FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border-slate-200/70 transition-colors duration-200 data-[state=open]:bg-blue-50/40 motion-reduce:transition-none"
            >
              <AccordionTrigger className="px-5 py-4 hover:bg-slate-50/70 sm:px-6 sm:py-5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl px-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:text-base">
                <FaqAnswer answer={item.answer} onNavigate={onNavigate} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
