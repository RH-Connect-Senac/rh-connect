# Persistência transacional da avaliação por IA (R3.2)

Serviço: `apps/api/src/interviews-ai/ai-evaluation-persistence.service.ts`
(`AiEvaluationPersistenceService`, registrado e exportado em `InterviewsAiModule`).

> **Estado: INERTE.** Nenhum controller, rota, executor ou chamada ao `/evaluate`
> usa este serviço. Ele só existe para a R4 consumir. Não há migration: reutiliza
> `interview_evaluation` e `interview_question_evaluation`.

## Contrato

```ts
persist(interviewId: string, evaluation: NormalizedAiEvaluation): Promise<AiEvaluationPersistResult>
// { status: 'created' | 'already_persisted'; interviewId; evaluationId }
```

A entrada deve ter passado por `normalizeAiEvaluation` (R2). O serviço NÃO
recalcula nem substitui o `overallScore`, não chama IA, não gera snapshot e não
toca em avaliações humanas.

### Erros tipados (`AiEvaluationPersistenceError`)

| Código | Quando |
| --- | --- |
| `INVALID_INPUT` | Entrada inválida (antes de abrir transação). `path` diz onde, nunca o valor. |
| `INTERVIEW_NOT_FOUND` | Entrevista inexistente. |
| `WRONG_EVALUATION_MODE` | Entrevista `HUMAN`. |
| `INVALID_INTERVIEW_STATE` | Modo nulo, ou `AI` em `IN_PROGRESS`, `CANCELLED`, `PENDING_ASSIGNMENT`, `ASSIGNED`. |
| `QUESTIONS_MISMATCH` | As 5 perguntas reais não batem com UUIDs/posições recebidos. |
| `INCONSISTENT_STATE` | Estado salvo incompleto/incoerente (sem avaliação, `DRAFT`, ≠5 avaliações por pergunta, ids alheios, `NULL`s, avaliação já existente em entrevista pendente). |
| `EVALUATION_CONFLICT` | Já persistida com conteúdo DIFERENTE do recebido (o vencedor não é sobrescrito). |
| `PERSISTENCE_FAILED` | Falha do banco/timeout, ou corrida transitória (claim perdido e entrevista ainda pendente). |

Mensagens contêm só código, etapa (`input`, `claim`, `questions`, `evaluation`,
`question_evaluations`, `classify`) e `path`. Sem `cause`, sem mensagem/stack do Prisma.

## Validação pré-transação (pura, sem banco)

UUID da entrevista; exatamente os 7 critérios canônicos (sem extras); notas finitas
em 0–10 com **no máximo 1 casa decimal** (rejeita 7.25, nunca arredonda para 7.3
como o `Decimal(3,1)` faria); exatamente 5 avaliações por pergunta com UUIDs únicos e
posições únicas 1–5; textos string (vazio permitido) e listas de itens não vazios.

## Transação (uma só, interativa, `maxWait` 5 s / `timeout` 15 s, sem rede)

1. `UPDATE` condicional da entrevista `PENDING_AI_EVALUATION → COMPLETED` com
   `evaluation_mode = 'AI'` (count deve ser 1). É o mutex: a ordem é inversa à da
   avaliação humana porque aqui ainda não existe linha de avaliação para travar.
2. Lê as perguntas reais e confere UUID/posição com o recebido.
3. Cria `interview_evaluation` já `COMPLETED`.
4. `createMany` de exatamente 5 `interview_question_evaluation` (sem `skipDuplicates`; count ≠ 5 aborta).

Qualquer falha desfaz tudo, inclusive o status da entrevista. Isolamento padrão
(READ COMMITTED); não se usa Serializable.

## Idempotência e concorrência

- Claim perdido (count 0): a transação termina sem gravar e o serviço **classifica em
  leitura nova** (entrevista + perguntas + avaliação + avaliações por pergunta):
  - conteúdo igual => `already_persisted` (mesmo `evaluationId`);
  - conteúdo diferente => `EVALUATION_CONFLICT`;
  - incompleto/incoerente => `INCONSISTENT_STATE`; demais casos conforme a tabela de erros.
- Violação de unicidade (P2002) nunca é tratada como sucesso. Num claim bem-sucedido
  ela significa avaliação já existente em entrevista pendente: rollback e `INCONSISTENT_STATE`.
- Comparação: `Decimal` via `toNumber()`; critérios por chave canônica (independe da
  ordem das propriedades do JSONB); textos e listas por igualdade exata (ordem de lista importa).
- Nunca há sobrescrita: o serviço não usa `update`/`upsert`/`delete` em avaliações.

## Segurança e observabilidade

Logs: apenas `interviewId`, `evaluationId`, `outcome`, `code`, `step`, `durationMs` e o
código `Pxxxx` do Prisma. Nunca respostas do candidato, textos de feedback, notas,
mensagens, stacks ou `meta` do Prisma. Erros do banco são trocados por
`PERSISTENCE_FAILED` sanitizado, evitando que o filtro padrão do Nest registre stacks
com argumentos de consulta.

## Testes

`ai-evaluation-persistence.service.spec.ts` usa um Prisma simulado em memória (modela
rollback e serializa transações). **Não prova** bloqueio de linha real do PostgreSQL.

## Pendências para a R3.2.1 (teste de integração com PostgreSQL real — obrigatório antes de ativar o executor)

- Bloqueio de linha do `UPDATE` condicional e reavaliação do `WHERE` sob READ COMMITTED com `Promise.all`.
- Semântica de transação abortada após P2002 e rollback do claim.
- Round-trip de `Decimal(3,1)` e dos CHECKs 0–10; comparação JSONB lida do banco.
- Comportamento de `maxWait`/`timeout` da transação.
- Efeito colateral a alinhar antes de ativar (R3.3/R5): o histórico passará a mostrar `COMPLETED`/`overallScore` para entrevistas IA enquanto `GET /interviews/:id/result` ainda responde 409 (somente HUMAN); o snapshot de materiais exclui entrevistas IA (`NOT_HUMAN`).
