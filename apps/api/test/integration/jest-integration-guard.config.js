const path = require('path');

// Testes unitários da infraestrutura de integração (guarda, montagem do comando
// de migration). NÃO usam banco e NÃO exigem INTEGRATION_DATABASE_URL.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: path.resolve(__dirname, '..', '..'),
  roots: ['<rootDir>/test/integration'],
  testEnvironment: 'node',
  testRegex: '\\.guard-spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
