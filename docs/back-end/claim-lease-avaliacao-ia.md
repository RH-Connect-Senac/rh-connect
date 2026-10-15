# Claim, lease e histórico de tentativas da avaliação por IA (R3.3a-4a)

Escopo: persistência de **posse** das entrevistas `AI` em `PENDING_AI_EVALUATION` para o futuro worker (R3.3a-4c). Código: `apps/api/src/interviews-ai/ai-evaluation-claim.repository.ts`. Schema: `apps/api/prisma/schema.prisma` e migration `20261015000000_add_ai_evaluation_claim`.

> Estado: migration aplicada **somente** no banco de integração `rhconnect_it` (isolado, ver §7); não aplicada em desenvolvimento compartilhado, VPS ou produção. O repositório é inerte (nenhum worker, agendador ou rota o chama). Não há alteração no serviço Python, nos prompts, na DEC-005 nem na persistência transacional da R3.2.

## 1. O que é (e o que não é)

- É um conjunto de operações SQL atômicas no PostgreSQL: reivindicar, marcar o início da chamada à IA, estender o lease, soltar com backoff, marcar falha terminal, encerrar e contar.
- Não chama a IA, não grava avaliação, não altera `status`/`evaluation_mode`, não conhece chaves da Groq e não faz retry próprio.
- A gravação da avaliação continua sendo `AiEvaluationPersistenceService` (R3.2).

## 2. Schema (aditivo)

Em `interview` (todas anuláveis, exceto `ai_attempts` com padrão 0): `ai_claim_token`, `ai_lease_until`, `ai_attempts`, `ai_first_claimed_at`, `ai_next_attempt_at`, `ai_last_error_code`, `ai_terminal_at`, `ai_terminal_reason`.

Tabela nova `ai_evaluation_attempt` (uma linha por **claim**): `attempt_id`, `interview_id` (FK, cascade), `claim_token` (único), `attempt_number`, `worker_id`, `started_at`, `lease_until`, `ai_requested_at`, `ai_calls_upper_bound`, `ai_duration_ms`, `finished_at`, `outcome`, `error_code`.

CHECKs: token e lease andam juntos; token só em `AI`; `ai_attempts >= 0`; terminal e motivo juntos; número da tentativa >= 1; duração/chamadas >= 0; `finished_at >= started_at`; tentativa aberta não tem desfecho (e vice-versa). Índice parcial `idx_interview_ai_eligible` (entrevistas de IA pendentes sem falha terminal).

**Compatibilidade com dados existentes:** nenhuma linha muda. Entrevistas existentes ficam com `ai_attempts = 0` e as demais colunas nulas; todos os CHECKs são satisfeitos por elas. O enum `interview_status` **não muda**: a falha terminal não é um status. As projeções explícitas da API (`INTERVIEW_SELECT` etc.) não expõem as colunas novas ao candidato.

A parte gerada pelo Prisma na migration é a saída literal de `prisma migrate diff` entre o schema anterior e o atual (sem drift); os CHECKs e o índice parcial são acréscimos que o Prisma não expressa (mesmo padrão das migrations anteriores). **Entrevistas antigas não expiram ao ativar o executor:** a idade máxima é a idade de **execução**, contada desde `ai_first_claimed_at` (o primeiro claim), nunca desde `submitted_at`. Uma entrevista enviada há semanas e ainda não reivindicada continua elegível; o prazo só começa no primeiro claim e não é renovado pelos seguintes (`COALESCE`). `terminateExhausted` só expira entrevistas já reivindicadas.

## 3. Protocolo de posse e fencing

1. **Claim** (`claim`): um `UPDATE … RETURNING` condicional só afeta a entrevista se: status `PENDING_AI_EVALUATION`, modalidade `AI`, sem falha terminal, lease nulo ou vencido, backoff vencido, `ai_attempts < max` e `submitted_at` dentro da idade máxima. Ele grava um `ai_claim_token` (uuid novo por claim), `ai_lease_until = now() + lease` (relógio do **banco**), incrementa `ai_attempts` e registra `ai_first_claimed_at` na primeira vez; na **mesma transação** abre a linha de histórico. A idade máxima é a de execução (desde o primeiro claim). Sem linha afetada, nada é gravado (`not_claimable`). Dois claims concorrentes: o PostgreSQL serializa o `UPDATE` e só um recebe a linha.
2. **Teto global** (opcional, `maxConcurrent`): dentro da transação do claim, um `pg_advisory_xact_lock` serializa só o claim (transação curta, sem rede), conta leases ativos e devolve `at_capacity` se o teto foi atingido.
3. **Fencing:** `ai_claim_token` é o token de posse. `finishRetry`, `finishTerminal` e `extendLease` só alteram a entrevista com `ai_claim_token = <token>` (e status pendente). Se outro worker assumiu (token trocado), a escrita não afeta nenhuma linha: o resultado é `owned: false` e o histórico registra `LOST_LEASE`. Quem perdeu o lease não consegue soltar, encerrar nem prolongar nada do novo dono.
4. **Trava antes da IA** (`markAiRequested`): só autoriza (`authorized: true`) se, naquele instante, o token ainda é o dono, o lease não venceu e a entrevista segue pendente; registra `ai_requested_at` e o teto de chamadas à Groq da tentativa. O worker **só pode chamar a IA depois dessa autorização**. Um lease vencido nunca é ressuscitado por heartbeat.
5. **Persistência da avaliação (R3.2) não é fenced por token, de propósito.** Um worker com lease vencido que ainda obtenha um resultado válido pode gravá-lo: o `UPDATE` condicional da R3.2 garante que existe no máximo **uma** avaliação e o segundo recebe `already_persisted`/conflito. Exigir o token ali obrigaria a mudar a persistência transacional e jogaria fora um resultado válido já pago. `finishDone` só limpa os campos do executor em entrevista `COMPLETED` de IA quando o claim é o do próprio chamador, não há claim ou o claim alheio já venceu; **nunca** limpa o controle de outro worker com lease ativo (ele encerra a própria tentativa). A linha de histórico fechada é sempre a do **próprio** claim (`attempt_id` + token), e nunca sobrescreve um desfecho já registrado. Um executor cujo lease venceu durante a IA pode gravar um resultado válido (R3.2) mas não consegue soltar, encerrar nem prolongar a posse do dono atual, e uma avaliação divergente nunca sobrescreve a íntegra (`EVALUATION_CONFLICT`).
6. **Recuperação após queda:** nada fica em memória. Lease vencido volta a ser elegível; `closeExpiredAttempts` fecha tentativas abertas abandonadas (`LEASE_EXPIRED`); `ai_attempts` é incrementado no claim, então uma queda logo após o claim também conta (nunca há laço infinito de reinício).
7. **Falha terminal:** `finishTerminal` (não repetível) e `terminateExhausted` (tentativas esgotadas ou idade máxima, apenas sem lease ativo) gravam `ai_terminal_at`/`ai_terminal_reason`. A entrevista continua `PENDING_AI_EVALUATION`, nunca vira `COMPLETED` e deixa de ser reivindicada: **nenhuma nova chamada à IA**. Reativar exige ação administrativa explícita (a definir).

## 4. Início de tentativa não é chamada à Groq

| Medida | Onde | Significado |
|---|---|---|
| **Início** (claim) | `ai_evaluation_attempt.started_at`, `countStartsSince` | O worker assumiu a entrevista. Pode terminar sem chamar a IA (estado inválido, payload recusado). |
| **Chamada à IA** | `ai_requested_at`, `countAiRequestsSince().requests` | O worker foi autorizado a chamar o serviço Python. |
| **Teto de chamadas à Groq** | `ai_calls_upper_bound`, `countAiRequestsSince().callsUpperBound` | Máximo que aquela tentativa pode ter gerado no Python (retry estrutural x chaves distintas, definido pela configuração do worker). **Não** é uma contagem de chamadas reais: a rotação e o retry acontecem só no Python. |

O orçamento (por hora/dia) deve limitar **chamadas à IA** e o **teto estimado de chamadas à Groq**, não apenas claims. Os limites são decisão do worker (R3.3a-4b/4c); o repositório só fornece os contadores.

## 5. Testes

- **Unitários** (`ai-evaluation-claim.repository.spec.ts`, 39; Prisma simulado): ordem das operações, parâmetros (nenhum valor concatenado no SQL), guardas (`status`, modalidade, terminal, lease, backoff, tentativas, idade), fencing por token em toda escrita de posse, `LOST_LEASE`, ausência de escrita em `status`/avaliações/perguntas, contadores distintos. **Não provam** o comportamento real do banco.
- **Reais, executados em `rhconnect_it`** (`test/integration/persistence/ai-evaluation-claim.persist-spec.ts`, 23 testes, todos aprovados; a suíte completa de persistência fechou em 56 de 56 com a da R3.2.1): 10 claims paralelos com um vencedor, expiração e reaproveitamento, fencing de worker que perdeu o lease, executor atrasado que conclui depois do lease, limites de tentativa/idade de execução/backoff, entrevista antiga que não expira, falha terminal, teto global, tentativas que sobrevivem a "nova instância", contadores e convivência com a persistência da R3.2. Mutações no SQL real (claim ignorando lease ativo, `extendLease` sem token, `finishDone` limpando o controle alheio) fazem testes falharem.

## 6. O que ainda não está provado (riscos)

- O SQL bruto foi exercitado no PostgreSQL 18.6 de integração (claim concorrente, advisory lock, `UPDATE … FROM`, `make_interval`); ainda não foi exercitado sob carga nem em mais de um host.
- `DEFAULT 0` + `NOT NULL` em `ai_attempts` é constante (sem reescrita de tabela), mas a aplicação deve ser feita em janela de baixo uso.
- O claim usa o relógio do banco; instâncias em hosts diferentes não dependem do relógio local.

## 7. Isolamento do banco usado nos testes reais

Antes de qualquer escrita foi confirmado: `INTEGRATION_DATABASE_URL` é a única URL configurada (sem `DATABASE_URL`, `DIRECT_URL` nem `SHADOW_DATABASE_URL`; a worktree não tem `.env`); host `127.0.0.1:5432`, banco `rhconnect_it`, usuário `rhconnect_it_user`; marcador `rh-connect:integration-test:v1`; o papel não é superusuário, não cria bancos/papéis, não pertence a nenhum papel e é dono apenas de `rhconnect_it`. Observação: o PostgreSQL local concede `CONNECT` por padrão (PUBLIC) a `rh_connect` e `rh_connect_materials`; nenhuma conexão, migration ou teste usou esses bancos. As migrations foram aplicadas pelo script existente (confirmação explícita, identidade do banco e prova do alvo no processo do Prisma) e o `prisma migrate diff` posterior indicou "up to date". Nenhum resíduo ficou no banco após os testes.
