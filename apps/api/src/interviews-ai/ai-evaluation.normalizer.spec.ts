import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  CRITERION_KEYS,
  EVALUATION_CRITERIA,
} from '../evaluator-interviews/evaluation-criteria';
import { NEED_KEYS } from '../material-recommendations/recommendation.types';
import { normalizeAiEvaluation } from './ai-evaluation.normalizer';
import {
  AI_CRITERION_LABELS,
  AiEvaluationContractError,
} from './ai-evaluation.types';
import type {
  AiEvaluationErrorCode,
  AiEvaluationQuestionRef,
  PythonEvaluationResponse,
} from './ai-evaluation.types';

const QUESTIONS: AiEvaluationQuestionRef[] = [
  { questionId: '11111111-1111-4111-8111-111111111111', position: 1 },
  { questionId: '22222222-2222-4222-8222-222222222222', position: 2 },
  { questionId: '33333333-3333-4333-8333-333333333333', position: 3 },
  { questionId: '44444444-4444-4444-8444-444444444444', position: 4 },
  { questionId: '55555555-5555-4555-8555-555555555555', position: 5 },
];

// Resposta representativa do Python (dados fictícios): 8,0 + 7,5 + 6,0 + 9,0 +
// 5,5 + 7,0 + 6,5 = 49,5; 49,5 / 7 = 7,0714... => overallScore 7,1.
function pythonResponse(): PythonEvaluationResponse {
  return {
    scores: {
      Clareza: 8.0,
      Coerência: 7.5,
      Objetividade: 6.0,
      Domínio: 9.0,
      Organização: 5.5,
      Aderência: 7.0,
      Exemplos: 6.5,
    },
    overallScore: 7.1,
    strengths: ['Boa estrutura nas respostas.'],
    improvements: ['Trazer mais exemplos concretos.'],
    recommendations: ['Praticar o método STAR.'],
    summary: 'Desempenho consistente, com espaço para exemplos.',
    questionsEvaluation: [1, 2, 3, 4, 5].map((id) => ({
      questionId: id,
      score: 7.5,
      reason: `Justificativa ${id}.`,
      positives: [`Ponto forte ${id}.`],
      improvements: [`Melhoria ${id}.`],
      suggestion: `Sugestão ${id}.`,
    })),
  };
}

// Cópia profunda mutável para os cenários inválidos.
function raw(): Record<string, any> {
  return JSON.parse(JSON.stringify(pythonResponse()));
}

function expectContractError(
  action: () => unknown,
  code: AiEvaluationErrorCode,
  path?: string,
) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AiEvaluationContractError);
    expect((error as AiEvaluationContractError).code).toBe(code);
    if (path !== undefined) {
      expect((error as AiEvaluationContractError).path).toBe(path);
    }
    return;
  }
  throw new Error(`esperava AiEvaluationContractError(${code})`);
}

const normalize = (value: unknown, questions = QUESTIONS) =>
  normalizeAiEvaluation(value, questions);

describe('normalizeAiEvaluation', () => {
  describe('resposta válida', () => {
    it('aceita uma resposta representativa do Python e preserva o conteúdo', () => {
      const input = pythonResponse();
      const result = normalize(input);

      expect(result.criteriaScores).toEqual({
        clarity: 8.0,
        coherence: 7.5,
        objectivity: 6.0,
        domain_knowledge: 9.0,
        organization: 5.5,
        requirements_alignment: 7.0,
        examples: 6.5,
      });
      expect(result.overallScore).toBe(7.1);
      expect(result.strengths).toEqual(input.strengths);
      expect(result.improvements).toEqual(input.improvements);
      expect(result.recommendations).toEqual(input.recommendations);
      expect(result.summary).toBe(input.summary);
      expect(result.questionsEvaluation[2]).toEqual({
        questionId: QUESTIONS[2].questionId,
        position: 3,
        score: 7.5,
        reason: 'Justificativa 3.',
        positives: ['Ponto forte 3.'],
        improvements: ['Melhoria 3.'],
        suggestion: 'Sugestão 3.',
      });
    });

    it('não altera a entrada nem reescreve textos (espaços e quebras preservados)', () => {
      const input = raw();
      input.summary = '  Texto  com\nquebra  ';
      input.questionsEvaluation[0].reason = ' mantém  espaços ';
      const snapshot = JSON.stringify(input);

      const result = normalize(input);

      expect(JSON.stringify(input)).toBe(snapshot);
      expect(result.summary).toBe('  Texto  com\nquebra  ');
      expect(result.questionsEvaluation[0].reason).toBe(' mantém  espaços ');
    });

    it('aceita textos vazios e listas vazias (o Python pode devolvê-los)', () => {
      const input = raw();
      input.summary = '';
      input.strengths = [];
      input.questionsEvaluation[0].reason = '';
      input.questionsEvaluation[0].suggestion = '';
      input.questionsEvaluation[0].positives = [];
      expect(() => normalize(input)).not.toThrow();
    });

    it('ignora campos extras desconhecidos fora de `scores`', () => {
      const input = raw();
      input.extra = 'x';
      input.questionsEvaluation[0].extra = 1;
      expect(() => normalize(input)).not.toThrow();
    });
  });

  describe('critérios', () => {
    it('mapeia os sete rótulos Python para as chaves canônicas, na ordem canônica', () => {
      const result = normalize(raw());
      expect(Object.keys(result.criteriaScores)).toEqual([...CRITERION_KEYS]);
      for (const criterion of EVALUATION_CRITERIA) {
        const label = AI_CRITERION_LABELS[criterion.key];
        expect(result.criteriaScores[criterion.key]).toBe(
          pythonResponse().scores[label],
        );
      }
    });

    it('aceita variações de acento e de caixa nos rótulos', () => {
      const input = raw();
      input.scores = {
        CLAREZA: 8.0,
        coerencia: 7.5,
        ' Objetividade ': 6.0,
        Dominio: 9.0,
        ORGANIZAÇÃO: 5.5,
        aderencia: 7.0,
        exemplos: 6.5,
      };
      expect(normalize(input).criteriaScores.requirements_alignment).toBe(7.0);
    });

    it('independe da ordem em que o Python envia os critérios', () => {
      const input = raw();
      input.scores = Object.fromEntries(
        Object.entries(input.scores as Record<string, number>).reverse(),
      );
      expect(Object.keys(normalize(input).criteriaScores)).toEqual([
        ...CRITERION_KEYS,
      ]);
    });

    it('rejeita critério ausente', () => {
      const input = raw();
      delete input.scores.Exemplos;
      expectContractError(
        () => normalize(input),
        'MISSING_CRITERION',
        'scores.examples',
      );
    });

    it('rejeita critério extra/desconhecido', () => {
      const input = raw();
      input.scores.Criatividade = 8;
      expectContractError(() => normalize(input), 'UNKNOWN_CRITERION');
    });

    it('rejeita as chaves canônicas em inglês (o Python usa rótulos)', () => {
      const input = raw();
      input.scores = {
        clarity: 8,
        coherence: 7,
        objectivity: 7,
        domain_knowledge: 7,
        organization: 7,
        requirements_alignment: 7,
        examples: 7,
      };
      expectContractError(() => normalize(input), 'UNKNOWN_CRITERION');
    });

    it('rejeita o mesmo critério informado duas vezes (variações do rótulo)', () => {
      const input = raw();
      input.scores.clareza = 8;
      expectContractError(
        () => normalize(input),
        'DUPLICATE_CRITERION',
        'scores.clarity',
      );
    });

    it.each([null, undefined, [], 'x', 3])(
      'rejeita `scores` que não é objeto (%p)',
      (scores) => {
        const input = raw();
        input.scores = scores;
        expectContractError(() => normalize(input), 'INVALID_CRITERIA');
      },
    );

    it.each([
      ['negativa', -0.1],
      ['acima de 10', 10.1],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['-Infinity', Number.NEGATIVE_INFINITY],
      ['texto numérico', '8'],
      ['null', null],
      ['booleano', true],
    ])('rejeita nota %s', (_name, value) => {
      const input = raw();
      input.scores.Clareza = value;
      expectContractError(
        () => normalize(input),
        'INVALID_SCORE',
        'scores.clarity',
      );
    });

    it('aceita os extremos 0 e 10 e não modifica notas individuais', () => {
      const input = raw();
      input.scores = {
        Clareza: 0,
        Coerência: 10,
        Objetividade: 3.14159,
        Domínio: 0,
        Organização: 10,
        Aderência: 0,
        Exemplos: 10,
      };
      // média = 33,14159 / 7 = 4,7345...
      input.overallScore = 4.7;
      const result = normalize(input);
      expect(result.criteriaScores.objectivity).toBe(3.14159);
      expect(result.criteriaScores.clarity).toBe(0);
    });
  });

  describe('nota geral (DEC-005, conferência sem substituição)', () => {
    it('aceita a nota geral correta e a devolve sem alteração', () => {
      expect(normalize(raw()).overallScore).toBe(7.1);
    });

    it('rejeita nota geral divergente da média dos sete', () => {
      const input = raw();
      input.overallScore = 7.0; // média 7,0714: diferença > 0,05
      expectContractError(
        () => normalize(input),
        'OVERALL_SCORE_MISMATCH',
        'overallScore',
      );
      input.overallScore = 8.5;
      expectContractError(() => normalize(input), 'OVERALL_SCORE_MISMATCH');
    });

    it('não substitui silenciosamente: divergência vira erro, nunca média recalculada', () => {
      const input = raw();
      input.overallScore = 9.9;
      expect(() => normalize(input)).toThrow(AiEvaluationContractError);
    });

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['negativa', -1],
      ['acima de 10', 10.5],
      ['texto', '7.1'],
      ['ausente', undefined],
      ['mais de uma casa decimal', 7.07],
    ])('rejeita nota geral inválida: %s', (_name, value) => {
      const input = raw();
      input.overallScore = value;
      expectContractError(() => normalize(input), 'INVALID_OVERALL_SCORE');
    });

    describe('arredondamento', () => {
      // Notas com uma casa decimal: a média/7 nunca cai em empate .x5
      // (N/7 = k + 0,5 não tem solução inteira), então Python (round) e o
      // NestJS (Math.round, meio para cima) sempre produzem o mesmo valor.
      const setScores = (values: number[]) => {
        const input = raw();
        const labels = Object.values(AI_CRITERION_LABELS);
        input.scores = Object.fromEntries(
          labels.map((label, index) => [label, values[index]]),
        );
        return input;
      };
      const nestRound = (mean: number) =>
        Math.round((mean + Number.EPSILON) * 10) / 10;

      it('limite inferior: média 7,0714 => 7,1 aceito; 7,0 e 7,2 rejeitados', () => {
        const values = [8.0, 7.5, 6.0, 9.0, 5.5, 7.0, 6.5];
        const input = setScores(values);
        input.overallScore = 7.1;
        expect(() => normalize(input)).not.toThrow();
        input.overallScore = 7.0;
        expectContractError(() => normalize(input), 'OVERALL_SCORE_MISMATCH');
        input.overallScore = 7.2;
        expectContractError(() => normalize(input), 'OVERALL_SCORE_MISMATCH');
      });

      it('empate exato (média 7,25): aceita as duas políticas de arredondamento (7,2 e 7,3)', () => {
        const input = setScores([7.25, 7.25, 7.25, 7.25, 7.25, 7.25, 7.25]);
        input.overallScore = 7.3; // meio para cima (NestJS)
        expect(() => normalize(input)).not.toThrow();
        input.overallScore = 7.2; // meio para o par (Python round)
        expect(() => normalize(input)).not.toThrow();
        input.overallScore = 7.1;
        expectContractError(() => normalize(input), 'OVERALL_SCORE_MISMATCH');
        input.overallScore = 7.4;
        expectContractError(() => normalize(input), 'OVERALL_SCORE_MISMATCH');
      });

      it('todos 0 => 0 e todos 10 => 10', () => {
        const zero = setScores([0, 0, 0, 0, 0, 0, 0]);
        zero.overallScore = 0;
        expect(normalize(zero).overallScore).toBe(0);
        const ten = setScores([10, 10, 10, 10, 10, 10, 10]);
        ten.overallScore = 10;
        expect(normalize(ten).overallScore).toBe(10);
      });

      it('varredura determinística: a média arredondada (regra do NestJS) sempre é aceita', () => {
        let seed = 12345;
        const next = () => {
          seed = (seed * 1103515245 + 12345) % 2147483648;
          return seed;
        };
        for (let i = 0; i < 2000; i += 1) {
          const values = Array.from({ length: 7 }, () => (next() % 101) / 10);
          const mean = values.reduce((a, b) => a + b, 0) / 7;
          const input = setScores(values);
          input.overallScore = nestRound(mean);
          expect(() => normalize(input)).not.toThrow();
        }
      });

      it('com notas de 1 casa, a ÚNICA nota geral aceita é a média arredondada (= round(soma / 7, 1) do Python)', () => {
        // Aritmética em décimos inteiros, sem ruído de ponto flutuante. Para
        // cada soma possível (0,0 a 70,0) as sete notas são distribuídas o mais
        // uniformemente possível. `tenths / 7` tem resto k/7 e nunca é um
        // empate .5, logo `Math.round` é inequívoco e coincide com o Python.
        for (let tenths = 0; tenths <= 700; tenths += 1) {
          const base = Math.floor(tenths / 7);
          const extra = tenths % 7;
          const values = Array.from(
            { length: 7 },
            (_, index) => (base + (index < extra ? 1 : 0)) / 10,
          );
          const rounded = Math.round(tenths / 7);
          const input = setScores(values);
          for (const candidate of [rounded - 1, rounded, rounded + 1]) {
            if (candidate < 0 || candidate > 100) continue;
            input.overallScore = candidate / 10;
            if (candidate === rounded) {
              expect(() => normalize(input)).not.toThrow();
            } else {
              expectContractError(
                () => normalize(input),
                'OVERALL_SCORE_MISMATCH',
              );
            }
          }
        }
      });
    });
  });

  describe('perguntas reais e associação com UUID', () => {
    it('associa a posição 1..5 ao UUID real de cada pergunta', () => {
      const result = normalize(raw());
      expect(
        result.questionsEvaluation.map((item) => [
          item.position,
          item.questionId,
        ]),
      ).toEqual(QUESTIONS.map((q) => [q.position, q.questionId]));
    });

    it('usa o `position` informado, não a ordem do array de perguntas reais', () => {
      const shuffled = [
        QUESTIONS[3],
        QUESTIONS[0],
        QUESTIONS[4],
        QUESTIONS[1],
        QUESTIONS[2],
      ];
      const result = normalize(raw(), shuffled);
      expect(result.questionsEvaluation[0].questionId).toBe(
        QUESTIONS[0].questionId,
      );
      expect(result.questionsEvaluation[3].questionId).toBe(
        QUESTIONS[3].questionId,
      );
    });

    it('avaliações fora de ordem são associadas pelo questionId e devolvidas ordenadas', () => {
      const input = raw();
      input.questionsEvaluation.reverse();
      const result = normalize(input);
      expect(result.questionsEvaluation.map((item) => item.position)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(result.questionsEvaluation[0].reason).toBe('Justificativa 1.');
      expect(result.questionsEvaluation[0].questionId).toBe(
        QUESTIONS[0].questionId,
      );
    });

    it('rejeita perguntas reais inválidas (quantidade, posição, ids)', () => {
      const bad = (questions: unknown) =>
        expectContractError(
          () => normalize(raw(), questions as AiEvaluationQuestionRef[]),
          'INVALID_QUESTION_REFERENCES',
        );
      bad(QUESTIONS.slice(0, 4));
      bad([...QUESTIONS, { questionId: 'x', position: 6 }]);
      bad(QUESTIONS.map((q, i) => (i === 4 ? { ...q, position: 4 } : q)));
      bad(QUESTIONS.map((q, i) => (i === 4 ? { ...q, position: 6 } : q)));
      bad(QUESTIONS.map((q, i) => (i === 4 ? { ...q, position: 0 } : q)));
      bad(QUESTIONS.map((q, i) => (i === 4 ? { ...q, position: 4.5 } : q)));
      bad(
        QUESTIONS.map((q, i) =>
          i === 4 ? { ...q, questionId: QUESTIONS[0].questionId } : q,
        ),
      );
      bad(QUESTIONS.map((q, i) => (i === 4 ? { ...q, questionId: ' ' } : q)));
      bad(null);
    });

    it('rejeita menos de cinco avaliações (ausente)', () => {
      const input = raw();
      input.questionsEvaluation.pop();
      expectContractError(
        () => normalize(input),
        'MISSING_QUESTION_EVALUATION',
      );
    });

    it('rejeita mais de cinco avaliações', () => {
      const input = raw();
      input.questionsEvaluation.push({ ...input.questionsEvaluation[0] });
      expectContractError(
        () => normalize(input),
        'INVALID_QUESTIONS_EVALUATION',
      );
    });

    it('rejeita questionId duplicado (mesmo com cinco itens)', () => {
      const input = raw();
      input.questionsEvaluation[4].questionId = 1;
      expectContractError(() => normalize(input), 'DUPLICATE_QUESTION_ID');
    });

    it.each([
      ['ausente', undefined],
      ['fracionário', 2.5],
      ['zero', 0],
      ['seis', 6],
      ['negativo', -1],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['texto numérico', '3'],
      ['UUID', QUESTIONS[2].questionId],
      ['null', null],
    ])('rejeita questionId %s (sem fallback posicional)', (_name, value) => {
      const input = raw();
      input.questionsEvaluation[2].questionId = value;
      expectContractError(
        () => normalize(input),
        'INVALID_QUESTION_ID',
        'questionsEvaluation[2].questionId',
      );
    });

    it.each([null, 'x', {}, 5])(
      'rejeita `questionsEvaluation` que não é lista (%p)',
      (value) => {
        const input = raw();
        input.questionsEvaluation = value;
        expectContractError(
          () => normalize(input),
          'INVALID_QUESTIONS_EVALUATION',
        );
      },
    );

    it.each([null, 'x', 7, []])(
      'rejeita item que não é objeto (%p)',
      (value) => {
        const input = raw();
        input.questionsEvaluation[1] = value;
        expectContractError(
          () => normalize(input),
          'INVALID_QUESTIONS_EVALUATION',
        );
      },
    );

    it.each([
      ['negativo', -1],
      ['acima de 10', 10.5],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['texto', '7'],
      ['ausente', undefined],
      ['mais de uma casa decimal', 7.55],
    ])('rejeita score da pergunta %s', (_name, value) => {
      const input = raw();
      input.questionsEvaluation[0].score = value;
      expectContractError(
        () => normalize(input),
        'INVALID_SCORE',
        'questionsEvaluation[0].score',
      );
    });

    it.each(['reason', 'suggestion'])('rejeita %s que não é texto', (field) => {
      for (const value of [undefined, null, 5, ['x'], {}]) {
        const input = raw();
        input.questionsEvaluation[0][field] = value;
        expectContractError(
          () => normalize(input),
          'INVALID_TEXT',
          `questionsEvaluation[0].${field}`,
        );
      }
    });

    it.each(['positives', 'improvements'])('rejeita %s inválido', (field) => {
      for (const value of [
        undefined,
        null,
        'x',
        {},
        [1],
        [null],
        ['ok', '  '],
      ]) {
        const input = raw();
        input.questionsEvaluation[0][field] = value;
        expectContractError(() => normalize(input), 'INVALID_TEXT_LIST');
      }
    });
  });

  describe('textos gerais', () => {
    it.each(['strengths', 'improvements', 'recommendations'])(
      'rejeita %s inválido',
      (field) => {
        for (const value of [
          undefined,
          null,
          'x',
          {},
          [1],
          ['ok', ''],
          [null],
        ]) {
          const input = raw();
          input[field] = value;
          expectContractError(
            () => normalize(input),
            'INVALID_TEXT_LIST',
            undefined,
          );
        }
      },
    );

    it('rejeita summary que não é texto', () => {
      for (const value of [undefined, null, 1, ['x'], {}]) {
        const input = raw();
        input.summary = value;
        expectContractError(() => normalize(input), 'INVALID_TEXT', 'summary');
      }
    });

    it.each([null, undefined, [], 'x', 7])(
      'rejeita payload que não é objeto (%p)',
      (value) => {
        expectContractError(() => normalize(value), 'INVALID_PAYLOAD');
      },
    );
  });

  describe('erros não vazam conteúdo', () => {
    it('a mensagem e o caminho nunca contêm valores recebidos', () => {
      const secret = 'SEGREDO-DO-CANDIDATO';
      const input = raw();
      input.scores[secret] = 5;
      input.questionsEvaluation[0].reason = 7;
      input.summary = secret;
      for (const mutate of [
        () => normalize(input),
        () => {
          const other = raw();
          other.questionsEvaluation[0].positives = [secret, 3];
          return normalize(other);
        },
        () => {
          const other = raw();
          other.scores.Clareza = secret;
          return normalize(other);
        },
      ]) {
        try {
          mutate();
          throw new Error('deveria falhar');
        } catch (error) {
          expect(error).toBeInstanceOf(AiEvaluationContractError);
          const typed = error as AiEvaluationContractError;
          expect(typed.message).not.toContain(secret);
          expect(typed.path).not.toContain(secret);
        }
      }
    });
  });

  describe('paridade com os critérios do sistema', () => {
    it('os rótulos cobrem exatamente os critérios canônicos, na ordem canônica', () => {
      expect(Object.keys(AI_CRITERION_LABELS)).toEqual([...CRITERION_KEYS]);
    });

    it('as chaves canônicas coincidem com as necessidades do motor de Materiais', () => {
      expect([...NEED_KEYS]).toEqual([...CRITERION_KEYS]);
      expect(Object.keys(normalize(raw()).criteriaScores)).toEqual([
        ...NEED_KEYS,
      ]);
    });

    // A verificação é OBRIGATÓRIA (nunca é ignorada): sobe até a raiz do
    // workspace (`pnpm-workspace.yaml`) e exige `schemas.py` do serviço Python.
    // Se o monorepo não estiver completo, o teste FALHA com mensagem clara.
    function findPythonSchemasPath(): string {
      let dir = __dirname;
      for (;;) {
        if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
          return join(dir, 'services', 'interview-ai-python', 'schemas.py');
        }
        const parent = dirname(dir);
        if (parent === dir) {
          throw new Error(
            'Raiz do monorepo (pnpm-workspace.yaml) não encontrada: o teste de paridade com o Python exige o repositório completo.',
          );
        }
        dir = parent;
      }
    }

    it('os rótulos coincidem com schemas.EVALUATION_CRITERIA do Python (mesma ordem)', () => {
      const schemasPath = findPythonSchemasPath();
      if (!existsSync(schemasPath)) {
        throw new Error(
          'services/interview-ai-python/schemas.py não encontrado: o teste de paridade com o Python é obrigatório.',
        );
      }
      const source = readFileSync(schemasPath, 'utf8');
      const block = /EVALUATION_CRITERIA\s*=\s*\(([\s\S]*?)\)/.exec(source);
      expect(block).not.toBeNull();
      const labels = [
        ...(block as RegExpExecArray)[1].matchAll(/"([^"]+)"/g),
      ].map((match) => match[1]);
      expect(labels).toHaveLength(EVALUATION_CRITERIA.length);
      expect(labels).toEqual(Object.values(AI_CRITERION_LABELS));
    });
  });
});
