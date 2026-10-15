# Timeout da avaliação por IA (R3.3a-2)

Escopo: o prazo que o NestJS espera por `POST /evaluate` do serviço Python. Implementado em `InterviewsAiService.evaluate` (`apps/api/src/interviews-ai/interviews-ai.service.ts`). Não altera o contrato `/evaluate`, os prompts nem o código Python.

> Estado: **nenhum valor de produção foi definido.** O valor definitivo depende de medir a latência real (seção 5). Enquanto a variável não for configurada, o comportamento é exatamente o anterior.

## 1. Configuração

| Variável | Afeta | Padrão |
|---|---|---|
| `INTERVIEW_AI_TIMEOUT_MS` | Geração de perguntas (`/questions`) e, na ausência da variável abaixo, a avaliação | 20000 |
| `INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS` | Extração de vaga (`/job-context`) | 20000 |
| `INTERVIEW_AI_EVALUATION_TIMEOUT_MS` | **Somente** a avaliação (`/evaluate`) | (nenhum): usa `INTERVIEW_AI_TIMEOUT_MS` |

Regras da variável da avaliação:

- Ausente, vazia ou só espaços: a avaliação usa o timeout geral. Nenhum valor novo é inventado.
- Inteiro entre 1 e 2147483647 ms: usado como está (pode ser menor ou maior que o geral). O limite superior é o maior atraso aceito por `setTimeout`; acima dele o Node dispararia em cerca de 1 ms.
- Qualquer outro valor (não numérico, decimal, zero, negativo, acima do máximo): **não** é aceito em silêncio. Registra um aviso na inicialização (sem ecoar o valor) e usa o timeout geral.
- As demais variáveis mantêm a leitura anterior, sem alteração.

## 2. O que o prazo limita (e o que não limita)

Cadeia de tempo de uma avaliação:

1. **NestJS → Python:** `AbortController` com o prazo acima. Uma tentativa; o Nest não repete a chamada.
2. **Python → Groq:** cada chamada usa `REQUEST_TIMEOUT_SECONDS` (padrão 20 s) com `max_retries=0` (sem repetição interna do SDK).
3. **Repetição estrutural no Python:** até 2 tentativas, só quando `questionsEvaluation` vem incompleto.
4. **Rotação de chaves:** em erro 429, cada chave distinta é tentada uma vez por tentativa.

Consequência: uma avaliação pode fazer até `2 × D` chamadas à Groq (D = chaves distintas), e uma chamada **não** equivale a uma avaliação. O pior caso de tempo é `2 × D × REQUEST_TIMEOUT_SECONDS`.

**Cancelar no Nest não interrompe o Python.** Pela leitura do código, o `app.py` atende `/evaluate` de forma síncrona (`app.run`, servidor de desenvolvimento do Flask) e não detecta a desconexão do cliente: a chamada à Groq segue até terminar, consome cota e o resultado é descartado. Por isso:

- o log de timeout de `/evaluate` registra que o Python pode continuar processando;
- quem chamar `evaluate` não deve repetir a mesma avaliação imediatamente após um timeout: a repetição soma outra chamada em paralelo à que ainda está rodando (ver a política de retry/backoff da R3.3a, ainda pendente);
- como o Python é executado na VPS ainda não está confirmado (decisão D3); um servidor com timeout próprio (por exemplo `gunicorn`) mudaria este comportamento.

Esse prazo não é uma garantia de custo: ele só decide quando o Nest para de esperar.

## 3. Por que o padrão não foi alterado

A geração de perguntas tem um candidato esperando e usa os mesmos 20 s. A avaliação roda em segundo plano (executor, R3.3a-4), então poderá usar um prazo maior sem prejudicar a experiência, mas **qualquer número agora seria um palpite**. O PR #85 acrescenta `max_tokens=8192` num modelo de raciocínio e não reporta latência. Por isso a variável existe e está vazia no `.env.example`.

## 4. Como o comportamento está coberto por testes

`apps/api/src/interviews-ai/interviews-ai.evaluation-timeout.spec.ts` (25 testes):

- variável configurada vale só para a avaliação; perguntas e extração de vaga ficam como antes;
- ausente, vazia ou em branco: segue o timeout geral, sem aviso;
- inválida (`abc`, `10s`, `0`, `-5`, `1.5`, `NaN`, `Infinity`, `2147483648`, número gigante): segue o geral e avisa uma vez;
- limites 1 e 2147483647 aceitos;
- cancelamento: o `AbortSignal` da avaliação só dispara no prazo próprio; perguntas continuam no prazo delas; vira `504` com a mensagem de produto;
- o log de timeout da avaliação avisa que o Python pode continuar; o de perguntas não;
- sem temporizador pendente após resposta dentro do prazo;
- chamada inalterada: `POST /evaluate`, uma vez, mesmo payload e cabeçalho.

Os testes preexistentes (`interviews-ai.job-context-errors.spec.ts`, `interviews-ai.service.spec.ts`) continuam passando sem alteração.

## 5. Como validar a configuração depois de medir a latência

Pré-requisito: autorização explícita para qualquer medição que consuma cota da Groq. Nada deste documento executa chamadas reais.

1. **Medir** a duração de `/evaluate` ponta a ponta (do Nest) e o tempo de cada chamada à Groq no Python, com a configuração real (modelo, `max_tokens`, `GROQ_EVALUATION_SEED`, número de chaves D). Coletar p50, p95, p99 e máximo, e a proporção de avaliações que usaram retry estrutural ou rotação de chave. A fonte pode ser o log do futuro executor (R3.3a-4), sem rodar lotes dedicados.
2. **Conferir `REQUEST_TIMEOUT_SECONDS`** (Python): precisa ser maior que o p99 de **uma** chamada; caso contrário o Python expira antes de o Nest.
3. **Dimensionar `INTERVIEW_AI_EVALUATION_TIMEOUT_MS`** a partir dos dados, não por palpite: pelo menos o tempo de duas chamadas no p99 mais margem (cobre uma repetição estrutural com uma chave). Rotação de chaves em 429 pode ultrapassar esse valor; nesse caso a avaliação cai em timeout transitório.
4. **Ambiente de teste primeiro:** configurar a variável, acompanhar a taxa de `504` em `/evaluate` e os avisos "Python pode continuar". Muitos 504 com resposta tardia do Python indicam prazo curto demais (chamadas desperdiçadas).
5. **Rollback:** remover a variável (volta a `INTERVIEW_AI_TIMEOUT_MS`).
6. **Registrar** o valor escolhido e a medição que o justifica na decisão correspondente (D6), junto com o orçamento de chamadas (D4).

## 6. Observação preexistente (não alterada)

`INTERVIEW_AI_TIMEOUT_MS` e `INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS` aceitam qualquer número positivo, inclusive acima de 2147483647 ms, que o Node trataria como cerca de 1 ms. Foi mantido como estava para preservar o comportamento atual; vale endurecer em uma etapa própria.
