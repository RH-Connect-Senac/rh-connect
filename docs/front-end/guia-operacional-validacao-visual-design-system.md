# Guia Operacional — Validação Visual do Design System

## RH Connect — Pré-Migração Estrutural

**Objetivo:** orientar a equipe Front-end responsável pela validação visual do Design System atual do RH Connect.

---

# 1. Objetivo desta atividade

Esta atividade existe para transformar a auditoria técnica já realizada em uma validação visual e prática da interface atual do RH Connect.

A auditoria técnica identificou padrões existentes, duplicações, hardcodes, componentes concorrentes e pontos ainda não consolidados. Agora a equipe deve observar o produto funcionando e comparar as telas para responder, com evidências:

- quais padrões visuais realmente se repetem;
- quais variações parecem intencionais;
- quais variações parecem apenas inconsistências do protótipo;
- quais elementos deveriam futuramente ser consolidados;
- quais pontos ainda dependem de decisão;
- quais padrões visuais representam melhor a identidade já aprovada do RH Connect.

Esta etapa **não é implementação**.

O objetivo é produzir informação confiável para que, depois, seja possível consolidar o **Design System v0.1** antes de aplicá-lo estruturalmente no código.

---

# 2. O que esta atividade NÃO é

Durante esta tarefa, não deve ser feito:

- redesign do RH Connect;
- alteração de cores por preferência pessoal;
- alteração de tipografia por preferência pessoal;
- substituição de componentes;
- refatoração de `App.tsx`;
- criação de novos componentes oficiais;
- troca de bibliotecas;
- remoção de componentes existentes;
- padronização direta no código;
- alteração de `theme.css`;
- alteração de `components/ui`;
- implementação de uma nova identidade visual;
- decisão individual de qual padrão será oficial.

A responsabilidade da equipe nesta fase é:

```text
OBSERVAR
+
COMPARAR
+
REGISTRAR
+
JUSTIFICAR
+
RECOMENDAR
```

A decisão oficial será consolidada depois.

---

# 3. Referências obrigatórias

Antes de iniciar a análise, cada responsável deve consultar:

```text
1. Aplicação atual em apps/web
2. Protótipo visual aprovado
3. docs/front-end/auditoria-design-system.md
4. documento atual do Design System
5. mapa de telas do Front-end
6. plano operacional da Pré-Migração Estrutural
```

A auditoria técnica deve ser usada como **ponto de partida**, não como decisão final.

Importante:

> A existência de um componente no código não significa que ele seja automaticamente o componente oficial do Design System.

Por exemplo, podem existir componentes em `components/ui` e, ao mesmo tempo, versões locais visualmente mais próximas do protótipo aprovado.

---

# 4. Preparação do ambiente

Antes de começar:

## 4.1 Atualizar a base

```bash
git checkout main
git pull origin main
```

## 4.2 Instalar dependências

```bash
pnpm install
```

## 4.3 Rodar o Front-end

Na raiz:

```bash
pnpm run dev:web
```

Ou dentro de `apps/web`:

```bash
pnpm run dev
```

## 4.4 Confirmar que a aplicação abre normalmente

Antes de analisar qualquer componente, verifique:

- aplicação abre;
- telas principais carregam;
- sidebar aparece;
- header aparece;
- navegação simulada funciona;
- não há erro crítico bloqueando a visualização.

---

# 5. Método oficial de análise

Para cada elemento recebido, seguir esta sequência:

```text
1. Ler o que a auditoria técnica encontrou
↓
2. Localizar o elemento no produto
↓
3. Ver onde ele aparece
↓
4. Comparar Candidato / Avaliador / Admin quando aplicável
↓
5. Comparar com o protótipo aprovado
↓
6. Identificar o padrão predominante
↓
7. Registrar variações
↓
8. Classificar se a variação parece necessária ou inconsistente
↓
9. Reunir evidências
↓
10. Fazer recomendação
↓
11. Manter decisão oficial como PENDENTE
```

---

# 6. O que significa “padrão predominante”

O padrão predominante é a versão que:

- aparece com maior frequência;
- parece mais coerente com o restante do sistema;
- está visualmente mais próxima da referência aprovada;
- funciona melhor entre diferentes telas e perfis;
- parece ter sido usada como base em outras partes do produto.

Não escolher um padrão apenas porque:

- está em `components/ui`;
- parece tecnicamente mais moderno;
- o responsável prefere aquele estilo;
- pertence ao shadcn/Radix;
- é visualmente mais bonito isoladamente.

---

# 7. Como identificar uma inconsistência

Uma inconsistência existe quando elementos que exercem o mesmo papel apresentam diferenças sem uma justificativa aparente.

Exemplo:

```text
Tela A
Botão principal:
altura 44px
radius grande
azul escuro
texto branco

Tela B
Botão principal:
altura menor
radius médio
azul diferente
texto branco

Tela C
Botão principal:
mesma função
hover diferente
```

Nesse caso, registrar:

```text
Existem múltiplas representações visuais para o mesmo tipo de ação primária.
```

Não escrever apenas:

```text
Os botões estão diferentes.
```

A análise deve dizer **como** estão diferentes e **onde**.

---

# 8. Como registrar evidências

Sempre que uma diferença visual for relevante, registrar evidência.

Pode ser:

- print da tela;
- nome da tela;
- perfil;
- nome do componente;
- caminho aproximado do arquivo;
- trecho visual descrito;
- comparação entre duas telas.

Não é necessário tirar print de tudo.

Priorizar evidências de:

- inconsistências claras;
- padrões concorrentes;
- elementos difíceis de decidir;
- diferenças entre perfis;
- possíveis desvios da identidade aprovada.

Sugestão de nome para imagens:

```text
design-system/
├── foundations/
├── componentes-basicos/
├── componentes-estruturais/
└── estados-comportamento/
```

Exemplo:

```text
button-primary-candidato-dashboard.png
button-primary-admin-evaluators.png
sidebar-candidato.png
sidebar-avaliador.png
```

---

# 9. Divisão recomendada da equipe

A validação deve ser dividida por tipo de elemento, e não por perfil.

O motivo é permitir comparação horizontal entre Candidato, Avaliador e Administrador.

## Responsável A — Foundations

Analisar:

- cores;
- tipografia;
- escala tipográfica;
- pesos;
- spacing;
- radius;
- bordas;
- sombras;
- ícones;
- breakpoints;
- princípios básicos de motion.

### Perguntas principais

- Qual azul realmente representa a ação primária?
- Quais cores são identidade e quais são apenas hardcodes?
- Existem cores semânticas consistentes para sucesso, alerta e erro?
- Plus Jakarta Sans é usada de forma consistente?
- Poppins aparece apenas em logo/wordmark?
- Há escala coerente de títulos?
- Quais espaçamentos mais se repetem?
- Há excesso de radius diferentes?
- As sombras possuem função consistente?
- Lucide parece ser o padrão real de ícones?
- Os breakpoints seguem uma lógica consistente?

---

## Responsável B — Componentes básicos

Analisar:

- Button;
- Input;
- Password Input, quando existir;
- Textarea;
- Select;
- Checkbox;
- Radio;
- Switch;
- Form Field;
- Card;
- Badge;
- Alert;
- Tooltip.

### Perguntas principais

- Existem versões diferentes do mesmo botão?
- Qual botão aparece mais próximo do visual aprovado?
- Estados hover/disabled/loading são consistentes?
- Inputs possuem mesma altura, borda, radius e foco?
- Cards seguem estrutura semelhante?
- Badges representam estados de forma consistente?
- Campos de formulário usam labels, mensagens e erros de forma coerente?

A auditoria já identificou concorrência entre componentes base e versões locais. A atividade deve validar visualmente qual direção representa melhor o produto.

---

## Responsável C — Componentes estruturais

Analisar:

- Sidebar;
- Header / TopBar;
- Dialog / Modal;
- Dropdown;
- Popover;
- Tabs;
- Toast;
- Table;
- Page Header;
- navegação visual;
- menus de perfil/notificação.

### Perguntas principais

- Candidato, Avaliador e Admin usam estruturas realmente diferentes ou apenas implementações duplicadas?
- Sidebars mantêm o mesmo comportamento visual?
- Headers possuem mesma altura, hierarquia e distribuição?
- Modais possuem padrões concorrentes?
- Dropdowns/popovers seguem a mesma linguagem visual?
- Tabs possuem múltiplas implementações para a mesma função?
- Toasts são consistentes?
- Tabelas possuem mesma densidade, cabeçalho e estados?

---

## Responsável D — Estados, comportamento e visualização de dados

Analisar:

- loading;
- skeleton;
- empty state;
- error;
- success;
- warning;
- disabled;
- responsividade;
- gráficos;
- animações;
- transições;
- feedback visual;
- comportamento em mobile/tablet.

### Perguntas principais

- Loading possui padrão único?
- Existem telas sem estado vazio?
- Erros são apresentados da mesma forma?
- Success e warning possuem cores/ícones consistentes?
- Disabled é reconhecível?
- Gráficos seguem as mesmas cores e regras?
- Uso direto de Recharts e wrapper de chart produz diferenças?
- Motion está sendo usada com propósito ou de forma pontual?
- Há animações excessivas ou inconsistentes?
- O comportamento em mobile preserva a identidade?

---

# 10. Escopo de telas a percorrer

Cada responsável deve verificar seu bloco nas telas onde ele realmente aparece.

Priorizar:

## Público/Auth

- Landing;
- Login;
- Cadastro;
- Termos/Privacidade quando relevantes.

## Candidato

- Onboarding;
- Dashboard;
- Perfil;
- início da entrevista;
- consentimento;
- preparação;
- teste técnico;
- gravação;
- revisão;
- status;
- relatório;
- Meu Desenvolvimento.

## Avaliador

- Onboarding;
- Dashboard;
- fila;
- avaliação;
- revisão;
- conclusão.

## Administrador

- Onboarding;
- Dashboard;
- Avaliadores;
- Entrevistas;
- Atribuições;
- Perguntas/Critérios quando disponíveis.

Não é necessário analisar componentes inexistentes em determinada tela.

---

# 11. Formato obrigatório de registro por elemento

Para cada elemento analisado, usar:

```text
Elemento analisado:

Responsável:

Bloco:
[ ] Foundations
[ ] Componentes básicos
[ ] Componentes estruturais
[ ] Estados e comportamento

Telas verificadas:

Perfis verificados:
[ ] Público
[ ] Candidato
[ ] Avaliador
[ ] Administrador

Arquivos relacionados, se encontrados:

Padrão predominante observado:

Variações encontradas:

Inconsistências identificadas:

A diferença parece:
[ ] necessária
[ ] possivelmente necessária
[ ] inconsistente
[ ] não foi possível concluir

Impacto percebido:

Referência visual mais coerente:

Evidências:

Recomendação:
[ ] Manter
[ ] Consolidar / Padronizar
[ ] Ajustar
[ ] Substituir futuramente
[ ] Remover futuramente
[ ] Criar / Definir padrão
[ ] Investigar mais

Justificativa:

Nível de confiança:
[ ] Alto
[ ] Médio
[ ] Baixo

Decisão oficial:
PENDENTE
```

---

# 12. Como escrever uma boa recomendação

## Ruim

```text
Usar esse botão porque está mais bonito.
```

## Bom

```text
Recomenda-se usar esta variação como referência para consolidação porque ela aparece nas principais telas do Candidato e do Avaliador, mantém o azul predominante do produto, possui estados de hover/disabled mais consistentes e está visualmente alinhada ao protótipo aprovado.
```

A recomendação deve sempre possuir justificativa observável.

---

# 13. Classificações permitidas

## Manter

O padrão atual é consistente e não apresenta necessidade evidente de mudança.

## Consolidar / Padronizar

Existem múltiplas versões do mesmo elemento e deve existir uma versão oficial posteriormente.

## Ajustar

O padrão está próximo do esperado, mas precisa de pequenas correções.

## Substituir futuramente

O elemento atual não parece adequado como padrão definitivo, mas não deve ser trocado nesta etapa.

## Remover futuramente

O padrão parece redundante ou legado, mas nenhuma remoção deve acontecer durante esta análise.

## Criar / Definir padrão

O sistema utiliza o conceito, mas não existe ainda uma representação oficial consistente.

## Investigar mais

Não há evidência suficiente para recomendar uma direção.

---

# 14. Pontos já identificados pela auditoria que exigem atenção

A auditoria técnica já encontrou alguns conflitos importantes.

A equipe deve validá-los visualmente.

## Temas e cores

Existem arquivos e valores concorrentes envolvendo:

```text
theme.css
default_shadcn_theme.css
hardcodes Tailwind
hex inline
SVGs com cores fixas
```

Verificar qual direção realmente representa o RH Connect.

## Button

Existe componente base e versões locais.

Não assumir automaticamente que `components/ui/Button` deve substituir os demais.

## Card

Existem diferenças de radius, padding e estrutura.

## Badge

Há componente base e badges/status semânticos locais.

## Inputs

Existem componentes base e helpers/campos locais.

## Sidebar

Há sidebar base e implementações específicas dos perfis.

## Header

Há estruturas separadas como:

```text
TopBar
AdminTopBar
EvalTopBar
```

Verificar quanto realmente deveria ser compartilhado.

## Modais

Existem componentes base e modais manuais.

## Tabs e filtros

Existem implementações diferentes.

## Toasts

Há wrapper e uso direto.

## Gráficos

Existem uso direto de Recharts e wrapper de chart.

## Estados

Loading, empty, error, success e disabled ainda não possuem um padrão transversal consolidado.

---

# 15. Atenção à identidade aprovada

O objetivo não é transformar o RH Connect em um template genérico.

A direção visual existente deve ser preservada quando coerente.

A análise deve considerar:

- aparência profissional;
- aparência tecnológica;
- linguagem educacional;
- base clara quando aplicável;
- azul como cor principal;
- azul escuro para hierarquia;
- estados visuais compreensíveis;
- tipografia legível;
- consistência entre perfis;
- evitar aparência excessivamente burocrática ou genérica.

---

# 16. Responsividade durante a validação

A análise visual também deve considerar:

```text
Desktop
Notebook
Tablet
Mobile
```

Não é necessário corrigir problemas nesta tarefa.

Registrar quando:

- componente perde legibilidade;
- sidebar fica inadequada;
- header quebra;
- botão fica espremido;
- tabela fica inutilizável;
- card perde hierarquia;
- modal fica bloqueado;
- estado visual desaparece;
- gráfico fica ilegível.

Se for problema simples e a pessoa também possuir tarefa formal de responsividade, a correção deve ocorrer em branch/PR separado.

---

# 17. O que fazer quando houver dúvida

Se não houver evidência suficiente:

```text
NÃO ESCOLHER POR CONTA PRÓPRIA.
```

Registrar:

```text
Situação: PENDENTE
Motivo:
Opção A:
Opção B:
Evidências:
Decisão necessária:
```

Esse tipo de dúvida é uma entrega válida.

---

# 18. Como trabalhar em equipe sem duplicar esforço

Antes de iniciar:

1. cada pessoa recebe um bloco;
2. registrar responsável pelo bloco;
3. evitar duas pessoas analisando exatamente o mesmo elemento sem necessidade;
4. quando um componente atravessar dois blocos, compartilhar evidência;
5. divergências devem ser registradas, não resolvidas informalmente sem documentação.

Exemplo:

```text
Responsável Foundations encontra problema de cor em Badge
↓
registra a cor
↓
Responsável Componentes Básicos analisa estrutura e função do Badge
↓
ambos podem referenciar a mesma evidência
```

---

# 19. Entrega final de cada responsável

Cada responsável deve entregar:

```text
1. Resumo do bloco analisado
2. Elementos verificados
3. Padrões predominantes
4. Inconsistências
5. Evidências
6. Recomendações
7. Dúvidas pendentes
8. Riscos
9. Itens que precisam de decisão
10. Checklist final
```

A entrega deve permitir que outra pessoa compreenda os achados sem precisar refazer toda a análise.

---

# 20. Estrutura sugerida do relatório final

```markdown
# Validação Visual — [Nome do Bloco]

## Responsável

Nome:

## Escopo analisado

...

## Telas percorridas

...

## Resumo executivo

...

## Elementos analisados

### Elemento 1

...

### Elemento 2

...

## Principais inconsistências

...

## Padrões predominantes

...

## Recomendações

...

## Decisões pendentes

...

## Evidências

...

## Riscos / observações

...

## Checklist final

...
```

---

# 21. Checklist obrigatório antes da entrega

```text
[ ] Li a auditoria técnica antes de iniciar
[ ] Rodei a aplicação atual
[ ] Consultei o protótipo/referência aprovada
[ ] Analisei todos os itens do meu bloco
[ ] Comparei perfis quando aplicável
[ ] Verifiquei mais de uma tela
[ ] Considerei desktop e mobile quando aplicável
[ ] Registrei variações
[ ] Registrei inconsistências
[ ] Incluí evidências relevantes
[ ] Minhas recomendações possuem justificativa
[ ] Não alterei código do Design System
[ ] Não fiz redesign
[ ] Não substituí componentes
[ ] Não tratei preferência pessoal como regra
[ ] Mantive decisões oficiais como PENDENTES
[ ] Registrei dúvidas quando não havia evidência suficiente
```

---

# 22. Critérios para considerar a validação bem executada

A análise é considerada boa quando:

- não se limita a opinião;
- apresenta evidências;
- compara diferentes telas;
- identifica repetição e divergência;
- diferencia variação necessária de possível inconsistência;
- considera a identidade aprovada;
- considera comportamento responsivo;
- não modifica prematuramente a implementação;
- não transforma componente existente em padrão oficial sem validação;
- oferece recomendações úteis para a consolidação posterior.

---

# 23. O que acontece depois

Depois que os quatro responsáveis entregarem suas análises:

```text
AUDITORIA TÉCNICA
+
VALIDAÇÃO VISUAL DA EQUIPE
↓
CONSOLIDAÇÃO DOS ACHADOS
↓
DECISÕES DO DESIGN SYSTEM v0.1
↓
ATUALIZAÇÃO DA DOCUMENTAÇÃO OFICIAL
↓
PR DE DOCUMENTAÇÃO
↓
IMPLEMENTAÇÃO GRADUAL NO CÓDIGO
```

A implementação deve acontecer somente depois que os padrões prioritários estiverem definidos.

---

# 24. Resultado esperado

Ao final desta atividade, o projeto deve conseguir responder com evidências:

```text
Quais cores são oficiais?
Qual tipografia e escala usar?
Quais espaçamentos e radius predominam?
Qual padrão de Button deve ser consolidado?
Qual padrão de Input?
Qual padrão de Card?
Qual padrão de Badge?
Como Sidebar e Header devem se comportar?
Como tratar modais, tabs, toasts e tabelas?
Como representar loading, empty, error e success?
Como os gráficos devem seguir o Design System?
Quais padrões são legado?
Quais decisões ainda precisam ser tomadas?
```

A validação não precisa resolver todas essas perguntas imediatamente.

Ela precisa produzir evidência suficiente para que as decisões seguintes sejam tomadas com segurança.

---

# 25. Regra final

> **Nesta fase, a qualidade da entrega não é medida pela quantidade de código alterado. É medida pela qualidade da análise, das evidências e das recomendações produzidas.**
