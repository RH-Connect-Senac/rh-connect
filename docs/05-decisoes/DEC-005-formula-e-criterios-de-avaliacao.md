# DEC-005 — Critérios, Escala e Fórmula da Nota de Avaliação

**Status:** Aprovado
**Data:** 11/10/2026
**Versão:** 1.0
**Escopo:** V1 do RH Connect

---

## 1. Contexto

O `AGENTS.md` (seção 27) listava "escala de avaliação", "pesos" e "fórmula da nota" como decisões ainda não tomadas, que o agente não deveria inventar.

Uma auditoria do repositório identificou que essa decisão já está implementada no serviço de IA de entrevista (`services/interview-ai-python/groq_service.py`), e que a mesma escala de critérios é reutilizada na interface de avaliação humana (`apps/web/src/app/components/eval-screens.tsx`, `apps/web/src/app/components/admin-screens.tsx`). Não havia, até este documento, um registro formal amarrando essa implementação como decisão aprovada.

---

## 2. Decisão

Fica confirmado o seguinte modelo de avaliação:

### 2.1. Critérios oficiais (7, pesos iguais)

Cada resposta de entrevista é avaliada em 7 critérios, todos na mesma escala e com o mesmo peso:

- **Clareza** — capacidade de se expressar de forma compreensível;
- **Coerência** — consistência e conexão lógica da resposta;
- **Objetividade** — capacidade de responder diretamente, sem dispersão excessiva;
- **Domínio** — conhecimento demonstrado sobre o assunto/pergunta;
- **Organização** — estrutura e sequência da resposta;
- **Aderência** — relação da resposta com a pergunta e com o contexto/requisitos da vaga;
- **Exemplos** — uso de exemplos concretos, experiências, casos ou situações que sustentem a resposta.

Referência de implementação: `services/interview-ai-python/groq_service.py`, função `_build_evaluation_prompt` (linhas 854–946 no momento deste registro).

### 2.2. Escala

Cada critério é pontuado de **0 a 10**, com a seguinte referência de severidade:

| Nota | Significado |
|---|---|
| 0 | sem resposta |
| 1 | resposta equivalente a "não sei" |
| 2 | resposta extremamente curta ou inútil |
| 3–4 | superficial |
| 5–6 | razoável |
| 7–8 | boa |
| 9 | muito boa |
| 10 | excepcional |

### 2.3. Fórmula da nota geral (`overallScore`)

A nota geral é a **média aritmética simples dos 7 critérios** (pesos iguais, 1/7 cada), calculada pelo sistema — não pelo modelo de IA:

```python
overall_score = round(sum(scores.values()) / len(EVALUATION_CRITERIA), 1)
```

Referência de implementação: `services/interview-ai-python/groq_service.py`, linha 996.

### 2.4. Natureza da avaliação

Conforme já instruído ao modelo de IA no próprio prompt de avaliação:

- a avaliação é **educacional e de desenvolvimento**;
- não constitui julgamento de contratação, aprovação ou reprovação;
- não avalia atributos pessoais protegidos ou irrelevantes para a entrevista;
- não deve penalizar o candidato por não mencionar tecnologia, ferramenta ou prática específica que não esteja na vaga, na pergunta, ou que não seja necessária para avaliar a resposta diretamente.

### 2.5. Reuso na avaliação humana

Os mesmos nomes de critério (Clareza, Coerência, Objetividade, Domínio, Organização, Aderência, Exemplos) aparecem na interface de avaliação humana (`eval-screens.tsx`, `admin-screens.tsx`), indicando que a escala é compartilhada entre avaliação por IA e avaliação humana, e não exclusiva de um dos dois fluxos.

---

## 3. O que permanece pendente

Este documento resolve critérios, escala e fórmula da nota. Continuam sem decisão registrada:

- liberação automática ou manual do relatório ao candidato;
- fluxo de revisão/reabertura de uma avaliação concluída;
- identificação exibida ao avaliador (candidato identificado ou anonimizado).

---

## 4. Alternativas consideradas

### 4.1. Pesos diferentes por critério

Não há, no código ou na documentação auditada, evidência de pesos diferenciados — todos os 7 critérios entram com peso igual na média.

**Não adotado** (não foi encontrada decisão ou implementação que diferencie pesos). Caso a equipe decida ponderar critérios de forma diferente no futuro, isso exige atualização deste documento.

---

## 5. Justificativa

1. **Aderência ao que já está implementado e em uso** — formaliza um comportamento já ativo no produto, evitando que a documentação continue tratando como "indefinido" algo que já roda em produção.
2. **Simplicidade e transparência** — uma média simples de critérios com nomes claros é mais fácil de explicar ao candidato e ao avaliador do que uma fórmula ponderada arbitrária.

---

## 6. Consequências

- `AGENTS.md` §27 deixa de listar "escala de avaliação", "pesos" e "fórmula da nota" como pendências.
- Qualquer mudança nos critérios, na escala ou na fórmula (ex.: introduzir pesos diferentes, trocar a escala de 0–10) exige uma nova decisão registrada, já que afeta tanto o serviço de IA quanto a interface de avaliação humana.

---

## 7. Critério para revisão futura

Esta decisão poderá ser revista caso a equipe decida ponderar critérios de forma diferente, mudar a escala, ou unificar formalmente (em código, não só em nomenclatura) os fluxos de avaliação por IA e avaliação humana.

---

**Fim do documento.**
