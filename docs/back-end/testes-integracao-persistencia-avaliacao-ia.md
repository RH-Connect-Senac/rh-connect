# Testes reais de persistência da avaliação por IA (R3.2.1-b)

Valida o `AiEvaluationPersistenceService` (R3.2) contra o PostgreSQL real
`rhconnect_it`. Não altera o serviço, o schema nem as migrations.

## Como executar (Windows CMD, em `apps/api`)

```
pnpm run test:integration:guard
pnpm run db:integration:check
pnpm run test:integration:persistence
```

O terceiro comando **escreve** no banco de integração. `test:integration`
(somente leitura) não o executa: a suíte usa o sufixo `.persist-spec.ts` e a
configuração `jest-integration-persistence.config.js`.

## Isolamento

1. `.env.integration` é carregado por `dotenv -e`; a guarda do `globalSetup`
   valida a URL e a identidade do banco (leitura) antes de qualquer teste.
2. A suíte abre o cliente por `openVerifiedIntegrationClient`: valida
   `INTEGRATION_DATABASE_URL`, recusa `DATABASE_URL`, `DIRECT_URL` ou
   `SHADOW_DATABASE_URL` que apontem para outro banco (`CONFLICTING_DATABASE_URL`),
   cria o cliente com `datasourceUrl` explícito e confirma banco, usuário e
   marcador por leitura. Só então a primeira fixture é criada.
3. Nenhum fallback para `DATABASE_URL` ou `.env` de desenvolvimento.

## Fixtures e limpeza

- Cada teste cria seu próprio candidato (`it-persist-<execução>-<n>@rhconnect-it.invalid`),
  uma entrevista e as perguntas necessárias.
- A limpeza remove, usuário a usuário e por id, apenas os criados na execução
  (cascata do schema leva entrevistas, perguntas e avaliações). Resíduos de uma
  execução interrompida (mesmo padrão de e-mail) são removidos no início.
- Sem `TRUNCATE`, `deleteMany`, reset, push, DDL ou SQL cru de escrita; testes
  estáticos garantem isso.

## Cenários

- Sucesso: entrevista `COMPLETED`, avaliação `COMPLETED`, cinco avaliações por
  pergunta, campos, relacionamentos, `Decimal(3,1)` (0, 10, uma casa), JSON, acentos
  e quebras de linha; logs sem texto da avaliação.
- Idempotência (mesmo conteúdo, ordem diferente) e `EVALUATION_CONFLICT` para seis
  tipos de divergência, sem alterar o que foi gravado.
- Classificação: inexistente, HUMAN, sem modalidade, `CANCELLED`, `COMPLETED` sem
  avaliação e com avaliação incompleta.
- Entrada inválida (nota com duas casas) sem tocar no banco.
- Rollback integral: avaliação pré-existente, pergunta de outra entrevista,
  posições trocadas, entrevista com quatro perguntas, e falhas simuladas dentro da
  transação real (após o INSERT da avaliação, antes/depois do INSERT das perguntas,
  contagem divergente); nova tentativa válida depois do rollback.
- Concorrência: cinco chamadas idênticas (1 `created` + 4 `already_persisted`),
  duas divergentes (1 `created` + 1 `EVALUATION_CONFLICT`), entrevistas distintas
  em paralelo.
- Integridade: a FK composta impede ligar avaliação e pergunta de entrevistas
  diferentes.

## Limitações

- Falhas "dentro da transação" são simuladas interceptando a chamada do Prisma
  (a transação e o rollback são os do PostgreSQL real); não há como forçar um erro
  do banco nesses passos sem DDL.
- Timeouts da transação (15 s) e perda do vencedor por rollback durante a disputa
  não são exercitados.
