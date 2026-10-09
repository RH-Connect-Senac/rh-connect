import { BadGatewayException, BadRequestException } from '@nestjs/common';
import {
  FLOW_LIMITS,
  normalizeAnswer,
  parseGeneratedQuestions,
  toQuestionResponse,
  validateAnswer,
} from './interview-flow';

function pythonPayload(overrides: Array<Record<string, unknown>> = []) {
  const base = [
    { id: 1, type: 'Tecnica', text: 'Pergunta técnica 1?' },
    { id: 2, type: 'Tecnica', text: 'Pergunta técnica 2?' },
    { id: 3, type: 'Comportamental', text: 'Pergunta comportamental 1?' },
    { id: 4, type: 'Comportamental', text: 'Pergunta comportamental 2?' },
    { id: 5, type: 'Carreira', text: 'Pergunta de carreira?' },
  ];
  return { questions: base.map((item, i) => ({ ...item, ...overrides[i] })) };
}

describe('normalizeAnswer / validateAnswer', () => {
  it('troca quebras de linha por espaço e faz trim (como o frontend)', () => {
    expect(normalizeAnswer('  linha 1 \r\n\r\n  linha 2\nlinha 3  ')).toBe(
      'linha 1 linha 2 linha 3',
    );
  });

  it('resposta só com espaços/quebras vira string vazia', () => {
    expect(normalizeAnswer('  \n \r\n ')).toBe('');
  });

  it('aceita exatamente 1000 caracteres e preserva o conteúdo', () => {
    const exact = 'a'.repeat(FLOW_LIMITS.answer);
    expect(validateAnswer(exact)).toBe(exact);
  });

  it('1001 caracteres => 400, sem truncar', () => {
    expect(() => validateAnswer('a'.repeat(FLOW_LIMITS.answer + 1))).toThrow(
      BadRequestException,
    );
  });

  it('mede o limite em pontos de código (emoji conta 1)', () => {
    const exact = '😀'.repeat(FLOW_LIMITS.answer);
    expect(validateAnswer(exact)).toBe(exact);
    expect(() => validateAnswer(`${exact}😀`)).toThrow(BadRequestException);
  });

  it('mede o limite depois de normalizar as quebras de linha', () => {
    const raw = `${'a'.repeat(499)}\n\n\n${'b'.repeat(500)}`; // 1000 normalizados
    expect(textOf(validateAnswer(raw))).toBe(1000);
  });
});

function textOf(value: string) {
  return Array.from(value).length;
}

describe('parseGeneratedQuestions', () => {
  it('mapeia tipos do Python para o enum e usa a ordem como posição', () => {
    const result = parseGeneratedQuestions(pythonPayload());
    expect(result.map((q) => q.position)).toEqual([1, 2, 3, 4, 5]);
    expect(result.map((q) => q.type)).toEqual([
      'TECHNICAL',
      'TECHNICAL',
      'BEHAVIORAL',
      'BEHAVIORAL',
      'CAREER',
    ]);
    expect(result[0].text).toBe('Pergunta técnica 1?');
  });

  it('ignora o id devolvido pelo Python (posição vem da ordem)', () => {
    const result = parseGeneratedQuestions(
      pythonPayload([{ id: 99 }, { id: 98 }]),
    );
    expect(result.map((q) => q.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('aceita tipos com acento/caixa diferentes', () => {
    const result = parseGeneratedQuestions(
      pythonPayload([{ type: ' TÉCNICA ' }, { type: 'behavioral' }]),
    );
    expect(result[0].type).toBe('TECHNICAL');
    expect(result[1].type).toBe('BEHAVIORAL');
  });

  it.each([
    ['payload nulo', null],
    ['sem questions', {}],
    ['questions não é lista', { questions: 'x' }],
    [
      'quantidade diferente de 5',
      { questions: pythonPayload().questions.slice(1) },
    ],
    ['tipo desconhecido', pythonPayload([{ type: 'constructor' }])],
    ['tipo ausente', pythonPayload([{ type: undefined }])],
    ['texto vazio', pythonPayload([{ text: '   ' }])],
    ['texto não string', pythonPayload([{ text: 123 }])],
    [
      'texto acima de 500 caracteres',
      pythonPayload([{ text: 'a'.repeat(FLOW_LIMITS.questionText + 1) }]),
    ],
  ])('%s => 502', (_name, payload) => {
    expect(() => parseGeneratedQuestions(payload)).toThrow(BadGatewayException);
  });

  it('aceita texto com exatamente 500 caracteres, sem cortar', () => {
    const text = 'a'.repeat(FLOW_LIMITS.questionText);
    const result = parseGeneratedQuestions(pythonPayload([{ text }]));
    expect(result[0].text).toBe(text);
  });
});

describe('toQuestionResponse', () => {
  it('expõe só id/posição/tipo/texto/resposta (sem interview_id)', () => {
    const at = new Date('2026-10-09T12:00:00.000Z');
    expect(
      toQuestionResponse({
        question_id: 'q-1',
        position: 2,
        question_type: 'TECHNICAL',
        question_text: 'Texto?',
        answer_text: 'Resposta',
        answered_at: at,
      }),
    ).toEqual({
      id: 'q-1',
      position: 2,
      type: 'TECHNICAL',
      text: 'Texto?',
      answer: 'Resposta',
      answeredAt: at,
    });
  });
});
