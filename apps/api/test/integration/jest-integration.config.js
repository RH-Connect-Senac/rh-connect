const path = require('path');

// Testes de integração com PostgreSQL REAL (banco descartável `rhconnect_it`).
// Roda em série, só com `*.int-spec.ts`. O globalSetup valida a URL e confirma a
// identidade do banco (leitura) antes de qualquer teste; não aplica migrations.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: path.resolve(__dirname, '..', '..'),
  roots: ['<rootDir>/test/integration'],
  testEnvironment: 'node',
  testRegex: '\\.int-spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globalSetup: '<rootDir>/test/integration/support/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/support/set-integration-env.ts'],
  maxWorkers: 1,
  testTimeout: 60000,
};
