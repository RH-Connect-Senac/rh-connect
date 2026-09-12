# Estratégia de Evolução do Front-end — RH Connect

**Versão:** 1.0  
**Data:** 11/08/2026  
**Status:** Aprovado para orientar a migração  
**Escopo:** Evolução do Front-end da V1 do RH Connect

---

## 1. Objetivo

Este documento define como o Front-end do RH Connect deve evoluir do estado atual — ainda fortemente baseado no protótipo original do perfil Candidato — para uma aplicação estruturada, preparada para:

- Candidato;
- Avaliador;
- Administrador;
- rotas reais;
- autenticação;
- autorização;
- componentes reutilizáveis;
- evolução do Design System;
- integração futura com Backend e dados reais.

O objetivo principal é evitar duas situações:

1. recomeçar o projeto sem necessidade;
2. continuar expandindo indefinidamente uma estrutura puramente prototípica.

---

# 2. Situação atual

O repositório oficial já existe e deve continuar sendo a base principal de desenvolvimento.

A aplicação atual foi criada a partir de uma versão anterior do protótipo e está predominantemente focada na experiência do **Candidato**.

A versão mais recente do Figma Make já possui evolução funcional e visual e inclui também:

```text
Candidato
Avaliador
Administrador
```

Essa versão mais recente deve ser utilizada como **referência de evolução**, mas não deve substituir diretamente o código oficial.

---

# 3. Decisão principal

O Front-end será evoluído **incrementalmente sobre o repositório atual**.

Não será criada uma nova aplicação apenas para incorporar as visões de Avaliador e Administrador.

Não será utilizada a estratégia:

```text
exportar nova versão do Figma Make
↓
substituir todo o código atual
↓
continuar desenvolvimento
```

A estratégia correta será:

```text
Repositório atual
+
nova referência do Figma Make
+
documentação vigente
↓
análise comparativa
↓
migração controlada
↓
arquitetura evoluída
```

---

# 4. Fontes de verdade

Durante a evolução do Front-end, considerar:

| Assunto | Fonte principal |
|---|---|
| Código existente | Repositório oficial |
| Interface e fluxo visual | Figma / Figma Make |
| Regras de negócio | Documentação em `/docs` |
| Autenticação e perfis | `regras-de-autenticacao-e-acesso.md` |
| Decisões | Registros `DEC-*` |
| Identidade visual | Design System vigente |

Nenhuma fonte deve substituir automaticamente as demais.

---

# 5. Papel do Figma Make

O Figma Make será utilizado como:

- referência visual;
- referência de fluxo;
- referência de telas;
- ambiente de exploração;
- apoio à validação de UX;
- fonte para identificar componentes e estados necessários.

Não deve ser tratado automaticamente como arquitetura de produção.

---

## 5.1. O que pode ser reaproveitado do Figma Make

Pode ser reaproveitado, após análise:

- estrutura visual de telas;
- hierarquia de informação;
- organização de menus;
- composição dos dashboards;
- componentes visuais;
- textos;
- estados de interface;
- fluxos aprovados;
- padrões de interação úteis.

---

## 5.2. O que não deve ser copiado cegamente

Não transferir automaticamente:

- navegação simulada;
- `setScreen` como substituto de roteamento;
- mocks;
- hardcodes;
- dados artificiais;
- componentes excessivamente grandes;
- estruturas temporárias;
- lógica criada apenas para demonstração;
- duplicações de componentes;
- decisões que contrariem a documentação vigente.

---

# 6. Regra para o repositório oficial

O repositório atual deve permanecer como **base oficial do produto**.

Toda evolução relevante deve acontecer nele por:

```text
branch
↓
alteração controlada
↓
teste
↓
revisão
↓
merge
```

Quando o processo de Pull Request estiver sendo utilizado pela equipe, alterações estruturais importantes devem preferencialmente passar por revisão antes de chegar à branch principal.

---

# 7. Estratégia de migração

A evolução será dividida em fases.

---

## FASE 1 — Comparar antes de alterar

Antes de incorporar Avaliador e Administrador, realizar auditoria comparativa entre:

```text
A. repositório oficial
B. exportação atualizada do Figma Make
C. documentação vigente
```

O objetivo da auditoria é identificar:

- o que já existe;
- o que mudou;
- o que é novo;
- o que pode ser reutilizado;
- o que deve ser refatorado;
- o que não deve ser migrado;
- quais arquivos serão afetados;
- quais dependências existem.

### Regra

Nesta fase, o Codex deve **analisar primeiro e implementar depois**.

---

## FASE 2 — Preparar a arquitetura para três perfis

Antes de migrar todas as telas, o projeto deve ser preparado para reconhecer estruturalmente:

```text
candidate
evaluator
admin
```

Uma organização possível:

```text
apps/web/src/

├── app/
│   ├── router/
│   ├── providers/
│   └── ...
│
├── pages/
│   ├── public/
│   ├── auth/
│   ├── candidate/
│   ├── evaluator/
│   └── admin/
│
├── features/
├── components/
├── hooks/
├── services/
└── ...
```

A estrutura final poderá variar de acordo com a stack e com a análise técnica.

O importante é evitar manter todas as telas e comportamentos centralizados em um único arquivo monolítico.

---

# 8. Layouts por perfil

A aplicação deve evoluir para possuir layouts coerentes com cada ambiente.

Exemplo conceitual:

```text
App
│
├── PublicLayout
├── AuthLayout
├── CandidateLayout
├── EvaluatorLayout
└── AdminLayout
```

Os layouts podem compartilhar componentes.

Exemplos:

```text
AppShell
Sidebar
Header
PageContainer
Breadcrumb
UserMenu
Notifications
```

A existência de layouts distintos não significa duplicar toda a interface.

O objetivo é compartilhar o que for comum e especializar apenas o necessário.

---

# 9. Rotas reais

A navegação do produto deve evoluir de estados internos simulados para rotas reais.

Exemplo:

```text
/
 /login
 /cadastro
 /candidate/dashboard
 /candidate/interviews
 /evaluator/dashboard
 /evaluator/evaluations
 /admin/dashboard
 /admin/evaluators
```

A definição final de rotas poderá ser refinada durante a implementação.

---

## 9.1. Navegação simulada

Chamadas como:

```text
setScreen("dashboard")
```

podem continuar temporariamente durante a migração, desde que exista plano explícito para substituição.

Não devem continuar sendo a solução arquitetural definitiva.

---

# 10. Entrada de Avaliador e Administrador

Avaliador e Administrador não serão incorporados inicialmente por uma migração completa de todas as telas.

A entrada deve ocorrer em duas etapas.

---

## 10.1. Primeiro: estrutura mínima

Criar primeiro:

### Avaliador

- layout;
- sidebar;
- header;
- dashboard;
- rota principal.

### Administrador

- layout;
- sidebar;
- header;
- dashboard;
- rota principal.

### Candidato

Manter e adaptar o dashboard e layout existentes.

---

## 10.2. Depois: telas por fluxo

As demais páginas devem ser incorporadas conforme os fluxos reais forem implementados.

Exemplo:

```text
Fluxo de avaliação
↓
telas do Avaliador necessárias
+
telas do Candidato relacionadas
+
telas administrativas relacionadas
```

Isso reduz o risco de migrar dezenas de telas que ainda não possuem comportamento real.

---

# 11. Desenvolvimento vertical por fluxo

Após a base dos três perfis, evitar:

```text
terminar todo o Candidato
↓
terminar todo o Avaliador
↓
terminar todo o Admin
```

Priorizar:

```text
Fluxo completo
↓
todos os perfis envolvidos
↓
integração ponta a ponta
```

---

## 11.1. Exemplo — Autenticação

```text
Cadastro do Candidato
↓
Verificação
↓
Login
↓
Role
↓
Dashboard correspondente
```

Envolve:

- público;
- Candidato;
- Avaliador;
- Admin;
- Backend;
- sessão;
- autorização.

---

## 11.2. Exemplo — Entrevista

```text
Candidato inicia entrevista
↓
realiza
↓
envia
↓
sistema registra
↓
Admin acompanha / atribui
↓
Avaliador recebe
```

---

## 11.3. Exemplo — Avaliação

```text
Avaliador avalia
↓
salva rascunho
↓
conclui
↓
resultado é disponibilizado
↓
Candidato consulta feedback
```

---

# 12. Design System

O Design System deve evoluir junto com a implementação.

Não é necessário congelar todos os detalhes visuais antes do desenvolvimento.

---

## 12.1. Preservar

Preservar:

- identidade geral aprovada;
- hierarquia;
- estrutura principal;
- linguagem visual;
- reconhecimento do produto.

---

## 12.2. Refinar

Pode ser refinado:

- paleta;
- tonalidades;
- contraste;
- hover;
- focus;
- active;
- disabled;
- tipografia;
- spacing;
- radius;
- sombras;
- cards;
- tabelas;
- formulários;
- sidebar;
- header;
- responsividade.

---

## 12.3. Evolução prevista

```text
Design System v0.1
↓
implementação
↓
teste no produto real
↓
ajustes
↓
Design System v0.2
```

Mudanças de Design System não exigem criação de novo projeto.

---

# 13. Componentes compartilhados

Componentes devem ser reaproveitados quando houver estabilidade suficiente.

Exemplos:

```text
Button
Input
Select
Modal
Card
Badge
Table
Tabs
Toast
Sidebar
Header
EmptyState
LoadingState
ErrorState
```

Evitar criar três componentes diferentes para resolver exatamente o mesmo problema em cada perfil.

---

# 14. `packages/ui`

Caso o repositório utilize um package compartilhado de UI, componentes só devem migrar para ele quando estiverem suficientemente consolidados.

Não mover tudo prematuramente.

Processo recomendado:

```text
componente nasce na aplicação
↓
é utilizado e validado
↓
fica estável
↓
é generalizado
↓
pode ser movido para package compartilhado
```

---

# 15. Estado e dados

Durante a migração, distinguir claramente:

```text
estado de interface
```

de:

```text
dados reais da aplicação
```

Exemplos de estado de interface:

- modal aberto;
- tab ativa;
- sidebar recolhida;
- filtro temporário.

Exemplos de dados de domínio:

- usuário;
- entrevista;
- avaliação;
- vaga;
- pergunta;
- relatório.

Dados de domínio não devem permanecer indefinidamente hardcoded dentro de componentes.

---

# 16. Serviços e integração com Backend

À medida que o Backend entrar, a evolução deve seguir preferencialmente:

```text
UI
↓
hook / controller de interface
↓
service
↓
API
↓
Backend
↓
Banco
```

Evitar espalhar chamadas de API diretamente por toda a árvore de componentes.

A estrutura exata deve seguir as decisões técnicas da equipe.

---

# 17. Autenticação e autorização

O Front-end deve implementar as regras definidas em:

```text
docs/01-produto-e-escopo/
regras-de-autenticacao-e-acesso.md
```

e:

```text
docs/decisoes/
DEC-001-autenticacao-e-perfis.md
```

Conceitualmente:

```text
login
↓
sessão
↓
role
↓
rota permitida
↓
renderização do ambiente
```

---

## 17.1. Proteção visual não é suficiente

Não basta:

```text
if role != ADMIN:
    esconder menu admin
```

Também deve existir proteção real de acesso.

A interface deve refletir a autorização, mas não ser a única barreira.

---

# 18. Estados obrigatórios de interface

Cada funcionalidade real deve considerar, quando aplicável:

```text
loading
empty
success
error
disabled
unauthorized
not found
```

A versão de produção não deve considerar apenas o “caminho feliz” mostrado no protótipo.

---

# 19. Responsividade

A responsividade deve ser tratada como requisito da implementação.

Validar:

- desktop;
- notebook;
- tablet;
- celular.

Itens prioritários:

- sidebar;
- menus;
- tabelas;
- formulários;
- grids;
- dashboards;
- modais;
- cards;
- gráficos.

---

# 20. Acessibilidade

Durante a evolução, revisar:

- contraste;
- foco visível;
- navegação por teclado;
- labels;
- estados;
- semântica;
- feedback de erro;
- tamanho de área clicável.

Acessibilidade deve entrar junto da consolidação de componentes.

---

# 21. Papel do Codex

O Codex deve atuar como apoio à análise e implementação no repositório oficial.

---

## 21.1. Antes de alterações estruturais

Solicitar:

```text
1. leia a documentação
2. analise o código atual
3. compare com a referência
4. identifique riscos
5. proponha plano
6. liste arquivos afetados
7. não implemente ainda
```

---

## 21.2. Após aprovação do plano

Solicitar implementações pequenas e verificáveis.

Exemplo:

```text
Implementar a estrutura de rotas e layouts
para Candidate, Evaluator e Admin,
preservando o comportamento atual do Candidato
e sem migrar ainda todas as telas.
```

---

## 21.3. Evitar

Evitar comandos amplos como:

> “Transforme tudo em produção.”

> “Refaça o projeto inteiro.”

> “Copie tudo da nova exportação.”

Esses pedidos aumentam o risco de regressões e mudanças desnecessárias.

---

# 22. Estratégia de commits

Alterações devem ser agrupadas por propósito.

Exemplos:

```text
feat: add evaluator app layout
feat: add admin dashboard route
refactor: extract candidate layout
refactor: introduce app router
fix: protect admin routes
```

Evitar commits gigantes misturando:

- Design System;
- autenticação;
- dezenas de telas;
- refatoração;
- conteúdo.

---

# 23. Estratégia de branches

Enquanto a equipe evolui o projeto, utilizar branches por tarefa ou fluxo.

Exemplos:

```text
feature/auth
feature/evaluator-layout
feature/admin-dashboard
refactor/app-router
fix/candidate-navigation
```

A convenção final pode ser ajustada pela equipe.

---

# 24. Compatibilidade durante a migração

A migração deve buscar manter o projeto funcionando entre etapas.

Preferir:

```text
estado atual funcionando
↓
alteração incremental
↓
novo estado funcionando
```

Evitar deixar o repositório principal em estado parcialmente quebrado durante longos períodos.

---

# 25. Ordem recomendada de evolução

A sequência sugerida é:

```text
1. Regras documentadas
↓
2. Figma Make atualizado
↓
3. Baseline definido
↓
4. Auditoria Codex
↓
5. Estrutura de rotas
↓
6. Layouts Candidate / Evaluator / Admin
↓
7. Dashboards mínimos
↓
8. Autenticação
↓
9. Proteção por role
↓
10. Primeiro deploy integrado
↓
11. Refinamento de Design System
↓
12. Próximos fluxos
↓
13. Backend e dados reais
```

---

# 26. Critérios de aceite da evolução arquitetural inicial

A primeira evolução estrutural será considerada concluída quando:

- [ ] o repositório oficial continuar sendo a única base principal;
- [ ] a nova exportação do Figma Make tiver sido tratada como referência, não substituição;
- [ ] existir estrutura clara para Candidato;
- [ ] existir estrutura clara para Avaliador;
- [ ] existir estrutura clara para Administrador;
- [ ] os três possuírem rota de dashboard;
- [ ] layouts estiverem separados de forma coerente;
- [ ] componentes compartilhados não estiverem duplicados sem necessidade;
- [ ] navegação principal utilizar rotas reais;
- [ ] exista base para autenticação e autorização;
- [ ] o comportamento atual relevante do Candidato tenha sido preservado;
- [ ] o projeto continue executando e compilando;
- [ ] alterações estejam documentadas.

---

# 27. Fora do escopo desta primeira migração

Não é necessário concluir simultaneamente:

- todas as páginas do Avaliador;
- todas as páginas do Admin;
- todos os fluxos do Candidato;
- Backend completo;
- banco de dados completo;
- Design System final;
- gamificação completa;
- Árvore de Talentos completa;
- recursos futuros de IA.

Esses itens devem entrar conforme prioridade e dependências.

---

# 28. Riscos principais

## 28.1. Copiar integralmente a nova exportação

**Risco:** perder organização já construída e trazer novamente arquitetura de protótipo.

**Mitigação:** auditoria e migração seletiva.

---

## 28.2. Continuar expandindo o monólito atual

**Risco:** dificuldade crescente de manutenção.

**Mitigação:** introduzir rotas, layouts, pages e features gradualmente.

---

## 28.3. Migrar todas as telas antes dos fluxos

**Risco:** grande volume de UI sem comportamento real.

**Mitigação:** desenvolvimento vertical.

---

## 28.4. Refatorar tudo ao mesmo tempo

**Risco:** regressões difíceis de identificar.

**Mitigação:** mudanças pequenas e commits por propósito.

---

## 28.5. Criar três aplicações independentes

**Risco:** duplicação de componentes e manutenção.

**Mitigação:** um único Front-end com ambientes por perfil.

---

# 29. Resultado esperado

Ao final desta estratégia, o Front-end deverá evoluir de:

```text
protótipo predominantemente Candidato
+
navegação simulada
+
dados mockados
```

para:

```text
RH Connect
│
├── ambiente público
├── autenticação
├── Candidato
├── Avaliador
└── Administrador
     │
     ├── rotas reais
     ├── autorização
     ├── componentes reutilizáveis
     ├── Design System consistente
     └── integração progressiva com Backend
```

Sem abandonar desnecessariamente o trabalho já realizado.

---

# 30. Próximo passo após este documento

Depois da aprovação desta estratégia:

```text
1. Criar DEC-002 — Migração do Figma Make
↓
2. Atualizar o Figma Make conforme as regras aprovadas
↓
3. Definir baseline
↓
4. Exportar referência
↓
5. Solicitar auditoria comparativa ao Codex
```

---

**Fim do documento.**
