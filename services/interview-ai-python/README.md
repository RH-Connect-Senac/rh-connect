# RH Connect Interview AI Python Service

Serviço Python separado para apoiar o fluxo de entrevista do RH Connect.

Arquitetura prevista:

```text
apps/web -> apps/api -> services/interview-ai-python -> Empregare / Groq
```

O Front-end nunca deve chamar este serviço diretamente. Toda comunicação deve passar pelo Back-end NestJS em `apps/api`.

## Ambiente local

Crie futuramente uma `.venv` local dentro desta pasta:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crie futuramente um arquivo `.env` local a partir de `.env.example`.

Não commite `.env`, `.venv` ou qualquer segredo.

## Configuração das API keys da Groq

O serviço aceita **múltiplas** API keys da Groq, usadas em rotação (round-robin) com fallback automático para a próxima credencial quando a Groq responde com rate limit (`429`). Isso reduz a chance de uma única key esgotada interromper o fluxo de entrevista.

### `GROQ_API_KEYS` (recomendado)

Uma ou mais keys separadas por vírgula:

```dotenv
GROQ_API_KEYS=<GROQ_KEY_01>,<GROQ_KEY_02>,<GROQ_KEY_03>
```

Regras de parsing (já implementadas, não alteradas por esta documentação):

- separação por vírgula, sem limite de quantidade;
- espaços em volta de cada valor são removidos automaticamente;
- entradas vazias (ex.: vírgula dupla) são descartadas;
- a ordem configurada é preservada;
- duplicatas **não** são removidas pelo parser nem pelo pool (compatibilidade com o comportamento já implementado) — mas **não configure a mesma key duas vezes**: isso não traz nenhuma capacidade adicional nem benefício de fallback, já que o fallback por operação seleciona a próxima credencial comparando **por valor** (`next_unique_key`), então uma mesma operação nunca tenta novamente uma credencial cujo valor ela já usou, mesmo que esse valor apareça mais de uma vez na lista configurada:

  ```dotenv
  # Não recomendado - "GROQ_KEY_01" ocupa duas posições sem necessidade;
  # ainda assim, dentro de UMA MESMA operação, ela é tentada no máximo uma
  # vez (o fallback não repete um valor de key já usado nessa operação):
  GROQ_API_KEYS=<GROQ_KEY_01>,<GROQ_KEY_01>,<GROQ_KEY_02>

  # Recomendado - todas as credenciais distintas entre si:
  GROQ_API_KEYS=<GROQ_KEY_01>,<GROQ_KEY_02>,<GROQ_KEY_03>
  ```

### `GROQ_API_KEY` (compatibilidade, uma única credencial)

Continua suportada, para ambientes com uma única credencial e sem fallback entre keys:

```dotenv
GROQ_API_KEY=<GROQ_KEY>
```

### Precedência quando as duas estão definidas

`GROQ_API_KEYS`, se resultar em ao menos uma key válida após o parsing, **tem precedência total** sobre `GROQ_API_KEY` — que é ignorada nesse caso. As duas variáveis nunca são somadas/concatenadas. `GROQ_API_KEY` só é usada como fallback quando `GROQ_API_KEYS` estiver ausente, vazia, ou não resultar em nenhuma key válida.

A leitura da configuração e a montagem do pool de keys são feitas de forma lazy (só na primeira operação que precisa da Groq, não na inicialização do serviço Flask). Se nenhuma das duas variáveis fornecer uma key válida, a operação que tentar usar a Groq (`/questions` ou `/evaluate`) falha com um erro de configuração controlado (sem expor nenhum valor de key) — o serviço Flask em si continua no ar normalmente (ex.: `/health` segue respondendo).

### Comportamento de fallback (resumo)

- o cliente Groq é sempre instanciado com `max_retries=0` (o SDK nunca tenta novamente sozinho, de forma invisível);
- o fallback interno do RH Connect troca de credencial **somente** quando a Groq responde `429` / rate limit;
- qualquer outra categoria de erro (ex.: `400`, `401`, `403`, `5xx`, timeout, erro de conexão) encerra a operação imediatamente, sem tentar outra key;
- cada operação tenta, no máximo, uma vez cada credencial distinta configurada.

### Observabilidade

O serviço registra, em log, informações técnicas do fallback — operação (`generate_questions`/`evaluate_interview`), número da tentativa, categoria do erro, e se as credenciais se esgotaram — **nunca o valor de nenhuma API key**.

### Limitação conhecida (solução temporária)

O pool de keys vive **em memória, por processo Python**. Se o serviço rodar com múltiplos workers/processos (ex.: `gunicorn -w N`), cada processo mantém seu próprio índice de round-robin, sem nenhuma coordenação entre processos. Essa é uma limitação conhecida da solução atual; uma estratégia para múltiplos processos/produção está sendo tratada separadamente, fora do escopo deste documento.

### Segurança

- **nunca** commite o arquivo `.env` real — apenas `.env.example`, com placeholders;
- **nunca** inclua uma API key real neste README ou em qualquer outro arquivo do repositório;
- **nunca** cole uma API key real em issues, Pull Requests ou mensagens de chat;
- não logue o valor de nenhuma key (o serviço já foi construído para nunca fazer isso);
- configure as keys reais diretamente como variáveis de ambiente/secrets do ambiente de execução (ex.: VPS), nunca versionadas no repositório;
- o repositório deve conter somente placeholders (ex.: `<GROQ_KEY_01>`) ou exemplos obviamente falsos (ex.: `fake-groq-key-01`).

## Execução local

Porta padrão: `5001`.

Com a `.venv` ativada e dependências instaladas:

```powershell
python app.py
```

Endpoints disponíveis:

```text
GET /health
POST /job-context
POST /questions
POST /evaluate
```

Resposta esperada de `GET /health`:

```json
{
  "status": "ok"
}
```

Request de `POST /job-context`:

```json
{
  "url": "https://www.empregare.com/..."
}
```

Response de sucesso:

```json
{
  "title": "...",
  "company": "...",
  "summary": "...",
  "activities": [],
  "requirements": [],
  "location": null,
  "contractType": null,
  "sourceUrl": "https://www.empregare.com/..."
}
```

Request de `POST /questions`:

```json
{
  "context": {
    "title": "...",
    "company": "...",
    "summary": "...",
    "activities": ["..."],
    "requirements": ["..."],
    "location": "...",
    "contractType": "...",
    "sourceUrl": "https://www.empregare.com/..."
  }
}
```

Response de sucesso:

```json
{
  "questions": [
    {
      "id": 1,
      "type": "Tecnica",
      "text": "..."
    },
    {
      "id": 2,
      "type": "Tecnica",
      "text": "..."
    },
    {
      "id": 3,
      "type": "Comportamental",
      "text": "..."
    },
    {
      "id": 4,
      "type": "Comportamental",
      "text": "..."
    },
    {
      "id": 5,
      "type": "Carreira",
      "text": "..."
    }
  ]
}
```

Request de `POST /evaluate`:

```json
{
  "context": {
    "title": "...",
    "company": "...",
    "summary": "...",
    "activities": ["..."],
    "requirements": ["..."],
    "location": "...",
    "contractType": "...",
    "sourceUrl": "https://www.empregare.com/..."
  },
  "answers": [
    {
      "questionId": 1,
      "questionText": "...",
      "questionType": "Tecnica",
      "answer": "..."
    }
  ]
}
```

Response de sucesso:

```json
{
  "scores": {
    "Clareza": 0,
    "Coerência": 0,
    "Objetividade": 0,
    "Domínio": 0,
    "Organização": 0,
    "Aderência": 0,
    "Exemplos": 0
  },
  "overallScore": 0,
  "strengths": ["..."],
  "improvements": ["..."],
  "recommendations": ["..."],
  "summary": "...",
  "questionsEvaluation": [
    {
      "questionId": 1,
      "score": 0,
      "reason": "...",
      "positives": ["..."],
      "improvements": ["..."],
      "suggestion": "..."
    }
  ]
}
```

## Geração de perguntas e avaliação

### Perguntas (`POST /questions`)

- Sempre 5 perguntas, nesta ordem de tipos: Técnica, Técnica, Comportamental, Comportamental e Carreira (o parser rejeita qualquer outra estrutura).
- Para evitar perguntas repetidas entre gerações da mesma vaga, a cada chamada o serviço sorteia um **ângulo de pergunta** por posição (por exemplo: cenário hipotético, análise de decisão, investigação de problema, feedback, autonomia, motivação). Os ângulos são genéricos e não criam requisito novo (`_QUESTION_ANGLES` em `groq_service.py`).
- O prompt também pede variedade de tema e de abertura, perguntas em português do Brasil, sem citar ferramentas ou frameworks que não estejam na vaga e sem números extremos incompatíveis com o nível da vaga.
- A geração usa `temperature=0.7`; a avaliação continua em `0.2`.

### Avaliação (`POST /evaluate`)

- Os 7 critérios, a escala de 0 a 10 e a fórmula da nota geral seguem a **DEC-005** (`docs/05-decisoes/DEC-005-formula-e-criterios-de-avaliacao.md`): `overallScore` é a **média simples dos 7 critérios, calculada pelo sistema**, não pela IA. Esta documentação não altera essa decisão.
- Os **tetos automáticos** continuam como antes: resposta vazia limita a 0, "não sei" a 1 e respostas com menos de 20 caracteres a 2 (`_answer_score_cap` e `_aggregate_answer_score_cap`).
- O prompt de avaliação traz uma rubrica com âncoras por critério (2, 5, 9 e 10), proporcionalidade ao nível da vaga, um filtro para texto longo e genérico (forma não substitui conteúdo) e orientação de tom: respeitoso, construtivo e específico, sem elogio artificial nem exigência de ferramentas ou métodos que não estejam na vaga.
- O prompt informa a quantidade de respostas e os `questionId` esperados, para reduzir o retorno de itens omitidos.
- A resposta pede até `max_tokens=8192`. O modelo em uso (`openai/gpt-oss-20b`) é de raciocínio e os tokens de raciocínio contam na saída (medido: cerca de 2.700 a 3.300 tokens por avaliação). Sem esse limite, a Groq cortava a saída em 2.048 tokens e a avaliação falhava com `400 json_validate_failed`.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GROQ_API_KEYS` / `GROQ_API_KEY` | Sim | Chaves da Groq (ver seção acima). |
| `GROQ_MODEL` | Sim | Modelo usado nas duas operações. |
| `GROQ_EVALUATION_SEED` | Não | Inteiro (ex.: `42`). Quando definido, a avaliação envia `seed` à Groq para estabilizar a nota da mesma resposta entre execuções. Sem a variável, nada muda. |
| `PORT` | Não | Porta do serviço (padrão `5001`). |
| `REQUEST_TIMEOUT_SECONDS` | Não | Timeout das chamadas à Groq. |

Sobre a seed: a Groq a trata como "melhor esforço", então a nota fica mais estável, mas não idêntica em 100% dos casos. No teste na VPS, a oscilação média da nota da mesma resposta entre rodadas caiu de cerca de 0,93 para 0,35 ponto, sem mudar o nível das notas. No retry estrutural, cada tentativa usa `seed + (tentativa - 1)`, para não repetir a mesma saída inválida.

### Calibração e diagnóstico (scripts)

Os scripts abaixo usam **somente dados fictícios**. O `baseline_ia.py` usa só a biblioteca padrão; o `diagnostico_avaliacao.py` usa `python-dotenv` e `groq` (já nas dependências) e lê o `.env` da pasta do serviço. O `baseline_ia.py` grava os resultados na **pasta atual** (`baseline_<label>/`), então rode-o a partir de uma pasta fora do repositório, para não versionar resultados. No exemplo, `$REPO` é a raiz do repositório.

```bash
mkdir -p ~/baselines && cd ~/baselines
S=$REPO/services/interview-ai-python/scripts

# Baseline de perguntas e avaliação (serviço já rodando na porta indicada)
python3 $S/baseline_ia.py --label antes --base-url http://localhost:5001

# Só a avaliação, com 3 repetições por perfil e resumo da oscilação (amplitude)
python3 $S/baseline_ia.py --label calib --only avaliacao --repeat 3 --base-url http://localhost:5002

# Mostra por que a Groq rejeitou uma avaliação (failed_generation, finish_reason e tokens)
python3 $S/diagnostico_avaliacao.py --perfil excelente --n 4
```

"Amplitude" é a diferença entre a maior e a menor nota que a mesma resposta recebeu em rodadas diferentes: quanto menor, mais estável a avaliação.

### Erros comuns

| Sintoma | Causa provável |
|---|---|
| `502` com "erro de autenticacao (401)" | Uma das chaves de `GROQ_API_KEYS` é inválida ou foi revogada. O fallback troca de chave somente em `429`, então a chave ruim derruba as requisições que a sorteiam. Teste cada chave e remova a inválida. |
| `502` com "requisicao invalida (400)" e `json_validate_failed` | A Groq rejeitou um JSON truncado ou malformado. Use `scripts/diagnostico_avaliacao.py` e confira `finish_reason`/`completion_tokens`. |
| `502` com "avaliacao por pergunta incompleta" | O modelo devolveu menos itens do que o esperado. O serviço repete uma vez; se persistir, o erro é retornado. |

## Escopo futuro

Este serviço já expõe a extração de contexto da vaga em `/job-context`.
Este serviço já expõe a geração de perguntas em `/questions`.
Este serviço já expõe a avaliação com Groq em `/evaluate`.
