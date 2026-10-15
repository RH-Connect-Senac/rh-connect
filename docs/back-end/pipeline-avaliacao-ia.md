# Pipeline de avaliação por IA de uma entrevista (R3.3a-3)

Escopo: `AiEvaluationPipelineService` (`apps/api/src/interviews-ai/ai-evaluation-pipeline.service.ts`). Processa **uma** entrevista `AI` em `PENDING_AI_EVALUATION`: carrega, classifica o estado, monta o payload, chama o serviço Python, normaliza e persiste.

> Estado: serviço **inerte**. Não há worker, agendador, rota nem disparo automático; quem o chamar decide quando e quantas vezes (R3.3a-4). Nenhuma mudança de schema.

## 1. O que é reutilizado (nada é duplicado)

| Etapa | Reaproveita | Observação |
|---|---|---|
| Montagem do payload | `buildAiEvaluationInput` (R3.3a-1) | valida cinco perguntas, respostas, contexto e estado antes de gastar a IA |
| Chamada ao Python | `InterviewsAiService.evaluate` (R3.3a-2) | timeout próprio da avaliação; **uma** chamada; rotação de chaves, retry estrutural e cálculo da nota continuam só no Python |
| Contrato da resposta | `normalizeAiEvaluation` (R2) | DEC-005: sete critérios, escala 0-10, média conferida e nunca recalculada |
| Gravação | `AiEvaluationPersistenceService.persist` (R3.2) | transação única; a reivindicação é o `UPDATE` condicional |
| "Avaliação íntegra?" | `isStoredEvaluationConsistent` (exportada da persistência) | a mesma definição que a persistência usa ao classificar uma reivindicação perdida |

Única alteração em código existente: `ai-evaluation-persistence.service.ts` passou a **exportar** `STORED_EVALUATION_SELECT` e `isStoredEvaluationConsistent` (sem mudar comportamento; o parâmetro interno ficou mais estreito) e o módulo registra/exporta o pipeline.

## 2. Estados e idempotência

Uma leitura única (`AI_EVALUATION_PIPELINE_SELECT`) traz o necessário para o builder e o estado persistido da avaliação.

| Estado lido | Resultado | IA chamada? |
|---|---|---|
| inexistente | `failed` `INTERVIEW_NOT_FOUND` | não |
| modalidade HUMAN ou ausente | `failed` `WRONG_EVALUATION_MODE` | não |
| `COMPLETED` com avaliação íntegra | `nothing_to_do` `ALREADY_COMPLETED` | **não** |
| `COMPLETED` sem avaliação ou com avaliação incompleta | `failed` `INCONSISTENT_STATE` | não |
| `PENDING_AI_EVALUATION` **com** avaliação gravada | `failed` `INCONSISTENT_STATE` | não |
| `IN_PROGRESS`, `PENDING_ASSIGNMENT`, `ASSIGNED`, `CANCELLED` | `failed` `INVALID_INTERVIEW_STATE` | não |
| `PENDING_AI_EVALUATION` sem avaliação | segue o fluxo | sim (uma vez) |

Depois da persistência: `created` => `persisted`; `already_persisted` (mesmo conteúdo, outro executor) => `already_persisted`.

`EVALUATION_CONFLICT` (outro executor gravou conteúdo diferente) **não** é aceito só pelo código do erro. O pipeline relê a entrevista (uma leitura extra, só nesse caminho raro) e só devolve `nothing_to_do` `COMPLETED_WITH_STORED_RESULT` (com o `evaluationId`) se, naquele momento: o registro é desta entrevista, a modalidade é `AI`, o status é `COMPLETED` e a avaliação é íntegra e vinculada às perguntas reais desta entrevista (`isStoredEvaluationConsistent`: avaliação `COMPLETED`, cinco avaliações por pergunta, sete critérios e textos válidos). Caso contrário: `INCONSISTENT_STATE` (`CONFLICT_WITHOUT_CONSISTENT_RESULT`, não repetível); entrevista que sumiu => `INTERVIEW_NOT_FOUND`; falha ao reler => `LOAD_FAILED` (repetível). Nunca vira sucesso por suposição.

## 3. Falhas (resultado tipado, nunca exceção esperada)

`status: 'failed'` com `stage`, `code`, `retryable` e `detail` (apenas códigos/caminhos fixos, nunca texto do candidato, da vaga ou da avaliação).

| Código | Origem | `retryable` |
|---|---|---|
| `INVALID_INTERVIEW_ID`, `INTERVIEW_NOT_FOUND`, `WRONG_EVALUATION_MODE`, `INVALID_INTERVIEW_STATE`, `INCONSISTENT_STATE` | estado (inclui o conflito sem resultado íntegro) | não (`INCONSISTENT_STATE` pede atenção humana) |
| `INVALID_INPUT` | builder recusou (resposta ausente, tamanho, perguntas) | não |
| `LOAD_FAILED` | erro ao ler o banco | sim |
| `AI_TIMEOUT` (504), `AI_UNAVAILABLE` (503), `AI_UPSTREAM_ERROR` (502) | `InterviewsAiService.evaluate` | sim |
| `AI_REJECTED_PAYLOAD` (400/422), `AI_REQUEST_FAILED` (demais) | `InterviewsAiService.evaluate` | não |
| `AI_INVALID_RESPONSE` | `normalizeAiEvaluation` recusou a resposta | sim (regerar pode corrigir) |
| `PERSISTENCE_FAILED` | falha transitória/corrida na persistência | sim |
| `PERSISTENCE_REJECTED` | `QUESTIONS_MISMATCH`, `INVALID_INPUT` da persistência | não |
| `UNEXPECTED` | exceção não prevista (só o nome da classe é registrado) | não |

O pipeline **nunca repete** a chamada nem a gravação, não rotaciona chaves e não calcula nota. Quantas tentativas, com que espera e quando desistir é decisão do chamador (R3.3a-4). Se a IA respondeu e a persistência falhou, nada fica gravado (a transação é da R3.2) e a entrevista segue `PENDING_AI_EVALUATION`, apta a ser reprocessada, o que custa uma nova chamada à IA.

O resultado traz `aiDurationMs` (duração da chamada ao Python): é a fonte passiva para medir a latência real e fechar o valor de `INTERVIEW_AI_EVALUATION_TIMEOUT_MS`. Cada execução registra uma linha de log com `interviewId`, resultado, etapa, código, `retryable` e durações.

## 4. Concorrência: o que é e o que NÃO é garantido

**Garantido**
1. **No mesmo processo**: uma entrevista nunca é processada por duas chamadas ao mesmo tempo. A segunda recebe `skipped` (`IN_FLIGHT`) sem tocar no banco nem na IA; a marca é liberada ao terminar, inclusive após falha.
2. **Em qualquer cenário**: no máximo **uma** avaliação é gravada por entrevista e `COMPLETED` nunca é "falso" (R3.2: `UPDATE` condicional + criação das avaliações na mesma transação; quem perde recebe `already_persisted` ou conflito).
3. Entrevista já concluída e íntegra: zero chamadas à IA.

**Não garantido (limite desta etapa)**
- **Entre processos ou instâncias não há exclusão antes da chamada à IA.** Dois processos que leiam a mesma entrevista `PENDING_AI_EVALUATION` chamam a Groq duas vezes (custo duplicado); só uma avaliação é gravada. Uma leitura de status **não** é exclusão: entre a leitura e a gravação há a chamada à IA, de segundos.
- Um timeout do Nest não interrompe o Python (ver `timeout-avaliacao-ia.md`): reprocessar logo após um `AI_TIMEOUT` pode somar uma segunda chamada à Groq enquanto a primeira ainda roda. O chamador deve esperar (backoff) e não repetir imediatamente.
- Um reinício do processo perde a marca em memória; a fila continua sendo o banco.

**Mecanismos existentes avaliados e descartados para impedir a chamada duplicada**
- Mudar o status antes de chamar a IA: não existe status intermediário e a R3.2 depende de `PENDING_AI_EVALUATION` para reivindicar.
- `pg_try_advisory_lock`: o lock de sessão não é confiável com o pool do Prisma e o de transação exigiria manter uma transação aberta durante a chamada de rede (a R3.2 evita isso de propósito).
- Alterar `updated_at`/outro campo existente como "lease": mistura significado e seria frágil.

## 5. Proposta (não implementada): claim com lease persistente

Necessária para evitar a chamada duplicada entre instâncias, para contar tentativas de forma durável e para o backoff sobreviver a reinícios. Exige **aprovação**, alteração de `schema.prisma` e uma migration aditiva.

**Colunas (nullable) em `interview`:** `ai_claim_token uuid`, `ai_lease_until timestamptz`, `ai_attempts smallint default 0`, `ai_next_attempt_at timestamptz`, `ai_last_error_code varchar(40)`; índice `(status, ai_next_attempt_at)`.

**Claim (sem SQL cru):** `updateMany` com `where: { interview_id, status: 'PENDING_AI_EVALUATION', evaluation_mode: 'AI', OR: [{ ai_lease_until: null }, { ai_lease_until: { lt: agora } }], OR: [próxima tentativa vencida] }` e `data: { ai_claim_token, ai_lease_until, ai_attempts: { increment: 1 } }`; só quem obtém `count === 1` chama a IA. Ao terminar com falha: grava `ai_next_attempt_at` (backoff) e `ai_last_error_code`, solta o lease conferindo o token. Com sucesso nada precisa ser limpo (o status `COMPLETED` encerra o ciclo).

**Impactos e cuidados**
- A duração do lease deve cobrir o pior caso do Python (`2 x D x REQUEST_TIMEOUT_SECONDS`), senão um segundo claim começa enquanto o primeiro ainda roda; leases mais curtos reintroduzem a duplicidade.
- Relógio: com mais de uma instância, comparar com o relógio do banco (não o da aplicação).
- A persistência (R3.2) continua igual; `INCONSISTENT_STATE` e o estado terminal de falha (D5: status novo, campo ou fluxo humano) seguem decisões separadas.
- Testes com PostgreSQL real (claim concorrente) só com a configuração autorizada.
- Migration só aditiva (colunas nulas): sem risco para dados existentes, mas toca o schema compartilhado.

**Alternativa sem schema:** manter este pipeline com uma única instância (flag no worker) e aceitar a duplicidade como custo, já limitada pelo orçamento e pela concorrência 1 da R3.3a-4.

## 6. Testes

`ai-evaluation-pipeline.service.spec.ts` (73 testes; Prisma, IA e persistência simulados; builder, normalizador e a verificação de consistência são os reais): sucesso (inclusive notas decimais, 0, 10 e listas vazias), idempotência e todos os estados, falhas da IA por status HTTP, falhas de normalização (inclusive nota geral divergente, nunca corrigida), falhas de persistência e do banco, concorrência no mesmo processo, o limite entre processos documentado em teste, privacidade dos logs e ausência de retry/rotação/cálculo de nota no código.
