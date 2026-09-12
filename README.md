# RH Connect

Plataforma web responsiva para preparação de candidatos para entrevistas de emprego, desenvolvida como projeto acadêmico no SENAC-DF.

O objetivo da versão atual é transformar o protótipo aprovado em uma versão testável e integrada do produto, priorizando fluxos reais de uso entre Front-end, Back-end, banco de dados e perfis de acesso.

> **Entrega testável:** 10/09/2026  
> **Status atual:** preparação técnica para desenvolvimento integrado, com Front-end em Pré-Migração Estrutural e Back-end em preparação técnica/F01 — Autenticação.

---

## 1. Visão geral do projeto

O RH Connect tem como objetivo oferecer um ambiente de preparação para entrevistas, permitindo que candidatos pratiquem respostas, recebam avaliação humana e acompanhem seus resultados dentro da plataforma.

A entrega testável prioriza um fluxo menor, mas funcional de ponta a ponta.

A ideia é substituir gradualmente comportamentos simulados e dados mockados por integrações reais entre:

```text
Front-end
↓
API
↓
Back-end
↓
Banco de dados
```

O desenvolvimento será organizado por fluxos verticais, começando por autenticação e avançando progressivamente pelas funcionalidades principais.

---

## 2. Perfis principais

O sistema considera três perfis principais.

### Candidato
- criar conta e acessar o sistema;
- passar pelo onboarding;
- completar o perfil;
- realizar entrevistas;
- acompanhar avaliações;
- consultar resultado e relatório.

### Avaliador
- acessar o sistema por conta controlada via convite e ativação;
- acessar entrevistas atribuídas;
- analisar respostas dos candidatos;
- registrar avaliação humana;
- inserir notas e feedback;
- concluir a avaliação.

### Administrador
- acessar a área administrativa;
- acompanhar informações essenciais do sistema;
- gerenciar usuários e avaliadores conforme o escopo definido;
- apoiar a operação da versão testável.

---

## 3. Fluxo funcional principal

A evolução funcional está organizada atualmente nesta ordem:

```text
Autenticação e acesso
↓
Perfil do candidato
↓
Contexto da entrevista
Entrevista baseada em uma vaga específica escolhida/cadastrada pelo candidato
↓
Escolha da modalidade
Texto | Áudio | Vídeo
↓
Entrevista
↓
Registro da resposta conforme a modalidade
↓
Atribuição da entrevista ao avaliador
↓
Avaliação humana
↓
Relatório e resultado
```

Para a entrega testável de 10/09, esse é o fluxo de referência do contexto da entrevista.

### Áreas da V1

A primeira versão trabalha com:
- Tecnologia da Informação;
- Gestão de RH;
- Secretariado.

A modelagem e a implementação devem ser extensíveis, permitindo adicionar novas áreas posteriormente sem depender de mudanças estruturais grandes.

---

## 4. Estado atual do projeto

O projeto está na fase de:

> **Preparação técnica para o desenvolvimento integrado.**

Front-end e Back-end trabalham atualmente em paralelo, cada um com seu próprio checkpoint.

```text
FRONT-END
Pré-Migração Estrutural
↓
Checkpoint Front
↓
Migração Estrutural

BACK-END
Preparação Técnica + Fundação do F01
↓
Checkpoint Back
↓
Auth Integrável
```

O primeiro encontro real entre as duas frentes será a integração do fluxo de autenticação.

---

## 5. Front-end — fase atual

O Front-end está em **Pré-Migração Estrutural**.

O objetivo é preparar e estabilizar a base antes de iniciar a reorganização estrutural mais pesada.

### Prioridades atuais da equipe Front

```text
1. Validar o mapa de telas e rotas existente
↓
2. Tratar responsividade crítica
↓
3. Realizar QA e inventário funcional
↓
4. Executar pequenos ajustes independentes
↓
5. Garantir estabilidade e build
↓
6. Atingir o checkpoint pré-migração
```

### Trilhas paralelas centralizadas

Por enquanto, estas frentes não fazem parte das tarefas manuais da equipe Front:

```text
Design System
→ Lucas + Codex

Análise / limpeza de dependências
→ Lucas + Codex, até nova decisão
```

### Importante

Nesta fase:
- o mapa de telas/rotas já existe e deve ser validado, não recriado;
- inconsistências devem ser registradas antes de grandes correções;
- responsividade deve ser tratada de forma localizada;
- botões, links e ações sem funcionamento devem ser identificados e documentados;
- pequenos bugs independentes podem ser corrigidos;
- mudanças estruturais profundas no `App.tsx` devem esperar o checkpoint;
- Design System e limpeza de dependências não devem ser alterados pela equipe sem liberação específica;
- Sidebar, Header/AppHeader, React Router completo e reorganização ampla de pastas não devem ser reconstruídos nesta etapa.

---

## 6. Checkpoint do Front

O Front pode avançar para Migração Estrutural quando houver segurança suficiente sobre a base atual.

```text
[ ] Mapa de telas/rotas validado
[ ] Responsividade crítica tratada
[ ] Inventário funcional consolidado
[ ] Bugs graves tratados ou registrados
[ ] Pequenos fixes prioritários concluídos
[ ] Build estável
[ ] Main estável
[ ] Sem refatoração estrutural concorrente
[ ] Design System e dependências em estado seguro para permitir migração
```

> Não precisa estar perfeito. Precisa estar suficientemente preparado e seguro para migrar.

---

## 7. Migração Estrutural do Front

Depois do checkpoint, a reorganização estrutural será feita de forma incremental, inicialmente com apoio centralizado de Lucas + Codex.

```text
Mapear App.tsx
↓
Mapear mocks
↓
Separar mocks
↓
Extrair telas prioritárias
↓
Criar pages
↓
Criar layouts
↓
Estruturar React Router
↓
Criar rotas reais
↓
Criar navegação real
```

O objetivo não é reconstruir o projeto do zero, mas reorganizar a base atual para permitir evolução modular.

Depois que essa estrutura inicial estiver organizada, a equipe Front volta a trabalhar sobre páginas, fluxos e módulos mais bem separados.

---

## 8. Back-end — fase atual

O Back-end está na fase de **Preparação Técnica + Fundação do F01 — Autenticação**.

```text
1. apps/api
↓
2. NestJS
↓
3. Stack-base
↓
4. PostgreSQL
↓
5. Modelagem F01 — Auth + Perfis
↓
6. Prisma
↓
7. Migration
↓
8. Estratégia Auth
↓
9. Contrato REST / OpenAPI
↓
10. Implementação Auth
↓
11. Testes
↓
12. Primeira integração
```

O objetivo não é implementar toda a API agora.

A meta é chegar ao primeiro fluxo real integrável.

---

## 9. Stack técnica atual

### Front-end

Base consolidada:
- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- Radix UI;
- React Router;
- React Hook Form;
- Vitest;
- React Testing Library;
- ESLint;
- Prettier;
- pnpm.

Itens previstos para integração com API:
- Zod;
- TanStack Query.

### Back-end

Base técnica atual:
- Node.js;
- TypeScript;
- NestJS;
- REST API;
- PostgreSQL;
- Prisma;
- Prisma Migrations;
- Swagger/OpenAPI;
- Jest;
- Supertest.

### Autenticação

Direção técnica atual:

```text
JWT
+
Cookie HTTP-only
```

Detalhes como expiração, refresh token, logout e configuração final da sessão devem ser fechados durante o F01.

### Infraestrutura em avaliação

- Host da API: Render;
- PostgreSQL hospedado: Supabase PostgreSQL em avaliação;
- Object Storage: Supabase Storage como candidato para mídia;
- Vercel para Front-end.

Providers em avaliação não devem ser considerados definitivos antes dos testes correspondentes.

---

## 10. Modelagem do primeiro fluxo

A modelagem atual deve focar no necessário para autenticação e acesso.

Ela deve permitir representar corretamente:
- usuário;
- perfil/papel;
- candidato;
- avaliador;
- administrador;
- cadastro público do candidato;
- acesso controlado do avaliador por convite e ativação de conta;
- provisionamento do Admin;
- conta ativa/inativa;
- estado necessário para onboarding;
- autorização por perfil.

O Back-end não deve antecipar entidades ou relações de evoluções futuras ainda não validadas.

---

## 11. Migrations

As alterações estruturais do banco devem ser versionadas com Prisma Migrations.

```text
schema
↓
migration
↓
aplicação local
↓
teste
↓
Git
```

Regras:
- migrations pequenas;
- reproduzíveis;
- alinhadas ao schema real;
- sem segredos;
- sem antecipar arquitetura de evoluções futuras ainda não validadas.

---

## 12. Contratos da API

Os contratos entre Front e Back devem ser definidos antes da integração.

Para cada endpoint devem estar claros:
- método;
- rota;
- autenticação;
- role;
- request;
- response;
- status HTTP;
- erros;
- validação;
- autorização.

Primeiro conjunto previsto:

```text
POST /auth/register
POST /auth/login
GET /auth/me
POST /auth/logout
```

Swagger/OpenAPI deve acompanhar os primeiros endpoints.

---

## 13. Checkpoint do Back

O Back está pronto para a primeira integração quando:

```text
[ ] apps/api existe e funciona no monorepo
[ ] NestJS roda localmente
[ ] PostgreSQL está acessível
[ ] Prisma está configurado
[ ] Auth + Perfis estão modelados
[ ] schema.prisma está validado
[ ] Migration inicial funciona
[ ] Estratégia Auth está definida
[ ] Contrato REST está documentado
[ ] register/login/logout/me funcionam
[ ] Testes mínimos passam
```

> O objetivo é chegar ao primeiro fluxo tecnicamente integrável, não terminar a API inteira.

---

## 14. Primeira integração — Autenticação

A primeira integração real será o fluxo de autenticação e acesso.

```text
Tela de Login / Cadastro
↓
React Hook Form
↓
Zod
↓
TanStack Query
↓
REST / JSON
↓
NestJS
↓
Auth
↓
Prisma
↓
PostgreSQL
```

Retorno:

```text
Login aprovado
↓
Servidor define cookie HTTP-only
↓
Browser armazena/envia o cookie
↓
GET /auth/me
↓
User + Role
↓
React
↓
Redirecionamento por perfil
```

Critérios mínimos:
- cadastro de candidato;
- login;
- usuário autenticado;
- identificação do perfil;
- `/auth/me`;
- logout;
- rota protegida;
- tratamento de erro.

---

## 15. Desenvolvimento vertical por fluxo

Depois da primeira integração, o projeto passa a evoluir por fluxos completos.

Cada fluxo deve considerar:

```text
UI
+
rota
+
API
+
persistência
+
permissão
+
loading
+
sucesso
+
erro
+
teste
```

---

## 16. Entrevista e modalidades de resposta

A entrevista fará parte do fluxo principal e poderá ser realizada em três modalidades:

- **Texto:** resposta digitada pelo candidato;
- **Áudio:** resposta gravada em áudio;
- **Vídeo:** resposta gravada em vídeo com áudio.

A modalidade escolhida representa a forma principal de resposta naquela entrevista.

Em Áudio e Vídeo, uma transcrição em texto poderá existir futuramente como recurso auxiliar, sem transformar a resposta em uma segunda modalidade obrigatória.

A arquitetura técnica de mídia para Áudio e Vídeo ainda deve ser validada por spike.

Direção atual em estudo:
- MediaRecorder no Front;
- player HTML5 para reprodução de mídia;
- Object Storage;
- acesso controlado;
- URLs assinadas/controladas.

Antes da decisão definitiva devem ser avaliados tamanho, duração, formato, upload, falhas, retry, acesso, retenção e privacidade.

---

## 17. Recuperação de senha

Recuperação de senha não é prioridade do fluxo principal da entrega testável.

Ela pode ser incorporada posteriormente sem bloquear cadastro, login, sessão, perfis, redirecionamento e integração Auth principal.

---

## 18. Estrutura do monorepo

```text
rh-connect/
├── apps/
│   ├── web/
│   └── api/
├── packages/
├── docs/
├── references/
├── .github/
├── README.md
├── package.json
└── pnpm-workspace.yaml
```

### `apps/web`

Aplicação Front-end.

### `apps/api`

Aplicação Back-end.

### `packages`

Área reservada para recursos realmente compartilhados no monorepo, somente quando houver necessidade real.

### `docs`

Documentação oficial do projeto.

### `references`

Materiais de apoio e referências.

---

## 19. Documentação

A documentação do projeto deve permanecer organizada em `docs/`.

```text
docs/
├── 01-produto-e-escopo/
├── 02-ux/
├── 03-design/
├── 04-arquitetura/
├── 05-modelo-de-dados/
├── 06-api/
├── front-end/
└── back-end/
```

### Front-end

`docs/front-end/` reúne auditoria, mapa de telas, Pré-Migração, Design System, dependências, rotas, App.tsx e mocks.

### Back-end

`docs/back-end/` reúne plano operacional, fluxo técnico, plano de execução/divisão, modelagem, migrations, contratos e autenticação/autorização.

---

## 20. Git e colaboração

O repositório oficial utiliza fluxo baseado em branches e Pull Requests.

Regras principais:
- não desenvolver diretamente na `main`;
- criar branch por tarefa;
- manter mudanças pequenas e revisáveis;
- abrir Pull Request;
- revisar antes do merge;
- resolver conversas do PR;
- manter checks técnicos;
- não commitar segredos;
- atualizar documentação quando necessário.

Exemplos:

```text
fix/responsividade-dashboard
docs/mapa-de-telas
chore/limpeza-dependencias
feat/auth-login
feat/profile
```

---

## 21. Como executar o projeto

O projeto utiliza `pnpm`.

Na raiz do monorepo:

```bash
pnpm install
```

Para executar o Front-end:

```bash
pnpm run dev:web
```

Os scripts da API devem ser utilizados conforme forem adicionados e validados no `package.json`.

Outros scripts devem ser consultados no `package.json` antes de serem utilizados.

Não utilizar `npm` como gerenciador padrão do projeto.

---

## 22. Qualidade e CI

O projeto utiliza ferramentas de qualidade como:
- TypeScript;
- ESLint;
- Prettier;
- Vitest;
- React Testing Library;
- Jest;
- Supertest;
- GitHub Actions.

Objetivo:

```text
mudança
↓
lint / typecheck / testes / build
↓
Pull Request
↓
review
↓
merge
```

Os checks devem representar validações reais antes de serem tratados como portões obrigatórios.

---

## 23. Decisões ainda pendentes

Ainda precisam de validação ou teste:
- evolução futura para sugestões de áreas e subáreas profissionais com base no perfil, sujeita à validação do cliente;
- Supabase PostgreSQL como host do banco;
- Render como host definitivo da API;
- Supabase Storage para mídia;
- detalhes finais de JWT + Cookie HTTP-only;
- refresh token, se necessário;
- estratégia final de mídia para Áudio e Vídeo;
- limites de armazenamento e retenção;
- alguns pacotes compartilhados do monorepo;
- tecnologias futuras condicionais.

Nenhuma decisão pendente deve ser apresentada como definitiva antes da validação correspondente.

---

## 24. Caminho atual até a entrega

```text
PREPARAÇÃO
↓
CHECKPOINTS FRONT E BACK
↓
MIGRAÇÃO ESTRUTURAL + AUTH INTEGRÁVEL
↓
PRIMEIRA INTEGRAÇÃO
↓
AUTENTICAÇÃO
↓
PERFIL
↓
CONTEXTO DA ENTREVISTA
VAGA ESPECÍFICA ESCOLHIDA/CADASTRADA PELO CANDIDATO
↓
MODALIDADE
TEXTO | ÁUDIO | VÍDEO
↓
ENTREVISTA
↓
ATRIBUIÇÃO
↓
AVALIAÇÃO
↓
RELATÓRIO
↓
TESTES E CORREÇÕES
↓
DEPLOY
↓
VALIDAÇÃO
```

---

## 25. Regra de condução

> **Preparar antes de migrar, integrar cedo, evoluir por fluxo e não antecipar arquitetura de evoluções futuras ainda não validadas.**
