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
