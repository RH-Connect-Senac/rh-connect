# Política do executor da avaliação por IA (R3.3a-4b)

Escopo: regras **puras** do futuro worker, em `apps/api/src/interviews-ai/ai-evaluation-worker-policy.ts`. Sem rede, banco, relógio ou aleatoriedade próprios (o "agora" e o gerador aleatório entram como parâmetro) e **sem agendador, worker ou processamento habilitado**: o módulo não está registrado como provedor e só importa tipos. O worker (R3.3a-4c) apenas chamará estas funções, o repositório de claim (R3.3a-4a) e o pipeline (R3.3a-3).

## 1. Três medidas, três orçamentos

Um claim **não** é uma chamada à Groq. A política mantém medidas separadas, cada uma com seus limites e contadores do repositório:

| Medida | Contador (repositório) | Verificada | Limites (opcionais, sem padrão) |
|---|---|---|---|
| Avaliações **iniciadas** (claims) | `countStartsSince` | antes de reivindicar (`checkStartBudget`) | `maxStartsPerHour`, `maxStartsPerDay`, concorrência (`maxConcurrent`, aprovado: 1) |
| Chamadas à **IA** autorizadas | `countAiRequestsSince().requests` | antes de chamar a IA, junto de `markAiRequested` (`checkAiRequestBudget`) | `maxAiRequestsPerHour`, `maxAiRequestsPerDay` |
| **Teto estimado** de chamadas à Groq | `countAiRequestsSince().callsUpperBound` | idem | `maxGroqCallsUpperBoundPerHour/Day`, exigem `groqCallsUpperBoundPerAiRequest` |

- O orçamento de inícios nunca olha chamadas à IA ou à Groq, e o de chamadas nunca olha inícios (testes provam a independência).
- **Nenhum limite da Groq tem valor padrão** e nada é presumido a partir do número de chaves. O teto por chamada à IA (`groqCallsUpperBoundPerAiRequest`) é configuração explícita; sem ele não há projeção da Groq e o valor gravado em `ai_calls_upper_bound` é `NULL` (por isso `markAiRequested` passou a aceitar `null`). Configurar um teto de Groq sem o teto por chamada é recusado.
- Quando um orçamento nega, devolve o motivo e `retryAfterSeconds` (reavaliação informativa, `recheckSeconds`, padrão 60 s). Limite ausente = sem limite daquela medida; ao habilitar o worker (R3.3a-4c) os limites deverão ser definidos explicitamente.

## 2. Classificação do resultado do pipeline (`classifyPipelineResult`)

| Resultado do pipeline | Ação gravada pelo worker |
|---|---|
| `persisted` / `already_persisted` / `nothing_to_do` | `done` (desfecho `PERSISTED` / `ALREADY_PERSISTED` / `NOTHING_TO_DO`), com `aiDurationMs` |
| `failed` com `retryable: true` e tentativa < máximo | `retry` com backoff persistido |
| `failed` com `retryable: true` na última tentativa | `terminal` `MAX_ATTEMPTS` (sem nova chamada à IA) |
| `failed` com `retryable: false` (inclui `INCONSISTENT_STATE`, estados inválidos, `INVALID_INPUT`, `AI_REJECTED_PAYLOAD`, `PERSISTENCE_REJECTED`, `UNEXPECTED`) | `terminal` `NON_RETRYABLE` na hora |
| `skipped` (duplicidade no mesmo processo) | `retry` com espera **fixa** (base do backoff, sem escalonar), `IN_FLIGHT`, neutro para o freio; nunca sucesso nem terminal. A tentativa já foi consumida pelo claim (não há "devolução"); o worker evita chegar aqui não chamando o pipeline para um id que ele mesmo já processa |

**Escopo de cada proteção (sem promessa entre instâncias além do que existe):** o `inFlight` do pipeline é **local** (só o mesmo processo). Orçamentos de inícios, de chamadas à IA e do teto da Groq são **persistidos** e contados no banco, portanto valem para todas as instâncias que compartilham o mesmo banco, mas são verificados antes da ação (não há trava atômica entre a contagem e a chamada: pequena ultrapassagem concorrente é possível, limitada pela concorrência máxima). O freio global é recalculado a partir de eventos mantidos pelo worker; em memória vale **por instância**. Falhas terminais nunca voltam sozinhas à fila (`ai_terminal_at` exclui o claim).

Todo código de falha do pipeline é coberto (o teste itera a tabela `AI_EVALUATION_FAILURE_RETRYABLE`, agora exportada pelo pipeline). A política nunca produz `done` para uma falha, e o `errorCode` gravado cabe na coluna `VARCHAR(40)`.

## 3. Retry, backoff e limites (valores provisórios, D4)

- **Tentativas:** `maxAttempts` = 4 (claims por entrevista).
- **Backoff:** `60 s × 2^(tentativa−1)`, teto de 600 s (60, 120, 240, 480, 600…), com variação (jitter) de ±20%, **nunca acima do teto**; inteiro, no mínimo 1 s.
- **AI_TIMEOUT:** o Nest desiste, mas o Python pode continuar chamando a Groq. Se `pythonWorstCaseSeconds` estiver configurado, a próxima tentativa só ocorre depois do maior entre o backoff e esse valor. **Sem valor padrão** (depende da medição real, D6, e do D3); ausente, vale só o backoff.
- **Idade máxima de execução:** 24 h **desde o primeiro claim** (`exhaustionReason`, mesma semântica do SQL: tentativas esgotadas têm precedência e entrevista nunca reivindicada não expira, por mais antiga que seja).

## 4. Falha terminal

`terminal` grava `ai_terminal_at`/`ai_terminal_reason` (`MAX_ATTEMPTS` ou `NON_RETRYABLE`; `EXPIRED` vem de `terminateExhausted`). A entrevista continua `PENDING_AI_EVALUATION`, nunca vira `COMPLETED` e deixa de ser reivindicada: nenhuma nova chamada à IA.

## 5. Freio global (`evaluateBrake`)

Protege a cota quando o provedor ou o Python estão fora. Abre quando as 3 ocorrências relevantes **mais recentes** são todas falhas transitórias (`retry` ou `terminal MAX_ATTEMPTS`) e fecha 300 s depois da última, ou ao primeiro sucesso. Falhas de dados/estado (`NON_RETRYABLE`, `IN_FLIGHT`) são neutras: não contam nem interrompem a sequência e não travam as outras entrevistas. Independe da ordem dos eventos. O estado do freio é recalculado a partir de eventos; guardá-los (memória ou o histórico `ai_evaluation_attempt`) é decisão do worker.

## 6. Testes

`ai-evaluation-worker-policy.spec.ts` (55 testes): configuração e ausência de padrões da Groq, backoff (sequência, teto, jitter), esgotamento por tentativas e idade, classificação exaustiva dos códigos, espera pós-timeout, independência dos três orçamentos, limites exatos, freio (abertura, reset, neutros, fechamento) e pureza do módulo (sem relógio, aleatoriedade, rede, banco, Nest nem registro como provedor). Mutações nas regras centrais derrubam testes.

## 7. O que falta (R3.3a-4c, não implementado)

Worker/agendador desabilitado por configuração, leitura dos contadores e do histórico, chamada a `claim`/`markAiRequested`/`finish*` conforme a política, `enableShutdownHooks()`, configuração (`.env.example`) e runbook. D3 (Python e API na VPS), D6 (timeout) e os limites numéricos de orçamento e Groq continuam pendentes de definição.
