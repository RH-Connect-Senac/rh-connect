# RH Connect — Entrega Testável 10/09
## Documento de Escopo e Critérios de Pronto

**Projeto:** RH Connect  
**Versão:** v1.2  
**Data de atualização:** 20/08/2026  
**Entrega testável:** 10/09/2026  
**Status:** Escopo consolidado para execução  
**Público:** Equipe do projeto, professor e turma de RH  

---

> **Aviso de atualização em 10/09/2026:** as decisões de produto mais recentes substituem os trechos deste documento que tratam video, camera, gravacao, upload, player, regravacao, Device Check e paginas independentes de vagas como obrigatorios para a primeira entrega. O fluxo vigente esta registrado em `docs/front-end/mapa-de-telas-front-end.md`.

---

# 1. Objetivo do documento

Este documento define o escopo oficial da entrega testável do RH Connect prevista para **10 de setembro de 2026**.

O objetivo é alinhar toda a equipe sobre:

- o que precisa funcionar obrigatoriamente;
- o que pode ser simplificado;
- o que fica fora da entrega;
- quais decisões ainda estão pendentes;
- quais partes precisam funcionar com dados reais;
- quais são os critérios mínimos para considerar a versão testável pronta.

A entrega de 10/09 não representa o produto final completo.

Ela deve representar uma versão menor, organizada, funcional e testável do RH Connect, suficiente para validar a jornada principal com a turma de RH.

---

# 2. Contexto da entrega

O RH Connect está passando da fase de protótipo visual para uma aplicação estruturada e integrada.

O Front-end atual foi originado a partir do protótipo exportado do Figma Make e ainda possui elementos típicos de protótipo, como:

- navegação interna por estado;
- mocks;
- dados hardcoded;
- telas concentradas em estruturas grandes;
- elementos de demonstração;
- funcionalidades ainda sem integração real.

O Back-end está sendo preparado em `apps/api`, com foco inicial em:

- PostgreSQL;
- Prisma;
- modelagem de dados;
- autenticação;
- perfis e permissões;
- contratos;
- primeiros endpoints.

A entrega de 10/09 deve validar o funcionamento real do fluxo principal e não apenas a aparência das telas.

---

# 3. Regra principal da entrega

> **A versão de 10/09 deve entregar um fluxo menor, porém funcionando de verdade.**

As partes essenciais que a turma de RH utilizar como funcionalidades reais não devem depender exclusivamente de mocks, dados falsos ou telas que apenas simulam comportamento.

Quando uma funcionalidade não puder ser concluída até a entrega, a equipe deve:

1. simplificar de forma honesta;
2. remover temporariamente;
3. desabilitar;
4. identificar como “Em breve”;
5. registrar como pendência;
6. substituir apenas por alternativa real previamente validada.

## 3.1. Estados vazios reais são permitidos

Exemplos:

- “Nenhuma entrevista enviada até o momento.”
- “Nenhuma avaliação pendente.”
- “Nenhum relatório disponível.”
- “Complete seu perfil para continuar.”

Estados vazios devem representar o estado real da aplicação.

## 3.2. O que deve ser evitado

- números inventados em dashboards;
- relatórios falsos apresentados como reais;
- entrevistas que parecem enviadas, mas não são registradas;
- avaliações simuladas;
- gráficos alimentados com dados fictícios apresentados como reais;
- botões que fingem executar ações;
- telas incompletas apresentadas como funcionais;
- navegação para módulos inexistentes sem identificação;
- simulação enganosa para substituir uma funcionalidade essencial.

---

# 4. Fluxo principal da versão testável

A versão testável deve priorizar o seguinte fluxo:

```text
Candidato
↓
Cadastro / Login
↓
Onboarding
↓
Dashboard
↓
Perfil
↓
Contexto de treinamento*
↓
Entrevista com vídeo
↓
Avaliação humana
↓
Resultado / Relatório
↓
Progresso / Gamificação base
```

> **Contexto de treinamento:** a forma definitiva de definição do contexto da entrevista ainda está pendente de validação de produto. O fluxo poderá continuar baseado em uma vaga ou evoluir para uma lógica de área/subárea relacionada ao perfil.

Essa decisão não deve bloquear autenticação, perfil, estrutura do Back-end, migração estrutural do Front ou demais preparações técnicas.

---

# 5. Resumo executivo do escopo

| Área | Entra em 10/09 | Pode ser simplificado | Fica para depois |
|---|---|---|---|
| Autenticação | Sim | Fluxo mínimo seguro | Recuperação de senha |
| Onboarding | Sim | Curto e direto | Experiência avançada conduzida pelo Nilo |
| Dashboard | Sim | Cards e dados essenciais | Analytics avançados |
| Perfil | Sim | Campos essenciais | Enriquecimento avançado |
| Contexto de treinamento | Sim | Modelo mínimo após decisão | Integrações externas avançadas |
| Entrevista | Sim | Fluxo mínimo | Recursos avançados |
| Vídeo | Sim | Duração/formato limitados | Processamento avançado |
| Avaliação humana | Sim | Critérios mínimos | Analytics e automações |
| Resultado/Relatório | Sim | Relatório básico | Relatórios avançados |
| Gamificação | Sim, base | Estados/progresso essenciais | Sistema completo |
| Nilo | Sim, estático | Aparições pontuais | Voz, lip-sync e interação avançada |
| Árvore de Talentos | Sim, reformulada | Evolução visual por estados | Árvore dinâmica avançada |
| Centro de Desenvolvimento | Não | — | Evolução futura |
| IA | Não | — | Fase futura |
| Admin | Sim, mínimo | Operação essencial | Gestão avançada |

---

# 6. Perfis do sistema

A aplicação considera três perfis principais:

```text
candidate
evaluator
admin
```

A nomenclatura técnica definitiva deve permanecer padronizada entre Front-end, Back-end, banco e contratos.

---

# 7. Autenticação e acesso

## 7.1. Candidato

O candidato deve conseguir:

- realizar cadastro público;
- definir credenciais;
- fazer login;
- acessar o onboarding;
- ser redirecionado para sua área;
- acessar apenas seus próprios dados e funcionalidades permitidas.

## 7.2. Avaliador

O avaliador deve:

- possuir conta criada ou disponibilizada por fluxo controlado;
- definir/acessar suas credenciais conforme implementação aprovada;
- fazer login;
- acessar apenas entrevistas atribuídas e informações necessárias à avaliação.

Não deve existir cadastro público de avaliador.

## 7.3. Administrador

O administrador deve:

- possuir acesso provisionado de forma controlada;
- fazer login;
- acessar o painel administrativo mínimo necessário;
- operar as ações previstas para a entrega.

Não deve existir cadastro público de administrador.

## 7.4. Login único

A aplicação deve utilizar uma entrada de login comum e redirecionar o usuário de acordo com seu perfil.

Exemplo:

```text
candidate
→ /candidate/dashboard

evaluator
→ /evaluator/dashboard

admin
→ /admin/dashboard
```

## 7.5. Recuperação de senha

A recuperação de senha fica **fora do foco principal da entrega de 10/09**.

Ela poderá ser implementada posteriormente sem bloquear a validação da versão testável.

---

# 8. Onboarding

O onboarding entra na entrega.

Deve ser:

- curto;
- posterior à autenticação;
- compatível com os três perfis quando aplicável;
- suficiente para introduzir a experiência e direcionar o usuário ao dashboard.

O onboarding não deve depender de:

- Nilo com voz;
- animação avançada;
- lip-sync;
- experiência narrativa complexa.

A presença do Nilo no onboarding pode ocorrer apenas em formato estático, se estiver prevista no layout aprovado.

---

# 9. Dashboard

Os dashboards dos três perfis entram na entrega em versão suficiente para suportar o fluxo principal.

Podem utilizar:

- cards essenciais;
- estados vazios reais;
- indicadores baseados em dados reais disponíveis;
- próxima ação;
- status relevantes.

Não é necessário entregar:

- analytics avançados;
- gráficos complexos;
- métricas que não tenham fonte real;
- painéis executivos completos.

---

# 10. Perfil do candidato

O candidato deve conseguir registrar e visualizar as informações básicas necessárias para continuar sua jornada.

O escopo deve priorizar os campos realmente necessários para:

- identificar o candidato;
- sustentar o contexto da entrevista;
- permitir continuidade da jornada.

Campos adicionais podem ser adiados.

---

# 11. Contexto de treinamento — decisão pendente

Existe uma decisão de produto ainda em validação.

## Alternativa A — Vaga

O candidato cadastra ou informa uma vaga e a entrevista é orientada por esse contexto.

## Alternativa B — Área/Subárea

O sistema utiliza informações do perfil e dados de mercado para apresentar áreas ou subáreas relacionadas, permitindo que o candidato escolha um caminho para treinamento.

## Regra atual

Conforme decisao de 10/09/2026:

- remover `Minhas Vagas` como pagina independente da primeira entrega;
- remover `Nova Vaga` e `Selecionar Vaga` como paginas independentes da primeira entrega;
- manter vaga como contexto da entrevista;
- receber a URL da vaga no inicio da Nova entrevista;
- evitar modelagem rigida que dificulte a integracao tecnica Python/Flask e Groq.

Essa decisao deve estar registrada tambem no Mapa de Telas e na documentacao tecnica relacionada ao dominio.

---

# 12. Entrevista com vídeo

A entrevista com vídeo é **obrigatória para a entrega de 10/09**.

O fluxo mínimo deve permitir:

```text
preparação
↓
consentimento
↓
teste básico de câmera/microfone
↓
gravação
↓
envio
↓
registro
↓
disponibilização para o avaliador
```

A implementação pode ser simplificada em duração, quantidade de respostas e recursos complementares, mas o vídeo não deve ser substituído por uma simulação visual.

## 12.1. O que pode ser simplificado

- duração máxima;
- quantidade de perguntas;
- formatos aceitos;
- experiência visual da gravação;
- controles avançados;
- processamento pós-gravação.

## 12.2. O que não deve ser simulado

- gravação concluída;
- envio;
- armazenamento/referência;
- associação com a entrevista;
- acesso autorizado pelo avaliador.

---

# 13. Vídeo, armazenamento e metadados

Os arquivos de vídeo não devem ser tratados como simples conteúdo pesado armazenado diretamente no banco relacional.

O sistema deve separar:

## Banco relacional

Armazenar informações como:

- identificador;
- usuário;
- entrevista;
- pergunta/resposta relacionada;
- status;
- duração;
- tamanho;
- tipo/formato;
- referência ou URL controlada;
- data de criação;
- demais metadados necessários.

## Armazenamento de mídia

Responsável pelo arquivo de vídeo propriamente dito.

Antes da integração definitiva, a equipe deve registrar:

- limite de duração;
- limite de tamanho;
- formato;
- estratégia de armazenamento;
- regra de acesso;
- retenção;
- tratamento de falhas.

O acesso ao vídeo deve respeitar as permissões do sistema.

---

# 14. Avaliação humana

A avaliação humana é uma das partes obrigatórias da entrega.

O avaliador deve conseguir:

- fazer login;
- acessar seu dashboard;
- visualizar entrevistas atribuídas;
- abrir a entrevista;
- reproduzir o vídeo autorizado;
- visualizar informações necessárias;
- preencher critérios/notas definidos;
- registrar feedback;
- concluir a avaliação.

O candidato não deve visualizar uma avaliação ainda não concluída.

Observações internas não destinadas ao candidato não devem ser exibidas a ele.

---

# 15. Resultado e relatório

Após a conclusão da avaliação, o candidato deve conseguir acessar o resultado.

O relatório mínimo pode apresentar:

- nota ou resultado conforme critérios aprovados;
- feedback;
- pontos fortes;
- pontos de melhoria;
- informações essenciais da avaliação.

Não é obrigatório entregar:

- gráficos complexos;
- análises históricas avançadas;
- comparação entre candidatos;
- IA;
- recomendações automáticas avançadas.

---

# 16. Gamificação base

A gamificação entra na entrega de 10/09 em **recorte base**.

Seu objetivo é tornar a jornada mais clara e mostrar progresso, sem transformar a experiência em competição.

Princípios:

- evolução individual;
- sem ranking entre candidatos;
- gamificação não altera nota;
- XP ou elementos equivalentes não representam competência profissional real;
- falhas técnicas não devem gerar punição;
- a experiência não deve ser infantilizada.

## 16.1. Escopo base

Pode incluir, conforme o design aprovado:

- progresso da jornada;
- missão/próxima ação;
- estados visuais;
- marcos simples;
- feedback de avanço;
- elementos visuais da Árvore de Talentos.

## 16.2. Fora do recorte base

Ficam para evolução posterior:

- sistema sofisticado de XP;
- níveis complexos;
- grande catálogo de conquistas;
- missões avançadas;
- itens desbloqueáveis sofisticados;
- personalização avançada;
- automações de gamificação.

---

# 17. Nilo

Nilo entra na entrega de 10/09 em **formato estático**.

Sua função é:

- orientar;
- acolher;
- indicar próximos passos;
- apoiar a compreensão da experiência.

Nilo não pode:

- avaliar;
- atribuir nota;
- aprovar ou reprovar;
- recomendar contratação;
- interferir na avaliação humana;
- representar o nível profissional real do candidato.

## 17.1. Escopo para 10/09

- representação visual estática;
- presença pontual nas telas aprovadas;
- mensagens curtas e orientativas quando aplicável.

## 17.2. Fora da entrega

- voz;
- lip-sync;
- conversa avançada;
- personagem animado completo;
- interação contextual sofisticada;
- condução completa da plataforma.

Nilo não deve aparecer sobre o vídeo ou durante a gravação de modo que atrapalhe a concentração.

---

# 18. Árvore de Talentos

A Árvore de Talentos entra na entrega em versão **reformulada e visual**.

Ela deve representar:

> **o progresso do candidato dentro da jornada do RH Connect.**

Ela não deve representar diretamente:

- senioridade profissional;
- “nível real” de uma competência;
- garantia de empregabilidade;
- ranking;
- comparação com outros candidatos.

## 18.1. Estratégia para 10/09

A versão testável pode utilizar uma sequência limitada de estados visuais da mesma árvore, preservando:

- mesma composição;
- mesma identidade;
- mesmos posicionamentos;
- evolução perceptível entre os estados.

Os estados podem ser acionados conforme marcos da jornada definidos pela equipe.

A quantidade e os gatilhos finais devem ser documentados antes da implementação definitiva.

## 18.2. Evolução futura

Ficam para fases posteriores:

- árvore totalmente dinâmica;
- ramificações complexas;
- lógica extensa por competência;
- personalização avançada;
- integração com trilhas de desenvolvimento.

---

# 19. Centro de Desenvolvimento

O Centro de Desenvolvimento fica **fora da entrega obrigatória de 10/09**.

Não deve bloquear:

- gamificação base;
- Nilo estático;
- Árvore de Talentos;
- fluxo principal.

Caso exista referência visual no protótipo, ela deverá ser removida, desabilitada ou identificada como “Em breve”, conforme decisão de UX.

---

# 20. Escopo do Avaliador

## Obrigatório

- login;
- dashboard;
- fila de entrevistas/avaliações;
- acesso apenas ao que foi atribuído;
- reprodução do vídeo;
- critérios/notas;
- feedback;
- conclusão da avaliação.

## Pode ser simplificado

- histórico;
- filtros;
- rascunho;
- quantidade de critérios;
- indicadores do dashboard.

## Fica para depois

- analytics avançados;
- comparação entre avaliadores;
- comentários temporais sofisticados no vídeo;
- IA de apoio;
- automação de feedback;
- configurações avançadas.

---

# 21. Escopo do Administrador

O Administrador entra com um recorte mínimo voltado à operação do fluxo principal.

Deve ser possível sustentar, conforme necessidade da entrega:

- existência e gestão básica de avaliadores;
- acompanhamento de entrevistas;
- atribuição de avaliações;
- perguntas;
- critérios;
- informações operacionais essenciais.

Pode ser simplificado por:

- dados pré-cadastrados;
- atribuição simples;
- fluxo técnico controlado quando a UI completa não for essencial;
- menor quantidade de configurações.

Ficam para depois:

- painel administrativo completo;
- analytics avançados;
- automações extensas;
- auditoria visual avançada;
- gestão sofisticada de permissões.

---

# 22. Escopo técnico do Front-end

Para a entrega, o Front-end deve evoluir do protótipo para uma base organizada e integrável.

A direção técnica inclui:

- `apps/web`;
- React;
- TypeScript;
- Vite;
- Tailwind;
- componentes locais/Radix conforme Design System;
- Lucide;
- Recharts quando necessário;
- Sonner para feedback;
- React Router para rotas reais;
- `pnpm` como gerenciador oficial.

A migração estrutural deve priorizar:

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

O Front não precisa estar 100% finalizado antes da integração.

---

# 23. Escopo técnico do Back-end

O Back-end faz parte oficialmente da entrega e deve avançar em `apps/api`.

Direção atual:

- PostgreSQL;
- Prisma;
- modelagem incremental;
- migrations;
- autenticação;
- roles;
- contratos;
- endpoints.

A modelagem deve evoluir por domínio.

## 23.1. Primeiro domínio — autenticação e perfis

Prioridade:

```text
User
Role
AccountStatus
CandidateProfile
Evaluator
Admin
```

## 23.2. Segundo domínio — contexto de treinamento

Deve aguardar a validação suficiente da decisão:

```text
Vaga
OU
Área/Subárea
```

sem bloquear o primeiro domínio.

## 23.3. Terceiro domínio — entrevista

Exemplos de entidades/conceitos:

```text
Interview
Question
Response
Consent
MediaMetadata
```

## 23.4. Quarto domínio — avaliação e relatório

Exemplos:

```text
Assignment
Evaluation
EvaluationCriteria
Report
```

---

# 24. Contratos Front-end ↔ Back-end

A integração deve ocorrer por contrato.

Antes de cada integração relevante, registrar pelo menos:

- rota;
- método HTTP;
- autenticação necessária;
- role permitida;
- request;
- response;
- códigos de sucesso;
- erros;
- validações.

A primeira integração recomendada é autenticação.

O Back e o Front não devem esperar um ao outro ficar 100% pronto.

A integração pode começar quando houver:

```text
Page
+
Route
+
Contrato
+
Endpoint
```

---

# 25. Ordem recomendada de integração

```text
1. Auth
↓
2. Perfil
↓
3. Contexto de treinamento
↓
4. Entrevista
↓
5. Vídeo
↓
6. Atribuição
↓
7. Avaliação
↓
8. Relatório
↓
9. Gamificação
```

Essa ordem pode ser ajustada se dependências técnicas exigirem, mas a equipe deve priorizar integração vertical por fluxo.

---

# 26. Design System

O Front e o Codex devem utilizar o Design System oficial como referência.

O mínimo deve definir:

- cores;
- tipografia;
- espaçamentos;
- border radius;
- sombras;
- botões;
- inputs;
- cards;
- badges;
- modais;
- dropdowns;
- header;
- sidebar;
- feedback;
- ícones;
- gráficos;
- breakpoints;
- motion básico.

A entrega de 10/09 não exige um Design System completo ou Storybook completo.

Exige uma base consistente suficiente para evitar padrões diferentes entre telas e desenvolvedores.

---

# 27. Responsividade

A versão testável deve ser utilizável nos principais tamanhos previstos pela equipe.

Antes da migração estrutural, priorizar apenas problemas críticos:

- overflow grave;
- sidebar inutilizável;
- conteúdo inacessível;
- modal bloqueado;
- ações impossíveis de usar.

Após a organização em pages/layouts, realizar uma rodada mais ampla de responsividade nas telas do fluxo principal.

---

# 28. Qualidade e testes

A equipe deve evoluir gradualmente:

```text
build
typecheck
lint
testes
```

A ausência de uma suíte completa não deve impedir a migração estrutural, mas os fluxos da entrega devem ser validados antes do teste com a turma de RH.

Priorizar testes de:

- autenticação;
- autorização;
- perfil;
- entrevista;
- upload/acesso ao vídeo;
- avaliação;
- relatório;
- navegação;
- responsividade crítica.

---

# 29. Deploy

O deploy não deve ficar para o último dia.

Assim que existir um primeiro fluxo real minimamente integrável, a equipe deve publicar uma versão de teste e validar:

- build;
- variáveis de ambiente;
- conexão com API;
- banco;
- CORS;
- rotas;
- permissões;
- upload;
- acesso ao vídeo.

O ambiente deverá ser atualizado progressivamente até 10/09.

---

# 30. Funcionalidades fora da entrega obrigatória

Ficam fora da entrega obrigatória de 10/09:

- recuperação de senha;
- Nilo com voz;
- lip-sync;
- animação complexa do Nilo;
- Centro de Desenvolvimento;
- gamificação completa/avançada;
- Árvore de Talentos dinâmica avançada;
- IA de avaliação;
- transcrição avançada;
- feedback automático por IA;
- comparação humano x IA;
- integrações externas não aprovadas;
- notificações avançadas;
- dashboards analíticos avançados;
- histórico avançado;
- permissões administrativas sofisticadas;
- recursos que não contribuam diretamente para a validação do fluxo principal.

---

# 31. Decisões pendentes

As seguintes decisões ainda precisam ser registradas quando forem validadas:

## Produto

- vaga x área/subárea como contexto definitivo;
- gatilhos finais dos estados da Árvore de Talentos;
- recorte exato da gamificação base.

## Vídeo / infraestrutura

- provider de armazenamento;
- tamanho máximo;
- duração máxima;
- formatos;
- retenção;
- estratégia de acesso.

## Back-end

- detalhes finais da estratégia de sessão/token;
- hospedagem definitiva da API;
- demais decisões de infraestrutura ainda não formalizadas.

## Integrações externas

- Orango/Caixola;
- Empregare;
- outras integrações propostas.

Itens pendentes não devem ser tratados como decisões definitivas.

---

# 32. Critérios de pronto

A entrega será considerada testável quando os critérios essenciais abaixo estiverem atendidos.

## 32.1. Candidato

```text
✅ criar conta
✅ fazer login
✅ passar pelo onboarding
✅ acessar dashboard
✅ completar perfil mínimo
✅ definir contexto de treinamento conforme decisão aprovada
✅ iniciar entrevista
✅ gravar/enviar vídeo
✅ acompanhar status
✅ visualizar resultado após avaliação
✅ visualizar recorte de progresso/gamificação previsto
```

## 32.2. Avaliador

```text
✅ fazer login
✅ acessar dashboard
✅ visualizar fila
✅ abrir entrevista atribuída
✅ reproduzir vídeo autorizado
✅ preencher critérios/notas
✅ registrar feedback
✅ concluir avaliação
```

## 32.3. Administrador

```text
✅ acessar painel
✅ sustentar a existência/operação de avaliadores
✅ acompanhar entrevistas conforme recorte
✅ realizar ou sustentar atribuição mínima
✅ manter perguntas/critérios necessários ao fluxo
```

## 32.4. Sistema

```text
✅ autenticação funcional
✅ autorização por perfil
✅ persistência real das etapas críticas
✅ vídeo registrado e acessível ao perfil autorizado
✅ fluxo candidato → avaliador → candidato funcional
✅ itens fora do escopo claramente removidos, desabilitados ou “Em breve”
✅ build estável
✅ responsividade mínima aceitável
✅ ambiente de teste publicado
✅ testes internos realizados
```

---

# 33. Critérios de corte

Se houver risco de não cumprir a data, preservar primeiro:

1. autenticação;
2. onboarding;
3. perfil;
4. contexto mínimo da entrevista;
5. entrevista com vídeo;
6. avaliação humana;
7. resultado/relatório;
8. admin mínimo necessário;
9. gamificação base em versão simplificada;
10. Nilo estático;
11. Árvore em versão visual simplificada;
12. responsividade crítica;
13. deploy.

Antes de retirar qualquer item já confirmado como parte da entrega, a decisão deve ser registrada e alinhada com liderança/professor quando necessário.

A regra permanece:

> **Não substituir funcionalidade essencial por simulação enganosa.**

---

# 34. Principais riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Escopo excessivo | Atrasar fluxo principal | Simplificar recursos secundários e preservar o caminho crítico |
| Vídeo/upload atrasar | Bloquear candidato → avaliador | Prototipar e testar armazenamento cedo, limitar duração/tamanho |
| Front e Back desalinharem | Retrabalho | Contratos antes da integração e integração por fluxo |
| Migração estrutural gerar conflitos | Atrasos no Front | PRs pequenos e janela de migração por região |
| Design inconsistente | Retrabalho visual | Consolidar Design System base antes da migração pesada |
| Decisão vaga x área/subárea atrasar | Bloquear domínio de contexto | Manter arquitetura flexível e avançar auth/perfil em paralelo |
| Responsividade ruim | Prejudicar teste | Corrigir críticos agora e aprofundar após migração |
| Funcionalidade incompleta parecer pronta | Confundir usuários | Desabilitar/remover/usar “Em breve” |
| Deploy tardio | Descobrir problemas tarde | Publicar versões de teste progressivamente |

---

# 35. Prioridade de execução até o checkpoint

Antes da migração estrutural pesada:

## Liderança

```text
Escopo 10/09
↓
Mapa de Telas
↓
Design System base
↓
decisões pendentes registradas
```

## Front

```text
PRs atuais
↓
artefatos de protótipo
↓
bugs críticos
↓
responsividade crítica
↓
mocks/App.tsx mapeados
↓
rotas propostas
↓
limpeza segura
↓
build estável
```

## Back

```text
apps/api
↓
PostgreSQL/Prisma
↓
modelagem inicial
↓
migrations
↓
auth/roles
↓
contrato de autenticação
↓
endpoint inicial
```

---

# 36. Resumo final

A entrega de 10 de setembro deve transformar o RH Connect de um protótipo visual em uma versão testável com um fluxo real.

A prioridade é:

```text
Candidato
↓
Autenticação
↓
Onboarding
↓
Perfil
↓
Contexto de treinamento
↓
Entrevista com vídeo
↓
Avaliação humana
↓
Resultado/Relatório
↓
Progresso/Gamificação base
```

O projeto deve entregar ainda:

- Nilo em formato estático;
- Árvore de Talentos reformulada em versão visual;
- gamificação base;
- administração mínima para sustentar o fluxo;
- Front organizado e integrável;
- Back funcional para os fluxos críticos;
- persistência real;
- deploy de teste.

Ficam para evolução futura os recursos que aumentam significativamente a complexidade sem serem necessários para validar a versão de 10/09, incluindo Nilo com voz/lip-sync, Centro de Desenvolvimento, gamificação avançada, IA e integrações externas ainda não aprovadas.

> **Frase-guia:** para 10/09, o RH Connect deve ser menor que o produto final, mas o que estiver apresentado como funcional deve funcionar de verdade.
