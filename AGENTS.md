# AGENTS.md — RH Connect

**Versão do contexto técnico: 0.2**

> Instruções de contexto, arquitetura, segurança, escopo e modo de trabalho para agentes de código que atuem no repositório do RH Connect.

## 1. Objetivo deste arquivo

Este arquivo é a orientação principal para agentes de código que trabalhem no RH Connect.

Antes de sugerir ou executar alterações relevantes:

1. leia este `AGENTS.md`;
2. leia o `README.md`;
3. consulte a documentação aplicável em `/docs`;
4. inspecione o código existente;
5. identifique decisões já aprovadas e decisões ainda pendentes;
6. não transforme propostas em decisões definitivas por conta própria.

Quando houver conflito entre código, documentação e notas antigas, não escolha silenciosamente uma versão. Informe o conflito e peça validação quando necessário.

---

## 2. Sobre o RH Connect

O RH Connect é um projeto acadêmico do SENAC-DF voltado ao treinamento de candidatos para entrevistas de emprego.

A plataforma será web e responsiva, com experiência para computador, tablet e celular.

O fluxo principal da primeira versão funcional é:

`cadastro → perfil profissional → vaga → entrevista simulada → envio das respostas → avaliação humana → relatório`

A primeira versão deve funcionar de ponta a ponta com avaliação humana.

Os três perfis principais são:

- **Candidato**
- **Avaliador**
- **Administrador**

A prioridade do produto é entregar uma experiência confiável, responsiva, segura e demonstrável.

---

## 3. Hierarquia das fontes de verdade

Ao trabalhar no projeto, respeite esta ordem de precedência:

1. **Decisões aprovadas registradas em `/docs/01-produto-e-escopo/04-registro-de-decisoes.md` ou ADRs equivalentes**
2. **PRD do MVP v0.2**
3. **Especificações especializadas mais recentes**
   - Matriz de Permissões
   - Inventário e Especificação de Telas
   - documentos de UX/UI
   - documentos de Design System
   - arquitetura
   - modelo de dados
   - API
   - testes
   - segurança
4. **Protótipo 01 aprovado como referência visual**
5. **PRD preliminar v0.1**
6. **Plan Action, anotações de reunião e materiais operacionais**
7. **Código legado/exportado do Figma Make**

Regras:

- Uma decisão mais recente e explicitamente aprovada prevalece sobre uma proposta antiga.
- Documentos marcados como `Proposto`, `A definir`, `Futuro` ou equivalentes não devem ser tratados como decisão final.
- O código do protótipo não deve substituir requisitos aprovados.
- Não invente decisões para preencher lacunas.
- Se uma informação não estiver definida, mantenha-a como pendente.

---

## 4. Estado atual do projeto

O Protótipo 01 foi criado no Figma Make e é a principal referência visual atual.

O código exportado é útil como:

- referência visual;
- fonte de layouts;
- fonte de componentes já desenhados;
- fonte de textos e estados visuais;
- base para identificar padrões de Design System;
- ponto de partida para migração controlada.

Ele **não deve ser tratado automaticamente como arquitetura final**.

### 4.1 Achados já identificados no protótipo exportado

A auditoria inicial identificou:

- React;
- TypeScript;
- Vite;
- Tailwind CSS 4;
- componentes base inspirados em Radix/shadcn;
- tokens visuais em `theme.css`;
- Plus Jakarta Sans como tipografia predominante da interface;
- muitas telas do candidato já representadas;
- navegação atual baseada em estado local, não em rotas reais;
- autenticação simulada;
- cadastro simulado;
- câmera e microfone simulados;
- gravação simulada;
- upload simulado;
- dados mockados/hardcoded;
- ausência de integração real com API;
- ausência de banco de dados;
- ausência de área funcional completa de avaliador;
- ausência de área funcional completa de administrador;
- arquivo principal excessivamente concentrado, com grande quantidade de responsabilidades;
- componentes duplicados ou concorrentes;
- cores hardcoded além dos tokens existentes;
- dependências que podem não estar sendo utilizadas;
- ausência de uma estratégia completa de lint, testes e automação.

Não remova ou refatore grandes partes do protótipo sem antes produzir um plano e obter aprovação.

---

## 5. Objetivo da migração

O objetivo não é “continuar adicionando código ao protótipo”.

O objetivo é:

`preservar → auditar → estruturar → migrar gradualmente → integrar → testar`

A estratégia preferencial é reaproveitamento parcial e controlado:

- preservar a identidade visual aprovada;
- reaproveitar componentes úteis;
- consolidar o Design System;
- separar responsabilidades;
- substituir navegação simulada por rotas reais;
- separar mocks;
- criar camada de integração com API;
- implementar autenticação e autorização reais;
- implementar mídia real somente quando a fundação estiver pronta;
- evitar reescrita desnecessária do que já funciona visualmente.

---

## 6. Escopo funcional do MVP

O MVP deve priorizar o fluxo essencial.

### 6.1 Área pública

Inclui, conforme documentação vigente:

- página inicial;
- apresentação do produto;
- como funciona;
- login;
- cadastro;
- termos;
- privacidade.

### 6.2 Autenticação e contas

Deve contemplar:

- cadastro;
- login;
- recuperação de senha;
- redefinição de senha;
- encerramento de sessão;
- controle de conta;
- redirecionamento por perfil.

### 6.3 Candidato

O candidato deve conseguir:

- acessar o próprio dashboard;
- editar os próprios dados;
- manter perfil profissional;
- cadastrar e gerenciar vagas próprias;
- iniciar entrevista;
- testar câmera e microfone;
- gravar respostas;
- revisar respostas;
- enviar entrevista;
- acompanhar status;
- consultar histórico;
- consultar relatório liberado.

### 6.4 Avaliador

O avaliador deve conseguir:

- acessar dashboard próprio;
- visualizar entrevistas atribuídas;
- reproduzir vídeos autorizados;
- avaliar por critérios;
- registrar pontos fortes e melhorias;
- registrar recomendação;
- salvar rascunho;
- concluir avaliação;
- consultar histórico próprio.

### 6.5 Administrador

O administrador deve conseguir operar o fluxo:

- gerenciar usuários;
- gerenciar avaliadores;
- acompanhar entrevistas;
- atribuir avaliações;
- gerenciar perguntas;
- gerenciar critérios;
- gerenciar consentimentos;
- acessar configurações operacionais;
- registrar/consultar ações críticas conforme regras aprovadas.

---

## 7. Funcionalidades futuras e escopo protegido

Não implemente automaticamente funcionalidades futuras apenas porque aparecem em documentos ou protótipos.

Itens como estes devem permanecer fora do caminho crítico até aprovação explícita:

- IA supervisionada;
- avaliação automática;
- comparação humano x IA;
- transcrição avançada;
- automação de feedback;
- comentários temporais em vídeo;
- recursos avançados de gamificação;
- integrações externas não aprovadas;
- ranking de candidatos.

O PRD do MVP estabelece que a primeira versão deve funcionar **sem depender de API paga de IA**.

Nunca adicione serviço pago, assinatura, API comercial ou dependência que gere custo sem aprovação explícita.

---

## 8. Nilo e gamificação

Existe uma especificação v0.2 para Nilo e gamificação.

Trate-a como **proposta em discussão/validação**, não como obrigação automática do MVP, salvo decisão registrada posteriormente.

Princípios obrigatórios quando esses recursos forem utilizados:

- Nilo é guia/mentor, não avaliador;
- Nilo não atribui nota;
- Nilo não aprova ou reprova;
- Nilo não recomenda contratação;
- Nilo não aparece durante a gravação da entrevista;
- a gamificação é individual e não competitiva;
- não deve haver ranking entre candidatos;
- XP, níveis, missões e conquistas não alteram a nota;
- falhas técnicas não devem penalizar o usuário;
- a experiência não deve infantilizar o produto;
- acessibilidade não pode depender da presença do personagem.

Se o escopo de Nilo, Árvore de Talentos, XP, missões ou Centro de Desenvolvimento estiver incerto, consulte a decisão mais recente antes de implementar.

---

## 9. Permissões e autorização

A aplicação utiliza três perfis principais:

- `candidate`
- `evaluator`
- `admin`

Os nomes técnicos exatos podem ser ajustados pelo time, mas devem ser padronizados em todo o sistema.

Princípios:

- autorização deve ser aplicada no **Back-end**;
- esconder botão no Front-end não é controle de acesso;
- usar menor privilégio;
- candidato acessa apenas os próprios dados;
- avaliador acessa apenas entrevistas atribuídas e dados necessários;
- administrador possui gestão operacional conforme permissões aprovadas;
- ações críticas devem ser auditáveis;
- avaliações em rascunho não aparecem ao candidato;
- observações internas do avaliador nunca aparecem ao candidato;
- alteração de avaliação concluída deve seguir fluxo de reabertura e auditoria;
- consentimento de gravação não significa consentimento para treinamento de IA.

Nunca afrouxe uma regra de autorização para “facilitar” a implementação.

---

## 10. Privacidade, consentimento e dados sensíveis

O projeto trabalha com:

- dados pessoais;
- dados profissionais;
- imagem;
- voz;
- vídeos;
- avaliações;
- consentimentos.

Regras:

- coletar somente dados necessários;
- registrar consentimentos com data e versão;
- separar consentimento de gravação/avaliação de eventual consentimento de IA;
- nunca utilizar dados para IA sem autorização específica quando exigida pelo projeto;
- nunca expor senhas;
- senhas devem ser armazenadas de forma segura no Back-end;
- vídeos não devem possuir URLs públicas permanentes sem decisão de segurança;
- acesso a vídeos deve ser controlado;
- exclusões devem considerar retenção, histórico, relatórios e auditoria;
- não registrar segredos em logs;
- não inserir dados reais de usuários em mocks ou testes.

---

## 11. Vídeos e mídia

O projeto requer gravação de vídeo no navegador.

Princípios arquiteturais:

- vídeo deve ser armazenado fora do banco relacional;
- banco mantém metadados e referência segura;
- upload precisa indicar progresso;
- falhas devem ser visíveis;
- nunca confirmar envio sem confirmação real do servidor;
- falha técnica não deve causar perda silenciosa;
- acesso ao vídeo deve respeitar perfil e atribuição;
- duração, tamanho, retenção, formatos e política de regravação ainda podem depender de decisão.

Antes do módulo definitivo de entrevista, realizar prova técnica controlada de:

- câmera;
- microfone;
- gravação;
- reprodução;
- upload;
- falha/retry;
- mobile.

---

## 12. Diretrizes de UX/UI

Princípios de experiência:

- clareza antes de complexidade;
- cada tela deve indicar a próxima ação;
- experiência profissional, educacional e tecnológica;
- reduzir ansiedade do candidato;
- feedback deve ser acionável;
- transparência sobre gravação, dados e avaliação;
- consistência entre componentes e estados;
- responsividade real, não apenas redução de tamanho.

Direção visual documentada:

- base clara;
- azul como cor principal;
- azul-escuro para hierarquia;
- verde para resultado positivo;
- amarelo para atenção;
- vermelho suave para problemas;
- cards;
- gráficos simples;
- ícones claros;
- tipografia legível.

Não altere identidade, cores oficiais, tipografia ou comportamento visual aprovado sem solicitação.

---

## 13. Responsividade

A aplicação deve funcionar em desktop, tablet e celular.

### Desktop

- sidebar fixa ou recolhível;
- múltiplas colunas quando adequado;
- tabelas completas;
- vídeo e formulário lado a lado quando houver espaço.

### Tablet

- sidebar recolhível;
- uma ou duas colunas;
- tabelas com rolagem ou adaptação;
- vídeo acima ou ao lado conforme espaço.

### Celular

- navegação compacta;
- cards em coluna;
- formulários adaptados;
- vídeo usando a largura disponível;
- controles grandes;
- ações principais claras;
- tabelas podem virar cards;
- evitar overflow horizontal acidental.

Toda alteração visual relevante deve ser verificada em múltiplos breakpoints.

---

## 14. Acessibilidade

Sempre considerar:

- contraste adequado;
- navegação por teclado;
- foco visível;
- labels associados aos campos;
- mensagens de erro compreensíveis;
- não depender apenas de cor;
- ícones importantes acompanhados de texto ou nome acessível;
- botões com área de interação adequada;
- linguagem clara;
- estado de gravação perceptível visual e textualmente;
- compatibilidade progressiva com leitores de tela.

Não remover acessibilidade existente para simplificar código.

---

## 15. Design System

O Design System deve ser consolidado a partir da identidade aprovada e da auditoria do Protótipo 01.

### 15.1 Não criar um Design System arbitrário

Antes de alterar tokens:

1. inventarie o que existe;
2. identifique duplicações;
3. identifique hardcodes;
4. compare com a identidade aprovada;
5. proponha consolidação;
6. aguarde validação em mudanças visuais relevantes.

### 15.2 Categorias de tokens

Esperadas:

- cores;
- tipografia;
- spacing;
- radius;
- sombras;
- breakpoints;
- ícones;
- estados;
- motion quando aprovado.

Preferir nomes semânticos, por exemplo:

- `brand-primary`
- `brand-secondary`
- `surface-default`
- `surface-muted`
- `text-primary`
- `text-secondary`
- `border-default`
- `status-success`
- `status-warning`
- `status-danger`

Evitar espalhar valores hexadecimais diretamente por componentes.

### 15.3 Componentes fundamentais

Priorizar consolidação de:

- Button
- Input
- PasswordInput
- Checkbox
- Select
- Textarea
- Card
- Badge
- Alert
- Modal/Dialog
- Toast
- FormField
- Loading/Skeleton
- Tooltip

Depois:

- Sidebar
- TopBar/Header
- PageHeader
- EmptyState
- DataTable
- Pagination
- Filters
- StatusBadge
- Tabs

Componentes específicos de entrevista e avaliação devem ser criados quando o fluxo correspondente entrar em implementação.

---

## 16. Stack técnica — adotada provisoriamente para a versão técnica inicial

Para permitir o avanço estruturado do RH Connect, as tecnologias abaixo devem ser consideradas a base vigente desta versão técnica inicial.

Estas decisões são **provisórias e revisáveis**: podem ser alteradas futuramente caso a equipe identifique impedimento técnico relevante ou registre uma decisão posterior. Até que isso ocorra, o agente deve utilizá-las como referência para planejamento e implementação.

### 16.1 Front-end

- React
- TypeScript
- Vite
- React Router
- React Hook Form
- Zod
- TanStack Query
- Storybook
- Vitest
- React Testing Library
- Cypress

### 16.2 Back-end

- Node.js
- TypeScript
- NestJS
- Prisma
- OpenAPI / Swagger UI
- Jest
- Supertest

### 16.3 Banco de dados

Banco adotado provisoriamente:

- MySQL

Motivo atual: familiaridade da equipe e adequação aos requisitos relacionais do MVP.

Não substituir por PostgreSQL ou outro banco sem uma decisão posterior registrada.

### 16.4 Qualidade e automação

- ESLint
- Prettier
- GitHub Actions
- testes automatizados adequados por camada

### 16.5 Versionamento e colaboração

- Git
- GitHub
- `main` como branch principal estável
- branches por tarefa
- Pull Requests para integração de mudanças
- GitHub Projects como quadro técnico de execução quando configurado

### 16.6 Deploy e infraestrutura

Adotado provisoriamente:

- Vercel para o deploy do Front-end (`apps/web`)

Ainda a definir:

- hospedagem da API;
- armazenamento dos vídeos;
- política de retenção;
- estratégia final de autenticação/sessão.

Não adicionar serviços pagos ou provedores adicionais sem justificativa e aprovação.

Não instale bibliotecas em massa apenas porque aparecem nesta seção. Verifique a necessidade da etapa atual e mantenha mudanças pequenas e revisáveis.

---

## 17. Arquitetura desejada

Para esta versão técnica inicial, adotar provisoriamente um **monorepositório**. Esta estrutura poderá ser revisada futuramente se houver decisão técnica registrada.

Estrutura de referência:

```text
rh-connect/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── config/
├── docs/
├── .github/
├── .env.example
├── .gitignore
├── README.md
└── AGENTS.md
```

### Responsabilidades

`apps/web`
- aplicação Front-end;
- páginas;
- rotas;
- integração com API;
- estados de UI.

`apps/api`
- API;
- autenticação;
- autorização;
- regras de negócio;
- acesso ao banco;
- integrações de infraestrutura.

`packages/ui`
- componentes reutilizáveis;
- tokens;
- Design System compartilhável.

`packages/types`
- tipos realmente compartilhados quando fizer sentido.

`packages/validation`
- schemas compartilháveis somente quando a estratégia técnica aprovada permitir.

`docs`
- documentação versionada do projeto.

Não crie abstrações compartilhadas prematuramente. Compartilhe apenas o que tiver uso real.

---

## 18. Organização recomendada do Front-end

Referência inicial:

```text
apps/web/src/
├── app/
│   ├── router/
│   ├── providers/
│   └── App.tsx
├── pages/
│   ├── public/
│   ├── auth/
│   ├── candidate/
│   ├── evaluator/
│   └── admin/
├── features/
│   ├── auth/
│   ├── profile/
│   ├── jobs/
│   ├── interviews/
│   ├── evaluations/
│   └── reports/
├── components/
│   ├── ui/
│   └── shared/
├── layouts/
├── services/
│   └── api/
├── hooks/
├── types/
├── mocks/
└── styles/
```

Esta estrutura é uma referência, não uma licença para mover tudo de uma vez.

Ao migrar:

- faça mudanças pequenas;
- preserve comportamento visual;
- execute build/testes;
- reporte o que foi alterado;
- evite um “big bang refactor”.

---

## 19. Mocks e dados temporários

Mocks são permitidos durante a migração, desde que claramente separados.

Preferir:

```text
mocks/
├── questions.ts
├── jobs.ts
├── reports.ts
└── interviews.ts
```

Não misturar dados fictícios com lógica de página.

Quando a API real existir:

- substituir mocks de maneira incremental;
- manter interfaces/contratos estáveis;
- remover mocks obsoletos.

Nunca apresentar mock como integração real.

---

## 20. Contratos de API

Antes de Front-end e Back-end implementarem juntos um fluxo, devem alinhar o contrato da API.

O contrato deve especificar:

- método HTTP;
- rota;
- autenticação necessária;
- campos de entrada;
- tipos;
- campos obrigatórios;
- formato de sucesso;
- formato de erro;
- códigos HTTP;
- regras de autorização;
- estados relevantes.

Primeiros contratos prioritários:

- cadastro;
- login;
- logout/sessão;
- recuperação de senha;
- usuário autenticado/perfil.

Documentar em OpenAPI/Swagger e/ou `/docs/06-api`.

Não alterar unilateralmente contratos compartilhados sem sinalizar impacto para a outra camada.

---

## 21. Formato de erros

A API deve manter padrão consistente.

Exemplo conceitual:

```json
{
  "statusCode": 401,
  "code": "INVALID_CREDENTIALS",
  "message": "E-mail ou senha inválidos."
}
```

Regras:

- não vazar detalhes sensíveis;
- não revelar indevidamente se uma conta existe;
- mensagens devem ser utilizáveis pelo Front-end;
- códigos internos devem ser estáveis o suficiente para tratamento;
- erros esperados e inesperados devem ser distinguíveis.

---

## 22. Git e colaboração

Para esta versão técnica inicial, Git e GitHub são adotados provisoriamente como base de versionamento e colaboração.

Princípios:

- não desenvolver diretamente na `main`;
- cada tarefa relevante deve possuir Issue;
- cada tarefa deve ter branch própria;
- mudanças entram por Pull Request;
- Pull Requests devem ser pequenos e revisáveis;
- Front-end deve ser revisado por responsável técnico do Front;
- Back-end deve ser revisado por responsável técnico do Back;
- contratos e mudanças compartilhadas devem envolver ambos;
- conflitos devem ser resolvidos antes do merge;
- não usar force push em branch protegida;
- não commitar segredos.

### Nomenclatura sugerida

```text
feature/web-login
feature/api-login
feature/database-users
feature/design-system-button
fix/sidebar-mobile
docs/api-authentication
refactor/auth-structure
test/login-flow
```

---

## 23. GitHub Projects

O GitHub Projects será o quadro oficial de execução técnica quando configurado.

Fluxo sugerido:

- Backlog
- Pronta para iniciar
- Em andamento
- Em revisão
- Em teste
- Bloqueada
- Concluída

Cada Issue deve, quando aplicável, conter:

- responsável;
- equipe;
- prioridade;
- sprint;
- prazo;
- dependências;
- revisor;
- critérios de aceite.

O Figma/FigJam pode ser usado para planejamento visual, mas não deve substituir o acompanhamento técnico no GitHub.

---

## 24. Segurança de segredos e ambiente

Nunca commitar:

- `.env`;
- senha de banco;
- JWT secret;
- tokens privados;
- chaves administrativas;
- credenciais SMTP;
- service keys;
- credenciais de armazenamento.

Manter apenas:

```text
.env.example
```

com nomes das variáveis e sem valores reais.

Todo segredo deve existir apenas no ambiente adequado.

Tudo enviado ao navegador deve ser considerado potencialmente público.

---

## 25. Testes e Definition of Done

Teste não é etapa exclusiva do final do projeto.

### Front-end

Proposta:

- Vitest
- React Testing Library
- Cypress para fluxos E2E

### Back-end

Proposta:

- Jest
- Supertest

### Automação

Proposta:

- lint;
- build;
- testes;
- GitHub Actions em Pull Requests.

Uma tarefa não deve ser considerada concluída apenas porque “aparece na tela”.

Quando aplicável, verificar:

- critério de aceite;
- sucesso;
- loading;
- erro;
- vazio;
- autorização;
- responsividade;
- acessibilidade;
- build;
- testes;
- ausência de segredos;
- documentação relevante.

---

## 26. Critérios gerais do MVP

Use os critérios de aceite documentados como referência.

Entre os resultados essenciais:

- candidato cria conta e acessa dashboard;
- candidato completa perfil e cadastra vaga;
- sistema solicita e valida câmera/microfone;
- candidato grava, reproduz e envia resposta;
- status da entrevista é consistente;
- administrador atribui entrevista;
- avaliador reproduz vídeo e avalia;
- rascunho não é visível ao candidato;
- relatório é exibido após conclusão/liberação;
- perfis não acessam áreas indevidas;
- fluxo funciona em desktop e mobile representativo;
- falha de upload não gera confirmação falsa;
- consentimento de gravação é registrado.

---

## 27. Decisões que NÃO devem ser inventadas pelo agente

Caso ainda não estejam em decisão aprovada, não escolha sozinho:

- modelo final de autenticação/sessão;
- hospedagem da API;
- armazenamento de vídeos;
- política de retenção;
- duração máxima de resposta;
- quantidade de perguntas;
- quantidade de regravações;
- possibilidade de pausa;
- acesso do candidato ao vídeo após envio;
- exclusão de vídeo;
- identificação exibida ao avaliador;
- escala de avaliação;
- pesos;
- fórmula da nota;
- liberação automática/manual do relatório;
- fluxo de revisão;
- notificações;
- materiais no MVP;
- navegadores oficiais;
- escopo exato de gamificação;
- escopo exato da Árvore de Talentos;
- escopo exato de Nilo;
- qualquer integração paga.

Quando encontrar uma dessas lacunas, sinalize:

- o que precisa ser decidido;
- impacto técnico;
- alternativas;
- recomendação opcional;
- bloqueio ou não bloqueio da tarefa atual.

---

## 28. Áreas profissionais iniciais

A documentação complementar atual trabalha com trilhas relacionadas a:

- Tecnologia da Informação;
- Gestão / Recursos Humanos;
- Secretariado.

Estruturas de cargos, níveis, competências e trilhas devem ser modeladas de modo extensível para permitir novas áreas futuramente.

Não hardcodar regras de domínio de forma que apenas três áreas possam existir.

---

## 29. Regras de alteração pelo agente

### Antes de editar

Para mudanças médias ou grandes:

1. explique o diagnóstico;
2. liste arquivos afetados;
3. proponha plano;
4. indique riscos;
5. aguarde aprovação quando solicitado.

### Durante a edição

- preserve comportamento não relacionado;
- faça mudanças pequenas;
- não renomeie dezenas de arquivos sem necessidade;
- não instale dependências sem justificar;
- não altere identidade visual silenciosamente;
- não “limpe” código apagando funcionalidades que parecem não utilizadas sem verificar;
- não altere contratos compartilhados sem informar;
- não faça migração de banco destrutiva sem aprovação.

### Depois de editar

Reporte:

- arquivos criados;
- arquivos alterados;
- arquivos removidos;
- dependências adicionadas/removidas;
- comandos executados;
- testes executados;
- resultado do build;
- pendências;
- riscos ou decisões necessárias.

---

## 30. Refatoração do protótipo

Ao trabalhar no código exportado do Figma Make:

### Fazer

- preservar uma cópia original;
- mapear componentes atuais;
- extrair componentes aos poucos;
- criar rotas reais gradualmente;
- separar dados mockados;
- consolidar tokens;
- reduzir hardcodes;
- limpar dependências somente após verificação;
- criar layouts;
- criar camada de API;
- adicionar testes progressivamente.

### Não fazer

- reescrever tudo de uma vez;
- mover todos os arquivos numa única tarefa;
- alterar aparência em massa durante refatoração estrutural;
- substituir bibliotecas apenas por preferência pessoal;
- adicionar arquitetura complexa sem necessidade;
- transformar TODO/Futuro em funcionalidade atual;
- apresentar simulação como implementação real.

---

## 31. Primeira fase técnica recomendada

A fundação inicial deve priorizar:

1. preservar o ZIP original;
2. criar/validar estrutura do repositório;
3. validar stack;
4. decidir banco;
5. configurar Front e Back;
6. configurar lint/format/testes mínimos;
7. consolidar Design System mínimo;
8. criar rotas reais iniciais;
9. documentar contratos de autenticação;
10. preparar cadastro/login/sessão;
11. criar primeira integração real Front + API + banco;
12. validar redirecionamento por perfil.

Primeira entrega funcional recomendada:

`cadastro → login → sessão → perfil do usuário → dashboard correspondente`

---

## 32. Modo de trabalho esperado do Codex/agente

Quando receber uma solicitação vaga como:

> “organize o projeto”

não execute uma refatoração ampla imediatamente.

Primeiro:

- inspecione;
- explique o estado atual;
- proponha opções;
- recomende uma abordagem;
- identifique decisões pendentes.

Quando receber:

> “analise”

não modifique arquivos.

Quando receber:

> “implemente somente a etapa X”

não avance para etapas seguintes sem autorização.

Quando uma solução simples atender, prefira-a a arquitetura desnecessariamente complexa.

---

## 33. Checklist antes de qualquer Pull Request

- [ ] O escopo da Issue foi respeitado?
- [ ] Alguma decisão pendente foi tratada como definitiva sem aprovação?
- [ ] O comportamento visual aprovado foi preservado quando aplicável?
- [ ] A autorização está no Back-end quando necessária?
- [ ] Nenhum segredo foi commitado?
- [ ] O código está tipado adequadamente?
- [ ] Estados de loading/erro/vazio foram considerados quando aplicável?
- [ ] Responsividade foi verificada?
- [ ] Acessibilidade básica foi preservada?
- [ ] Testes relevantes foram executados?
- [ ] O build passa?
- [ ] Contratos/documentação foram atualizados quando necessário?
- [ ] O PR explica o que mudou e como testar?

---

## 34. Documentos recomendados no repositório

Estrutura sugerida:

```text
docs/
├── 00-fontes-originais/
├── 01-produto-e-escopo/
│   ├── PRD_RH_Connect_v0.2.docx
│   └── 04-registro-de-decisoes.md
├── 02-ux/
│   └── Inventario_e_Especificacao_de_Telas.docx
├── 03-design/
│   ├── design-system.md
│   └── nilo-e-gamificacao.pdf
├── 04-arquitetura/
│   └── architecture.md
├── 05-modelo-de-dados/
├── 06-api/
├── 07-testes/
├── 08-seguranca-e-permissoes/
│   └── Matriz_de_Permissoes.docx
└── 09-gestao/
    └── plan-action.pdf
```

Arquivos binários/originais podem ser preservados, mas decisões técnicas importantes devem gradualmente ganhar versões Markdown fáceis de consultar e versionar.

---

## 35. Registro de decisões

Criar ADRs ou registros equivalentes para decisões que afetem arquitetura.

Exemplos:

```text
docs/04-arquitetura/decisions/
├── ADR-001-banco-de-dados.md
├── ADR-002-estrutura-do-repositorio.md
├── ADR-003-stack-frontend.md
├── ADR-004-stack-backend.md
├── ADR-005-autenticacao.md
└── ADR-006-armazenamento-de-videos.md
```

Cada ADR deve conter:

- status;
- contexto;
- decisão;
- alternativas consideradas;
- motivo;
- consequências;
- data;
- responsáveis/validadores quando aplicável.

Um agente não deve alterar uma decisão `Aprovada` sem solicitar revisão explícita.

---

## 36. Regra final

O objetivo do agente é ajudar a equipe a transformar o Protótipo 01 em um produto funcional **sem perder as decisões de produto e sem criar arquitetura desnecessária**.

Prioridades:

1. preservar requisitos e identidade;
2. reduzir risco;
3. manter código compreensível;
4. permitir trabalho colaborativo;
5. garantir segurança e permissões;
6. testar progressivamente;
7. documentar decisões;
8. entregar o fluxo principal antes de funcionalidades futuras.

Quando houver dúvida entre “inventar” e “perguntar”, pergunte.

Quando houver dúvida entre “reescrever tudo” e “migrar com segurança”, migre com segurança.

Para decisões relacionadas à identidade visual, tokens e componentes do Design System, consulte:

`docs/03-design/design-system.md`