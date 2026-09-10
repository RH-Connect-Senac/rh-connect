# Mapa de Telas e Rotas do Front-end

Atualizado em 10/09/2026 para a primeira entrega sem video.

## Decisoes Aplicadas

- Video, camera, gravacao, player, upload, regravacao e storage de midia ficam fora da primeira entrega.
- Respostas textuais entram no fluxo principal.
- Voz para texto entra apenas como forma alternativa de preencher a resposta textual no navegador, sem armazenamento de audio.
- Avaliacao continua humana.
- Python/Flask passa a ser arquitetura oficial para extracao e geracao de perguntas, mas a integracao real ainda esta pendente.
- Groq e o gerador previsto para as 5 perguntas reais, conforme versao final da POC da Tati/Igor.
- O conceito de vaga permanece como contexto da entrevista.
- O modulo independente de gerenciamento de vagas sai da primeira entrega.

## Rotas Removidas

| Rota | Tela anterior | Motivo |
| --- | --- | --- |
| `/candidate/jobs` | `JobListScreen` | Minhas Vagas deixa de existir como pagina independente. |
| `/candidate/jobs/new` | `JobScreen` | Nova Vaga deixa de existir como pagina independente. |
| `/candidate/jobs/:id` | `JobListScreen` | Detalhe/selecionar vaga deixa de existir como fluxo separado. |
| `/candidate/interviews/new/device-check` | `DeviceScreen` | Device Check sai do fluxo principal sem video/camera. |

## Rota Alterada

| Antes | Depois | Tela |
| --- | --- | --- |
| `/candidate/interviews/new/record` | `/candidate/interviews/new/answers` | `InterviewScreen` textual |

## Fluxo do Candidato

| Ordem | Rota | Tela | Status atual |
| --- | --- | --- | --- |
| 1 | `/candidate/dashboard` | Dashboard | CTA aponta para Nova entrevista. |
| 2 | `/candidate/interviews/new` | Nova entrevista / `InterviewSetupScreen` | Recebe URL da vaga, analisa contexto mockado e confirma requisitos. |
| 3 | `/candidate/interviews/new/preparation` | Orientacoes / `PrepScreen` | Explica entrevista textual e ditado por voz. |
| 4 | `/candidate/interviews/new/consent` | Consentimento / `ConsentScreen` | Texto adaptado para respostas textuais; juridico/LGPD pendente de validacao. |
| 5 | `/candidate/interviews/new/answers` | Perguntas e respostas / `InterviewScreen` | 5 perguntas textuais, textarea e voz para texto via Web Speech API quando suportada. |
| 6 | `/candidate/interviews/new/review` | Revisao / `ReviewScreen` | Exibe pergunta e resposta, permite voltar para editar. |
| 7 | `/candidate/interviews/new/submit` | Confirmar envio / `InterviewConfirmScreen` | Envio simulado para avaliacao humana. |
| 8 | `/candidate/interviews/:id/success` | Entrevista concluida | Confirma recebimento das respostas. |
| 9 | `/candidate/interviews/:id/status` | Aguardando avaliacao | Mantem acompanhamento da avaliacao humana. |
| 10 | `/candidate/reports/:id` | Relatorio | Relatorio baseado em criterios textuais permitidos. |

## Rotas Mantidas

### Publico

| Rota | Tela |
| --- | --- |
| `/` | Landing |
| `/login` | Login |
| `/register` | Cadastro |
| `/terms` | Termos |
| `/privacy` | Privacidade |
| `/verify-email` | Verificacao de e-mail |
| `/forgot-password` | Recuperacao de senha |
| `/reset-password` | Redefinicao de senha |

### Candidato

| Rota | Tela |
| --- | --- |
| `/candidate/onboarding` | Onboarding candidato |
| `/candidate/dashboard` | Dashboard candidato |
| `/candidate/profile` | Perfil |
| `/candidate/settings` | Configuracoes |
| `/candidate/materials` | Materiais |
| `/candidate/notifications` | Notificacoes |
| `/candidate/interviews` | Historico de entrevistas |
| `/candidate/development` | Desenvolvimento |

### Avaliador

| Rota | Tela |
| --- | --- |
| `/evaluator/activate` | Ativacao |
| `/evaluator/onboarding` | Onboarding |
| `/evaluator/dashboard` | Dashboard |
| `/evaluator/evaluations` | Fila |
| `/evaluator/evaluations/active` | Em andamento |
| `/evaluator/evaluations/:id` | Avaliacao humana |
| `/evaluator/evaluations/:id/review` | Revisao da avaliacao |
| `/evaluator/evaluations/:id/success` | Avaliacao enviada |
| `/evaluator/history` | Historico |
| `/evaluator/criteria` | Guia de criterios |
| `/evaluator/settings` | Configuracoes |

### Administrador

| Rota | Tela |
| --- | --- |
| `/admin/onboarding` | Onboarding admin |
| `/admin/dashboard` | Dashboard admin |
| `/admin/candidates` | Candidatos |
| `/admin/candidates/:id` | Detalhe do candidato |
| `/admin/evaluators` | Avaliadores |
| `/admin/evaluators/new` | Formulario de avaliador |
| `/admin/interviews` | Entrevistas |
| `/admin/assignments` | Atribuicoes |
| `/admin/questions` | Perguntas |
| `/admin/questions/new` | Formulario de pergunta |
| `/admin/roles` | Cargos e areas |
| `/admin/criteria` | Criterios |
| `/admin/consents` | Consentimentos |
| `/admin/audit` | Auditoria |
| `/admin/settings` | Configuracoes |

## Criterios de Avaliacao Permitidos

- Clareza.
- Coerencia.
- Objetividade.
- Dominio.
- Organizacao.
- Aderencia aos requisitos.
- Capacidade de exemplificar.

## Criterios Removidos da Primeira Entrega

- Postura.
- Contato visual.
- Iluminacao.
- Camera.
- Qualidade de audio.
- Tom ou ritmo quando depender de gravacao.
- Hesitacoes percebidas em midia.

## Interface Temporaria de Integracao

O Front usa uma camada isolada em `apps/web/src/app/services/interview-context-service.ts`:

- `analyzeJobUrl(url): Promise<JobInterviewContext>`
- `generateInterviewQuestions(context): Promise<InterviewQuestion[]>`

A implementacao atual e mockada de forma explicita. Ela deve ser conectada a integracao Python/Flask e Groq quando Tati/Igor confirmarem versao final, modelo, temperature, prompt e formato de retorno.

## Pendencias

- Contrato real da API Python/Flask.
- Modelo Groq, temperature, prompt final e schema de retorno.
- Validacao juridica/LGPD dos textos de consentimento, termos e privacidade.
- Regras finais de retencao/exclusao de respostas textuais.
- Decisao posterior sobre modulo futuro de video.
