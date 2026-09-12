export type DiscFactorId = "D" | "I" | "S" | "C";

export type DiscFactor = {
  id: DiscFactorId;
  name: string;
  title: string;
  description: string;
  resultDescription: string;
  resultPotentialSummary: string;
  resultDevelopmentSummary: string;
  resultAttentionSummary: string;
  commandWord: string;
  potentials: string[];
  developmentPoints: string[];
  recommendations: string[];
  color: string;
  softClassName: string;
  textClassName: string;
};

export const DISC_ETHICAL_NOTICE =
  "O DISC deve apoiar o desenvolvimento e a reflexão. Não deve ser utilizado isoladamente como critério de aprovação, eliminação ou julgamento de capacidade profissional.";

export const DISC_FACTORS: DiscFactor[] = [
  {
    id: "D",
    name: "Dominância",
    title: "Ação, objetividade e decisão",
    description:
      "Representa a tendência a agir com foco em resultados, tomar decisões e lidar com desafios de forma direta.",
    resultDescription: "muito ativa(o) ao lidar com problemas e desafios.",
    resultPotentialSummary:
      "Você pode ser descrita(o) como uma pessoa direta, ousada, exigente, enérgica e determinada.",
    resultDevelopmentSummary:
      "Pode parecer arrogante quando fala sem pensar e pode criar medo nas pessoas.",
    resultAttentionSummary: "Pode ter dificuldade de delegação e de receber feedback.",
    commandWord: "CALMA. Vá mais devagar com as pessoas.",
    potentials: [
      "Iniciativa diante de problemas.",
      "Objetividade para definir caminhos.",
      "Decisão em situações que exigem posicionamento.",
    ],
    developmentPoints: [
      "Equilibrar rapidez com escuta.",
      "Sustentar decisões com evidências observáveis.",
      "Conduzir conflitos de forma construtiva.",
    ],
    recommendations: [
      "Pratique explicar o motivo das suas decisões antes de defender uma solução.",
      "Busque registrar critérios, riscos e impactos antes de agir.",
      "Peça feedback sobre clareza, assertividade e abertura ao diálogo.",
    ],
    color: "#1D4ED8",
    softClassName: "bg-blue-50 border-blue-100",
    textClassName: "text-blue-700",
  },
  {
    id: "I",
    name: "Influência",
    title: "Comunicação, persuasão e interação",
    description:
      "Indica facilidade para comunicar ideias, interagir com pessoas e mobilizar colaboração em torno de objetivos.",
    resultDescription: "uma pessoa que gosta de influenciar os outros através da conversa e atividades.",
    resultPotentialSummary:
      "Você pode ser descrita(o) como uma pessoa entusiasta, persuasiva, convincente, amistosa, comunicativa, confiante e otimista.",
    resultDevelopmentSummary:
      "Pode abandonar quando há conflito, ser demasiadamente otimista e ser indireta(o) na comunicação.",
    resultAttentionSummary:
      "Pode ter problemas com administração do tempo, conclusão de tarefas e organização.",
    commandWord: "ACABATIVA. Termine aquilo que começou e vá até o fim.",
    potentials: [
      "Comunicação e interação com diferentes públicos.",
      "Capacidade de engajar pessoas.",
      "Abertura para cooperação e troca de ideias.",
    ],
    developmentPoints: [
      "Converter comunicação em acompanhamento consistente.",
      "Registrar combinados e responsabilidades.",
      "Manter atenção a detalhes e prazos.",
    ],
    recommendations: [
      "Ao final de conversas importantes, registre próximos passos e responsáveis.",
      "Use checklists para transformar interação em execução acompanhada.",
      "Equilibre espontaneidade com precisão nas informações.",
    ],
    color: "#16A34A",
    softClassName: "bg-green-50 border-green-100",
    textClassName: "text-green-700",
  },
  {
    id: "S",
    name: "Estabilidade",
    title: "Cooperação, paciência e constância",
    description:
      "Expressa preferência por colaboração, previsibilidade, escuta e manutenção de relações de confiança.",
    resultDescription: "apreciador(a) de um ritmo constante, de segurança e sem mudanças súbitas.",
    resultPotentialSummary:
      "Você pode ser descrita(o) como uma pessoa paciente, confiável, calma, leal, persistente, gentil e previsível.",
    resultDevelopmentSummary:
      "Pode ser lenta(o), fazer uma coisa de cada vez, ser pouco expansiva(o) e ter pouca ambição.",
    resultAttentionSummary:
      "Pode ter falta de iniciativa, evitar mudanças, correr pouco risco e guardar rancor.",
    commandWord: "VAI. Depois que você começa, vá até o fim.",
    potentials: [
      "Escuta e cooperação em equipe.",
      "Paciência para sustentar processos.",
      "Constância em rotinas e relações profissionais.",
    ],
    developmentPoints: [
      "Ampliar iniciativa em cenários incertos.",
      "Praticar assertividade sem perder acolhimento.",
      "Tomar decisões mesmo quando houver desconforto.",
    ],
    recommendations: [
      "Escolha um comportamento de iniciativa para praticar por ciclos de 30 dias.",
      "Prepare frases objetivas para conversas difíceis.",
      "Use evidências para apoiar decisões e reduzir insegurança.",
    ],
    color: "#D97706",
    softClassName: "bg-amber-50 border-amber-100",
    textClassName: "text-amber-700",
  },
  {
    id: "C",
    name: "Conformidade",
    title: "Precisão, análise e atenção a padrões",
    description:
      "Relaciona-se à busca por qualidade, análise cuidadosa, organização e atenção a normas, critérios e detalhes.",
    resultDescription:
      "adepta(o) a aderir regras, regulamentos e estrutura. Gosta de fazer com qualidade e certo na primeira vez.",
    resultPotentialSummary:
      "Você pode ser descrita(o) como uma pessoa disciplinada, cautelosa, sistemática, precisa, analítica, perfeccionista e lógica.",
    resultDevelopmentSummary:
      "Pode requerer dados demais, agir de forma lenta, correr pouco risco e internalizar sentimentos.",
    resultAttentionSummary:
      "Pode ser muito crítica(o) e inflexível, sendo dura(o) consigo mesma(o).",
    commandWord: "FLEXIBILIDADE. Pare de buscar 110% de conhecimento e comece.",
    potentials: [
      "Análise e precisão na execução.",
      "Organização e cumprimento de padrões.",
      "Cuidado com qualidade, riscos e documentação.",
    ],
    developmentPoints: [
      "Comunicar análises de forma acessível.",
      "Agir diante de imprevistos sem paralisar por excesso de revisão.",
      "Equilibrar controle e flexibilidade.",
    ],
    recommendations: [
      "Apresente conclusões em linguagem simples antes de detalhar evidências.",
      "Defina um limite de tempo para análise quando houver urgência.",
      "Pratique adaptar padrões sem abandonar controles essenciais.",
    ],
    color: "#7C3AED",
    softClassName: "bg-purple-50 border-purple-100",
    textClassName: "text-purple-700",
  },
];

export const DISC_FACTOR_MAP = DISC_FACTORS.reduce(
  (acc, factor) => ({ ...acc, [factor.id]: factor }),
  {} as Record<DiscFactorId, DiscFactor>,
);
