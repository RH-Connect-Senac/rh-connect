# Patterns/Layout v1 — RH Connect

**Status:** Oficial para referência de implementação  
**Versão:** 1.0  
**Data de consolidação:** 01/09/2026  
**Escopo:** Patterns e layouts reutilizáveis do Design System do RH Connect  
**Fontes base:** Design System Foundations v1, Components v1, Mapa de Telas do Front-end, Plano de Migração do App.tsx, atualização de escopo da entrevista multimodal e decisões recentes do projeto.
> **Importante:** Este documento é um contrato-alvo do Design System. A aplicação no Front-end atual deve seguir o plano de migração gradual, sem substituição em massa de componentes antes da entrega testável.

---

## 1. Objetivo

Este documento define os principais **patterns de layout** do RH Connect.

Enquanto o documento **Components v1** define peças básicas reutilizáveis, como Button, Input, Card, Dialog, Tabs, Badge e Avatar, este documento define **como essas peças devem ser combinadas para montar telas reais**.

O objetivo é orientar a equipe e o Codex durante a organização do Front-end, preservando a identidade visual aprovada, evitando redesign acidental e preparando a aplicação para rotas reais, responsividade, integração futura com API e evolução por fluxos.

---

## 2. Relação com os documentos anteriores

Este documento deve ser lido junto com:

- `docs/design-system/design-system-foundations-v1.md`;
- `docs/design-system/components-v1.md`;
- `docs/01-produto-e-escopo/atualizacao-escopo-entrevista-10-09.md`;
- `docs/front-end/mapa-de-telas-front-end.md`;
- `docs/front-end/plano-de-migracao-app-tsx.md`;
- `docs/front-end/mocks-e-dados-temporarios.md`;
- `docs/05-decisoes/DEC-001-autenticacao-e-perfis.md`.

O documento de Foundations define os tokens visuais.  
O documento de Components define os componentes básicos.  
Este documento define os padrões de composição de páginas e fluxos.

---

## 3. O que este documento define

Este documento define padrões para:

- estrutura geral de página;
- layouts públicos, autenticação e áreas autenticadas;
- Sidebar e Header/Topbar;
- PageHeader;
- Dashboard layout;
- Form layout;
- List/Table layout;
- Filter pattern;
- EmptyState;
- LoadingState;
- ErrorState;
- estados de permissão/acesso;
- layout do fluxo de entrevista multimodal;
- layout de avaliação humana;
- layout de relatório;
- layout de desenvolvimento/gamificação;
- responsividade geral;
- aplicação segura durante refatorações.

---

## 4. O que este documento não define

Este documento não define:

- implementação final dos componentes em React;
- regras de API;
- contrato do Back-end;
- modelagem de banco;
- regras finais de gamificação;
- lógica completa da Árvore de Talentos;
- animação do Nilo;
- telas pixel-perfect;
- identidade visual nova;
- dark mode;
- critérios finais de avaliação;
- cálculo final de nota;
- IA avaliadora;
- IA entrevistadora adaptativa real.

Esses assuntos pertencem a documentos de produto, arquitetura, Product Components ou decisões futuras.

---

## 5. Princípios gerais de layout

1. **Preservar o visual aprovado.**  
   Nenhum pattern deve redesenhar a aplicação sem decisão explícita.

2. **Usar Components v1 como base.**  
   Patterns devem compor Button, Card, Input, Badge, StatusBadge, Dialog, Tabs, Avatar e demais componentes aprovados.

3. **Separar layout de regra de negócio.**  
   O layout pode indicar onde aparece um status, mas não deve definir sozinho a regra que produz esse status.

4. **Evitar big bang refactor.**  
   A aplicação deve sair do protótipo para uma estrutura real de forma gradual.

5. **Responsividade desde o início.**  
   Todo pattern deve prever desktop, tablet e mobile.

6. **Estados reais antes de métricas falsas.**  
   EmptyState real é melhor do que dashboard com número inventado.

7. **Não esconder protótipo como funcionalidade real.**  
   Quando algo ainda for simulado, deve ser tratado com cuidado para não parecer integração real.

8. **Fluxos completos valem mais do que telas isoladas.**  
   O produto deve evoluir por jornadas testáveis, não por telas bonitas desconectadas.

---

# Parte I — Layouts estruturais

---

## 6. App Shell autenticado

### 6.1 Objetivo

O App Shell é a estrutura base usada nas áreas autenticadas do RH Connect.

Ele organiza:

- Sidebar;
- Header/Topbar;
- área principal de conteúdo;
- espaço para feedbacks globais;
- comportamento responsivo;
- navegação por perfil.

### 6.2 Aplicação

O App Shell será usado para:

- área do Candidato;
- área do Avaliador;
- área do Administrador.

Cada perfil poderá ter navegação e conteúdo próprios, mas deve compartilhar a mesma lógica estrutural sempre que possível.

### 6.3 Estrutura recomendada

```text
AppShell
├── Sidebar
├── MainArea
│   ├── Header / Topbar
│   └── PageContent
└── ToastProvider / GlobalFeedback
```

### 6.4 Regras

- A Sidebar não deve ser duplicada manualmente em cada tela.
- Header/Topbar não deve ser recriado por perfil sem necessidade.
- O conteúdo da página deve respeitar o espaçamento macro definido em Foundations.
- Toasts devem usar o wrapper do Design System.
- A estrutura deve permitir proteção de rotas por perfil no futuro.
- Guards do Front-end são apoio de UX; autorização real pertence ao Back-end.

---

## 7. PublicLayout

### 7.1 Objetivo

O PublicLayout organiza páginas públicas, acessíveis sem autenticação.

### 7.2 Telas previstas

- Landing page;
- Como funciona;
- Sobre o projeto;
- Termos de uso;
- Política de privacidade.

### 7.3 Estrutura recomendada

```text
PublicLayout
├── PublicHeader
├── PublicMain
└── PublicFooter
```

### 7.4 Regras

- Deve apresentar a marca RH Connect com asset oficial quando disponível.
- Deve manter chamadas para login/cadastro.
- Deve funcionar em desktop, tablet e mobile.
- Não deve exibir informações privadas ou dados mockados de usuário.
- Usuário já autenticado pode ser redirecionado ao dashboard correspondente.

---

## 8. AuthLayout

### 8.1 Objetivo

O AuthLayout organiza telas de entrada, cadastro e ativação.

### 8.2 Telas previstas

- Login;
- Cadastro de candidato;
- Ativação de avaliador;
- Verificação de e-mail, se entrar no fluxo;
- Recuperação/redefinição de senha, quando implementada.

### 8.3 Estrutura recomendada

```text
AuthLayout
├── BrandPanel / IntroPanel
└── AuthCard
    ├── Title
    ├── Description
    ├── Form
    └── AuxiliaryLinks
```

### 8.4 Regras

- Login é único para Candidato, Avaliador e Admin.
- O usuário não escolhe a role no login.
- Candidato possui cadastro público.
- Avaliador não possui cadastro público; entra por convite/ativação.
- Admin não possui cadastro público; acesso é provisionado.
- Mensagens de erro não devem revelar se determinado e-mail existe.
- Formulários devem usar FormField quando houver label, erro, hint ou validação.
- PasswordInput deve ser usado para campos de senha.

---

## 9. CandidateLayout

### 9.1 Objetivo

CandidateLayout organiza a área autenticada do Candidato.

### 9.2 Telas previstas

- Dashboard do candidato;
- Perfil;
- Vagas/contexto de entrevista;
- Entrevista;
- Histórico;
- Resultado/relatório;
- Desenvolvimento/Gamificação/Árvore/Nilo.

### 9.3 Regras

- Deve destacar a próxima ação do candidato.
- Deve facilitar retomada de entrevista ou consulta de resultado.
- Deve evitar sobrecarregar o usuário com métricas falsas.
- Deve permitir presença pontual do Nilo estático sem bloquear uso.
- Nilo não deve aparecer sobre vídeo ou em momentos que exijam concentração.
- A área de desenvolvimento deve indicar progresso/gamificação sem sugerir ranking ou comparação entre candidatos.

---

## 10. EvaluatorLayout

### 10.1 Objetivo

EvaluatorLayout organiza a área autenticada do Avaliador.

### 10.2 Telas previstas

- Dashboard do avaliador;
- Fila de avaliações;
- Avaliação em andamento;
- Tela de avaliação;
- Revisão;
- Avaliação concluída;
- Histórico, se viável;
- Guia de critérios, se viável.

### 10.3 Regras

- Deve priorizar fila, status e ações de avaliação.
- Deve deixar claro o que está pendente, em andamento ou concluído.
- Deve evitar que observações internas sejam confundidas com feedback ao candidato.
- Deve suportar avaliação de entrevista multimodal.
- Deve apresentar a mídia ou resposta do candidato conforme a modalidade da tentativa.

---

## 11. AdminLayout

### 11.1 Objetivo

AdminLayout organiza a área autenticada do Administrador.

### 11.2 Telas previstas

- Dashboard administrativo;
- Gestão de avaliadores;
- Entrevistas;
- Atribuições;
- Critérios/perguntas, se necessário;
- Gestão de candidatos, se viável;
- Configurações avançadas, futuramente.

### 11.3 Regras

- Deve priorizar operação mínima do fluxo principal.
- Não deve expor criação pública de Admin.
- Não deve sugerir SUPER_ADMIN na V1.
- Ações críticas devem usar AlertDialog quando houver risco ou irreversibilidade.
- Métricas devem ser reais ou representadas como estado vazio/indisponível.

---

# Parte II — Patterns de página

---

## 12. PageContent

### 12.1 Objetivo

PageContent define o container principal de uma página interna.

### 12.2 Regras visuais

- Usar `color-surface-page` como fundo geral quando aplicável.
- Usar espaçamento de página responsivo:
  - mobile: 16px;
  - tablet: 24px;
  - desktop: 32px.
- Evitar conteúdo encostado nas bordas.
- Evitar largura de texto excessiva em páginas de leitura.
- Permitir grids e cards responsivos.

### 12.3 Estrutura recomendada

```text
PageContent
├── PageHeader
├── PageBody
└── OptionalPageFooter / StickyActions
```

---

## 13. PageHeader

### 13.1 Objetivo

PageHeader apresenta contexto, título e ações principais da página.

### 13.2 Elementos possíveis

- Breadcrumb, futuramente;
- título;
- descrição curta;
- metadata;
- StatusBadge;
- ação principal;
- ação secundária;
- filtros ou tabs quando forem parte da navegação da página.

### 13.3 Estrutura recomendada

```text
PageHeader
├── TitleBlock
│   ├── Eyebrow / Metadata opcional
│   ├── Title
│   └── Description
└── HeaderActions
```

### 13.4 Regras

- Cada página deve ter um título claro.
- A ação principal deve usar Button `primary`.
- Ações secundárias devem usar `secondary`, `outline` ou TextLink conforme o caso.
- Não usar mais de uma ação primária competindo no mesmo PageHeader.
- Status da página deve usar StatusBadge, não Badge comum.

---

## 14. SectionHeader

### 14.1 Objetivo

SectionHeader separa blocos internos dentro de uma página.

### 14.2 Aplicação

- seções de dashboard;
- grupos de formulário;
- blocos de relatório;
- listas;
- área de filtros;
- seções da página de desenvolvimento.

### 14.3 Regras

- Deve ser menor que PageHeader.
- Pode conter ação contextual pequena.
- Não deve competir com o título principal da página.
- Usar tipografia de título de surface quando estiver dentro de Card.

---

## 15. DashboardLayout

### 15.1 Objetivo

DashboardLayout organiza visões iniciais por perfil.

### 15.2 Estrutura recomendada

```text
DashboardLayout
├── PageHeader
├── PrimaryActionCard / NextAction
├── MetricsGrid
├── MainContentGrid
└── SecondarySections
```

### 15.3 Regras

- Dashboard deve priorizar próxima ação, status real e atalhos úteis.
- Não preencher cards com números inventados.
- Quando não houver dados, usar EmptyState real.
- Métricas devem ser derivadas de dados reais ou ficar ocultas/indisponíveis.
- Cards de dashboard devem usar Card padrão com border + shadow-rest.
- Cards clicáveis devem usar InteractiveCard ou Link/Button semântico.

### 15.4 Candidato

O dashboard do candidato deve destacar:

- completar perfil;
- iniciar ou continuar entrevista;
- status de avaliação;
- resultado disponível;
- progresso/gamificação quando aplicável;
- atalho para desenvolvimento.

### 15.5 Avaliador

O dashboard do avaliador deve destacar:

- avaliações pendentes;
- avaliações em andamento;
- prazos/ordem de prioridade quando existir;
- acesso rápido à fila;
- guia de critérios, se disponível.

### 15.6 Admin

O dashboard administrativo deve destacar:

- entrevistas recebidas;
- avaliações pendentes;
- avaliadores ativos;
- atribuições;
- problemas operacionais;
- atalhos para gestão mínima.

---

## 16. MetricsGrid

### 16.1 Objetivo

MetricsGrid organiza cards de indicadores.

### 16.2 Regras

- Cada métrica deve ter fonte real ou ser omitida.
- Metadata deve usar no mínimo 12px.
- Usar StatusBadge para estado, não apenas cor.
- Não usar métricas como decoração.
- Em mobile, grid deve virar uma coluna ou duas colunas conforme espaço.

### 16.3 Estrutura recomendada

```text
MetricsGrid
├── MetricCard
├── MetricCard
└── MetricCard
```

### 16.4 Observação

MetricCard pode ser tratado como Product Component ou Data Display posteriormente. Neste documento, o foco é o pattern de organização.

---

## 17. FormLayout

### 17.1 Objetivo

FormLayout define como organizar formulários.

### 17.2 Aplicação

- login;
- cadastro;
- ativação de avaliador;
- perfil candidato;
- vaga/contexto;
- avaliação humana;
- criação/edição de perguntas;
- filtros avançados.

### 17.3 Estrutura recomendada

```text
FormLayout
├── FormSection
│   ├── SectionHeader
│   └── FieldGrid
├── FormSection
└── FormActions
```

### 17.4 Regras

- Usar FormField para campos com label, erro, hint ou validação.
- Campos principais devem usar Input, Select, NativeSelect, Textarea ou composições aprovadas.
- Labels usam padrão aprovado em Components v1.
- FormActions deve deixar clara a ação principal e a ação de cancelamento/voltar.
- Ação destrutiva deve usar Button `destructive` e, se crítica, AlertDialog.
- Em mobile, formulários devem priorizar uma coluna.
- Em desktop, formulários podem usar duas colunas quando os campos forem relacionados.
- Não criar formulários densos demais para fluxos sensíveis, como entrevista e avaliação.

---

## 18. FieldGrid

### 18.1 Objetivo

FieldGrid organiza campos dentro de uma seção de formulário.

### 18.2 Regras

- Uma coluna em mobile.
- Duas colunas em tablet/desktop quando fizer sentido.
- Campos longos podem ocupar largura total.
- Campos obrigatórios devem ser indicados de forma textual/visual acessível.
- Erros devem aparecer próximos ao campo correspondente.

### 18.3 Exemplos de campos em largura total

- resumo profissional;
- feedback do avaliador;
- descrição da vaga;
- observações;
- justificativa de ação crítica.

---

## 19. FormActions

### 19.1 Objetivo

FormActions organiza botões ao final de formulários ou etapas.

### 19.2 Regras

- Ação principal à direita em desktop quando fizer sentido.
- Em mobile, ações podem ocupar largura total.
- Evitar múltiplos botões `primary` no mesmo grupo.
- Usar loading com largura preservada em ações assíncronas.
- Cancelar/voltar deve ser visualmente menos forte que salvar/enviar/concluir.
- Ações fixas/sticky só devem ser usadas se o formulário for longo.

---

## 20. ListLayout

### 20.1 Objetivo

ListLayout organiza listas de dados.

### 20.2 Aplicação

- Minhas vagas;
- histórico de entrevistas;
- fila de avaliações;
- gestão de avaliadores;
- gestão de entrevistas;
- banco de perguntas;
- lista de relatórios.

### 20.3 Estrutura recomendada

```text
ListLayout
├── PageHeader
├── ListToolbar
│   ├── SearchInput
│   ├── Filters
│   └── ViewActions
├── ListContent
└── Pagination / LoadMore
```

### 20.4 Regras

- Listas devem ter estado vazio real.
- Busca deve usar SearchInput.
- Filtros devem usar Filter Pattern.
- Status devem usar StatusBadge.
- Ações por item devem usar Button, IconButton, DropdownMenu ou TextLink conforme semântica.
- Em mobile, lista pode virar cards.
- Em desktop, lista pode ser tabela ou card grid conforme densidade.

---

## 21. TablePattern

### 21.1 Objetivo

TablePattern organiza dados tabulares quando comparação por linha/coluna for importante.

### 21.2 Aplicação

- fila de avaliações;
- gestão de entrevistas;
- gestão de avaliadores;
- banco de perguntas;
- relatórios administrativos.

### 21.3 Regras

- Usar tabela quando houver necessidade real de comparação.
- Em mobile, prever `overflow-x-auto` ou versão em cards.
- Não forçar tabela para conteúdo que funciona melhor como card.
- Linhas com ações devem ter área clicável clara.
- Status deve ser textual/StatusBadge, não apenas cor.
- Paginação visual deve seguir Components v1, mas lógica de dados pertence à API/pattern de lista.

### 21.4 Observação

DataTable completa não faz parte do Components v1 básico. Pode virar pattern avançado ou Product Component técnico posteriormente.

---

## 22. CardGrid

### 22.1 Objetivo

CardGrid organiza cards responsivos.

### 22.2 Aplicação

- dashboards;
- cards de vaga;
- cards de entrevista;
- cards de missão;
- cards de conquista;
- cards de relatório;
- atalhos administrativos.

### 22.3 Regras

- Usar Card base para surfaces estáticas.
- Usar InteractiveCard apenas quando o card inteiro for clicável.
- Usar SelectableCard quando houver escolha entre opções.
- Não usar `div onClick` sem semântica.
- Em mobile, priorizar uma coluna.
- Em desktop, usar grid conforme densidade do conteúdo.

---

## 23. FilterPattern

### 23.1 Objetivo

FilterPattern organiza busca, filtros e filtros aplicados.

### 23.2 Estrutura recomendada

```text
FilterPattern
├── SearchInput
├── FilterControls
├── AppliedFilters
└── ClearFiltersAction
```

### 23.3 Regras

- SearchInput para busca textual.
- FilterChip `selectable` para opções rápidas.
- FilterChip `applied/removable` para filtros já aplicados.
- Badges comuns não devem virar filtro clicável.
- Filtros avançados podem abrir Popover, Dialog ou Sheet conforme complexidade.
- Em mobile, filtros podem ir para Sheet inferior/lateral.

---

## 24. TabsPattern

### 24.1 Objetivo

TabsPattern separa seções relacionadas dentro do mesmo contexto.

### 24.2 Regras

- Visual padrão: underline.
- Tabs não devem ser usadas como filtro genérico.
- Estado pode ser local, rota ou query, dependendo do contexto.
- Tabs importantes e compartilháveis podem usar rota/query.
- Tabs simples internas podem usar estado local.

### 24.3 Aplicação

- Histórico: pendentes/concluídas;
- Avaliações: fila/em andamento/histórico;
- Perfil: dados pessoais/profissionais;
- Relatório: resumo/critérios/recomendações, se necessário.

---

## 25. EmptyState

### 25.1 Objetivo

EmptyState orienta o usuário quando não há dados reais disponíveis.

### 25.2 Estrutura recomendada

```text
EmptyState
├── Icon / Illustration opcional
├── Title
├── Description
└── Action opcional
```

### 25.3 Regras

- EmptyState deve explicar o estado real.
- Deve indicar próxima ação quando houver.
- Não deve mascarar falha de carregamento.
- Não deve substituir erro técnico.
- Não deve usar tom alarmista.
- Pode ter Nilo somente quando fizer sentido e sem bloquear a interface.

### 25.4 Exemplos

```text
Nenhuma entrevista enviada até o momento.
Complete seu perfil e inicie uma nova entrevista quando estiver pronto.
```

```text
Nenhuma avaliação pendente.
Quando novas entrevistas forem atribuídas a você, elas aparecerão aqui.
```

```text
Nenhum relatório disponível.
O relatório será liberado depois que a avaliação humana for concluída.
```

---

## 26. LoadingState

### 26.1 Objetivo

LoadingState comunica carregamento ou processamento.

### 26.2 Regras

- Usar Spinner para processamento compacto.
- Usar Skeleton para carregamento de conteúdo estrutural.
- Button em loading deve preservar largura.
- Skeleton deve usar pulse e respeitar redução de movimento.
- Não manter loading infinito sem alternativa de erro ou retry.

### 26.3 Aplicação

- login;
- cadastro;
- envio de entrevista;
- carregamento de dashboard;
- fila de avaliação;
- relatório;
- listas e tabelas.

---

## 27. ErrorState

### 27.1 Objetivo

ErrorState comunica falha e orienta recuperação.

### 27.2 Estrutura recomendada

```text
ErrorState
├── Title
├── Description
├── ErrorDetails opcional
└── Action / Retry
```

### 27.3 Regras

- Usar linguagem clara e não técnica quando voltado ao usuário final.
- Não expor stack trace ou detalhes sensíveis.
- Oferecer ação de tentar novamente quando possível.
- Diferenciar erro de permissão, erro de conexão e erro inesperado.
- Erros críticos podem usar Alert ou página dedicada.

---

## 28. PermissionState / AccessDenied

### 28.1 Objetivo

PermissionState comunica acesso negado ou role inadequada.

### 28.2 Regras

- Não revelar dados de área proibida.
- Explicar de forma simples que o usuário não possui acesso.
- Oferecer retorno ao dashboard correto.
- Não confiar apenas em ocultação de menu; autorização real deve estar no Back-end.

---

# Parte III — Patterns por fluxo

---

## 29. AuthFlowPattern

### 29.1 Objetivo

Organizar o fluxo de autenticação e entrada por perfil.

### 29.2 Fluxos previstos

```text
Candidato
Cadastro público
↓
Login
↓
Onboarding
↓
Dashboard do candidato
```

```text
Avaliador
Convite administrativo
↓
Ativação / definição de senha
↓
Login
↓
Onboarding operacional
↓
Dashboard do avaliador
```

```text
Admin
Provisionamento técnico/controlado
↓
Login
↓
Introdução operacional curta, se houver
↓
Dashboard administrativo
```

### 29.3 Regras

- Login único para os três perfis.
- Role vem da conta, não da escolha do usuário.
- Redirecionamento por role após autenticação.
- Onboarding acontece após autenticação.
- Recuperação de senha não deve revelar tipo de conta.

---

## 30. InterviewFlowPattern — Entrevista multimodal

### 30.1 Objetivo

Organizar o layout do fluxo de entrevista considerando a visão atual de **entrevista multimodal**.

A tentativa de entrevista pode ser de:

- Texto;
- Áudio;
- Vídeo.

O candidato deve escolher a modalidade antes de iniciar a tentativa, e a tentativa deve manter a mesma modalidade até o final.

### 30.2 Estrutura conceitual

```text
Contexto de treinamento / vaga específica
↓
Configuração da entrevista
↓
Modalidade
Texto | Áudio | Vídeo
↓
Nível, se aprovado
Básico | Intermediário | Avançado
↓
Modo, se aprovado
Prática | Simulação
↓
Orientações
↓
Consentimento e/ou preparação técnica
↓
Entrevista
↓
Revisão
↓
Envio
↓
Aguardando avaliação
```

### 30.3 Recorte para 10/09

Para a entrega testável, o layout deve estar preparado para a entrevista multimodal, mas a implementação pode priorizar o fluxo funcional mais seguro.

Regras para o recorte:

- prever seleção de modalidade;
- manter uma modalidade única por tentativa;
- não misturar texto, áudio e vídeo dentro da mesma tentativa;
- priorizar vídeo se continuar sendo a modalidade principal da entrega;
- não bloquear evolução futura para áudio e texto;
- não implementar IA adaptativa real como obrigação da entrega;
- não depender de cronômetro sofisticado para validar o fluxo.

### 30.4 Layout da etapa de configuração

```text
InterviewSetupPage
├── PageHeader
├── ContextCard / JobContext
├── ModalitySelector
├── LevelSelector opcional
├── ModeSelector opcional
└── FormActions
```

### 30.5 ModalitySelector

ModalitySelector deve funcionar como escolha clara entre Texto, Áudio e Vídeo.

Regras:

- usar SelectableCard ou RadioGroup conforme layout final;
- deixar claro o impacto da escolha;
- mostrar requisitos técnicos quando necessário;
- vídeo exige câmera e microfone;
- áudio exige microfone;
- texto exige campo de resposta;
- a escolha deve ser feita antes do início.

### 30.6 Layout da entrevista por vídeo

```text
VideoInterviewPage
├── QuestionPanel
├── VideoRecorderArea
├── Progress / CurrentQuestion
├── TechnicalStatus
└── InterviewActions
```

Regras:

- Nilo não deve aparecer sobre a gravação.
- O conteúdo deve evitar distrações.
- A área de vídeo deve ter prioridade visual.
- Estados de permissão de câmera/microfone devem ser claros.
- Envio não deve parecer concluído antes de confirmação real do servidor.

### 30.7 Layout da entrevista por áudio

```text
AudioInterviewPage
├── QuestionPanel
├── AudioRecorderArea
├── Progress / CurrentQuestion
├── TechnicalStatus
└── InterviewActions
```

Regras:

- Exibir estado de gravação de áudio.
- Evitar animações falsas que pareçam captura real se não houver gravação real.
- Permitir revisão antes do envio quando aplicável.
- Deixar claro se o áudio foi salvo/enviado.

### 30.8 Layout da entrevista por texto

```text
TextInterviewPage
├── QuestionPanel
├── AnswerTextarea
├── Progress / CurrentQuestion
└── InterviewActions
```

Regras:

- Textarea deve ter label, hint e estado de erro quando necessário.
- Pode haver limite de caracteres se aprovado.
- Não usar critérios de vídeo para avaliar texto.
- Envio deve gerar resposta vinculada à pergunta/tentativa.

### 30.9 Revisão e envio

```text
InterviewReviewPage
├── PageHeader
├── ResponsePreview
├── AttemptSummary
├── ConsentSummary opcional
└── FormActions
```

Regras:

- Mostrar o que será enviado.
- Permitir voltar quando seguro.
- Confirmar envio apenas se o registro real acontecer.
- Falha de upload/envio deve gerar ErrorState recuperável.

---

## 31. EvaluationFlowPattern — Avaliação humana

### 31.1 Objetivo

Organizar a avaliação humana realizada pelo Avaliador.

### 31.2 Estrutura recomendada

```text
EvaluationPage
├── PageHeader
├── CandidateContextSummary
├── ResponseViewer
├── EvaluationCriteriaForm
├── InternalNotes opcional
└── EvaluationActions
```

### 31.3 Regras

- Avaliador deve ver apenas entrevistas atribuídas.
- A modalidade da tentativa deve ser clara.
- ResponseViewer deve se adaptar a Texto, Áudio ou Vídeo.
- Critérios devem respeitar a modalidade.
- Critérios não aplicáveis devem ser ocultos ou marcados como N/A, se essa regra for aprovada.
- Observações internas não devem ser confundidas com feedback ao candidato.
- Concluir avaliação deve usar confirmação se a ação for sensível.

### 31.4 ResponseViewer por modalidade

```text
Vídeo → player de vídeo autorizado
Áudio → player de áudio autorizado
Texto → resposta textual formatada para leitura
```

### 31.5 EvaluationActions

Ações possíveis:

- salvar rascunho;
- revisar;
- concluir avaliação;
- cancelar/voltar.

Regras:

- “Concluir avaliação” deve ser ação clara e, se necessário, confirmada por AlertDialog.
- Feedback destinado ao candidato deve estar separado de observações internas.

---

## 32. ReportPattern — Resultado e relatório

### 32.1 Objetivo

Organizar o relatório visível ao candidato após avaliação concluída.

### 32.2 Estrutura recomendada

```text
ReportPage
├── PageHeader
├── ResultSummaryCard
├── CriteriaBreakdown
├── FeedbackSection
├── StrengthsAndImprovements
└── NextAction / DevelopmentLink
```

### 32.3 Regras

- Relatório só deve aparecer após avaliação concluída.
- Não apresentar nota antes da avaliação.
- Não comparar candidato com outros usuários.
- Não prometer contratação.
- Critérios devem fazer sentido para a modalidade avaliada.
- Feedback deve ser educativo, respeitoso e acionável.
- Pode conectar com gamificação/progresso sem alterar nota.

---

## 33. DevelopmentPattern — Gamificação, Nilo e Árvore

### 33.1 Objetivo

Organizar a área de desenvolvimento do candidato.

### 33.2 Estrutura recomendada

```text
DevelopmentPage
├── PageHeader
├── NiloGuideCard opcional
├── ProgressSummary
├── CurrentMission
├── TalentTreeArea
└── RecentAchievements / NextActions
```

### 33.3 Regras

- Gamificação deve representar evolução individual.
- Não deve haver ranking entre candidatos.
- XP/progresso não deve alterar nota de entrevista.
- A Árvore de Talentos deve representar evolução dentro da jornada, não senioridade profissional real.
- O funcionamento detalhado da árvore e gatilhos de progresso ainda deve ser definido em documento próprio.
- Nilo deve orientar, não avaliar.
- Nilo não deve bloquear campos, vídeo ou informações importantes.
- Centro de Desenvolvimento não deve ser tratado como obrigatório se estiver fora do recorte atual.

### 33.4 TalentTreeArea

Para 10/09, pode usar estados visuais planejados ou frames simulando evolução, desde que não prometa dinâmica real inexistente.

Regras:

- mostrar evolução de forma clara;
- não poluir visualmente;
- não repetir gatilhos sem sentido;
- não afirmar conexão com eventos gerais do sistema sem regra definida;
- tratar a árvore como parte da gamificação/evolução do candidato.

---

## 34. JobContextPattern — Vaga/contexto de treinamento

### 34.1 Objetivo

Organizar o contexto usado para iniciar a entrevista.

### 34.2 Direção atual

A direção mais segura para o recorte atual é manter o fluxo baseado em **vaga específica escolhida ou cadastrada pelo candidato**, com evolução futura para sugestões por área/subárea quando validado.

### 34.3 Estrutura recomendada

```text
JobContextPage
├── PageHeader
├── Search / API Jobs opcional
├── JobList / JobCardGrid
├── ManualJobForm opcional
└── ContinueAction
```

### 34.4 Regras

- Não remover oficialmente o fluxo de vaga específica no recorte atual.
- API de busca de vagas entra como parte planejada do recorte.
- Sugestão por área/subárea pode ser evolução futura ou validação com cliente.
- O layout não deve amarrar tudo de forma rígida a uma decisão futura ainda instável.

---

# Parte IV — Responsividade

---

## 35. Regras gerais de responsividade

### 35.1 Mobile

- Priorizar uma coluna.
- Ações principais podem ocupar largura total.
- Sidebar deve ser recolhida, ocultada ou virar menu/sheet conforme implementação.
- Tabelas devem ter alternativa com scroll horizontal ou cards.
- Modais devem respeitar largura da tela.
- Filtros complexos podem ir para Sheet.

### 35.2 Tablet

- Permitir duas colunas quando houver espaço.
- Manter navegação utilizável.
- Evitar grids densos demais.
- Testar cards de dashboard e formulários.

### 35.3 Desktop

- Usar sidebar + header + conteúdo principal.
- Permitir grids mais amplos.
- Evitar linhas de texto muito largas.
- Manter ações próximas ao contexto.

---

## 36. Sidebar responsiva

### 36.1 Regras

- Em desktop, Sidebar pode ficar fixa ou colapsável.
- Em notebook, deve evitar ocupar espaço excessivo.
- Em mobile, pode virar menu/sheet.
- Sidebar usa `color-surface-inverse`.
- Itens ativos e hover usam tokens específicos de Sidebar.
- Sidebar não é Sheet, embora Sheet possa ser usado para navegação mobile.

---

## 37. Header/Topbar responsivo

### 37.1 Regras

- Deve conter título/contexto quando necessário.
- Pode conter avatar/menu de usuário.
- Pode conter notificações se forem reais ou claramente planejadas.
- Evitar excesso de ações no mobile.
- Dropdowns e popovers devem respeitar contratos de Overlays.

---

# Parte V — Aplicação na migração do Front-end

---

## 38. Ordem recomendada de aplicação

A aplicação destes patterns deve ser gradual.

Ordem recomendada:

```text
1. Preservar visual atual
2. Mapear telas e mocks
3. Separar mocks
4. Separar telas prioritárias
5. Criar layouts por perfil
6. Criar rotas reais
7. Aplicar patterns aos poucos
8. Integrar API por contrato
9. Revisar responsividade
10. Revisar estados reais
```

---

## 39. O que pode ser feito agora

- Usar este documento para orientar separação de páginas.
- Definir layout base por perfil.
- Padronizar PageHeader, DashboardLayout, FormLayout e ListLayout.
- Corrigir responsividade crítica com base nos patterns.
- Substituir telas vazias falsas por EmptyState real.
- Preparar entrevista multimodal no layout sem implementar toda a lógica avançada.

---

## 40. O que não deve ser feito agora

- Refatorar o App.tsx inteiro de uma vez.
- Aplicar todos os patterns em uma única branch.
- Redesenhar todas as telas.
- Transformar patterns em Product Components sem necessidade.
- Implementar auth real sem contrato mínimo.
- Simular envio real de entrevista sem integração.
- Criar gamificação dinâmica sem regra definida.
- Criar árvore conectada a eventos gerais sem decisão.
- Implementar IA entrevistadora/adaptativa como obrigação do recorte atual.

---

## 41. Critérios de aceite para uso dos patterns

Um pattern pode ser considerado aplicado corretamente quando:

- preserva identidade visual aprovada;
- usa Foundations e Components v1;
- funciona em desktop, tablet e mobile;
- não mistura mock com funcionalidade real;
- possui estados de loading, erro e vazio quando necessário;
- respeita semântica e acessibilidade mínima;
- não cria duplicação desnecessária;
- não introduz regra de negócio escondida no layout;
- mantém o fluxo principal testável.

---

## 42. Próximos documentos

Após este documento, os próximos passos do Design System são:

```text
1. product-components-v1.md
2. front-implementation-guide-v1.md
```

O `product-components-v1.md` deverá tratar componentes específicos do RH Connect, como:

- JobCard;
- InterviewCard;
- EvaluationCard;
- CandidateSummary;
- ReportSummaryCard;
- NiloGuideCard;
- MissionCard;
- GamificationProgress;
- TalentTreePreview.

O `front-implementation-guide-v1.md` deverá orientar como aplicar Foundations, Components, Patterns e Product Components no código real, principalmente durante a separação do App.tsx, criação de rotas e integração com Back-end.

---

## 43. Resumo executivo

Este documento define que o RH Connect deve usar patterns de layout consistentes para transformar o protótipo em produto sem perder a identidade visual.

A prioridade é organizar:

- layouts por perfil;
- PageHeader;
- dashboards;
- formulários;
- listas/tabelas;
- estados vazios, loading e erro;
- entrevista multimodal;
- avaliação humana;
- relatório;
- desenvolvimento/gamificação.

O foco não é redesenhar a aplicação.  
O foco é criar uma base clara para implementação gradual, responsiva, testável e coerente com o escopo atualizado.

---

**Fim do documento.**
