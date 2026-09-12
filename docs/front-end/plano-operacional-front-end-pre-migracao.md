# Plano Operacional Front-end — Pré-Migração Estrutural

## 1. Objetivo do documento

Este documento orienta a equipe Front-end sobre como trabalhar na base atual do RH Connect durante a fase de **Pré-Migração Estrutural**.

O objetivo desta fase é estabilizar a base atual, validar decisões visuais e arquiteturais, identificar dependências desnecessárias, registrar riscos e preparar o Front-end para a migração estrutural sem antecipar refatorações de grande porte.

A equipe deve trabalhar de forma controlada, evitando alterações amplas ou decisões isoladas que possam gerar retrabalho durante a migração.

Este plano não define tarefas obrigatórias por pessoa. Ele organiza as principais frentes de trabalho da fase para que a liderança possa distribuir as atividades conforme prioridade, disponibilidade e perfil técnico de cada integrante.

---

## 2. Estado atual do Front-end

O protótipo atualizado já está em:

```text
apps/web
```

A base atual já possui telas de:

- Candidato;
- Avaliador;
- Administrador.

O projeto roda localmente e a referência visual está mais completa que a versão anterior. Mesmo assim, ainda é uma base derivada de protótipo:

- a navegação ainda possui estados e fluxos simulados;
- as rotas reais ainda não estão consolidadas;
- muitos dados ainda são mockados ou hardcoded;
- o `App.tsx` ainda concentra muitas telas e responsabilidades;
- ações como login, cadastro, envio, gravação, avaliação e salvamento ainda podem depender de simulações;
- a integração real com Back-end ainda não está concluída;
- existem componentes visuais semelhantes implementados de formas diferentes;
- existem dependências que precisam ser analisadas antes de permanecerem na base definitiva;
- o mapa de telas e rotas já possui uma proposta atualizada, mas as rotas ainda precisam de validação antes da implementação estrutural.

Portanto, o objetivo desta fase não é “mexer em tudo”, e sim preparar uma base segura e conhecida para a migração gradual.

---

## 3. Como rodar o projeto localmente

No Windows, a recomendação inicial é usar o **PowerShell** ou o **terminal integrado do VS Code**.

Por enquanto, evite usar o **Git Bash** para rodar o projeto caso ele não reconheça corretamente o `pnpm`.

Antes de rodar o projeto, confira se Node, npm e pnpm estão disponíveis:

```bash
node -v
npm -v
pnpm -v
```

Se `node -v` e `npm -v` funcionarem, mas `pnpm -v` não funcionar, instale o pnpm com:

```bash
npm install -g pnpm
```

Depois de instalar, feche o terminal e abra novamente.

### Rodando pela raiz do projeto

1. Abra o terminal na raiz do repositório.
2. Instale as dependências:

```bash
pnpm install
```

3. Rode o Front-end:

```bash
pnpm run dev:web
```

4. Abra no navegador a URL indicada pelo Vite.

Se o terminal estiver aberto diretamente dentro de `apps/web`, também é possível rodar:

```bash
pnpm run dev
```

Use `pnpm` como gerenciador oficial do projeto. Não rode `npm install`, porque isso pode gerar `package-lock.json` e misturar gerenciadores de pacote.

Arquivos e pastas que não devem ser commitados:

- `node_modules`;
- `dist`;
- `.pnpm-store`;
- `.env`;
- arquivos temporários pessoais;
- `package-lock.json`.

Antes de qualquer commit, sempre rode:

```bash
git status
```

---

## 4. Como encontrar uma tela no código

Ainda não existem rotas reais consolidadas por página. Por isso, encontrar uma tela pode exigir consulta ao mapa de telas e pesquisa no código.

Use primeiro:

```text
docs/front-end/mapa-de-telas-front-end.md
```

Depois, no VS Code, use `Ctrl + Shift + F` para buscar por textos visíveis na interface ou por nomes como:

- `Dashboard`;
- `Avaliação`;
- `Admin`;
- `Onboarding`;
- `Relatório`;
- `Entrevista`;
- `Perfil`;
- `Vagas`;
- `Desenvolvimento`.

Exemplos úteis:

- Dashboard e telas do Avaliador podem estar em `apps/web/src/app/components/eval-screens.tsx`.
- Telas administrativas podem estar em `apps/web/src/app/components/admin-screens.tsx`.
- Onboarding do candidato pode estar em `apps/web/src/app/components/onboarding-screens.tsx`.
- Popovers de conta, header e notificações podem estar em `apps/web/src/app/components/header-popovers.tsx`.
- Várias telas do Candidato ainda podem estar em `apps/web/src/app/App.tsx`.

Se não encontrar pelo nome da função ou componente, procure por um texto que aparece visualmente na tela.

---

## 5. Como fazer ajustes de responsividade nesta fase

A equipe pode continuar trabalhando responsividade, desde que os ajustes sejam **críticos, pequenos e seguros**.

Passo a passo recomendado:

1. Rode o projeto localmente.
2. Abra a tela no navegador.
3. Use o DevTools em modo responsivo.
4. Teste desktop, tablet e mobile.
5. Identifique a quebra visual.
6. Localize a tela no código.
7. Ajuste classes Tailwind/CSS com cuidado.
8. Teste novamente nos três tamanhos.
9. Faça um commit pequeno e focado.

Exemplos de ajustes comuns:

```tsx
// Antes
grid-cols-3

// Depois
grid-cols-1 md:grid-cols-2 xl:grid-cols-3
```

```tsx
// Antes
flex

// Depois
flex flex-col lg:flex-row
```

Outros exemplos:

- trocar larguras fixas por `w-full max-w-*`;
- adicionar `overflow-x-auto` em tabelas quando necessário;
- reduzir espaçamentos em mobile;
- evitar que botões fiquem espremidos;
- evitar texto cortado em cards;
- validar sidebar e menus em notebook/mobile.

Evite mudanças visuais grandes nesta fase. Se o ajuste exigir alterar o layout inteiro ou depender de uma decisão do Design System, registre o problema para a etapa adequada.

---

# 6. Frentes de trabalho da Pré-Migração Estrutural

## Frente 1 — Validação visual do Design System

### Objetivo

Complementar a auditoria técnica já realizada com uma análise visual e prática das telas atuais do RH Connect.

A tarefa não é redesenhar o sistema, alterar componentes ou oficializar decisões individualmente.

A equipe deve:

- observar;
- comparar;
- identificar padrões;
- registrar inconsistências;
- reunir evidências;
- recomendar possíveis consolidações.

### Referências

Usar em conjunto:

- aplicação atual em `apps/web`;
- protótipo visual aprovado;
- auditoria técnica do Design System;
- documento atual de Design System.

### Atividades

- comparar padrões entre Candidato, Avaliador e Administrador;
- validar cores predominantes;
- validar tipografia;
- validar spacing;
- validar radius;
- validar bordas e sombras;
- revisar buttons;
- revisar inputs e formulários;
- revisar cards e badges;
- revisar sidebar e header;
- revisar dialogs, dropdowns, popovers, tabs e toasts;
- revisar tabelas e gráficos;
- revisar estados de loading, empty, error, success e disabled;
- revisar comportamento responsivo;
- revisar motion/transições quando aplicável;
- registrar diferenças relevantes com evidências.

### Regras

- não alterar código durante a análise;
- não substituir componentes;
- não fazer redesign;
- não oficializar padrão por preferência pessoal;
- não considerar um componente existente em `components/ui` como padrão oficial apenas porque ele existe;
- decisões finais permanecem pendentes de consolidação.

### Entrega esperada

Relatório padronizado contendo:

```text
Elemento analisado:
Responsável:
Telas verificadas:
Arquivos relacionados, se encontrados:

Padrão predominante observado:
Variações encontradas:
Inconsistências:
Impacto percebido:
Evidências/prints:

Recomendação:
- manter;
- consolidar/padronizar;
- ajustar;
- remover;
- criar/definir.

Justificativa:
Decisão oficial: PENDENTE
```

---

## Frente 2 — Auditoria e limpeza segura de dependências

### Objetivo

Validar quais dependências do Front-end realmente são utilizadas, quais podem ser removidas e quais devem permanecer em investigação.

A prioridade é **reduzir risco e complexidade sem quebrar a base atual**.

### Atividades

- revisar dependências candidatas já identificadas;
- pesquisar imports e usos reais;
- verificar se existe uso indireto;
- verificar se o pacote está ligado a componente ainda utilizado;
- rodar build antes e depois de qualquer remoção;
- testar telas afetadas;
- classificar cada dependência.

### Classificações sugeridas

```text
MANTER
REMOVER COM SEGURANÇA
INVESTIGAR MAIS
ADIAR DECISÃO
```

### Regras

- não remover biblioteca apenas porque parece não estar sendo usada;
- não trocar biblioteca por preferência pessoal;
- não misturar limpeza de dependências com refatoração estrutural;
- não remover várias dependências de alto risco no mesmo PR;
- bibliotecas ligadas a motion, gamificação ou comportamentos ainda não consolidados podem permanecer temporariamente até decisão.

### Entrega esperada

Para cada dependência:

```text
Dependência:
Onde foi pesquisada:
Uso encontrado:
Impacto da remoção:
Classificação:
Justificativa:
Teste realizado:
Recomendação:
```

Quando a remoção for considerada segura, deve ocorrer em PR pequeno e isolado.

---

## Frente 3 — Validação do mapa de rotas e navegação

### Objetivo

Validar as rotas já propostas no mapa de telas antes da implementação estrutural.

Esta frente **não deve criar React Router nem implementar rotas reais ainda**.

### Atividades

Para cada rota proposta, verificar:

- a tela correspondente realmente existe;
- a URL representa corretamente a função da tela;
- o perfil está correto;
- a rota deve ser pública ou protegida;
- qual role pode acessar;
- se precisa de parâmetro como `:id`;
- se a tela realmente precisa de uma URL própria;
- se poderia ser apenas uma etapa interna de outra página;
- se existem rotas duplicadas ou redundantes;
- se alguma rota importante está faltando;
- qual tela leva até ela;
- para onde ela deve levar depois;
- se depende de decisão de produto;
- se a prioridade P0, P1, P2 ou P3 parece coerente.

### Atenção especial

As rotas relacionadas a:

```text
vaga
OU
área/subárea
```

não devem ser consolidadas enquanto a decisão de produto permanecer pendente.

### Entrega esperada

```text
Tela:
Rota proposta:
Perfil:
Pública/protegida:
Role autorizada:
Origem da navegação:
Destino seguinte:
Precisa de :id?:
Precisa ser rota própria?:
Prioridade atual:
Prioridade sugerida:
Situação:
- aprovar;
- ajustar;
- remover;
- pendente.

Justificativa:
```

---

## Frente 4 — Responsividade crítica

### Objetivo

Garantir que as telas prioritárias da entrega não apresentem quebras relevantes em desktop, notebook, tablet e mobile.

### Prioridade

Começar pelo caminho crítico:

```text
Autenticação
→ Onboarding
→ Dashboard
→ Perfil
→ Entrevista
→ Avaliação
→ Relatório
```

Depois validar:

- Admin mínimo;
- Desenvolvimento/Gamificação base;
- telas auxiliares prioritárias.

### Atividades

- testar breakpoints;
- identificar overflow;
- identificar conteúdo cortado;
- validar grids;
- validar formulários;
- validar tabelas;
- validar sidebar/header;
- corrigir apenas problemas pequenos e seguros;
- registrar o que exige refatoração maior.

### Entrega esperada

- lista de problemas;
- prints quando relevante;
- correções pequenas realizadas;
- problemas adiados com justificativa.

---

## Frente 5 — Testes e estabilidade da base

### Objetivo

Garantir que a base continue estável durante toda a Pré-Migração.

### Atividades

- confirmar que o projeto instala corretamente;
- confirmar que o Front inicia;
- rodar build;
- percorrer os principais fluxos atuais;
- registrar erros de console relevantes;
- identificar telas inacessíveis;
- verificar regressões após PRs;
- acompanhar alterações de dependências;
- registrar falhas que podem afetar a migração.

### Entrega esperada

Relatório curto contendo:

```text
Build:
Inicialização:
Fluxos testados:
Problemas encontrados:
Regressões:
Bloqueadores:
Observações:
```

---

## Frente 6 — Preparação estrutural de App.tsx, mocks e navegação atual

### Objetivo

Entender a estrutura atual para preparar a migração, sem executar ainda a reorganização completa.

### Atividades

- identificar blocos de autenticação;
- identificar blocos do Candidato;
- identificar blocos da entrevista;
- identificar relatório;
- localizar `screenMap`, `onNavigate`, `setScreen` e equivalentes;
- mapear mocks e dados hardcoded;
- localizar dados duplicados;
- identificar responsabilidades concentradas no `App.tsx`;
- identificar componentes candidatos à separação;
- registrar riscos;
- sugerir ordem de migração.

### Regras

- não separar tudo agora;
- não reescrever o `App.tsx`;
- não apagar mocks;
- não implementar rotas reais;
- não criar arquitetura paralela desnecessária.

### Entrega esperada

- blocos candidatos à separação;
- lista dos principais mocks;
- riscos;
- dependências entre telas;
- sugestão de ordem de migração.

---

# 7. O que pode ser feito agora

Durante a Pré-Migração Estrutural, pode ser feito:

- validação visual do Design System;
- auditoria segura de dependências;
- validação das rotas propostas;
- responsividade crítica;
- testes de estabilidade;
- documentação;
- mapeamento de mocks;
- análise do `App.tsx`;
- análise da navegação simulada;
- correções visuais pequenas;
- pequenos commits focados;
- registro de riscos e pendências;
- remoção de dependências apenas quando comprovadamente segura e isolada.

---

# 8. O que não deve ser feito agora

- Não refatorar o `App.tsx` inteiro.
- Não iniciar a migração estrutural completa antes do checkpoint.
- Não implementar autenticação real como parte desta fase de preparação.
- Não criar/consolidar React Router antes da validação das rotas.
- Não substituir componentes em massa.
- Não implementar o Design System definitivo diretamente no código antes da consolidação.
- Não fazer redesign.
- Não apagar mocks sem mapeamento.
- Não remover dependências sem comprovar que não estão em uso.
- Não trocar bibliotecas por preferência.
- Não mexer no `apps/api` como parte das tarefas de Front.
- Não consolidar as rotas de vaga/área enquanto a decisão de produto estiver pendente.
- Não misturar muitas alterações em um mesmo commit.
- Não commitar `node_modules`, `dist`, `.pnpm-store`, `.env` ou `package-lock.json`.

---

# 9. Como fazer uma alteração com segurança

Fluxo recomendado:

1. Atualizar a `main`.
2. Instalar ou atualizar dependências com `pnpm install`.
3. Rodar o projeto com `pnpm run dev:web`.
4. Confirmar que a base abre normalmente.
5. Criar uma branch nova.
6. Executar apenas a tarefa atribuída.
7. Fazer ajustes pequenos quando a tarefa permitir alteração.
8. Testar localmente.
9. Rodar `git status`.
10. Fazer commit.
11. Fazer push.
12. Abrir Pull Request.

Comandos úteis:

```bash
git checkout main
git pull origin main
pnpm install
pnpm run dev:web
git checkout -b nome-da-branch
git status
git add caminho/do/arquivo
git commit -m "mensagem do commit"
git push -u origin nome-da-branch
```

Antes de abrir o PR, confira:

- se a alteração ficou restrita ao escopo;
- se nenhum arquivo indevido entrou;
- se o projeto continua funcionando;
- se o visual foi testado quando aplicável;
- se o PR explica o que foi feito;
- se as limitações foram registradas;
- se não houve refatoração não autorizada.

---

# 10. Padrão de branches e commits

Sugestões de nomes de branch:

```text
docs/validacao-design-system
chore/auditoria-dependencias
docs/validacao-mapa-rotas
fix/responsividade-dashboard-candidato
test/estabilidade-front
docs/mapeamento-app-mocks
```

Sugestões de commits:

```text
docs: registra validacao visual do design system
chore: audita dependencias do front
docs: valida mapa de rotas do front
fix: ajusta responsividade do dashboard do candidato
test: registra validacao de estabilidade do front
docs: atualiza mapeamento de mocks e app
```

Use mensagens curtas, claras e alinhadas ao escopo da alteração.

---

# 11. Critérios para considerar uma tarefa concluída

Uma tarefa pode ser considerada pronta para revisão quando:

- o escopo atribuído foi analisado por completo;
- a entrega esperada foi produzida;
- evidências foram registradas quando necessárias;
- nenhuma decisão pendente foi tratada como definitiva sem validação;
- alterações de código, quando permitidas, foram pequenas e focadas;
- o projeto foi testado;
- nenhum fluxo importante foi quebrado;
- nenhum arquivo indevido foi adicionado;
- nenhum segredo foi commitado;
- o commit está claro;
- o PR explica o que foi feito;
- dúvidas, riscos e limitações foram registrados.

Para tarefas exclusivamente de análise/documentação, não é obrigatório alterar código.

---

# 12. Critério para encerramento da Pré-Migração Estrutural

A fase de Pré-Migração pode ser considerada concluída quando os principais pontos abaixo estiverem resolvidos ou formalmente registrados:

- auditoria técnica do Design System concluída;
- validação visual do Design System entregue;
- padrões e inconsistências relevantes documentados;
- dependências candidatas classificadas;
- remoções seguras realizadas ou registradas para execução;
- mapa de rotas validado;
- rotas pendentes de produto claramente identificadas;
- problemas críticos de responsividade tratados ou documentados;
- build estável;
- fluxos principais testados;
- principais mocks conhecidos;
- responsabilidades do `App.tsx` mapeadas;
- navegação simulada compreendida;
- riscos estruturais registrados;
- PRs desta fase revisados e integrados à `main`.

Quando esses critérios forem atingidos, a liderança pode declarar o:

```text
CHECKPOINT DE PRÉ-MIGRAÇÃO
```

---

# 13. Próxima fase — Migração Estrutural

Depois do checkpoint, inicia-se a reorganização estrutural do Front-end.

A ordem geral esperada é:

```text
mocks
↓
pages
↓
layouts
↓
rotas reais
↓
navegação
↓
integração
```

A migração deve ser gradual.

O objetivo não é reconstruir o produto do zero, mas reorganizar a base atual preservando:

- telas aprovadas;
- identidade visual;
- regras de negócio;
- comportamento válido;
- fluxo definido.

A implementação de React Router, separação estrutural de páginas/layouts e integração progressiva com o Back-end pertencem à fase de Migração Estrutural, não à Pré-Migração.

---

# 14. Resultado esperado da fase

Ao final da Pré-Migração, a equipe deve ter produzido uma base de decisão suficientemente clara para avançar com segurança:

```text
MAIN ESTÁVEL
+
DESIGN SYSTEM AUDITADO E VALIDADO VISUALMENTE
+
DEPENDÊNCIAS CLASSIFICADAS
+
MAPA DE ROTAS VALIDADO
+
RESPONSIVIDADE CRÍTICA TRATADA
+
BUILD E FLUXOS PRINCIPAIS TESTADOS
+
APP.TSX / MOCKS / NAVEGAÇÃO MAPEADOS
+
RISCOS DOCUMENTADOS
↓
CHECKPOINT DE PRÉ-MIGRAÇÃO
↓
MIGRAÇÃO ESTRUTURAL
```

O mais importante nesta fase é reduzir incerteza antes de reorganizar a arquitetura do Front-end.
