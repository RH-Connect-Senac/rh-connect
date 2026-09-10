# Product Components v1 — RH Connect

**Status:** Oficial para referência de implementação  
**Versão:** 1.0  
**Data de consolidação:** 01/09/2026  
**Escopo:** Product Components reutilizáveis do RH Connect  
**Fontes base:** Escopo da Entrega Testável 10/09, Atualização de Escopo da Entrevista Multimodal, Components v1, Patterns/Layout v1, Aderência Front-end ao Design System, PRD Preliminar, Inventário de Telas, DEC-001 Autenticação e Perfis, especificação de Nilo e Gamificação.

> **Importante:** Este documento é um contrato-alvo do Design System. A aplicação no Front-end atual deve seguir o plano de migração gradual, sem substituição em massa de componentes antes da entrega testável.

---

## 1. Objetivo

Este documento define os **Product Components v1** do RH Connect.

Enquanto o documento **Components v1** define componentes básicos do Design System, como Button, Input, Card, Badge, Dialog, Toast e Avatar, este documento define componentes específicos do produto RH Connect, ligados aos seus fluxos principais.

O objetivo é orientar a implementação futura de componentes reutilizáveis que aparecem de forma recorrente nas jornadas de:

- Candidato;
- Vaga/contexto da entrevista;
- Entrevista multimodal;
- Avaliação humana;
- Relatório;
- Administração mínima;
- Gamificação, Nilo e Árvore de Talentos.

Este documento não deve ser usado para reescrever o Front-end inteiro de uma vez. Ele serve como referência para consolidação gradual, preservando o visual atual aprovado e respeitando a entrega testável de 10/09.

---

## 2. Relação com Foundations, Components e Patterns/Layout

Os Product Components devem ser construídos sobre as camadas anteriores do Design System:

```text
Foundations
↓
Components
↓
Patterns/Layout
↓
Product Components
```

### 2.1 Foundations

Foundations definem tokens visuais como:

- cores;
- tipografia;
- espaçamentos;
- radius;
- bordas;
- sombras;
- foco visível;
- surfaces.

Product Components não devem criar uma nova linguagem visual nem novos tokens sem necessidade validada.

### 2.2 Components

Components definem peças básicas reutilizáveis, como:

- Button;
- IconButton;
- TextLink;
- FormField;
- Input;
- Select;
- Textarea;
- Badge;
- StatusBadge;
- Card;
- Alert;
- Toast;
- Dialog;
- Tabs;
- Avatar.

Product Components devem compor esses componentes básicos, e não duplicá-los.

### 2.3 Patterns/Layout

Patterns/Layout definem como montar páginas, seções, listas, dashboards, formulários, fluxos de entrevista, avaliação e relatório.

Product Components vivem dentro desses patterns.

Exemplo:

```text
DashboardLayout
└── InterviewStatusCard

ListLayout
└── JobCard

EvaluationFlowPattern
└── EvaluationCriteriaPanel
```

---

## 3. O que este documento define

Este documento define:

- nomes dos Product Components v1;
- objetivo de cada componente;
- onde cada componente aparece;
- base visual recomendada;
- dados esperados;
- estados previstos;
- regras de uso;
- relação com a entrega de 10/09;
- limites para não misturar componente de produto com regra de negócio, API ou layout completo.

---

## 4. O que este documento não define

Este documento não define:

- implementação final em React;
- props TypeScript definitivas;
- contrato de API;
- modelagem do banco;
- regras finais de avaliação;
- pesos, cálculo de nota ou escala final;
- regras finais de XP;
- gatilhos definitivos da Árvore de Talentos;
- lógica de desbloqueio de conquistas;
- integração externa de vagas;
- IA avaliadora;
- IA entrevistadora adaptativa real;
- animação do Nilo;
- voz ou lip-sync;
- Centro de Desenvolvimento, removido do escopo do produto;
- DataTable completa;
- redesign visual.

Esses temas pertencem a documentos de produto, Back-end, Front-end, gamificação, arquitetura, decisão técnica ou evolução futura.

---

## 5. Princípios gerais dos Product Components

1. **Compor, não duplicar.**  
   Product Components devem usar Components básicos, não recriar Button, Card, Badge, Input ou Dialog internamente.

2. **Preservar a identidade visual atual.**  
   A consolidação de Product Components não autoriza redesign.

3. **Separar UI de regra de negócio.**  
   O componente pode exibir status, nota, progresso ou ação, mas não deve calcular sozinho regras críticas do produto.

4. **Não esconder mocks como funcionalidade real.**  
   Se um dado for temporário, visual ou simulado, o componente não deve sugerir integração real.

5. **Ser reutilizável dentro do domínio certo.**  
   Um componente de entrevista não deve virar componente genérico demais; um componente genérico deve continuar em Components v1.

6. **Evitar Product Components prematuros.**  
   Só entram no v1 os componentes com relação clara com a entrega testável ou com fluxos centrais do produto.

7. **Respeitar os perfis.**  
   Candidato, Avaliador e Admin possuem necessidades diferentes. Um componente não deve misturar responsabilidades de perfis sem necessidade.

8. **Respeitar a entrevista multimodal.**  
   Componentes de entrevista e avaliação devem prever Texto, Áudio e Vídeo como modalidades possíveis, mesmo que uma modalidade seja priorizada no teste de 10/09.

9. **Não transformar gamificação em competição.**  
   Componentes de gamificação devem representar evolução individual, sem ranking, comparação entre candidatos ou promessa de contratação.

10. **Não consolidar lógica pendente como definitiva.**  
    Árvore de Talentos, XP, conquistas e progresso podem ter representação visual no v1, mas suas regras finais continuam pendentes de documento próprio.

---

## 6. Classificação dos Product Components v1

### 6.1 P0 — essenciais para o fluxo principal

Componentes necessários para demonstrar o fluxo principal da entrega:

- JobCard;
- JobContextSummary;
- InterviewSetupCard;
- QuestionCard;
- CandidateAnswerInput;
- InterviewRecorderPanel;
- CandidateAnswerViewer;
- EvaluationCriteriaPanel;
- ReportHeaderCard;
- ScoreSummaryCard.

### 6.2 P1 — importantes para completar a experiência

Componentes importantes para deixar a jornada compreensível e apresentável:

- CandidateSummary;
- CandidateProfileCompletionCard;
- InterviewStatusCard;
- InterviewModalitySelector;
- InterviewLevelSelector;
- InterviewModeSelector;
- InterviewReviewCard;
- InterviewSubmitStatus;
- EvaluatorQueueItem;
- EvaluationCard;
- EvaluationReviewSummary;
- FeedbackBlock;
- NiloGuideCard;
- GamificationOverviewCard;
- CurrentMissionCard;
- TalentTreePreview.

### 6.3 P2 — úteis, mas podem esperar

Componentes úteis, mas que não devem bloquear a entrega principal:

- ImprovementSuggestionCard;
- AdminMetricCard;
- EvaluatorAssignmentCard;
- UserAccessStatusCard;
- XPProgressCard;
- ProgressLevelCard;
- AchievementPreviewCard.

---

# Parte I — Componentes do Candidato

---

## 7. CandidateSummary

**Objetivo:** apresentar um resumo do candidato em contextos operacionais.

**Onde aparece:**

- Dashboard do candidato;
- perfil do candidato;
- tela do avaliador;
- tela administrativa;
- relatório.

**Base visual:** Card ou composição compacta com Avatar, textos, metadata e StatusBadge.

**Dados esperados:**

- nome;
- avatar ou iniciais;
- cargo pretendido ou objetivo;
- área/subárea, se existir;
- status do perfil;
- resumo curto;
- data ou metadata relevante.

**Estados:**

- completo;
- incompleto;
- sem avatar;
- carregando;
- indisponível.

**Regras:**

- não deve expor dados sensíveis sem necessidade;
- não deve exibir nota ou julgamento de desempenho como identidade do candidato;
- não deve misturar perfil profissional com resultado de avaliação.

**Relação com 10/09:** entra como componente recomendado para organizar informações recorrentes sobre candidato.

---

## 8. CandidateProfileCompletionCard

**Objetivo:** indicar ao candidato o progresso do preenchimento do perfil.

**Onde aparece:**

- Dashboard do candidato;
- perfil;
- onboarding;
- página Meu Desenvolvimento, se necessário.

**Base visual:** Card + Progress visual + Button/TextLink.

**Dados esperados:**

- percentual ou etapa textual;
- campos pendentes;
- próxima ação;
- status do perfil;
- link para completar perfil.

**Estados:**

- perfil incompleto;
- perfil parcialmente completo;
- perfil completo;
- dados indisponíveis.

**Regras:**

- não deve inventar percentual se a regra de completude não estiver definida;
- pode usar texto simples como “Perfil quase pronto” ou “Complete informações essenciais”;
- não deve bloquear entrevista se a regra de produto não exigir isso.

**Relação com 10/09:** útil para orientar o candidato, mas pode ser simplificado.

---

## 9. InterviewStatusCard

**Objetivo:** mostrar o estado atual de uma entrevista ou tentativa do candidato.

**Onde aparece:**

- Dashboard do candidato;
- histórico de entrevistas;
- detalhes da entrevista;
- área de relatório.

**Base visual:** Card + StatusBadge + metadata + ação principal.

**Dados esperados:**

- título ou identificador da entrevista;
- vaga/contexto;
- modalidade;
- status;
- data de criação/envio;
- avaliador, se aplicável;
- ação disponível.

**Estados:**

- não iniciada;
- em andamento;
- enviada;
- aguardando avaliação;
- em avaliação;
- avaliação concluída;
- relatório disponível;
- erro ou envio falhou.

**Regras:**

- não liberar relatório antes da avaliação concluída;
- não apresentar envio como concluído se não houver confirmação real ou simulação controlada assumida;
- status real deve vir do domínio, não ser calculado apenas pelo componente.

**Relação com 10/09:** importante para conectar entrevista, avaliação e resultado.

---

# Parte II — Componentes de Vaga e Contexto

---

## 10. JobCard

**Objetivo:** representar uma vaga ou contexto de entrevista escolhido pelo candidato.

**Onde aparece:**

- Minhas vagas;
- seleção de contexto da entrevista;
- Dashboard do candidato;
- detalhes da entrevista;
- relatório.

**Base visual:** Card + Badge/StatusBadge + Button/TextLink.

**Dados esperados:**

- título da vaga;
- empresa, quando existir;
- área;
- subárea;
- senioridade ou nível, se existir;
- modelo de trabalho, se existir;
- data de criação;
- status;
- origem da vaga, se aplicável.

**Estados:**

- disponível;
- selecionada;
- incompleta;
- usada em entrevista;
- arquivada;
- indisponível.

**Regras:**

- não deve buscar dados diretamente da API;
- não deve definir sozinho a regra da entrevista;
- não deve misturar layout de lista com regra de negócio;
- se a vaga for mockada, isso deve estar claro na camada de dados/documentação.

**Relação com 10/09:** componente recomendado para sustentar o contexto da entrevista.

---

## 11. JobContextSummary

**Objetivo:** resumir o contexto usado para gerar ou conduzir uma entrevista.

**Onde aparece:**

- configuração da entrevista;
- tela de entrevista;
- avaliação humana;
- relatório;
- detalhes de tentativa.

**Base visual:** Card compacto ou bloco de metadata com Badge/StatusBadge.

**Dados esperados:**

- título da vaga ou contexto;
- empresa;
- área/subárea;
- nível;
- modalidade da entrevista;
- data da tentativa;
- status.

**Estados:**

- contexto selecionado;
- contexto incompleto;
- contexto indisponível;
- carregando.

**Regras:**

- deve deixar claro qual contexto está sendo usado;
- não deve permitir iniciar entrevista sem contexto se a regra exigir vaga específica;
- não deve substituir a tela completa de detalhes da vaga.

**Relação com 10/09:** essencial para evitar entrevista desconectada de uma vaga/contexto.

---

# Parte III — Componentes de Entrevista

---

## 12. InterviewSetupCard

**Objetivo:** apresentar ao candidato as escolhas e informações necessárias antes de iniciar a entrevista.

**Onde aparece:**

- configuração da entrevista;
- seleção de vaga/contexto;
- etapa anterior ao consentimento ou preparação.

**Base visual:** Card + FormField + selectors + Button primary.

**Dados esperados:**

- vaga/contexto selecionado;
- modalidade;
- nível, se existir;
- modo, se existir;
- tempo estimado;
- quantidade de perguntas, se definida;
- aviso de preparação.

**Estados:**

- pronto para iniciar;
- faltando contexto;
- modalidade indisponível;
- carregando;
- erro recuperável.

**Regras:**

- não deve fingir que uma modalidade está funcional se ainda não estiver;
- pode exibir modalidades futuras como indisponíveis ou “em breve”;
- não deve iniciar tentativa sem informações mínimas necessárias.

**Relação com 10/09:** essencial para organizar a entrada da entrevista.

---

## 13. InterviewModalitySelector

**Objetivo:** permitir ou representar a escolha da modalidade da entrevista.

**Onde aparece:**

- configuração da entrevista;
- setup da tentativa;
- tela de preparação.

**Base visual:** SegmentedControl, SelectableCard ou RadioGroup, conforme o contexto.

**Modalidades previstas:**

- Texto;
- Áudio;
- Vídeo.

**Dados esperados:**

- modalidade selecionada;
- disponibilidade de cada modalidade;
- descrição curta;
- requisitos técnicos;
- status “disponível”, “em breve” ou “indisponível”.

**Estados:**

- selecionada;
- disponível;
- indisponível;
- em breve;
- erro de permissão técnica, quando aplicável.

**Regras:**

- uma tentativa deve manter uma única modalidade do início ao fim;
- não misturar texto, áudio e vídeo dentro da mesma tentativa;
- não apresentar modalidade como clicável se ela não estiver funcional;
- quando usar RadioGroup, preservar semântica de formulário.

**Relação com 10/09:** entra como direção de arquitetura. Pode estar visual/simplificado se apenas uma modalidade estiver funcional.

---

## 14. InterviewLevelSelector

**Objetivo:** representar a escolha ou indicação do nível da entrevista.

**Onde aparece:**

- configuração da entrevista;
- setup da tentativa;
- relatório, se o nível for utilizado.

**Base visual:** SegmentedControl, SelectableCard ou Select.

**Níveis previstos:**

- Básico;
- Intermediário;
- Avançado.

**Dados esperados:**

- nível selecionado;
- descrição;
- impacto esperado na quantidade/profundidade das perguntas;
- disponibilidade.

**Estados:**

- selecionado;
- disponível;
- indisponível;
- oculto quando nível não entrar no recorte.

**Regras:**

- não deve sugerir senioridade profissional real do candidato;
- se a regra de nível não estiver definida, tratar como configuração futura ou visual;
- não deve alterar perguntas automaticamente sem contrato definido.

**Relação com 10/09:** entra apenas se não comprometer o fluxo principal. Pode ser adiado.

---

## 15. InterviewModeSelector

**Objetivo:** representar a escolha entre modo de prática e modo de simulação, caso essa decisão seja aplicada.

**Onde aparece:**

- configuração da entrevista;
- setup da tentativa.

**Base visual:** SegmentedControl ou SelectableCard.

**Modos previstos:**

- Prática;
- Simulação.

**Dados esperados:**

- modo selecionado;
- descrição;
- diferenças de comportamento;
- disponibilidade.

**Estados:**

- selecionado;
- disponível;
- indisponível;
- oculto quando modo não entrar no recorte.

**Regras:**

- não deve criar pressão indevida se o modo for de prática;
- não deve prometer simulação realista se a experiência ainda for simples;
- pode ficar fora do fluxo de 10/09 se não estiver validado.

**Relação com 10/09:** componente P1/P2, não bloqueador.

---

## 16. QuestionCard

**Objetivo:** apresentar uma pergunta da entrevista de forma clara e focada.

**Onde aparece:**

- tela de entrevista;
- revisão da resposta;
- avaliação humana;
- relatório, se necessário.

**Base visual:** Card + título + metadata + orientação curta.

**Dados esperados:**

- texto da pergunta;
- categoria;
- competência relacionada;
- ordem;
- tempo ou limite, se existir;
- nível, se existir.

**Estados:**

- pergunta atual;
- respondida;
- pendente;
- pulada, se permitido;
- indisponível.

**Regras:**

- não deve gerar perguntas sozinho;
- não deve alterar a pergunta após resposta enviada;
- não deve exibir critérios internos de avaliação de forma que induza resposta artificial, salvo decisão de produto.

**Relação com 10/09:** essencial para o fluxo de entrevista.

---

## 17. CandidateAnswerInput

**Objetivo:** representar a área de resposta do candidato conforme a modalidade da tentativa.

**Onde aparece:**

- tela de entrevista;
- revisão da resposta.

**Base visual:** composição por modalidade.

**Variações previstas:**

- texto: Textarea + contador/limite, se existir;
- áudio: gravador de áudio + player/revisão;
- vídeo: painel de câmera/gravação + player/revisão.

**Dados esperados:**

- modalidade;
- resposta atual;
- status de gravação/envio;
- duração;
- erros técnicos;
- permissões.

**Estados:**

- vazio;
- gravando;
- pausado, se aplicável;
- respondido;
- revisando;
- erro de permissão;
- erro de captura;
- carregando envio.

**Regras:**

- deve respeitar a modalidade única da tentativa;
- não deve exibir controles de outras modalidades na mesma tentativa;
- não deve confirmar gravação/envio sem estado correspondente;
- não deve armazenar mídia pesada diretamente no estado global sem decisão técnica.

**Relação com 10/09:** essencial, podendo priorizar vídeo se for a modalidade funcional definida.

---

## 18. InterviewRecorderPanel

**Objetivo:** organizar a experiência de gravação de vídeo ou áudio.

**Onde aparece:**

- entrevista por vídeo;
- entrevista por áudio;
- teste técnico;
- revisão.

**Base visual:** Card/Panel + controles + status técnico + feedback.

**Dados esperados:**

- modalidade;
- permissão de câmera/microfone;
- estado de gravação;
- duração;
- preview;
- erro técnico;
- ação disponível.

**Estados:**

- aguardando permissão;
- pronto;
- gravando;
- finalizado;
- revisão disponível;
- erro de câmera;
- erro de microfone;
- dispositivo indisponível.

**Regras:**

- não deve mostrar Nilo sobre a gravação;
- não deve cobrir o vídeo do candidato;
- deve permitir feedback claro de permissão/erro;
- deve evitar controles ambíguos.

**Relação com 10/09:** essencial se vídeo ou áudio forem usados no fluxo testável.

---

## 19. InterviewReviewCard

**Objetivo:** permitir que o candidato revise a resposta antes do envio.

**Onde aparece:**

- etapa de revisão da entrevista;
- confirmação de envio.

**Base visual:** Card + viewer/player + QuestionCard compacto + ações.

**Dados esperados:**

- pergunta;
- resposta;
- modalidade;
- duração ou tamanho;
- status de validação;
- ação de reenviar/refazer, se permitido;
- ação de confirmar envio.

**Estados:**

- resposta pronta;
- sem resposta;
- erro ao carregar mídia;
- envio em andamento;
- envio concluído.

**Regras:**

- não deve permitir envio vazio, salvo regra explícita;
- não deve perder resposta ao navegar sem aviso;
- ações destrutivas devem usar confirmação quando houver risco de perda.

**Relação com 10/09:** importante para dar segurança ao fluxo de entrevista.

---

## 20. InterviewSubmitStatus

**Objetivo:** comunicar o estado de envio/registro da tentativa de entrevista.

**Onde aparece:**

- confirmação de envio;
- entrevista concluída;
- status aguardando avaliação;
- dashboard do candidato.

**Base visual:** Alert, Card, StatusBadge, Spinner/Skeleton quando aplicável.

**Dados esperados:**

- status de envio;
- tentativa identificada;
- data de envio;
- próxima etapa;
- mensagem de erro ou sucesso;
- ação de retorno.

**Estados:**

- enviando;
- enviado;
- aguardando avaliação;
- falhou;
- precisa tentar novamente;
- salvo parcialmente, se existir.

**Regras:**

- não deve afirmar envio real sem confirmação real do servidor, exceto em simulação controlada explicitamente reconhecida internamente;
- não deve liberar relatório automaticamente;
- deve indicar próximo passo de forma simples.

**Relação com 10/09:** essencial para conectar candidato e avaliador.

---

# Parte IV — Componentes de Avaliação Humana

---

## 21. EvaluatorQueueItem

**Objetivo:** representar um item da fila de avaliação do avaliador.

**Onde aparece:**

- fila de avaliações;
- dashboard do avaliador;
- avaliações em andamento.

**Base visual:** Card compacto, linha de lista ou item de tabela responsivo.

**Dados esperados:**

- candidato;
- vaga/contexto;
- modalidade;
- data de envio;
- prioridade ou prazo, se existir;
- status;
- ação principal.

**Estados:**

- pendente;
- em andamento;
- rascunho;
- concluída;
- indisponível;
- erro ao carregar.

**Regras:**

- não deve expor dados além do necessário para avaliação;
- não deve permitir avaliar item não atribuído, salvo regra administrativa;
- deve deixar claro o status da avaliação.

**Relação com 10/09:** importante para o fluxo do avaliador.

---

## 22. CandidateAnswerViewer

**Objetivo:** apresentar ao avaliador a resposta do candidato de acordo com a modalidade.

**Onde aparece:**

- tela de avaliação;
- revisão de avaliação;
- histórico, se entrar;
- relatório interno, se existir.

**Base visual:** Card/Panel + player ou área de texto + metadata.

**Variações previstas:**

- texto: resposta textual;
- áudio: player de áudio;
- vídeo: player de vídeo.

**Dados esperados:**

- pergunta;
- resposta;
- modalidade;
- duração;
- contexto da vaga;
- data de envio;
- status de mídia.

**Estados:**

- carregando;
- disponível;
- mídia indisponível;
- erro de reprodução;
- resposta vazia ou inválida;
- sem permissão.

**Regras:**

- deve respeitar a modalidade da tentativa;
- não deve permitir edição da resposta pelo avaliador;
- não deve mascarar falha de mídia como se estivesse tudo certo;
- deve apresentar contexto suficiente para avaliação.

**Relação com 10/09:** essencial para avaliação humana.

---

## 23. EvaluationCriteriaPanel

**Objetivo:** organizar critérios, notas e feedback do avaliador.

**Onde aparece:**

- tela de avaliação;
- revisão da avaliação;
- guia de critérios, se aplicável.

**Base visual:** FormLayout + Card + FormField + Status/Alert contextual.

**Dados esperados:**

- lista de critérios;
- descrição dos critérios;
- escala de nota;
- nota selecionada;
- feedback por critério ou feedback geral;
- indicação de critério não aplicável, se existir.

**Estados:**

- vazio;
- preenchimento parcial;
- completo;
- erro de validação;
- rascunho salvo;
- pronto para concluir.

**Regras:**

- não deve definir pesos finais sozinho;
- critérios devem ser compatíveis com a modalidade;
- critérios não observáveis não devem ser exigidos;
- feedback ao candidato e observação interna não devem ser confundidos;
- conclusão deve exigir validação mínima.

**Relação com 10/09:** essencial para padronizar a avaliação humana.

---

## 24. EvaluationCard

**Objetivo:** representar uma avaliação em resumo.

**Onde aparece:**

- dashboard do avaliador;
- histórico de avaliações;
- dashboard admin;
- detalhes do candidato;
- relatório, quando necessário.

**Base visual:** Card + StatusBadge + metadata + ação.

**Dados esperados:**

- candidato;
- vaga/contexto;
- avaliador;
- status;
- nota geral, se concluída;
- data;
- modalidade;
- ação disponível.

**Estados:**

- pendente;
- em andamento;
- rascunho;
- concluída;
- devolvida, se existir;
- indisponível.

**Regras:**

- não deve exibir nota antes da conclusão;
- não deve misturar avaliação humana com avaliação por IA;
- não deve substituir a tela completa de avaliação.

**Relação com 10/09:** importante para visão resumida do avaliador e Admin.

---

## 25. EvaluationReviewSummary

**Objetivo:** permitir revisão final antes de concluir uma avaliação.

**Onde aparece:**

- revisão da avaliação;
- confirmação de conclusão.

**Base visual:** Card + CriteriaScoreList + FeedbackBlock + AlertDialog quando necessário.

**Dados esperados:**

- notas por critério;
- feedback;
- recomendação, se existir;
- status;
- pendências;
- ação de concluir.

**Estados:**

- pronto para concluir;
- com pendências;
- salvando;
- concluído;
- erro ao salvar.

**Regras:**

- deve deixar claro que concluir pode liberar resultado ao candidato;
- ação crítica deve ter confirmação quando necessário;
- não deve permitir conclusão com campos obrigatórios ausentes.

**Relação com 10/09:** importante para fechar o fluxo avaliador → candidato.

---

# Parte V — Componentes de Relatório

---

## 26. ReportHeaderCard

**Objetivo:** apresentar o contexto principal do relatório do candidato.

**Onde aparece:**

- página de resultado/relatório;
- detalhes da entrevista;
- histórico, se aplicável.

**Base visual:** Card + StatusBadge + metadata.

**Dados esperados:**

- candidato;
- vaga/contexto;
- modalidade;
- nível, se existir;
- data da tentativa;
- data da avaliação;
- status;
- avaliador, se exibível.

**Estados:**

- relatório disponível;
- avaliação pendente;
- relatório indisponível;
- erro ao carregar.

**Regras:**

- não deve mostrar resultado antes da avaliação concluída;
- deve indicar modalidade da tentativa;
- não deve prometer contratação ou aprovação.

**Relação com 10/09:** essencial para o relatório básico.

---

## 27. ScoreSummaryCard

**Objetivo:** apresentar nota, resultado ou síntese de desempenho de forma clara.

**Onde aparece:**

- relatório do candidato;
- dashboard do candidato, se relatório disponível;
- visão do avaliador/admin, se necessário.

**Base visual:** Card + destaque numérico/textual + StatusBadge.

**Dados esperados:**

- nota geral ou conceito;
- escala;
- status;
- mensagem curta;
- evolução em relação à tentativa anterior, se existir e for real.

**Estados:**

- disponível;
- pendente;
- sem nota;
- carregando;
- erro.

**Regras:**

- não deve calcular nota sozinho;
- não deve comparar candidatos;
- não deve indicar garantia de contratação;
- se a escala não estiver definida, usar apresentação simples e validada.

**Relação com 10/09:** essencial para apresentar resultado.

---

## 28. CriteriaScoreList

**Objetivo:** listar notas ou avaliações por critério.

**Onde aparece:**

- relatório;
- revisão da avaliação;
- tela de avaliação.

**Base visual:** lista, tabela simples ou Cards compactos.

**Dados esperados:**

- critério;
- descrição;
- nota;
- escala;
- feedback por critério, se existir;
- aplicabilidade por modalidade.

**Estados:**

- completo;
- parcialmente preenchido;
- não aplicável;
- pendente.

**Regras:**

- critérios não aplicáveis à modalidade devem ser marcados ou omitidos;
- não deve exibir contato visual para entrevista de texto, por exemplo;
- não deve inventar nota quando avaliação ainda estiver pendente.

**Relação com 10/09:** essencial para dar clareza ao resultado.

---

## 29. FeedbackBlock

**Objetivo:** apresentar feedback textual estruturado.

**Onde aparece:**

- relatório do candidato;
- revisão da avaliação;
- tela de avaliação;
- histórico, se necessário.

**Base visual:** Card/Alert/Section com título e texto.

**Tipos possíveis:**

- pontos fortes;
- pontos a desenvolver;
- orientação geral;
- observação do avaliador;
- recomendação de próxima prática.

**Estados:**

- preenchido;
- vazio;
- pendente;
- não disponível.

**Regras:**

- não deve usar linguagem julgadora ou constrangedora;
- não deve prometer contratação;
- deve diferenciar feedback ao candidato de observação interna;
- pode ser usado junto com NiloGuideCard apenas quando fizer sentido.

**Relação com 10/09:** essencial para tornar avaliação educativa.

---

## 30. ImprovementSuggestionCard

**Objetivo:** sugerir próximo passo de melhoria após o relatório.

**Onde aparece:**

- relatório;
- dashboard do candidato;
- Meu Desenvolvimento/Gamificação.

**Base visual:** Card + Button/TextLink + Badge opcional.

**Dados esperados:**

- título da sugestão;
- motivo;
- competência relacionada;
- ação recomendada;
- relação com missão, se existir.

**Estados:**

- disponível;
- concluída;
- indisponível;
- futura.

**Regras:**

- não deve depender de IA se a sugestão for manual/mockada;
- não deve parecer diagnóstico profissional definitivo;
- pode ser simples em 10/09.

**Relação com 10/09:** útil, mas pode esperar se o fluxo principal estiver apertado.

---

# Parte VI — Componentes Administrativos

---

## 31. AdminMetricCard

**Objetivo:** apresentar métrica operacional simples para o administrador.

**Onde aparece:**

- dashboard administrativo.

**Base visual:** Card + título + valor + metadata + StatusBadge opcional.

**Dados esperados:**

- nome da métrica;
- valor;
- variação, se real;
- status;
- período;
- ação de detalhe, se existir.

**Estados:**

- disponível;
- sem dados;
- carregando;
- indisponível;
- erro.

**Regras:**

- não usar números inventados como se fossem reais;
- omitir ou marcar como exemplo quando não houver dado real;
- não transformar métrica em decoração.

**Relação com 10/09:** útil para dashboard mínimo, mas não deve bloquear operação.

---

## 32. EvaluatorAssignmentCard

**Objetivo:** representar atribuição de uma entrevista a um avaliador.

**Onde aparece:**

- Admin — atribuições;
- gestão de entrevistas;
- detalhes da entrevista;
- dashboard admin.

**Base visual:** Card/List item + CandidateSummary compacto + evaluator summary + StatusBadge.

**Dados esperados:**

- entrevista;
- candidato;
- avaliador;
- status da atribuição;
- data;
- ação de atribuir/reatribuir.

**Estados:**

- sem avaliador;
- atribuído;
- em avaliação;
- concluído;
- erro;
- indisponível.

**Regras:**

- não deve simular atribuição real sem persistência, salvo demonstração controlada;
- não deve permitir atribuir a usuário sem role EVALUATOR;
- não deve misturar atribuição com conclusão da avaliação.

**Relação com 10/09:** importante para Admin mínimo se o fluxo depender de atribuição.

---

## 33. UserAccessStatusCard

**Objetivo:** apresentar status de acesso de candidato, avaliador ou admin.

**Onde aparece:**

- gestão de usuários;
- gestão de avaliadores;
- detalhes de conta;
- Admin dashboard, se necessário.

**Base visual:** Card compacto ou item de lista com StatusBadge.

**Dados esperados:**

- usuário;
- role;
- status da conta;
- data de criação/convite;
- último acesso, se existir;
- ação disponível.

**Estados:**

- ativo;
- convidado;
- pendente de verificação;
- bloqueado;
- inativo;
- erro.

**Regras:**

- não deve permitir troca de role pelo próprio usuário;
- não deve sugerir criação pública de Admin;
- ações críticas devem ser protegidas por confirmação.

**Relação com 10/09:** útil para operação, mas pode ser simplificado.

---

# Parte VII — Gamificação, Nilo e Árvore de Talentos

---

## 34. Direção geral desta frente

A área de **Gamificação / Meu Desenvolvimento** entra como experiência visual de evolução do candidato.

Para o recorte atual, ela pode apresentar:

- Nilo estático;
- orientação contextual;
- progresso geral;
- missão atual ou próxima ação;
- conquistas recentes em formato simples;
- representação visual da Árvore de Talentos.

Esta frente **não define**:

- lógica final de XP;
- gatilhos definitivos da Árvore de Talentos;
- desbloqueios finais;
- cálculo real de progresso;
- animações avançadas;
- voz do Nilo;
- lip-sync;
- Centro de Desenvolvimento, removido do escopo do produto.

O **Centro de Desenvolvimento foi removido do escopo do produto** e não deve orientar Product Components v1.

---

## 35. NiloGuideCard

**Objetivo:** apresentar uma orientação contextual do Nilo ao candidato.

**Onde aparece:**

- onboarding;
- dashboard do candidato;
- Meu Desenvolvimento/Gamificação;
- resultado/relatório, se fizer sentido;
- estados vazios ou orientações pontuais.

**Base visual:** Card ou painel com ilustração/imagem do Nilo, mensagem curta e ação opcional.

**Dados esperados:**

- imagem/asset do Nilo;
- mensagem;
- contexto;
- ação principal opcional;
- ação de fechar/pular, quando aplicável.

**Estados:**

- orientação inicial;
- dica;
- celebração;
- alerta leve;
- próxima ação;
- fechado/oculto.

**Regras:**

- Nilo é guia, não avaliador;
- não atribui nota;
- não aprova nem reprova;
- não recomenda contratação;
- não substitui o avaliador humano;
- não deve aparecer durante gravação;
- não deve cobrir vídeo, campos importantes ou relatórios;
- deve poder ser ignorado, fechado ou não interromper tarefas críticas;
- linguagem deve ser acolhedora, profissional e não julgadora.

**Relação com 10/09:** entra como componente estático, sem voz, animação avançada ou lip-sync.

---

## 36. GamificationOverviewCard

**Objetivo:** apresentar um resumo simples da evolução do candidato.

**Onde aparece:**

- Meu Desenvolvimento/Gamificação;
- dashboard do candidato, se necessário.

**Base visual:** Card + progress visual + StatusBadge/Badge + ação.

**Dados esperados:**

- progresso geral;
- nível textual, se existir;
- XP, se for usado;
- próxima etapa;
- missão atual;
- conquistas recentes.

**Estados:**

- sem progresso;
- em progresso;
- etapa concluída;
- dados indisponíveis;
- visual/mockado.

**Regras:**

- não deve representar competência profissional real;
- não deve comparar candidatos;
- não deve prometer contratação;
- não deve inventar cálculo definitivo;
- pode usar mensagens qualitativas quando a lógica ainda não estiver definida.

**Relação com 10/09:** recomendado para comunicar evolução sem depender da lógica final.

---

## 37. CurrentMissionCard

**Objetivo:** indicar a missão atual ou próxima ação recomendada ao candidato.

**Onde aparece:**

- dashboard do candidato;
- Meu Desenvolvimento/Gamificação;
- após relatório;
- onboarding, se aplicável.

**Base visual:** Card + StatusBadge + Button/TextLink.

**Dados esperados:**

- título da missão;
- descrição;
- motivo;
- progresso;
- recompensa simbólica, se existir;
- ação principal;
- status.

**Estados:**

- disponível;
- ativa;
- em andamento;
- concluída;
- substituída;
- indisponível.

**Regras:**

- missões não devem bloquear funções essenciais;
- não devem punir ausência ou baixo desempenho;
- não devem gerar comparação entre usuários;
- se a missão for visual/mockada, não apresentar como regra definitiva.

**Relação com 10/09:** entra como apoio visual/próxima ação, podendo ser simples.

---

## 38. TalentTreePreview

**Objetivo:** representar visualmente a evolução do candidato dentro da jornada de preparação.

**Onde aparece:**

- Meu Desenvolvimento/Gamificação.

**Base visual:** composição visual própria, usando Card/Panel como container e elementos gráficos internos.

**Dados esperados:**

- título;
- descrição curta;
- estágios visuais;
- estado visual de cada nó/elemento;
- legenda simples;
- mensagem de orientação.

**Estados visuais possíveis:**

- bloqueado;
- disponível;
- em desenvolvimento;
- avançado;
- consolidado.

**Status no v1:** visual/provisório.

**Regras:**

- não define lógica final da árvore;
- não define gatilhos de evolução;
- não representa senioridade profissional real;
- não compara candidatos;
- não promete empregabilidade;
- não deve exibir percentuais sem regra definida;
- pode exibir estados visuais simples;
- deve permitir evolução futura quando as regras forem definidas.

**Relação com 10/09:** entra como representação visual da evolução, sem lógica completa obrigatória.

---

## 39. XPProgressCard

**Objetivo:** representar progresso de XP quando a equipe decidir usar XP visualmente.

**Onde aparece:**

- Meu Desenvolvimento/Gamificação;
- dashboard do candidato;
- missão atual.

**Base visual:** Card compacto + progress bar + Badge.

**Dados esperados:**

- XP atual;
- XP necessário para próximo nível;
- progresso percentual;
- fonte do XP;
- próxima meta.

**Estados:**

- sem XP;
- em progresso;
- nível alcançado;
- indisponível;
- oculto.

**Regras:**

- XP não representa nota da entrevista;
- XP não representa competência profissional real;
- XP não deve afetar avaliação humana;
- XP não deve comparar candidatos;
- não exibir valores se a pontuação não estiver definida.

**Relação com 10/09:** P2. Pode ficar visual ou ser omitido se a regra não estiver clara.

---

## 40. ProgressLevelCard

**Objetivo:** representar o nível de progresso do candidato na jornada.

**Onde aparece:**

- Meu Desenvolvimento/Gamificação;
- dashboard do candidato.

**Base visual:** Card + Badge/StatusBadge + progress visual.

**Dados esperados:**

- nível atual;
- descrição positiva;
- próximo nível;
- progresso;
- critérios gerais.

**Estados:**

- inicial;
- em progresso;
- nível alcançado;
- indisponível;
- oculto.

**Regras:**

- nível não significa garantia de contratação;
- nível não é senioridade profissional real;
- nível não compara o candidato com outros;
- nomes devem ser positivos e acolhedores.

**Relação com 10/09:** P2. Pode ser simplificado ou textual.

---

## 41. AchievementPreviewCard

**Objetivo:** representar conquista recente ou marco da jornada.

**Onde aparece:**

- Meu Desenvolvimento/Gamificação;
- dashboard do candidato;
- pós-entrevista ou pós-relatório, se aplicável.

**Base visual:** Card pequeno + ícone + Badge + metadata.

**Dados esperados:**

- nome da conquista;
- descrição;
- data;
- critério relacionado;
- estado;
- ícone.

**Estados:**

- bloqueada;
- desbloqueada;
- recente;
- indisponível;
- visual/mockada.

**Regras:**

- conquista não representa garantia de emprego;
- conquista não deve comparar usuários;
- conquista não deve ser perdida por ausência;
- o sistema deve conseguir explicar por que a conquista foi liberada quando a regra existir.

**Relação com 10/09:** P2. Pode aparecer como preview visual, sem lógica definitiva.

---

# Parte VIII — Componentes adiados ou fora do recorte

---

## 42. Componentes adiados

Os itens abaixo não entram como Product Components v1:

- DataTable completa;
- AdvancedAnalyticsCard;
- AIRecommendationCard;
- AIComparisonPanel;
- Timeline completa de auditoria;
- MaterialRecommendationCard avançado;
- TalentTreeEditor;
- AdvancedTalentTreeGraph;
- NiloVoicePanel;
- LipSyncAvatar;
- VideoAnalysisPanel;
- AIConfidenceScoreCard;
- AuditLogTimeline;
- PermissionMatrixEditor.

---

## 43. Componentes explicitamente fora

Os itens abaixo não devem ser criados neste recorte:

- CourseUnlockCard;
- UnlockedItemsPanel;
- RewardStore;
- RankingCard;
- Leaderboard;
- CandidateComparisonCard;
- PublicRankingPanel.

**Motivo:** a frente de desenvolvimento fica limitada à gamificação base, Nilo estático e Árvore de Talentos visual/provisória. O RH Connect não deve usar ranking, comparação entre candidatos ou competição por XP.

---

# Parte IX — Relação com a entrega 10/09

---

## 44. Componentes mais relevantes para 10/09

Para a entrega testável, os Product Components mais importantes são:

```text
Vaga/contexto
→ JobCard
→ JobContextSummary

Entrevista
→ InterviewSetupCard
→ InterviewModalitySelector
→ QuestionCard
→ CandidateAnswerInput
→ InterviewRecorderPanel
→ InterviewReviewCard
→ InterviewSubmitStatus

Avaliação
→ EvaluatorQueueItem
→ CandidateAnswerViewer
→ EvaluationCriteriaPanel
→ EvaluationReviewSummary

Relatório
→ ReportHeaderCard
→ ScoreSummaryCard
→ CriteriaScoreList
→ FeedbackBlock

Gamificação
→ NiloGuideCard
→ GamificationOverviewCard
→ CurrentMissionCard
→ TalentTreePreview
```

## 45. Componentes que podem ficar apenas como orientação

Podem permanecer apenas documentados ou visuais, sem implementação completa:

- InterviewLevelSelector;
- InterviewModeSelector;
- ImprovementSuggestionCard;
- AdminMetricCard;
- EvaluatorAssignmentCard;
- UserAccessStatusCard;
- XPProgressCard;
- ProgressLevelCard;
- AchievementPreviewCard.

---

## 46. Regra de implementação segura

A implementação dos Product Components deve seguir o plano de migração gradual do Front-end.

Regras:

- não substituir todos os cards de uma vez;
- não criar Product Components antes de separar mocks quando isso aumentar risco;
- não misturar aplicação de Product Components com rotas reais no mesmo PR;
- não mudar visual aprovado sem tarefa específica;
- não transformar componentes mockados em integração falsa;
- não implementar lógica final de gamificação sem definição de produto;
- não mexer em Nilo/Árvore dentro da migração estrutural sem tarefa específica;
- validar responsividade após cada alteração;
- manter PRs pequenos, revisáveis e reversíveis.

---

## 47. Ordem recomendada de aplicação futura

Quando chegar a hora de aplicar no código, a ordem recomendada é:

1. mapear onde cada Product Component já aparece informalmente;
2. consolidar componentes essenciais de entrevista;
3. consolidar componentes de avaliação humana;
4. consolidar componentes de relatório;
5. consolidar componentes de vaga/contexto;
6. consolidar componentes mínimos de gamificação visual;
7. consolidar componentes administrativos apenas onde houver repetição real;
8. revisar acessibilidade, estados vazios e responsividade;
9. substituir mocks por API somente com contrato real.

---

## 48. Próximas etapas

Após este documento, as próximas etapas recomendadas são:

1. pedir ao Codex uma análise de aderência entre Product Components v1 e Front-end atual;
2. não implementar nada nessa primeira análise;
3. registrar quais Product Components já existem informalmente em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx` e `development-screen.tsx`;
4. ajustar este documento se aparecer conflito relevante;
5. criar o guia de implementação do Design System no Front-end;
6. aplicar Product Components futuramente em PRs pequenos.

---

## Registro de origem

Este documento foi consolidado a partir das decisões atuais do RH Connect sobre:

- escopo testável de 10/09;
- entrevista multimodal;
- avaliação humana;
- Design System v1;
- Patterns/Layout v1;
- aderência do Front-end ao Design System;
- Nilo como guia estático;
- gamificação individual;
- Árvore de Talentos como representação visual provisória;
- remoção do Centro de Desenvolvimento do escopo do produto.

---

**Fim do documento.**
