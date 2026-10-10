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
    id: "ti-assistente-ti-suporte-180562",
    area: "TECNOLOGIA",
    title: "Assistente de TI – Suporte Técnico e Infraestrutura - TI",
    company: "SICOOB CREDIACIL",
    level: "Operacional",
    modality: "Presencial",
    location: "Leme/SP",
    url: "https://www.empregare.com/pt-br/vaga-assistente-de-ti-suporte-tecnico-e-infra_180562",
  },
  {
    id: "rh-estagio-rh-rands-177210",
    area: "RECURSOS_HUMANOS",
    // Título exatamente como na página pública da vaga.
    title: "Estagio em Recursos Humanos (R&S)",
    company: "Clima Gestão",
    level: "Estágio",
    modality: "Híbrido",
    location: "Brasília/DF",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-recursos-humanos-rands_177210",
  },
  {
    id: "rh-assistente-rh-168796",
    area: "RECURSOS_HUMANOS",
    title: "Assistente de RH",
    company: "Start People Consultoria de RH e Treinamentos",
    level: "Profissional",
    modality: "Presencial",
    location: "Cachoeiro de Itapemirim/ES",
    url: "https://www.empregare.com/pt-br/vaga-assistente-de-rh_168796",
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
    id: "sec-secretaria-comercial-178376",
    area: "SECRETARIADO",
    title: "Secretária Comercial - Três Lagoas MS",
    // Dados confirmados na página pública da vaga. O modelo do card não tem campo de contrato.
    company: "A KARINI P DE SENA RIBEIRO, CONSULTORIA EMPRESARIAL",
    level: "Profissional",
    modality: "Híbrido",
    location: "Três Lagoas/MS",
    url: "https://www.empregare.com/pt-br/vaga-secretaria-comercial-tres-lagoas-ms_178376",
  },
];

/** Apenas as vagas da área escolhida (2 por área). */
export function getSuggestedJobsByArea(area: SuggestedJobArea): SuggestedJob[] {
  return SUGGESTED_JOBS.filter((job) => job.area === area);
}

// ─── Snapshots (fallback controlado das vagas sugeridas OFICIAIS) ─────────────
//
// Dados lidos das páginas públicas da Empregare; só o que a página confirma (sem
// salário, sem benefícios, sem inventar). Título, empresa e local vêm do próprio
// card (`SUGGESTED_JOBS`), então não há duas cópias para divergir. Cada snapshot
// só vale para o id E a URL do próprio card. Usado apenas quando a análise real
// da MESMA URL falha (ver `resolveJobContext` no serviço de contexto); nunca para
// URL externa e nunca como fonte da verdade do analisador.

export type SuggestedJobSnapshot = {
  id: string;
  url: string;
  summary: string;
  activities: string[];
  requirements: string[];
  contractType: string;
  workMode: "REMOTE" | "HYBRID" | "ONSITE";
};

export const SUGGESTED_JOB_SNAPSHOTS: readonly SuggestedJobSnapshot[] = [
  {
    id: "ti-estagio-ads-181565",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-analise-e-desenvolvimento-de-_181565",
    summary:
      "O estagiário trabalhará com planilhas em Excel e fará dashboards no Power BI. Carga de 20 horas semanais, horário a combinar.",
    activities: [],
    requirements: ["Formação: Ensino Superior Cursando", "Curso: Análise e Desenvolvimento de Sistemas"],
    contractType: "Estágio",
    workMode: "ONSITE",
  },
  {
    id: "ti-assistente-ti-suporte-180562",
    url: "https://www.empregare.com/pt-br/vaga-assistente-de-ti-suporte-tecnico-e-infra_180562",
    summary:
      "Prestar suporte às atividades da área de Tecnologia da Informação, auxiliando na manutenção da infraestrutura tecnológica, no atendimento aos usuários, no acompanhamento de processos e na execução de rotinas da área, contribuindo para o pleno funcionamento dos sistemas e recursos da Cooperativa.",
    activities: [],
    requirements: [
      "Ensino técnico ou superior cursando em Tecnologia da Informação",
      "Conhecimento em sistemas operacionais Windows",
      "Noções de redes, hardware, software e suporte técnico",
      "Conhecimento do Pacote Office e ferramentas corporativas",
      "Boa comunicação, organização, proatividade e capacidade de atendimento ao usuário",
    ],
    contractType: "Efetivo – CLT",
    workMode: "ONSITE",
  },
  {
    id: "rh-estagio-rh-rands-177210",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-recursos-humanos-rands_177210",
    summary: "Estágio em Recrutamento e Seleção. Carga de 6 horas diárias (horário flexível).",
    activities: [
      "Divulgação de vagas",
      "Criação de artes no Canva",
      "Triagem de currículos",
      "Entrevistas online",
      "Apoio aos processos seletivos",
    ],
    requirements: [
      "Cursando Administração ou RH",
      "A partir do 4º semestre",
      "Interesse em Recrutamento e Seleção",
      "Boa comunicação",
      "Conhecimento em Canva e redes sociais",
    ],
    contractType: "Estágio",
    workMode: "HYBRID",
  },
  {
    id: "rh-assistente-rh-168796",
    url: "https://www.empregare.com/pt-br/vaga-assistente-de-rh_168796",
    summary:
      "Auxiliar nas atividades de gestão de pessoas: recrutamento e seleção, administração de benefícios, treinamento e desenvolvimento, controle de ponto e suporte ao departamento pessoal, garantindo que as políticas e procedimentos internos sejam seguidos. Horário: segunda a sexta, das 7h30 às 18h (1h30 de almoço).",
    activities: [
      "Auxiliar no recrutamento e seleção: triagem de currículos, agendamento de entrevistas e suporte nas contratações",
      "Controlar e atualizar registros de funcionários, em conformidade com as normas trabalhistas",
      "Organizar e arquivar documentos trabalhistas e administrativos do setor",
      "Auxiliar no planejamento e execução de treinamentos e programas de desenvolvimento",
      "Prestar suporte em ações de endomarketing e comunicação interna",
    ],
    requirements: [
      "Educação: ensino médio completo ou cursando Ensino Superior em Administração, Recursos Humanos, Psicologia ou áreas afins",
    ],
    contractType: "Efetivo – CLT",
    workMode: "ONSITE",
  },
  {
    id: "sec-estagio-secretariado-182983",
    url: "https://www.empregare.com/pt-br/vaga-estagio-em-secretariado-e-administracao-_182983",
    summary:
      "Auxiliar nas atividades administrativas, emissão de documentos institucionais (ofícios, pareceres, formulários, notas técnicas, acordos de cooperação e planos de trabalho), contato com parceiros, abertura e conclusão de processos no SEI, acompanhamento de cadastros no sistema, ligações e planilhas. Carga de 30 horas semanais, das 12:00 às 18:00.",
    activities: [],
    requirements: [
      "Formação: Ensino Superior Cursando",
      "Curso: Secretariado e Administração",
      "Tranquilidade, bom senso, foco, pontualidade e organização",
      "Boa comunicação",
    ],
    contractType: "Estágio",
    workMode: "ONSITE",
  },
  {
    id: "sec-secretaria-comercial-178376",
    url: "https://www.empregare.com/pt-br/vaga-secretaria-comercial-tres-lagoas-ms_178376",
    summary:
      "Secretária comercial de clínica, em regime híbrido (maior parte remota, com alguns dias presenciais). Horário: segunda a sexta, das 10h às 14h e das 16h às 20h.",
    activities: [
      "Agendar e confirmar consultas, programas, procedimentos e reuniões conforme o planejamento (POP) da clínica",
      "Manter a agenda atualizada e confirmada",
      "Explicar e vender os programas de tratamento oferecidos pelos profissionais da clínica",
      "Elaborar documentos do atendimento: nota fiscal, recibo e relatórios",
      "Manter a organização do ambiente e solicitar recursos de trabalho",
    ],
    requirements: [
      "Ensino Médio Completo",
      "Desejável experiência anterior em vendas e no segmento médico/hospitalar",
      "Conhecimento intermediário em pacote Office",
      "Desejável conhecimento/experiência com CRM, Excel e negociações",
      "Disponibilidade para trabalho híbrido",
    ],
    contractType: "Prestador de Serviços - PJ",
    workMode: "HYBRID",
  },
];

/** Chave de comparação "exata" de uma URL de vaga: host (sem www) + caminho, sem barra final, query ou hash. */
function jobUrlKey(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/** A vaga sugerida oficial cuja URL é a informada (ou null: URL externa/desconhecida). */
export function findSuggestedJobByUrl(url: string): SuggestedJob | null {
  const key = jobUrlKey(url);
  if (!key) return null;
  return SUGGESTED_JOBS.find((job) => jobUrlKey(job.url) === key) ?? null;
}

/** O snapshot da vaga: só se o id E a URL do snapshot forem os do próprio card. */
export function getSuggestedJobSnapshot(job: SuggestedJob): SuggestedJobSnapshot | null {
  return SUGGESTED_JOB_SNAPSHOTS.find((snapshot) => snapshot.id === job.id && snapshot.url === job.url) ?? null;
}
