# Plano Mestre de Implementação — RH Connect

**Versão:** 1.0  
**Data:** 11/08/2026  
**Status:** Em uso

---

## 1. Objetivo deste documento

Este documento define o caminho de evolução do RH Connect desde o estado atual do projeto até uma versão funcional, organizada, testável e preparada para entrega.

Ele deve servir como **mapa principal de execução**, respondendo à pergunta:

> **“Qual é o próximo passo e o que precisa estar concluído antes de avançarmos?”**

O objetivo não é substituir o PRD, a Matriz de Permissões, o Inventário de Telas, o Design System ou os registros de decisão. Este documento organiza a **ordem de execução** desses trabalhos.

---

## 2. Situação atual

O projeto possui hoje três referências principais.

### 2.1. Repositório oficial

O repositório atual no GitHub é a **base oficial de código** do RH Connect.

No momento, o Front-end oficial ainda está predominantemente estruturado a partir da visão do **Candidato**, originada de uma versão anterior do protótipo.

A estrutura do repositório já foi preparada para evolução do produto e não deve ser descartada ou substituída integralmente por uma nova exportação do Figma Make.

### 2.2. Figma Make atualizado

Existe uma versão mais atualizada do protótipo no Figma Make que representa:

- Candidato;
- Avaliador;
- Administrador;
- novos fluxos;
- correções e evoluções visuais e funcionais.

Essa versão deve funcionar como **referência funcional e visual para implementação**, e não como código definitivo de produção.

### 2.3. Documentação oficial

Os documentos do projeto representam as regras de produto, permissões, telas, fluxos e decisões.

Eles devem ser mantidos atualizados conforme novas decisões forem aprovadas.

---

## 3. Fontes de verdade do projeto

| Item | Fonte principal |
|---|---|
| Código implementado | GitHub |
| Interface, experiência e fluxo visual de referência | Figma / Figma Make |
| Regras funcionais e de negócio | Documentação em `/docs` |
| Decisões arquiteturais | Registros de decisão |
| Design System | Documentação de Design + implementação validada |
| Histórico de alterações | Git / Pull Requests |

### Regra importante

O Figma Make **não substitui o repositório**.

A exportação do Figma Make deve ser utilizada para comparação, referência, reaproveitamento seletivo, identificação de telas e componentes e validação de fluxos. Não deve ser utilizada para substituir integralmente o código oficial.

---

## 4. Princípios de evolução

1. **Não recomeçar o RH Connect do zero sem justificativa técnica forte.**
2. **Manter um único repositório oficial.**
3. **Preservar a direção visual e estrutural aprovada.**
4. **Permitir refinamentos do Design System sem descaracterizar a identidade.**
5. **Evitar continuar expandindo código puramente prototípico.**
6. **Migrar o produto gradualmente para rotas, estados e integrações reais.**
7. **Desenvolver por fluxos completos, e não terminar um perfil inteiro antes dos demais.**
8. **Documentar decisões importantes antes de implementações que dependam delas.**
9. **Reutilizar componentes e código somente quando fizer sentido técnico.**
10. **Priorizar clareza, segurança, manutenção, reutilização e escalabilidade.**

---

## 5. Decisões já fechadas

### 5.1. Perfis da aplicação

A V1 trabalhará com:

- **Candidato**
- **Avaliador**
- **Administrador**

Não será criado `SUPER_ADMIN` na V1.

### 5.2. Cadastro e criação de contas

#### Candidato

Possui cadastro público.

```text
Cadastro
↓
Verificação de e-mail
↓
Primeiro acesso
↓
Onboarding
↓
Dashboard
```

O cadastro inicial deve ser simples. Informações profissionais mais detalhadas devem ser coletadas posteriormente.

#### Avaliador

Não possui cadastro público.

```text
Administrador cadastra/convida avaliador
↓
Convite é enviado
↓
Avaliador acessa convite
↓
Define a própria senha
↓
Conta é ativada
↓
Primeiro acesso
↓
Onboarding operacional
↓
Dashboard do Avaliador
```

O administrador não deve conhecer nem definir permanentemente a senha do avaliador.

#### Administrador

Não possui cadastro público.

Novos administradores da V1 não serão criados pela interface administrativa.

```text
Provisionamento técnico/controlado
↓
Conta administrativa autorizada
↓
Primeiro acesso
↓
Ativação/definição segura da senha
↓
Introdução operacional
↓
Dashboard Administrativo
```

Não haverá, na V1, gerenciamento normal de novos administradores pela interface.

### 5.3. Login

Os três perfis utilizarão **um único login**.

```text
/login
↓
E-mail + senha
↓
Autenticação
↓
Identificação da role
↓
Redirecionamento
```

Destino:

```text
CANDIDATE
→ /candidate/dashboard

EVALUATOR
→ /evaluator/dashboard

ADMIN
→ /admin/dashboard
```

O usuário não escolhe sua role no login. A role é determinada pela forma como a conta foi criada.

### 5.4. Troca de perfil

Nenhum usuário pode transformar a própria conta em outro perfil.

### 5.5. Recuperação de senha

Os três perfis terão acesso ao mesmo fluxo de **Esqueci minha senha**.

```text
Esqueci minha senha
↓
Informar e-mail
↓
Receber instruções
↓
Abrir link seguro
↓
Definir nova senha
↓
Login
```

A interface não deverá revelar se aquele e-mail pertence a Candidato, Avaliador ou Administrador.

Proteções adicionais para administradores, como MFA, podem ser avaliadas futuramente, sem necessidade de inclusão imediata na V1.

### 5.6. Onboarding

**Candidato:** onboarding completo e orientado à jornada, podendo utilizar Nilo como mentor e guia.

**Avaliador:** onboarding curto, profissional e operacional, apresentando fila de avaliações, processo, critérios, rascunho x conclusão, informações destinadas ao candidato e observações internas.

**Administrador:** introdução operacional curta ou opcional, focada nas principais áreas administrativas.

---

## 6. Roadmap geral

- [ ] Etapa 01 — Consolidar decisões
- [ ] Etapa 02 — Atualizar documentação
- [ ] Etapa 03 — Atualizar referência do Figma Make
- [ ] Etapa 04 — Definir baseline de implementação
- [ ] Etapa 05 — Auditoria comparativa com Codex
- [ ] Etapa 06 — Preparar arquitetura para três perfis
- [ ] Etapa 07 — Integrar dashboards mínimos
- [ ] Etapa 08 — Implementar autenticação e autorização
- [ ] Etapa 09 — Realizar primeiro deploy integrado
- [ ] Etapa 10 — Refinar Design System
- [ ] Etapa 11 — Desenvolver por fluxos
- [ ] Etapa 12 — Substituir mocks por backend e dados reais
- [ ] Etapa 13 — Testar sistematicamente
- [ ] Etapa 14 — Revisar produto e documentação
- [ ] Etapa 15 — Preparar versão candidata à entrega

---

## 7. Etapas detalhadas

### ETAPA 01 — Consolidar decisões

**Objetivo:** garantir que as principais regras estejam definidas antes de alterar significativamente a aplicação.

**Ações:**
- validar regras de autenticação;
- validar criação de contas;
- validar roles;
- validar recuperação de senha;
- validar onboarding;
- validar estratégia de entrada de Avaliador e Admin;
- registrar decisões pendentes.

**Critério de conclusão:** a equipe consegue responder, sem ambiguidade, quem pode criar conta, quem cria cada tipo de usuário, como cada perfil entra, para onde é redirecionado, como recupera senha e como funciona o primeiro acesso.

---

### ETAPA 02 — Atualizar documentação oficial

**Objetivo:** transformar decisões de conversa em regras formais do projeto.

**Documentos prioritários:**

```text
docs/00-planejamento/
└── plano-mestre-de-implementacao.md

docs/01-produto-e-escopo/
└── regras-de-autenticacao-e-acesso.md

docs/04-arquitetura/
└── estrategia-de-evolucao-do-frontend.md

docs/decisoes/
├── README.md
├── DEC-001-autenticacao-e-perfis.md
└── DEC-002-migracao-figma-make.md
```

**Critério de conclusão:** as decisões necessárias para as próximas etapas estão registradas no repositório.

---

### ETAPA 03 — Atualizar a referência funcional e visual no Figma Make

**Objetivo:** fazer o protótipo refletir corretamente as regras aprovadas antes de utilizá-lo como referência de implementação.

**Importante:** esta etapa ocorre no **Figma Make**, e não no Codex.

O objetivo é representar corretamente a experiência. Não é necessário implementar segurança, banco, tokens ou envio real de e-mails no protótipo.

**Ajustes prioritários:**

- Cadastro do candidato: `Cadastro → Verificação de e-mail → Primeiro acesso`.
- Não permitir acesso direto ao dashboard imediatamente após cadastro sem a etapa prevista de verificação.
- Não colocar consentimento de IA de forma deslocada no cadastro inicial.
- Representar o fluxo de convite e ativação do Avaliador.
- Não criar cadastro público de Administrador.
- Representar recuperação de senha comum aos três perfis.
- Corrigir falhas de navegação que prejudiquem o uso do protótipo como referência.

**Não é prioridade nesta etapa:** autenticação real, banco, API, token real, envio real de e-mail, proteção real de rota, arquitetura definitiva ou perfeição visual de todos os componentes.

**Critério de conclusão:** o Figma Make representa corretamente os principais fluxos que serão implementados.

---

### ETAPA 04 — Definir baseline de implementação

**Objetivo:** evitar que a equipe implemente a partir de versões diferentes.

Definir uma versão como **Referência oficial para implementação** e registrar:

- nome da versão;
- data;
- principais alterações;
- o que está aprovado;
- o que ainda pode evoluir;
- quais pontos são somente demonstrativos.

**Critério de conclusão:** existe uma versão identificável do Figma Make utilizada como referência pela equipe e pelo Codex.

---

### ETAPA 05 — Auditoria comparativa com Codex

**Objetivo:** comparar a aplicação oficial com a nova referência antes de incorporar Avaliador e Administrador.

O Codex deve analisar:

```text
A. Repositório oficial atual
B. Exportação da referência atualizada do Figma Make
C. Documentação vigente
```

**Primeiro pedido ao Codex: não implementar imediatamente.**

Solicitar análise de:

- diferenças entre versões;
- novas telas;
- alterações no Candidato;
- componentes reutilizáveis;
- componentes duplicados;
- lógica puramente prototípica;
- mocks e hardcodes;
- navegação simulada;
- arquivos que precisam ser criados;
- arquivos que precisam ser refatorados;
- estratégia de migração.

**Regra obrigatória:** não copiar todo o novo `/src` e colar sobre o projeto atual.

**Critério de conclusão:** existe um plano técnico de migração revisado antes de qualquer mudança estrutural grande.

---

### ETAPA 06 — Preparar arquitetura para três perfis

**Objetivo:** fazer o código oficial reconhecer estruturalmente Candidato, Avaliador e Administrador.

Evoluir a aplicação para uma organização adequada à stack real, contemplando áreas equivalentes a:

```text
apps/web/src/
├── app/
├── pages/
│   ├── public/
│   ├── auth/
│   ├── candidate/
│   ├── evaluator/
│   └── admin/
├── features/
├── components/
└── ...
```

Criar conceitos de layout como:

```text
CandidateLayout
EvaluatorLayout
AdminLayout
```

reutilizando componentes compartilhados sempre que fizer sentido.

Começar a substituir navegação simulada por rotas reais.

**Critério de conclusão:** o projeto não é mais arquiteturalmente limitado ao Candidato e está preparado para os três perfis.

---

### ETAPA 07 — Integrar dashboards mínimos

**Objetivo:** criar os destinos mínimos necessários para autenticação dos três perfis.

Implementar primeiro:

```text
Candidato → Dashboard
Avaliador → Dashboard
Administrador → Dashboard
```

junto dos respectivos layouts, sidebar, header e navegação principal.

**Importante:** não migrar todas as telas de Avaliador e Admin nesta etapa.

**Critério de conclusão:** os três perfis possuem ambiente inicial navegável no repositório oficial.

---

### ETAPA 08 — Implementar autenticação e autorização

**Objetivo:** transformar a navegação simulada em acesso real controlado por usuário e role.

**Fluxos mínimos:** cadastro do candidato, verificação de e-mail, convite do avaliador, provisionamento de Admin, login único, logout, recuperação e redefinição de senha, sessão, redirecionamento por role e proteção de rotas.

Exemplo de proteção:

```text
CANDIDATE
✅ /candidate/*
❌ /evaluator/*
❌ /admin/*

EVALUATOR
❌ /candidate/*
✅ /evaluator/*
❌ /admin/*

ADMIN
✅ /admin/*
```

Estados de conta sugeridos:

```text
PENDING_VERIFICATION
INVITED
ACTIVE
BLOCKED
INACTIVE
```

Os nomes finais podem ser ajustados à implementação.

**Critério de conclusão:** é possível testar ponta a ponta `login candidato → candidato`, `login avaliador → avaliador` e `login admin → admin`, com bloqueio de acessos indevidos.

---

### ETAPA 09 — Primeiro deploy integrado

**Objetivo:** testar a aplicação em ambiente real de navegador e compartilhamento.

Publicar uma primeira versão integrada na Vercel contendo pelo menos autenticação, cadastro do candidato, recuperação de senha, roles, dashboards, navegação principal e layouts.

Testar desktop, tablet, celular, rotas, refresh, sessão, erros e responsividade.

**Critério de conclusão:** existe uma versão online estável o suficiente para testes internos.

---

### ETAPA 10 — Refinar Design System

**Objetivo:** profissionalizar o visual sem descaracterizar a direção aprovada.

Revisar:

- paleta;
- tons;
- contrastes;
- hover;
- focus;
- active;
- disabled;
- spacing;
- radius;
- sombras;
- tipografia;
- cards;
- tabelas;
- inputs;
- sidebar;
- header;
- responsividade;
- acessibilidade.

É permitido ajustar a paleta mantendo a identidade visual.

Processo:

```text
Design System v0.1
↓
Implementação real
↓
Teste na Vercel
↓
Refinamentos
↓
Design System v0.2
```

**Critério de conclusão:** os componentes prioritários possuem padrão visual consistente e documentado.

---

### ETAPA 11 — Desenvolver por fluxos

Depois do Fluxo 01, o projeto deve evoluir **por fluxos verticais**, não por perfil inteiro.

#### Exemplo — Entrevista

```text
Candidato
↓
prepara entrevista
↓
realiza
↓
envia
↓
sistema registra
↓
Admin acompanha/atribui
↓
Avaliador recebe
```

#### Exemplo — Avaliação

```text
Avaliador
↓
abre entrevista atribuída
↓
avalia critérios
↓
salva rascunho
↓
conclui
↓
resultado é disponibilizado
↓
Candidato consulta feedback
```

#### Exemplo — Administração

```text
Admin
↓
gerencia candidatos
↓
gerencia avaliadores
↓
gerencia perguntas
↓
gerencia critérios
↓
acompanha entrevistas
```

**Critério de conclusão:** cada fluxo entregue funciona de ponta a ponta entre os perfis necessários.

---

### ETAPA 12 — Substituir mocks por backend e dados reais

**Objetivo:** fazer o sistema deixar progressivamente de depender de dados simulados.

```text
mock
↓
service
↓
API
↓
banco
```

Domínios prioritários:

- usuários;
- autenticação;
- roles;
- perfil;
- vagas;
- entrevistas;
- avaliações;
- critérios;
- perguntas;
- relatórios;
- consentimentos;
- notificações;
- histórico e logs quando aplicável.

**Critério de conclusão:** as funcionalidades prioritárias utilizam dados persistentes e regras reais.

---

### ETAPA 13 — Testes sistemáticos

Para cada fluxo validar:

- caminho principal;
- estados alternativos;
- erro;
- sucesso;
- cancelamento;
- autorização;
- usuário não autenticado;
- conta bloqueada ou pendente;
- loading;
- empty state;
- responsividade;
- acessibilidade básica;
- integração Front-end/API/banco/sessão.

**Critério de conclusão:** os principais fluxos não dependem apenas de testes manuais informais.

---

### ETAPA 14 — Revisão final

Revisar:

- código;
- organização;
- documentação;
- permissões;
- segurança;
- Design System;
- responsividade;
- fluxos;
- conteúdo;
- links;
- navegação;
- deploy;
- variáveis de ambiente;
- acessibilidade;
- erros de console;
- testes.

Comparar:

```text
Documentação
↕
Figma
↕
Código
```

**Critério de conclusão:** não existem divergências críticas conhecidas entre especificação e implementação.

---

### ETAPA 15 — Versão candidata à entrega

Preparar uma versão do RH Connect apta para apresentação e avaliação, contendo:

- repositório organizado;
- documentação atualizada;
- aplicação publicada;
- Candidato;
- Avaliador;
- Administrador;
- autenticação funcional;
- fluxos prioritários;
- permissões;
- Design System consistente;
- testes dos caminhos principais;
- roteiro de demonstração.

Resultado:

```text
RH Connect — V1 candidata à entrega
```

---

## 8. Dependências principais

```text
Decisões
↓
Documentação
↓
Figma Make coerente
↓
Baseline
↓
Auditoria Codex
↓
Arquitetura 3 perfis
↓
Dashboards mínimos
↓
Autenticação
↓
Deploy
↓
Refino visual
↓
Fluxos
↓
Backend
↓
Testes
↓
Entrega
```

Algumas atividades podem ocorrer em paralelo, mas não devem contradizer decisões ainda não fechadas.

---

## 9. Uso do Figma Make

### Utilizar para

- explorar UI;
- representar fluxos;
- validar telas;
- experimentar variações;
- manter referência visual;
- demonstrar experiências;
- identificar estados necessários.

### Não utilizar como fonte automática de arquitetura

A implementação do protótipo pode conter mocks, hardcodes, navegação simulada, componentes grandes, estruturas temporárias e estados artificiais.

Código gerado pelo Figma Make deve ser analisado antes de ser incorporado ao produto.

---

## 10. Uso do Codex

### Primeiro: analisar

Antes de grandes alterações, o Codex deve ler o repositório, a documentação e a versão de referência e apresentar:

```text
análise
↓
plano
↓
arquivos afetados
↓
riscos
```

### Depois: implementar incrementalmente

Evitar pedidos como:

> “Reescreva o projeto inteiro.”

Preferir:

> “Implemente a etapa aprovada preservando a arquitetura existente e alterando apenas o necessário.”

Cada grande mudança deve produzir descrição, arquivos alterados, motivo, testes executados e pendências.

---

## 11. Uso da pasta pessoal

A pasta pessoal pode armazenar:

- rascunhos;
- ideias ainda não aprovadas;
- prompts;
- referências;
- anotações de reunião;
- imagens de inspiração;
- comparações temporárias.

Não utilizar a pasta pessoal como única fonte para regras que afetam toda a equipe.

---

## 12. O que deve entrar no GitHub

Colocar no repositório:

- regras aprovadas;
- arquitetura;
- decisões;
- Design System vigente;
- planejamento oficial;
- documentação funcional;
- documentação técnica;
- histórico de implementação.

Regra simples:

```text
Ainda estou pensando
→ pasta pessoal

A equipe precisa seguir
→ GitHub /docs
```

---

## 13. Documentos que devem ser criados a partir deste plano

### 1. Regras de Autenticação e Acesso

```text
docs/01-produto-e-escopo/
regras-de-autenticacao-e-acesso.md
```

### 2. Registro de decisão — Autenticação e Perfis

```text
docs/decisoes/
DEC-001-autenticacao-e-perfis.md
```

### 3. Estratégia de Evolução do Front-end

```text
docs/04-arquitetura/
estrategia-de-evolucao-do-frontend.md
```

### 4. Registro de decisão — Migração do Figma Make

```text
docs/decisoes/
DEC-002-migracao-figma-make.md
```

---

## 14. Próxima ação imediata

Após aprovação deste plano:

```text
1. Criar documentos de autenticação
↓
2. Atualizar o Figma Make
↓
3. Definir baseline
↓
4. Exportar versão atualizada
↓
5. Dar repositório + referência ao Codex
↓
6. Solicitar auditoria comparativa
↓
7. Aprovar plano técnico
↓
8. Preparar arquitetura para três perfis
```

---

## 15. Controle de progresso

**Fase atual:** Planejamento e consolidação de decisões.

### Próximas três ações

- [ ] Criar documentação de autenticação e perfis.
- [ ] Atualizar os fluxos correspondentes no Figma Make.
- [ ] Definir/exportar a versão de referência para auditoria do Codex.

---

## 16. Regra de manutenção deste documento

Este plano deve ser atualizado quando:

- uma etapa for concluída;
- uma decisão alterar a ordem das fases;
- surgir uma dependência relevante;
- o escopo da V1 mudar;
- uma nova estratégia técnica for aprovada.

Não apagar decisões históricas importantes sem registrar a mudança.

Quando o plano mudar de forma significativa, atualizar sua versão.
