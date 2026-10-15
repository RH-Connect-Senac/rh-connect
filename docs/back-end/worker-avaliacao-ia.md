# Executor (worker) da avaliação por IA (R3.3a-4c)

Código: `apps/api/src/interviews-ai/ai-evaluation-worker.service.ts` (ciclo), `ai-evaluation-worker.config.ts` (configuração) e `ai-evaluation-worker-policy.ts` (regras puras, R3.3a-4b). Usa `AiEvaluationClaimRepository` (R3.3a-4a) e `AiEvaluationPipelineService` (R3.3a-3).

> **Estado: desabilitado por padrão.** Nenhum ambiente atual o ativa (`AI_EVALUATION_WORKER_ENABLED` ausente ou `false`). Não houve chamada real à Groq nem acesso à VPS. Nada neste módulo altera contratos públicos, o serviço Python, prompts ou a DEC-005.

## 1. Quando ele processa

Só com `AI_EVALUATION_WORKER_ENABLED=true` **e** todos os limites obrigatórios definidos como inteiros positivos (nenhum tem valor padrão ou recomendado; ver `apps/api/.env.example`):

`AI_EVALUATION_LEASE_SECONDS`, `AI_EVALUATION_POLL_INTERVAL_SECONDS`, `AI_EVALUATION_PYTHON_WORST_CASE_SECONDS`, `AI_EVALUATION_MAX_STARTS_PER_HOUR/DAY`, `AI_EVALUATION_MAX_AI_REQUESTS_PER_HOUR/DAY`, `AI_EVALUATION_GROQ_CALLS_UPPER_BOUND_PER_AI_REQUEST`, `AI_EVALUATION_MAX_GROQ_CALLS_UPPER_BOUND_PER_HOUR/DAY`.

- `false`, ausente ou vazio: estado `disabled` (nenhum timer, nenhuma consulta ao banco).
- Qualquer outro valor de `ENABLED` que não seja `true`, ou qualquer limite ausente/inválido (não numérico, zero, lease ≤ pior caso do Python): estado `invalid_config`. O executor **não inicia**, a API continua de pé e o log lista só os **nomes** das variáveis, nunca valores.
- Opcionais (padrões provisórios D4): `AI_EVALUATION_MAX_ATTEMPTS` (4), `..._BACKOFF_BASE_SECONDS` (60), `..._BACKOFF_CAP_SECONDS` (600), `..._MAX_AGE_SECONDS` (86400), `..._SHUTDOWN_GRACE_SECONDS` (30).
- Concorrência: 1 por instância **e** 1 global, imposta no claim por advisory lock + contagem de leases ativos no banco. Ainda não configurável.

## 2. Ciclo

1. Manutenção: `closeExpiredAttempts` e `terminateExhausted` (tentativas ou idade de execução esgotadas viram falha terminal, sem chamar a IA).
2. Repete, uma entrevista por vez: freio → orçamentos persistidos (inícios, concorrência, chamadas à IA e teto da Groq) → `listEligible` → `claim` atômico.
3. Com a posse: heartbeat (`extendLease` a cada lease/3) e `pipeline.process(id, { beforeAiCall })`. O gancho **reconfere o orçamento da IA/Groq e chama `markAiRequested`** imediatamente antes do Python: sem autorização (orçamento esgotado ou posse perdida) a IA **não** é chamada (`aborted`).
4. Desfecho conforme a política: `done` → `finishDone`; `retry` → `finishRetry` (backoff persistido); `terminal` → `finishTerminal`. Todas as gravações de posse são fenced pelo token; `owned=false` apenas é registrado.
5. Termina quando não há elegíveis, um orçamento nega, o freio abre, o teto global é atingido ou há encerramento. O próximo ciclo ocorre depois de `POLL_INTERVAL` (timer encadeado com `unref`, sem dependência nova).

## 3. O que cada proteção garante (e o que não)

| Proteção | Escopo |
|---|---|
| `inFlight` do pipeline | só o mesmo processo |
| Claim/lease/token no PostgreSQL | todas as instâncias que usam o mesmo banco |
| Teto de concorrência (advisory lock + leases) | global, via banco |
| Orçamentos de inícios, chamadas à IA e teto da Groq | globais (contados no banco), conferidos **antes** do claim e de novo antes da IA; entre a contagem e a ação não há trava, então uma ultrapassagem pequena por corrida é possível (limitada pela concorrência 1) |
| Freio global | **por instância** (memória); reinício o zera |
| Retry/rotação de chaves da Groq | **somente** no serviço Python; o Nest nunca repete a chamada nem escolhe chave |

Sem promessa entre instâncias além disso: uma chamada duplicada ao Python só é possível se um lease vencer durante a chamada, e o resultado ainda é gravado uma única vez (R3.2).

- **Falha terminal** mantém `PENDING_AI_EVALUATION`, nunca vira `COMPLETED` e nunca volta sozinha à fila; reativar exige ação administrativa (ainda a definir).
- **Tentativa consumida:** o claim incrementa `ai_attempts`. Se, na corrida, o orçamento esgota ou a posse se perde antes da IA, a tentativa **não é devolvida** (libera-se com espera fixa, sem escalonar). Isso é raro porque os mesmos orçamentos são checados antes do claim.
- **Queda do processo:** nada depende de memória; o lease vence, `closeExpiredAttempts` registra `LEASE_EXPIRED` e a entrevista é reivindicada de novo, já contando a tentativa perdida (não há laço infinito).

## 4. Encerramento ordenado (`enableShutdownHooks()`)

`apps/api/src/main.ts` passa a chamar `app.enableShutdownHooks()` antes de `listen`. Impacto avaliado:

- Antes, SIGTERM/SIGINT encerravam o processo imediatamente e nenhum hook (`onModuleDestroy`) rodava, inclusive o `$disconnect` do Prisma.
- Agora o Nest executa os hooks e reenvia o sinal ao processo. O executor (`onModuleDestroy`) para de reivindicar, cancela o timer e **aguarda a avaliação em curso** até `SHUTDOWN_GRACE` (30 s por padrão); só depois o Prisma desconecta (provado em teste com `app.close()`: ordem `IA → finishDone → desconexão`).
- Se a chamada não terminar no prazo, o encerramento segue e o lease persistido recupera a entrevista depois do vencimento.
- Ponto de atenção operacional: o gerenciador de processos da VPS (systemd/pm2/…) precisa esperar pelo menos o prazo de encerramento antes de forçar a morte (ex.: `TimeoutStopSec` maior que `SHUTDOWN_GRACE`). Isso é decisão de infraestrutura (D3) e não foi alterado aqui.
- Outros hooks do Nest passam a rodar no encerramento; não há outros `onModuleDestroy` além do Prisma no código atual.

## 5. Testes

- `ai-evaluation-worker.service.spec.ts` (54): desabilitado; configuração inválida; uma e várias avaliações (sempre uma por vez); `not_claimable`/`at_capacity`; perda de lease (antes da IA e durante, com heartbeat); retry e backoff; terminal; orçamentos esgotados (cada limite); freio; encerramento (aguarda, prazo, sem reagendar); recuperação após reinício; privacidade dos logs; ciclo de vida real do Nest.
- `ai-evaluation-worker.config.spec.ts` (38) e testes do gancho no pipeline e do `main.ts`.
- Reais (`test/integration/persistence/ai-evaluation-worker.persist-spec.ts`, 7, em `rhconnect_it`): sucesso completo, falha transitória com backoff persistido, falha terminal que não volta à fila, recuperação após queda, posse perdida antes da IA (fenced, `LOST_LEASE`), orçamento persistido esgotado e concorrência por lease de outra instância. O pipeline é falso (sem Python/Groq/rede).

## 6. Pendências antes de habilitar em qualquer ambiente

D3 (como API e Python rodam na VPS), D6 (timeout definitivo da avaliação), os valores numéricos de todos os limites acima (incluindo o teto de chamadas à Groq por chamada ao Python), ação administrativa para reativar falhas terminais, retenção do histórico de tentativas, revisão do `schema.prisma` compartilhado e a política de espera do gerenciador de processos no encerramento.
