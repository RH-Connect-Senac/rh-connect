import { BadRequestException } from '@nestjs/common';
import {
  JOB_LIMITS,
  normalizeJobContext,
  type JobContextInput,
} from './job-context';

const base = {
  sourceUrl: '  https://empregare.example/vaga/1  ',
  title: 'Desenvolvedor',
};

// O NestJS monta `error.message` como "Bad Request Exception" quando o corpo
// é uma lista; as mensagens reais ficam em `getResponse().message`.
function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

function messagesOf(error: unknown): string[] {
  expect(error).toBeInstanceOf(BadRequestException);
  const response = (error as BadRequestException).getResponse();
  const message =
    typeof response === 'string'
      ? response
      : (response as { message?: unknown }).message;
  return Array.isArray(message) ? (message as string[]) : [String(message)];
}

// Campo variável (it.each) sem depender da inferência de chave computada.
const withField = (field: string, value: string) =>
  normalizeJobContext({ ...base, [field]: value } as JobContextInput);

describe('normalizeJobContext', () => {
  it('normaliza espaços, remove itens vazios e aplica defaults', () => {
    const ctx = normalizeJobContext({
      ...base,
      title: '  Desenvolvedor \n  Front-end  ',
      company: '   ',
      activities: ['  Criar telas  ', '', '   '],
      requirements: undefined,
      workMode: undefined,
    });

    expect(ctx).toEqual({
      sourceUrl: 'https://empregare.example/vaga/1',
      title: 'Desenvolvedor Front-end',
      company: null,
      summary: null,
      activities: ['Criar telas'],
      requirements: [],
      location: null,
      contractType: null,
      workMode: null,
    });
  });

  const LIMITS = {
    title: 80,
    company: 80,
    summary: 800,
    location: 60,
    contractType: 40,
  } as const;

  it.each(Object.entries(LIMITS))(
    '%s: aceita exatamente o limite (%i) e preserva o conteúdo',
    (field, max) => {
      const value = 'a'.repeat(max);
      const ctx = withField(field, value);
      expect(ctx[field as keyof typeof ctx]).toBe(value);
    },
  );

  // Mensagens reais devolvidas no corpo do 400 (getResponse().message).
  const LIMIT_MESSAGES = [
    ['title', 80, 'O título da vaga deve ter no máximo 80 caracteres.'],
    ['company', 80, 'A empresa deve ter no máximo 80 caracteres.'],
    ['summary', 800, 'O resumo da vaga deve ter no máximo 800 caracteres.'],
    ['location', 60, 'A localização deve ter no máximo 60 caracteres.'],
    [
      'contractType',
      40,
      'O tipo de contrato deve ter no máximo 40 caracteres.',
    ],
  ] as const;

  it.each(LIMIT_MESSAGES)(
    '%s: acima do limite (%i + 1) => 400 com a mensagem do campo, sem truncar',
    (field, max, message) => {
      const error = capture(() => withField(field, 'a'.repeat(max + 1)));

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect(messagesOf(error)).toEqual([message]);
    },
  );

  it('reporta todos os campos acima do limite de uma vez', () => {
    let error: unknown;
    try {
      normalizeJobContext({
        ...base,
        title: 'a'.repeat(81),
        company: 'b'.repeat(81),
        location: 'c'.repeat(61),
      });
    } catch (caught) {
      error = caught;
    }

    expect(messagesOf(error)).toEqual([
      'O título da vaga deve ter no máximo 80 caracteres.',
      'A empresa deve ter no máximo 80 caracteres.',
      'A localização deve ter no máximo 60 caracteres.',
    ]);
  });

  it('mede o limite sobre o texto normalizado (espaços colapsados não contam)', () => {
    const title = `${'a'.repeat(40)}${' '.repeat(50)}${'b'.repeat(40)}`; // 130 brutos, 81 normalizados
    expect(() => normalizeJobContext({ ...base, title })).toThrow(
      BadRequestException,
    );
    const ok = `${'a'.repeat(39)}${' '.repeat(50)}${'b'.repeat(40)}`; // 80 normalizados
    expect(normalizeJobContext({ ...base, title: ok }).title).toBe(
      `${'a'.repeat(39)} ${'b'.repeat(40)}`,
    );
  });

  it('conta pontos de código como o VARCHAR (emoji = 1)', () => {
    const ok = normalizeJobContext({ ...base, title: '😀'.repeat(80) });
    expect(Array.from(ok.title)).toHaveLength(80);
    expect(() =>
      normalizeJobContext({ ...base, title: '😀'.repeat(81) }),
    ).toThrow(BadRequestException);
  });

  it('título vazio após normalizar => 400', () => {
    expect(() => normalizeJobContext({ ...base, title: '  \n ' })).toThrow(
      BadRequestException,
    );
  });

  it('limita quantidade e tamanho dos itens das listas', () => {
    const many = Array.from({ length: 120 }, (_, i) => `req ${i}`);
    const ctx = normalizeJobContext({
      ...base,
      requirements: many,
      activities: ['x'.repeat(5000)],
    });

    expect(ctx.requirements).toHaveLength(JOB_LIMITS.listMaxItems);
    expect(ctx.activities[0]).toHaveLength(JOB_LIMITS.listItemLength);
  });

  it('preserva quebras de linha do resumo', () => {
    const ctx = normalizeJobContext({ ...base, summary: ' linha 1\nlinha 2 ' });
    expect(ctx.summary).toBe('linha 1\nlinha 2');
  });
});
