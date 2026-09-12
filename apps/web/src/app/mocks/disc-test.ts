import type { DiscFactorId } from "../domain/disc-content";

export const DISC_TEST_STORAGE_KEY = "rhconnect:disc-test:v1";
export const DISC_TEST_VERSION = "v2";

export type DiscTestStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type DiscFactorCode = 1 | 2 | 3 | 4;

export type DiscOption = {
  code: DiscFactorCode;
  factor: DiscFactorId;
  label: string;
};

export type DiscBlock = {
  id: string;
  group: number;
  order: number;
  options: DiscOption[];
};

export type DiscRawCounts = Record<DiscFactorId, number>;

export type DiscTestStorage = {
  status: DiscTestStatus;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  answers: Record<string, DiscFactorCode>;
  rawCounts?: DiscRawCounts;
  primaryFactor?: DiscFactorId;
  secondaryFactor?: DiscFactorId;
  version: string;
};

export const DISC_FACTOR_BY_CODE: Record<DiscFactorCode, DiscFactorId> = {
  1: "D",
  2: "I",
  3: "S",
  4: "C",
};

export const DISC_CODE_BY_FACTOR: Record<DiscFactorId, DiscFactorCode> = {
  D: 1,
  I: 2,
  S: 3,
  C: 4,
};

export const DISC_SPREADSHEET_FACTOR_ORDER: DiscFactorId[] = ["D", "I", "S", "C"];

export const EMPTY_DISC_RAW_COUNTS: DiscRawCounts = {
  D: 0,
  I: 0,
  S: 0,
  C: 0,
};

const option = (code: DiscFactorCode, label: string): DiscOption => ({
  code,
  factor: DISC_FACTOR_BY_CODE[code],
  label: label.trim(),
});

// Estrutura transcrita da aba "Teste DISC" da planilha original do projeto.
// Os codigos 1-4 ficam internos e mapeiam D/I/S/C conforme a aba "Resultado DISC".
export const DISC_TEST_BLOCKS: DiscBlock[] = [
  { id: "disc-q01", group: 1, order: 1, options: [option(1, "Aventureiro"), option(2, "Animado"), option(3, "Adaptável"), option(4, "Analítico")] },
  { id: "disc-q02", group: 1, order: 2, options: [option(1, "Energético"), option(2, "Sociável"), option(3, "Submisso"), option(4, "Doador")] },
  { id: "disc-q03", group: 1, order: 3, options: [option(1, "Habilidoso"), option(2, "Estimulante"), option(3, "Reservado"), option(4, "Respeitoso")] },
  { id: "disc-q04", group: 1, order: 4, options: [option(1, "Positivo"), option(2, "Charmoso"), option(3, "Paciente"), option(4, "Planejador")] },
  { id: "disc-q05", group: 1, order: 5, options: [option(1, "Persuasivo"), option(2, "Brincalhão"), option(3, "Sereno"), option(4, "Persistente")] },
  { id: "disc-q06", group: 1, order: 6, options: [option(1, "Competitivo"), option(2, "Convincente"), option(3, "Controlado"), option(4, "Atencioso")] },
  { id: "disc-q07", group: 1, order: 7, options: [option(1, "Autossuficiente"), option(2, "Espirituoso"), option(3, "Satisfeito"), option(4, "Sensível")] },
  { id: "disc-q08", group: 1, order: 8, options: [option(1, "Seguro"), option(2, "Espontâneo"), option(3, "Tímido"), option(4, "Organizado")] },
  { id: "disc-q09", group: 2, order: 9, options: [option(1, "Franco"), option(2, "Otimista"), option(3, "Serviçal"), option(4, "Ordeiro")] },
  { id: "disc-q10", group: 2, order: 10, options: [option(1, "Audacioso"), option(2, "Encantador"), option(3, "Diplomático"), option(4, "Minucioso")] },
  { id: "disc-q11", group: 2, order: 11, options: [option(1, "Independente"), option(2, "Inspirado"), option(3, "Inofensivo"), option(4, "Idealista")] },
  { id: "disc-q12", group: 2, order: 12, options: [option(1, "Ativo"), option(2, "Desavergonhado"), option(3, "Mediador"), option(4, "Musical")] },
  { id: "disc-q13", group: 2, order: 13, options: [option(1, "Vigoroso"), option(2, "Engraçado"), option(3, "Amigável"), option(4, "Fiel")] },
  { id: "disc-q14", group: 2, order: 14, options: [option(1, "Confiante"), option(2, "Alegre"), option(3, "Previsível"), option(4, "Culto")] },
  { id: "disc-q15", group: 2, order: 15, options: [option(1, "Decidido"), option(2, "Demonstrativo"), option(3, "Profundo"), option(4, "Irônico")] },
  { id: "disc-q16", group: 2, order: 16, options: [option(1, "Firme"), option(2, "Conversador"), option(3, "Tolerante"), option(4, "Pensativo")] },
  { id: "disc-q17", group: 3, order: 17, options: [option(1, "Líder"), option(2, "Ativo"), option(3, "Ouvinte"), option(4, "Leal")] },
  { id: "disc-q18", group: 3, order: 18, options: [option(1, "Produtivo"), option(2, "Popular"), option(3, "Agradável"), option(4, "Perfeccionista")] },
  { id: "disc-q19", group: 3, order: 19, options: [option(1, "Autoritário"), option(2, "Metido"), option(3, "Tranquilo"), option(4, "Acanhado")] },
  { id: "disc-q20", group: 3, order: 20, options: [option(1, "Inflexível"), option(2, "Repetitivo"), option(3, "Relutante"), option(4, "Ressentido")] },
  { id: "disc-q21", group: 3, order: 21, options: [option(1, "Chefe"), option(2, "Atraente"), option(3, "Contente"), option(4, "Detalhista")] },
  { id: "disc-q22", group: 3, order: 22, options: [option(1, "Valente"), option(2, "Vivaz"), option(3, "Equilibrado"), option(4, "Comportado")] },
  { id: "disc-q23", group: 3, order: 23, options: [option(1, "Insensível"), option(2, "Indisciplinado"), option(3, "Desinteressado"), option(4, "Rancoroso")] },
  { id: "disc-q24", group: 3, order: 24, options: [option(1, "Mandão"), option(2, "Esquecido"), option(3, "Medroso"), option(4, "Complicado")] },
  { id: "disc-q25", group: 4, order: 25, options: [option(1, "Impaciente"), option(2, "Inoportuno"), option(3, "Indeciso"), option(4, "Inseguro")] },
  { id: "disc-q26", group: 4, order: 26, options: [option(1, "Cabeçudo"), option(2, "Casual"), option(3, "Hesitante"), option(4, "Insatisfeito")] },
  { id: "disc-q27", group: 4, order: 27, options: [option(1, "Discutidor"), option(2, "Esquentado"), option(3, "Incerto"), option(4, "Alienado")] },
  { id: "disc-q28", group: 4, order: 28, options: [option(1, "Trabalhador"), option(2, "Egoísta"), option(3, "Preocupado"), option(4, "Retraído")] },
  { id: "disc-q29", group: 4, order: 29, options: [option(1, "Frio"), option(2, "Imprevisível"), option(3, "Desligado"), option(4, "Impopular")] },
  { id: "disc-q30", group: 4, order: 30, options: [option(1, "Orgulhoso"), option(2, "Permissivo"), option(3, "Simples"), option(4, "Cauteloso")] },
  { id: "disc-q31", group: 4, order: 31, options: [option(1, "Ousado"), option(2, "Ingênuo"), option(3, "Indiferente"), option(4, "Negativo")] },
  { id: "disc-q32", group: 4, order: 32, options: [option(1, "Indelicado"), option(2, "Tagarela"), option(3, "Tímido"), option(4, "Sensível")] },
  { id: "disc-q33", group: 5, order: 33, options: [option(1, "Mandão"), option(2, "Desorganizado"), option(3, "Confuso"), option(4, "Deprimido")] },
  { id: "disc-q34", group: 5, order: 34, options: [option(1, "Manipulador"), option(2, "Desordenado"), option(3, "Resmungão"), option(4, "Triste")] },
  { id: "disc-q35", group: 5, order: 35, options: [option(1, "Tirânico"), option(2, "Barulhento"), option(3, "Preguiçoso"), option(4, "Solitário")] },
  { id: "disc-q36", group: 5, order: 36, options: [option(1, "Imprudente"), option(2, "Agitado"), option(3, "Relutante"), option(4, "Vingativo")] },
  { id: "disc-q37", group: 5, order: 37, options: [option(1, "Intolerante"), option(2, "Inconstante"), option(3, "Apático"), option(4, "Introvertido")] },
  { id: "disc-q38", group: 5, order: 38, options: [option(1, "Obstinado"), option(2, "Convencido"), option(3, "Lento"), option(4, "Cético")] },
  { id: "disc-q39", group: 5, order: 39, options: [option(1, "Irritável"), option(2, "Distraído"), option(3, "Vagaroso"), option(4, "Desconfiado")] },
  { id: "disc-q40", group: 5, order: 40, options: [option(1, "Astuto"), option(2, "Instável"), option(3, "Acomodado"), option(4, "Crítico")] },
];

export function createInitialDiscTestStorage(): DiscTestStorage {
  return {
    status: "NOT_STARTED",
    answers: {},
    version: DISC_TEST_VERSION,
  };
}

function getFactorBySpreadsheetRank(counts: DiscRawCounts, rank: 1 | 2): DiscFactorId {
  const sortedValues = DISC_SPREADSHEET_FACTOR_ORDER.map((factor) => counts[factor]).sort((a, b) => b - a);
  const targetValue = sortedValues[rank - 1] ?? 0;
  return DISC_SPREADSHEET_FACTOR_ORDER.find((factor) => counts[factor] === targetValue) ?? "D";
}

export function getDiscPercentFromRawCount(count: number) {
  return Math.round((count / DISC_TEST_BLOCKS.length) * 100);
}

export function calculateDiscMockResult(answers: Record<string, DiscFactorCode>): {
  rawCounts: DiscRawCounts;
  primaryFactor: DiscFactorId;
  secondaryFactor: DiscFactorId;
} {
  const rawCounts: DiscRawCounts = { ...EMPTY_DISC_RAW_COUNTS };

  DISC_TEST_BLOCKS.forEach((block) => {
    const selectedCode = answers[block.id];
    if (!selectedCode) return;
    rawCounts[DISC_FACTOR_BY_CODE[selectedCode]] += 1;
  });

  return {
    rawCounts,
    primaryFactor: getFactorBySpreadsheetRank(rawCounts, 1),
    secondaryFactor: getFactorBySpreadsheetRank(rawCounts, 2),
  };
}
