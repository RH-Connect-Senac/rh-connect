# Contrato da avaliação por IA e política de validação

Escopo: contrato entre o serviço Python (`POST /evaluate`) e o NestJS, e a validação feita por `normalizeAiEvaluation` (`apps/api/src/interviews-ai/ai-evaluation.normalizer.ts`). Os tipos estão em `ai-evaluation.types.ts`. Os critérios, a escala e a fórmula são os da [DEC-005](../05-decisoes/DEC-005-formula-e-criterios-de-avaliacao.md), que não é alterada por este documento.

> Estado: o normalizador é uma função pura, ainda **não conectada** a nenhum endpoint, executor ou persistência.

## 1. Entrada e saída

Entrada: `normalizeAiEvaluation(raw: unknown, questions: AiEvaluationQuestionRef[])`.

- `raw`: resposta do Python, tratada como `unknown` até a validação.
- `questions`: as 5 perguntas reais da entrevista, `{ questionId: <UUID>, position: 1..5 }` (`interview_question.question_id` e `interview_question.position`).

Saída (`NormalizedAiEvaluation`): `criteriaScores` (chaves canônicas), `overallScore`, `strengths`, `improvements`, `recommendations`, `summary` e `questionsEvaluation` (ordenada por posição, com `questionId` UUID e `position`). Qualquer violação lança `AiEvaluationContractError` (`code`, `path`); nunca há resultado parcial.

## 2. Critérios

| Rótulo Python | Chave canônica (`criteria_scores`, Materiais) |
|---|---|
| Clareza | `clarity` |
| Coerência | `coherence` |
| Objetividade | `objectivity` |
| Domínio | `domain_knowledge` |
| Organização | `organization` |
| Aderência | `requirements_alignment` |
| Exemplos | `examples` |

- O rótulo é comparado sem acento, sem diferença de caixa e sem espaços nas pontas.
- Exige exatamente os sete: ausente, desconhecido ou repetido (inclusive por variação de acento/caixa) é erro. As chaves em inglês **não** são aceitas como entrada do Python.
- Cada nota: número finito de 0 a 10. As notas não são recalculadas nem arredondadas.
- A ordem de saída é sempre a canônica.

## 3. Nota geral e arredondamento

- Python: cada critério é arredondado a 1 casa e `overallScore = round(soma / 7, 1)` (`groq_service.py`).
- NestJS (humano): `Math.round((média + EPSILON) * 10) / 10` (`computeDraftOverallScore`), meio para cima.
- Com notas de 1 casa decimal a média nunca cai em empate exato (`N/7 = k + 0,5` não tem solução inteira), então as duas regras coincidem.

Política adotada: o normalizador calcula a média simples dos sete **sem arredondar** e aceita o `overallScore` se `|overallScore − média| ≤ 0,05` (`OVERALL_SCORE_TOLERANCE`, mais 1e-9 de ruído de ponto flutuante). Fora da tolerância é erro (`OVERALL_SCORE_MISMATCH`); o valor do Python **nunca** é substituído. O `overallScore` também precisa estar entre 0 e 10 e ter no máximo 1 casa decimal (coluna `DECIMAL(3,1)`).

Por que não comparar com a média arredondada:

- **Com notas de 1 casa (o que o Python produz hoje), as duas comparações são idênticas.** Em décimos inteiros, `soma/7` tem resto `k/7` e nunca é `.5`; o empate mais próximo está a 0,0071 ponto (3/7 ou 4/7 de décimo), muito acima do ruído de ponto flutuante (~1e-15). Só existe um valor de 1 casa a até 0,05 da média, e ele é exatamente `round(soma/7, 1)`. Exemplo: 8,0 + 7,5 + 6,0 + 9,0 + 5,5 + 7,0 + 6,5 = 49,5; média 7,0714; aceita só 7,1 (7,0 e 7,2 são rejeitados).
- **Verificação numérica:** nas 701 somas possíveis (0,0 a 70,0), `round(soma/7, 1)` do Python, a regra do NestJS e o arredondamento exato em décimos inteiros coincidem; em 1.000.000 de combinações aleatórias de notas de 1 casa, a tolerância nunca rejeitou uma nota geral calculada pelo Python. Um teste automatizado cobre as 701 somas e confirma que os vizinhos ±0,1 são rejeitados.
- **Onde diferem (contrato para versões futuras):** se um dia as notas tiverem mais de 1 casa, pode haver empate exato. Ex.: sete notas 7,25 (média 7,25): o Python (`round`, meio para o par) dá 7,2 e o NestJS (meio para cima) dá 7,3. Uma comparação exata com a média arredondada teria de escolher uma das regras e rejeitaria indevidamente a saída válida da outra; a tolerância aceita 7,2 e 7,3 e continua rejeitando 7,1 e 7,4.

## 4. Perguntas

- O Python devolve `questionId` **numérico** = posição (1..5) enviada na requisição. A ponte para o banco é `position` → UUID `question_id`.
- Exige exatamente 5 perguntas reais com posições únicas de 1 a 5 e UUIDs únicos, e exatamente 5 avaliações, uma por posição.
- Cada `questionId` deve estar presente, ser inteiro e estar entre 1 e 5. Ausente, fracionário, fora do intervalo, texto ou duplicado é erro. **Não há fallback posicional**: a ordem do array não identifica a pergunta (avaliações fora de ordem são aceitas porque cada uma traz seu identificador).
- `score` da pergunta: número de 0 a 10 com no máximo 1 casa decimal (`DECIMAL(3,1)`). Os tetos por resposta do Python não são reaplicados.

## 5. Textos

- `reason`, `suggestion` e `summary`: texto (string). Vazio é aceito, porque o Python pode devolver `""`.
- `strengths`, `improvements`, `recommendations`, `positives` e `improvements` (por pergunta): lista de textos não vazios (o Python descarta itens vazios). Lista vazia é aceita.
- Os conteúdos são preservados exatamente como recebidos (sem trim, sem reescrita). Campos extras desconhecidos são ignorados.

## 6. Erros e privacidade

`AiEvaluationContractError` expõe só `code` e `path` (ex.: `questionsEvaluation[2].questionId`). Mensagens e caminhos nunca contêm valores recebidos, pois a IA pode ecoar texto do candidato. A função não faz rede, banco nem log.

## 7. Teste de paridade com o Python

O spec confere, sem nunca ser ignorado, que `AI_CRITERION_LABELS` coincide (rótulos e ordem) com `EVALUATION_CRITERIA` de `services/interview-ai-python/schemas.py`. O teste sobe a partir do próprio arquivo até a raiz do workspace (`pnpm-workspace.yaml`) e **falha** com mensagem clara se a raiz ou o `schemas.py` não existirem, em vez de passar sem verificar. Hoje o único workflow de CI (`frontend-ci.yml`) cobre apenas `apps/web`; quando houver CI do API, o checkout completo do repositório já satisfaz a exigência, e o job deve incluir `services/**` nos gatilhos para que uma mudança no `schemas.py` dispare o teste.

## 8. Fora deste contrato (etapas futuras)

Tipagem do retorno de `InterviewsAiService.evaluate`, adapter de Materiais para IA, executor de `PENDING_AI_EVALUATION` e persistência em `interview_evaluation` / `interview_question_evaluation`.
