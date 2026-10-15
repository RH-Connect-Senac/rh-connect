const path = require('path');

// Testes de PERSISTÊNCIA com PostgreSQL REAL (banco descartável `rhconnect_it`).
// Só `*.persist-spec.ts`: o sufixo é diferente de `.int-spec.ts` de propósito,
// para que `test:integration` (somente leitura) nunca execute estes testes que
// escrevem. O globalSetup valida a URL e confirma a identidade do banco (leitura)
// antes de qualquer teste; a própria suíte reabre o cliente por
// `openVerifiedIntegrationClient` antes de criar a primeira fixture.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: path.resolve(__dirname, '..', '..'),
  roots: ['<rootDir>/test/integration'],
  testEnvironment: 'node',
  testRegex: '\\.persist-spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globalSetup: '<rootDir>/test/integration/support/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/support/set-integration-env.ts'],
  maxWorkers: 1,
  testTimeout: 60000,
};
