# Plano de Migracao do App.tsx

## Objetivo

Reduzir gradualmente o `apps/web/src/app/App.tsx` sem quebrar o prototipo atualizado, preservando a identidade visual e preparando o Front-end para rotas reais, mocks separados e integracao futura com API.

Este plano nao autoriza implementacao automatica. Cada etapa deve ser executada em branch propria, com Pull Request pequeno e validacao.

## Principios

- Preservar o visual aprovado.
- Nao fazer big bang refactor.
- Separar refatoracao estrutural de mudanca visual.
- Manter build funcionando ao final de cada etapa.
- Nao transformar mocks em integracoes falsas.
- Nao implementar autenticacao real antes dos contratos.
- Nao mover telas sem validar navegacao equivalente.

## Etapa 1 - Documentacao e congelamento visual

Objetivo:

- Registrar o estado atual do prototipo atualizado.
- Mapear telas, componentes, mocks e prioridades.
- Definir o recorte da entrega testavel de 10/09.

Arquivos envolvidos:

- `apps/web/src/app/App.tsx`;
- `apps/web/src/app/components/admin-screens.tsx`;
- `apps/web/src/app/components/eval-screens.tsx`;
- `apps/web/src/app/components/header-popovers.tsx`;
- `apps/web/src/app/components/onboarding-screens.tsx`;
- documentos em `docs/front-end`.

Resultado esperado:

- Documentacao suficiente para orientar refatoracoes pequenas.
- Nenhuma alteracao de codigo.

## Etapa 2 - Separacao de mocks

Objetivo:

- Extrair dados temporarios para arquivos dedicados.
- Reduzir mistura entre UI e dados ficticios.
- Preparar substituicao futura por API.

Destino sugerido:

```text
apps/web/src/mocks/
├── auth.ts
├── candidate.ts
├── jobs.ts
├── interviews.ts
├── evaluations.ts
├── admin.ts
├── reports.ts
└── questions.ts
```

Cuidados:

- Nao alterar textos, valores ou ordem visual sem necessidade.
- Nao criar camada de API falsa.
- Nao mudar comportamento de navegacao.

Validacao:

- Build continua passando.
- Telas continuam visualmente equivalentes.

## Etapa 3 - Separacao de telas prioritarias

Objetivo:

- Extrair do `App.tsx` somente as telas prioritarias para a entrega testavel.
- Evitar extrair todas as telas de uma vez.

Ordem recomendada:

1. Publicas/auth: landing wrapper, login/cadastro, termos, privacidade.
2. Candidato: onboarding, dashboard, perfil, vagas.
3. Entrevista: setup, consentimento, orientacoes, teste tecnico, entrevista, revisao, envio, pendente, relatorio.
4. Avaliador minimo: dashboard, fila, avaliacao, revisao, conclusao.
5. Administrador minimo: dashboard, entrevistas, avaliadores, atribuicoes.

Destino futuro sugerido:

```text
apps/web/src/pages/
├── public/
├── auth/
├── candidate/
├── evaluator/
└── admin/
```

Cuidados:

- Manter `screenMap` funcionando durante a transicao.
- Evitar alterar JSX internamente, salvo imports.
- Nao introduzir React Router ainda.

## Etapa 4 - Layouts por perfil

Objetivo:

- Consolidar layouts de Candidato, Avaliador e Administrador.
- Reduzir duplicacao entre sidebars, topbars e wrappers.

Destino futuro sugerido:

```text
apps/web/src/layouts/
├── PublicLayout.tsx
├── AuthLayout.tsx
├── CandidateLayout.tsx
├── EvaluatorLayout.tsx
└── AdminLayout.tsx
```

Cuidados:

- Preservar comportamento de sidebar recolhida.
- Preservar popovers e notificacoes.
- Nao criar autorizacao real apenas no Front.

## Etapa 5 - Rotas reais

Objetivo:

- Substituir gradualmente navegacao por estado local por React Router.
- Criar URLs reais para telas principais.
- Preparar guards futuros por perfil.

Destino futuro sugerido:

```text
apps/web/src/app/router/
├── routes.tsx
└── route-paths.ts
```

Ordem recomendada:

1. Rotas publicas.
2. Rotas de auth.
3. Rotas do candidato.
4. Rotas do avaliador.
5. Rotas do administrador.
6. Fallback/404.

Cuidados:

- Nao implementar seguranca apenas por escondimento de rotas.
- Guards do Front devem ser UX, nao controle de acesso definitivo.
- Autorizacao real deve permanecer responsabilidade do Back-end.

## Etapa 6 - Integracao futura com API

Objetivo:

- Criar camada de servicos para consumir contratos reais.
- Substituir mocks por chamadas reais de forma incremental.

Destino futuro sugerido:

```text
apps/web/src/services/api/
├── client.ts
├── auth.ts
├── candidate.ts
├── interviews.ts
├── evaluations.ts
└── admin.ts
```

Dependencias futuras:

- Contratos de API;
- estrategia de autenticacao/sessao;
- API do Back-end;
- politica de erro;
- modelos de usuario/perfil;
- armazenamento de video definido.

Cuidados:

- Nao confirmar envio de entrevista sem resposta real do servidor.
- Nao expor segredos no Front-end.
- Nao armazenar video em banco relacional.
- Nao apresentar mock como integracao real.
