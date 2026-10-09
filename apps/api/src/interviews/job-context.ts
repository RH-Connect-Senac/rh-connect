import { BadRequestException } from '@nestjs/common';

// Contexto da vaga (snapshot) persistido na Interview.
//
// O contexto vem do front (resultado de POST /interviews/ai/job-context) e
// afeta somente a entrevista DO PRÓPRIO candidato autenticado. Por isso é
// aceito, mas sempre validado (DTO) e normalizado aqui antes de gravar: nada
// do que o cliente envia define dono, status ou modalidade.
//
// Campos com limite físico (título, empresa, resumo, localização, tipo de
// contrato): trim/espaços são normalizados, mas o conteúdo NUNCA é cortado em
// silêncio. Acima do limite => 400. Só as LISTAS (atividades/requisitos), que
// são JSONB e não têm VARCHAR, continuam limitadas em quantidade/tamanho.

export const JOB_WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type JobWorkMode = (typeof JOB_WORK_MODES)[number];

// Limites físicos aprovados (VARCHAR) + limites das listas.
export const JOB_LIMITS = {
  title: 80,
  company: 80,
  summary: 800,
  location: 60,
  contractType: 40,
  sourceUrl: 2048,
  listMaxItems: 50,
  listItemLength: 1000,
} as const;

// Teto de ENTRADA das listas no DTO (anti-abuso).
export const JOB_INPUT_LIMITS = {
  text: 2000,
  listMaxItems: 200,
} as const;

export interface JobContextInput {
  sourceUrl: string;
  title: string;
  company?: string | null;
  summary?: string | null;
  activities?: string[] | null;
  requirements?: string[] | null;
  location?: string | null;
  contractType?: string | null;
  workMode?: JobWorkMode | null;
}

export interface NormalizedJobContext {
  sourceUrl: string;
  title: string;
  company: string | null;
  summary: string | null;
  activities: string[];
  requirements: string[];
  location: string | null;
  contractType: string | null;
  workMode: JobWorkMode | null;
}

// Normalização de texto de linha única: colapsa qualquer sequência de espaços
// (inclui quebras de linha) em um espaço e remove as pontas.
export function normalizeSingleLine(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

// Texto de várias linhas (resumo): só remove as pontas, preserva as quebras.
export function normalizeMultiLine(value: string | null | undefined): string {
  return (value ?? '').trim();
}

// Tamanho em pontos de código, igual ao que o VARCHAR(n) do PostgreSQL conta
// (um emoji conta 1, mesmo ocupando 2 unidades UTF-16).
export function textLength(value: string): number {
  return Array.from(value).length;
}

// Corta por pontos de código (não separa pares substitutos). Usado apenas nos
// itens das LISTAS JSONB; nunca nos campos com VARCHAR.
function clip(value: string, max: number): string {
  return Array.from(value).slice(0, max).join('');
}

function listItem(value: string | null | undefined, max: number) {
  const text = normalizeSingleLine(value);
  return text ? clip(text, max) : null;
}

function list(items: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of items ?? []) {
    const text = listItem(raw, JOB_LIMITS.listItemLength);
    if (text) out.push(text);
    if (out.length >= JOB_LIMITS.listMaxItems) break;
  }
  return out;
}

// Campos com limite físico: devolve o texto normalizado ou registra o erro.
function limited(
  value: string | null | undefined,
  max: number,
  label: string,
  mode: 'single' | 'multi',
  errors: string[],
): string | null {
  const text =
    mode === 'single' ? normalizeSingleLine(value) : normalizeMultiLine(value);
  if (textLength(text) > max) {
    errors.push(`${label} deve ter no máximo ${max} caracteres.`);
  }
  return text || null;
}

export function normalizeJobContext(
  input: JobContextInput,
): NormalizedJobContext {
  const errors: string[] = [];

  const title = limited(
    input.title,
    JOB_LIMITS.title,
    'O título da vaga',
    'single',
    errors,
  );
  if (!title) errors.push('Informe o título da vaga.');
  const company = limited(
    input.company,
    JOB_LIMITS.company,
    'A empresa',
    'single',
    errors,
  );
  const summary = limited(
    input.summary,
    JOB_LIMITS.summary,
    'O resumo da vaga',
    'multi',
    errors,
  );
  const location = limited(
    input.location,
    JOB_LIMITS.location,
    'A localização',
    'single',
    errors,
  );
  const contractType = limited(
    input.contractType,
    JOB_LIMITS.contractType,
    'O tipo de contrato',
    'single',
    errors,
  );

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }

  return {
    sourceUrl: input.sourceUrl.trim(),
    title: title as string,
    company,
    summary,
    activities: list(input.activities),
    requirements: list(input.requirements),
    location,
    contractType,
    workMode: input.workMode ?? null,
  };
}
