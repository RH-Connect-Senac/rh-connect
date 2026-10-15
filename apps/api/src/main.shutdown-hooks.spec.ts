import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// `main.ts` não pode ser importado em teste (sobe o servidor); o comportamento do
// encerramento é provado em ai-evaluation-worker.service.spec.ts (app.close()).
// Aqui só se garante que o bootstrap realmente o habilita, antes de escutar.
describe('bootstrap: encerramento ordenado', () => {
  const source = readFileSync(join(__dirname, 'main.ts'), 'utf8');

  it('habilita os shutdown hooks do Nest antes de app.listen', () => {
    const hooks = source.indexOf('app.enableShutdownHooks()');
    const listen = source.indexOf('app.listen(');
    expect(hooks).toBeGreaterThan(-1);
    expect(listen).toBeGreaterThan(hooks);
  });
});
