/**
 * Vagas sugeridas da Empregare para a tela "Nova entrevista" (atalho temporário
 * de apresentação). Dados fixos e isolados aqui: nenhuma URL no JSX.
 *
 * Campos opcionais (company, level, modality) só são preenchidos quando a
 * informação está explícita na vaga; nunca inventar valores. Sem salário.
 */

export type SuggestedJobArea = "TECNOLOGIA" | "RECURSOS_HUMANOS" | "SECRETARIADO";

export type SuggestedJob = {
  id: string;
  area: SuggestedJobArea;
  title: string;
  company?: string;
  level?: string;
  modality?: string;
  location: string;
  url: string;
};

export const SUGGESTED_JOB_AREAS: ReadonlyArray<{ id: SuggestedJobArea; label: string }> = [
  { id: "TECNOLOGIA", label: "Tecnologia" },
  { id: "RECURSOS_HUMANOS", label: "Recursos Humanos" },
  { id: "SECRETARIADO", label: "Secretariado" },
];

export const DEFAULT_SUGGESTED_JOB_AREA: SuggestedJobArea = "TECNOLOGIA";

export const SUGGESTED_JOBS: readonly SuggestedJob[] = [
  {
    id: "ti-estagio-ads-181565",
    area: "TECNOLOGIA",
    title: "Estágio em Análise e Desenvolvimento de Sistemas - EBSERH/DF",
    company: "RECRUTA EASY",
    level: "Estágio",
    location: "Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-analise-e-desenvolvimento-de-_181565",
  },
  {
    id: "ti-desenvolvedor-aplicacoes-179347",
    area: "TECNOLOGIA",
    title: "Desenvolvedor de Aplicações Júnior – Sistemas de Crédito PF",
    company: "CENTRO COOPERATIVO SICOOB",
    level: "Júnior",
    location: "Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-desenvolvedor-de-aplicacoes-junior-siste_179347",
  },
  {
    id: "rh-estagiario-rh-174874",
    area: "RECURSOS_HUMANOS",
    title: "Estagiário de RH",
    company: "MACAW BRASIL TRANSPORTES LTDA",
    modality: "Presencial",
    location: "Lago Sul - Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-estagiario-de-rh_174874",
  },
  {
    id: "rh-analista-dp-rh-175209",
    area: "RECURSOS_HUMANOS",
    title: "Analista de DP/RH Generalista Júnior",
    level: "Júnior",
    modality: "Presencial",
    location: "Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-analista-de-dp-rh-generalista-junior_175209",
  },
  {
    id: "sec-estagio-secretariado-182983",
    area: "SECRETARIADO",
    title: "Estágio em Secretariado e Administração - Ministério das Comunicações",
    company: "RECRUTA EASY",
    level: "Estágio",
    modality: "Presencial",
    location: "Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-secretariado-e-administracao-_182983",
  },
  {
    id: "sec-secretario-academico-174994",
    area: "SECRETARIADO",
    title: "Secretário(a) Acadêmico(a) – Instituição de Ensino | Anhanguera Taguatinga Norte",
    company: "INSTITUTO MIDORI",
    modality: "Presencial",
    location: "Taguatinga - Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-secretario-a-academico-a-instituicao-de-_174994",
  },
];

/** Apenas as vagas da área escolhida (2 por área). */
export function getSuggestedJobsByArea(area: SuggestedJobArea): SuggestedJob[] {
  return SUGGESTED_JOBS.filter((job) => job.area === area);
}
