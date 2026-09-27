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

## Escopo futuro

Este serviço já expõe a extração de contexto da vaga em `/job-context`.
Este serviço já expõe a geração de perguntas em `/questions`.
Este serviço já expõe a avaliação com Groq em `/evaluate`.
