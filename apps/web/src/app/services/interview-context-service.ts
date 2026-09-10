import type { ProfessionalAreaId, ProfessionalSubareaId, SeniorityLevelId } from "../domain/professional-catalog";

export type JobInterviewContext = {
  sourceUrl: string;
  areaId?: ProfessionalAreaId;
  subareaId?: ProfessionalSubareaId;
  seniorityId?: SeniorityLevelId;
  jobTitle?: string;
  title: string;
  company: string;
  summary: string;
  requirements: string[];
};

export type InterviewQuestion = {
  id: number;
  type: "Tecnica" | "Comportamental" | "Carreira";
  text: string;
};

const MOCK_REQUIREMENTS = [
  "Comunicar ideias com clareza em contextos profissionais.",
  "Organizar prioridades e cumprir prazos com autonomia.",
  "Trabalhar em equipe e relatar resultados de forma objetiva.",
  "Demonstrar dominio basico das ferramentas relacionadas ao cargo.",
];

const MOCK_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    type: "Tecnica",
    text: "Quais conhecimentos ou ferramentas voce considera mais importantes para atuar nesta vaga? Explique com exemplos.",
  },
  {
    id: 2,
    type: "Tecnica",
    text: "Como voce aplicaria seus conhecimentos tecnicos para resolver uma demanda comum desta oportunidade?",
  },
  {
    id: 3,
    type: "Comportamental",
    text: "Conte sobre uma situacao em que precisou organizar prioridades para cumprir um prazo importante.",
  },
  {
    id: 4,
    type: "Comportamental",
    text: "Descreva uma experiencia de trabalho em equipe e como voce contribuiu para o resultado.",
  },
  {
    id: 5,
    type: "Carreira",
    text: "Por que esta vaga faz sentido para seus objetivos profissionais neste momento?",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeJobUrl(url: string): Promise<JobInterviewContext> {
  await wait(850);

  if (!/^https?:\/\/\S+\.\S+/i.test(url.trim())) {
    throw new Error("Informe uma URL valida da vaga para analisar o contexto.");
  }

  return {
    sourceUrl: url.trim(),
    areaId: "information-technology",
    subareaId: "full-stack-development",
    seniorityId: "junior",
    jobTitle: "Desenvolvedor Full Stack Júnior",
    title: "Desenvolvedor Full Stack Júnior",
    company: "Empresa extraida da vaga",
    summary:
      "Contexto mockado enquanto a integracao tecnica Python/Flask de extracao da vaga nao esta conectada ao Front oficial.",
    requirements: MOCK_REQUIREMENTS,
  };
}

export async function generateInterviewQuestions(
  context: JobInterviewContext,
): Promise<InterviewQuestion[]> {
  await wait(650);

  return MOCK_QUESTIONS.map((question) => ({
    ...question,
    text: question.text.replace("esta vaga", `a vaga de ${context.title}`),
  }));
}
