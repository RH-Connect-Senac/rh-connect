import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_SHUTDOWN_GRACE_SECONDS,
  resolveWorkerSetup,
  WORKER_ENV,
} from './ai-evaluation-worker.config';

// Valores de TESTE (não são recomendação nem padrão): só provam que a configuração
// explícita é exigida e validada.
export const VALID_WORKER_ENV: Record<string, string> = {
  [WORKER_ENV.enabled]: 'true',
  [WORKER_ENV.leaseSeconds]: '300',
  [WORKER_ENV.pollIntervalSeconds]: '30',
  [WORKER_ENV.pythonWorstCaseSeconds]: '120',
  [WORKER_ENV.maxStartsPerHour]: '10',
  [WORKER_ENV.maxStartsPerDay]: '50',
  [WORKER_ENV.maxAiRequestsPerHour]: '10',
  [WORKER_ENV.maxAiRequestsPerDay]: '50',
  [WORKER_ENV.groqCallsUpperBoundPerAiRequest]: '8',
  [WORKER_ENV.maxGroqCallsUpperBoundPerHour]: '80',
  [WORKER_ENV.maxGroqCallsUpperBoundPerDay]: '400',
};

const MANDATORY_NAMES = [
  WORKER_ENV.leaseSeconds,
  WORKER_ENV.pollIntervalSeconds,
  WORKER_ENV.pythonWorstCaseSeconds,
  WORKER_ENV.maxStartsPerHour,
  WORKER_ENV.maxStartsPerDay,
  WORKER_ENV.maxAiRequestsPerHour,
  WORKER_ENV.maxAiRequestsPerDay,
  WORKER_ENV.groqCallsUpperBoundPerAiRequest,
  WORKER_ENV.maxGroqCallsUpperBoundPerHour,
  WORKER_ENV.maxGroqCallsUpperBoundPerDay,
];

describe('configuração do executor da avaliação por IA', () => {
  describe('desabilitado por padrão', () => {
    it.each([
      ['ambiente vazio', {}],
      ['variável vazia', { [WORKER_ENV.enabled]: '' }],
      ['false', { [WORKER_ENV.enabled]: 'false' }],
      ['FALSE com espaços', { [WORKER_ENV.enabled]: ' FALSE ' }],
      [
        'false mesmo com os limites preenchidos',
        { ...VALID_WORKER_ENV, [WORKER_ENV.enabled]: 'false' },
      ],
    ])('%s => disabled', (_name, env) => {
      expect(resolveWorkerSetup(env)).toEqual({ state: 'disabled' });
    });

    it.each(['yes', '1', 'on', 'truee'])(
      '"%s" não habilita (valor ambíguo é recusado, nunca adivinhado)',
      (value) => {
        expect(
          resolveWorkerSetup({
            ...VALID_WORKER_ENV,
            [WORKER_ENV.enabled]: value,
          }),
        ).toEqual({ state: 'invalid', fields: [WORKER_ENV.enabled] });
      },
    );
  });

  describe('habilitado exige TODOS os limites obrigatórios', () => {
    it('sem nenhum limite: inválido e lista todos os nomes obrigatórios', () => {
      const setup = resolveWorkerSetup({ [WORKER_ENV.enabled]: 'true' });
      expect(setup.state).toBe('invalid');
      if (setup.state !== 'invalid') return;
      expect([...setup.fields].sort()).toEqual([...MANDATORY_NAMES].sort());
    });

    it.each(MANDATORY_NAMES)('sem %s: inválido', (name) => {
      const env = { ...VALID_WORKER_ENV };
      delete env[name];
      expect(resolveWorkerSetup(env)).toEqual({
        state: 'invalid',
        fields: [name],
      });
    });

    it.each(MANDATORY_NAMES)(
      '%s vazio, não numérico ou zero: inválido',
      (name) => {
        for (const bad of ['', '  ', 'abc', '-1', '1.5', '0x10', '1e3', '0']) {
          const setup = resolveWorkerSetup({
            ...VALID_WORKER_ENV,
            [name]: bad,
          });
          expect(setup.state).toBe('invalid');
        }
      },
    );

    it('configuração completa e válida habilita, com concorrência 1', () => {
      const setup = resolveWorkerSetup(VALID_WORKER_ENV);
      expect(setup.state).toBe('enabled');
      if (setup.state !== 'enabled') return;
      expect(setup.config.budget.maxConcurrent).toBe(1);
      expect(setup.config.leaseSeconds).toBe(300);
      expect(setup.config.heartbeatSeconds).toBe(100);
      expect(setup.config.pollIntervalSeconds).toBe(30);
      expect(setup.config.shutdownGraceSeconds).toBe(
        DEFAULT_SHUTDOWN_GRACE_SECONDS,
      );
      expect(setup.config.retry.pythonWorstCaseSeconds).toBe(120);
      expect(setup.config.budget).toMatchObject({
        maxStartsPerHour: 10,
        maxStartsPerDay: 50,
        maxAiRequestsPerHour: 10,
        maxAiRequestsPerDay: 50,
        groqCallsUpperBoundPerAiRequest: 8,
        maxGroqCallsUpperBoundPerHour: 80,
        maxGroqCallsUpperBoundPerDay: 400,
      });
    });

    it('usa os padrões provisórios (D4) de tentativas/backoff/idade quando não informados', () => {
      const setup = resolveWorkerSetup(VALID_WORKER_ENV);
      if (setup.state !== 'enabled') throw new Error('esperava enabled');
      expect(setup.config.retry).toMatchObject({
        maxAttempts: 4,
        backoffBaseSeconds: 60,
        backoffCapSeconds: 600,
        maxAgeSeconds: 86_400,
      });
    });

    it('aceita sobrescrever os opcionais e valida cada um', () => {
      const ok = resolveWorkerSetup({
        ...VALID_WORKER_ENV,
        [WORKER_ENV.maxAttempts]: '2',
        [WORKER_ENV.backoffBaseSeconds]: '10',
        [WORKER_ENV.backoffCapSeconds]: '100',
        [WORKER_ENV.maxAgeSeconds]: '3600',
        [WORKER_ENV.shutdownGraceSeconds]: '5',
      });
      if (ok.state !== 'enabled') throw new Error('esperava enabled');
      expect(ok.config.retry).toMatchObject({
        maxAttempts: 2,
        backoffBaseSeconds: 10,
        backoffCapSeconds: 100,
        maxAgeSeconds: 3600,
      });
      expect(ok.config.shutdownGraceSeconds).toBe(5);

      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.maxAttempts]: '0',
        }),
      ).toEqual({ state: 'invalid', fields: [WORKER_ENV.maxAttempts] });
      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.backoffBaseSeconds]: '90',
          [WORKER_ENV.backoffCapSeconds]: '30',
        }),
      ).toEqual({
        state: 'invalid',
        fields: [WORKER_ENV.backoffCapSeconds],
      });
      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.shutdownGraceSeconds]: '0',
        }),
      ).toEqual({
        state: 'invalid',
        fields: [WORKER_ENV.shutdownGraceSeconds],
      });
    });

    it('o lease precisa ser maior que o pior caso do Python (e ao menos 3 s)', () => {
      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.leaseSeconds]: '120',
        }),
      ).toEqual({ state: 'invalid', fields: [WORKER_ENV.leaseSeconds] });
      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.leaseSeconds]: '121',
        }).state,
      ).toBe('enabled');
      expect(
        resolveWorkerSetup({
          ...VALID_WORKER_ENV,
          [WORKER_ENV.leaseSeconds]: '2',
          [WORKER_ENV.pythonWorstCaseSeconds]: '1',
        }).state,
      ).toBe('invalid');
    });

    it('nenhum limite de volume ou da Groq tem valor padrão (nada é presumido)', () => {
      // Cada um dos limites ausentes sozinho já invalida (teste acima); aqui,
      // reforça que a política não os preenche por conta própria.
      for (const name of MANDATORY_NAMES) {
        const env = { ...VALID_WORKER_ENV };
        delete env[name];
        expect(resolveWorkerSetup(env).state).toBe('invalid');
      }
    });

    it('as mensagens de erro listam só NOMES de variáveis, nunca valores', () => {
      const setup = resolveWorkerSetup({
        ...VALID_WORKER_ENV,
        [WORKER_ENV.leaseSeconds]: 'SEGREDO-123',
      });
      expect(setup.state).toBe('invalid');
      expect(JSON.stringify(setup)).not.toContain('SEGREDO-123');
    });
  });
});

describe('.env.example do executor', () => {
  const example = readFileSync(join(__dirname, '../../.env.example'), 'utf8');
  const value = (name: string) =>
    new RegExp(`^${name}=(.*)$`, 'm').exec(example)?.[1]?.trim();

  it('vem desabilitado e sem nenhum valor para os limites obrigatórios', () => {
    expect(value(WORKER_ENV.enabled)).toBe('false');
    for (const name of MANDATORY_NAMES) expect(value(name)).toBe('');
  });

  it('documenta todas as variáveis do executor', () => {
    for (const name of Object.values(WORKER_ENV)) {
      expect(example).toContain(`${name}=`);
    }
  });
});
