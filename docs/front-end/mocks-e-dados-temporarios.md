# Mocks e Dados Temporarios

## Objetivo

Registrar os principais dados mockados e fluxos simulados atuais do Front-end apos a decisao da primeira entrega sem video.

Este documento orienta a substituicao incremental por contratos reais de API sem apresentar mock como integracao real.

## Servico temporario de entrevista

Arquivo:

```text
apps/web/src/app/services/interview-context-service.ts
```

Contratos expostos:

- `analyzeJobUrl(url): Promise<JobInterviewContext>`
- `generateInterviewQuestions(context): Promise<InterviewQuestion[]>`

Estado atual:

- A analise da URL da vaga e mockada.
- O contexto retornado usa cargo, empresa, resumo e requisitos ficticios.
- A geracao de perguntas retorna 5 perguntas mockadas.
- A camada foi isolada para conexao posterior com a integracao Python/Flask e Groq.
- Nao ha chamada real para Empregare, Python, Flask ou Groq nesta etapa.

## App.tsx

Arquivo:

```text
apps/web/src/app/App.tsx
```

Principais dados e simulacoes:

- `AUTH_SCREENS` ainda diferencia telas autenticadas de forma visual.
- `CRITERIA` contem criterios e notas fixas para relatorio.
- Nome do candidato, historico, status e relatorio continuam mockados.
- O fluxo de Nova entrevista usa estado local para guardar contexto, perguntas e respostas.
- O envio das respostas e simulado com `setTimeout`.
- Consentimento e configuracoes sao visuais e sem persistencia real.
- Voz para texto usa a Web Speech API quando suportada pelo navegador, apenas para preencher textarea.
- Nao ha audio armazenado, enviado ou persistido pelo Front.
- `sessionStorage` continua usado apenas para estado visual da sidebar recolhida.

Mocks removidos do fluxo principal:

- Lista independente de vagas salvas.
- Cadastro independente de vaga.
- Selecao independente de vaga.
- Device Check.
- Gravacao por pergunta.
- Duracao, tamanho, resolucao e dados de video.
- Barras simuladas de microfone para gravacao.

## admin-screens.tsx

Arquivo:

```text
apps/web/src/app/components/admin-screens.tsx
```

Principais dados e simulacoes:

- `CANDIDATES`, `EVALUATORS`, `INTERVIEWS` e `QUESTIONS_DATA` continuam ficticios.
- Dashboard administrativo usa metricas hardcoded.
- Convite de avaliador, atribuicao, consentimentos, auditoria e configuracoes nao persistem.
- Configuracoes foram adaptadas para respostas textuais, criterios permitidos e integracao Python/Flask pendente.

Risco:

- A area administrativa parece operacional, mas ainda nao possui autorizacao, persistencia ou auditoria reais.

## eval-screens.tsx

Arquivo:

```text
apps/web/src/app/components/eval-screens.tsx
```

Principais dados e simulacoes:

- `CRITERIA_GUIDE` usa criterios textuais permitidos.
- `QUEUE_ITEMS` e `HISTORY_ITEMS` continuam ficticios.
- A tela de avaliacao mostra contexto da vaga, requisitos, pergunta e resposta textual/transcrita mockada.
- A avaliacao por criterios continua controlada localmente.
- Revisao e conclusao da avaliacao sao simuladas.

Risco:

- O fluxo de avaliacao humana parece completo, mas ainda nao consome entrevistas reais nem salva avaliacao real.

## header-popovers.tsx

Arquivo:

```text
apps/web/src/app/components/header-popovers.tsx
```

Principais dados e simulacoes:

- Dados de contas e notificacoes dos tres perfis continuam ficticios.
- Logout e navegacao continuam visuais.

## Dados por dominio

### Candidato

- Nome, cargo, progresso, dados profissionais e status sao mockados.
- Perfil e configuracoes nao persistem.
- Historico e relatorio sao dados fixos.

### Vaga

- Vaga deixou de ser modulo independente na primeira entrega.
- O conceito permanece como contexto da entrevista.
- URL, cargo, empresa, resumo e requisitos existem por contrato temporario mockado.

### Entrevista

- 5 perguntas textuais sao mockadas pelo servico temporario.
- Respostas sao armazenadas apenas em estado local durante o fluxo.
- Envio e status sao simulados.
- Nao ha video, camera, gravacao, player, upload, regravacao ou storage de midia.

### Avaliador

- Conta, fila, historico e criterios sao mockados.
- Avaliacao nao e salva no servidor.
- Observacoes e recomendacoes sao locais/visuais.

### Administrador

- Usuarios, avaliadores, entrevistas e atribuicoes sao mockados.
- Permissoes, auditoria e consentimentos sao apenas visuais.

## Recomendacao de destino futuro

Conectar o servico temporario a chamadas reais somente quando houver contrato confirmado:

```text
apps/web/src/services/api/
```

Pendencias para substituicao:

- endpoint Python/Flask de analise da URL;
- modelo Groq;
- temperature;
- prompt final;
- schema de retorno;
- tratamento de erro real;
- autenticacao/autorizacao entre Front, API oficial e servico Python.
