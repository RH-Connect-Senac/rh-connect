# Components v1 — RH Connect

**Status:** Oficial para referência de implementação  
**Versão:** 1.0  
**Data de consolidação:** 01/09/2026  
**Fonte de decisão:** Components Decision Lab — Resumo local  
**Escopo:** Components básicos do Design System do RH Connect
> **Importante:** Este documento é um contrato-alvo do Design System. A aplicação no Front-end atual deve seguir o plano de migração gradual, sem substituição em massa de componentes antes da entrega testável.

---

## 1. Objetivo

Este documento consolida as decisões aprovadas para a versão 1 dos componentes básicos do Design System do RH Connect.

Ele transforma o resumo do **Components Decision Lab** em uma especificação mais limpa, voltada para documentação e implementação futura no Front-end.

Este documento não é uma cópia integral do Lab. O Lab serviu como ambiente de comparação, decisão humana e registro de alternativas. Este documento registra apenas o resultado aprovado, as regras de uso e os limites de cada componente.

---

## 2. Relação com Foundations

Os componentes definidos neste documento devem utilizar os valores semânticos já aprovados em **Design System Foundations v1**, incluindo:

- cores;
- tipografia;
- espaçamentos;
- radius;
- bordas;
- sombras;
- foco visível;
- surfaces.

As decisões de Components não reabrem os Foundations. Caso algum componente precise de um ajuste não coberto pelos Foundations, a necessidade deverá ser registrada como evidência para revisão futura.

---

## 3. Princípios gerais

1. Preservar a identidade visual aprovada do RH Connect.
2. Evitar redesign durante refatorações técnicas.
3. Usar tokens semânticos sempre que possível.
4. Separar componentes básicos de Patterns, Product Components e regras de negócio.
5. Evitar que cada tela implemente variações próprias de botão, input, card, badge, modal ou feedback.
6. Garantir acessibilidade mínima, especialmente foco visível, semântica correta e nomes acessíveis.
7. Tratar previews do Lab como simulações, não como implementação visual final obrigatória.
8. Não transformar componentes genéricos em componentes de produto antes da hora.

---

## 4. O que este documento define

Este documento define o padrão aprovado para:

- Actions e Forms;
- Selection e Status;
- Surfaces e Feedback;
- Overlays;
- Navigation;
- Identity.

---

## 5. O que este documento não define

Este documento não define completamente:

- telas finais do produto;
- Sidebar e Header finais;
- Page Layouts;
- Dashboard Patterns;
- DataTable completa;
- Product Components como JobCard, InterviewCard, EvaluationCard e CandidateSummary;
- Gamificação, Nilo e Árvore de Talentos;
- regras de API;
- regras de Back-end;
- permissões;
- rotas reais;
- integração com dados reais.

Esses temas pertencem a documentos posteriores de **Patterns/Layout**, **Product Components**, arquitetura Front-end/Back-end e especificações de produto.

---

# 6. Actions

## 6.1 Button

### Variant principal

**Decisão aprovada:** `primary`

O nome da variant principal do Button será `primary`.

**Regra:** utilizar `primary` para a ação principal de uma tela, card, formulário ou fluxo.

**Justificativa:** `primary` é mais explícito para ação principal do sistema do que `default`.

---

### Variants secundárias

**Decisão aprovada:** `secondary + outline`

O Button v1 deverá prever `secondary` e `outline` como variants distintas.

**Uso recomendado:**

- `secondary`: ação alternativa com peso visual moderado;
- `outline`: ação discreta, de apoio ou menos prioritária.

**Regra:** não usar `outline` como substituto automático de `secondary`. Cada variant deve ter intenção clara.

---

### Ação destrutiva

**Decisão aprovada:** `destructive`

A variant para ação destrutiva será chamada `destructive`.

**Uso recomendado:** exclusão, cancelamento crítico, bloqueio, remoção ou ação que possa causar perda de informação.

**Regra:** `danger` pode continuar como referência visual ou tone, mas a intenção do botão deve ser semântica.

---

### Loading

**Decisão aprovada:** `spinner + largura preservada`

O Button deverá suportar estado de carregamento com spinner e preservação da largura visual.

**Regra:** o botão em loading não deve causar pulo visual na interface.

**Uso recomendado:** login, cadastro, envio de entrevista, salvamento, conclusão de avaliação, upload e ações assíncronas.

---

## 6.2 IconButton

**Decisão aprovada:** `IconButton wrapper`

O IconButton será um wrapper fino sobre Button.

**Regras:**

- deve centralizar acessibilidade;
- deve possuir tamanho consistente;
- deve exigir nome acessível;
- não deve ser apenas um ícone clicável sem semântica.

**Uso recomendado:** ações compactas como abrir menu, fechar, limpar campo, alternar visualização ou acessar configurações.

---

## 6.3 Button-like Link

**Decisão aprovada:** `Button asChild`

Links com aparência de botão deverão utilizar Button com composição `asChild`, preservando a semântica de navegação.

**Regra:** quando a ação navega para outra rota ou URL, a semântica deve continuar sendo de link, mesmo que o visual pareça botão.

---

## 6.4 TextLink

**Decisão aprovada:** `TextLink separado`

TextLink será separado de Button.

**Regra:** link textual possui uso, semântica e aparência próprios. Não deve ser tratado como apenas `Button variant=link`.

**Uso recomendado:** links de apoio como termos, privacidade, recuperar senha, voltar ao login e navegação textual contextual.

---

# 7. Forms

## 7.1 FormField

**Decisão aprovada:** `FormField opcional`

FormField será opcional por contexto.

**Obrigatório quando houver:**

- label;
- hint;
- erro;
- indicação de campo obrigatório;
- validação;
- relação explícita entre rótulo e campo.

**Opcional em:**

- busca simples;
- filtros compactos;
- toolbars;
- controles isolados.

**Regra:** não forçar FormField em todos os casos se isso gerar excesso visual ou estrutura desnecessária.

---

## 7.2 Input

### Background padrão

**Decisão aprovada:** `surface-default`

O background padrão do Input será `surface-default`.

**Regra:** `surface-muted` não deve ser assumido automaticamente para Inputs.

**Justificativa:** `surface-default` mantém melhor contraste, clareza e aparência limpa em cards e formulários.

---

### Slots e ícones

**Decisão aprovada:** `InputGroup/InputWrapper`

Ícones, prefixos, sufixos e ações internas devem ser tratados por `InputGroup` ou `InputWrapper`, mantendo o Input primitive simples.

**Exemplos de uso:**

- ícone de busca;
- botão de limpar;
- ícone de senha;
- prefixo;
- sufixo;
- trailing action.

**Regra:** não transformar o Input base em um componente excessivamente complexo.

---

### Altura e padding

**Decisão aprovada:** `py 10px`

Inputs e Selects devem usar `py 10px` como padding vertical padrão.

**Justificativa:** mantém controles médios e equilibrados para formulários, filtros e dashboards.

---

### Foco visual de campos

**Decisão aplicada nos primitives oficiais:** foco discreto para Forms.

`Input`, `Textarea` e `SelectTrigger` devem usar foco profissional e discreto, sem halo/ring azul grosso.

Padrão visual aplicado:

- borda de foco equivalente a `#2563EB`;
- sombra de foco equivalente a `0 0 0 1px rgba(37,99,235,0.12)`;
- `transition-[border-color,box-shadow]`;
- `duration-150`.

**Regras:**

- preservar `:focus-visible`/acessibilidade de teclado;
- preservar estados `disabled`;
- preservar `aria-invalid`/invalid/error;
- não substituir o foco por glow exagerado;
- não criar token oficial novo nesta etapa.

**Pendência futura:** avaliar, após validação visual, se esse padrão deve ser centralizado em tokens/contratos específicos de foco para Forms.

---

## 7.3 Label

**Decisão aprovada:** `14/600`

Labels devem utilizar peso `14/600`.

**Justificativa:** melhora clareza e hierarquia dos campos sem alterar a escala tipográfica geral do sistema.

---

## 7.4 Select

**Decisão aprovada:** `Select + NativeSelect`

O Design System poderá ter dois contratos distintos:

- `NativeSelect`: para seleções simples;
- `Select custom/Radix`: para casos que exigem controle visual, comportamento ou acessibilidade mais elaborada.

**Regra:** não esconder comportamento custom e comportamento nativo sob o mesmo componente sem critério.

---

## 7.5 SearchInput

**Decisão aprovada:** `componente nomeado`

SearchInput será uma composição nomeada baseada em Input/InputGroup.

**Uso recomendado:** buscas, filtros e listas recorrentes no sistema.

**Regra de iconografia:** o ícone exibido no Lab era apenas placeholder. Na implementação final, usar ícone oficial de busca do pacote de ícones adotado no projeto.

---

## 7.6 PasswordInput

**Decisão aprovada:** `componente nomeado`

PasswordInput será uma composição nomeada baseada em Input + trailing IconButton.

**Uso recomendado:** login, cadastro, ativação de conta e recuperação/redefinição de senha quando existir.

**Regras:**

- padronizar mostrar/ocultar senha;
- garantir acessibilidade do botão;
- usar ícones oficiais de mostrar/ocultar senha na implementação final;
- não depender dos ícones placeholders do Lab.

---

# 8. Selection Controls

## 8.1 Checkbox

### Tamanho visual

**Decisão aprovada:** `20px`

O Checkbox terá 20px como tamanho visual padrão.

**Justificativa:** melhora leitura, clique/toque e presença visual em formulários, listas e telas responsivas.

---

### Radius

**Decisão aprovada:** `radius específico`

Checkbox poderá ter radius específico, sem usar automaticamente `radius-inline-subtle`.

**Regra:** o controle deve ter arredondamento próprio e adequado ao indicador de seleção.

---

### Indeterminate

**Decisão aprovada:** `suportar no v1`

Checkbox deve suportar estado `indeterminate`.

**Uso recomendado:** seleção parcial em listas, tabelas e grupos de itens.

**Regra:** o uso inicial pode ser controlado, mas o componente deve prever esse estado.

---

## 8.2 RadioGroup

**Decisão aprovada:** `Radix + fieldset/legend`

RadioGroup deverá usar base técnica acessível e semântica de grupo.

**Regras:**

- usar Radix como base técnica quando aplicável;
- usar `fieldset/legend` quando houver pergunta ou conjunto de opções relacionado;
- não tratar RadioGroup como simples coleção visual de bolinhas;
- garantir navegação e leitura adequadas por tecnologias assistivas.

**Observação:** o preview do Lab era apenas uma simulação mínima e não representa o layout final do RadioGroup nas telas do RH Connect.

---

## 8.3 Switch e Toggle

### Nome oficial

**Decisão aprovada:** `ambos separados`

Switch e Toggle serão conceitos separados.

**Uso recomendado:**

- `Switch`: ligar/desligar configurações com efeito de estado;
- `Toggle`: botão pressionado/não pressionado quando necessário em Actions ou Navigation.

**Regra:** não usar Switch como substituto genérico de Toggle nem Toggle como substituto de configuração on/off.

---

### Estados visuais

**Decisão aprovada:** `off/on/disabled/focus`

Switch deve diferenciar visualmente:

- desligado;
- ligado;
- desabilitado;
- foco visível.

**Regra:** o estado desabilitado não pode ser confundido com apenas desligado.

---

# 9. Status e metadata

## 9.1 Badge

### Variants

**Decisão aprovada:** `neutral + subtle + outline`

Badge deverá prever as variações `neutral`, `subtle` e `outline`.

**Uso recomendado:**

- `neutral`: informações discretas e metadata;
- `subtle`: destaque leve com cor;
- `outline`: marcação discreta sem transformar o badge em status.

**Regra:** Badge não deve representar sozinho estados críticos do sistema. Para estados reais, usar StatusBadge.

---

### Shape

**Decisão aprovada:** `pill`

Badge terá formato pill como padrão visual.

**Justificativa:** combina com elementos compactos, tags, metadata e indicadores leves do RH Connect.

---

## 9.2 StatusBadge

### Arquitetura

**Decisão aprovada:** `componente separado`

StatusBadge será componente separado de Badge.

**Regra:** separar metadata comum de estados reais do sistema.

**Exemplos de StatusBadge:**

- pendente;
- concluído;
- ativo;
- bloqueado;
- em avaliação;
- aguardando resultado.

---

### Tone x domínio

**Decisão aprovada:** `tone semântico`

StatusBadge será baseado em tones semânticos do Design System.

**Tones previstos:**

- neutral;
- info;
- success;
- warning;
- danger.

**Regra:** estados de domínio do produto devem ser mapeados para esses tones, sem transformar o Design System em uma lista fixa de regras de negócio.

---

### Appearance

**Decisão aprovada:** `soft`

A aparência padrão do StatusBadge será `soft`.

**Justificativa:** comunica estado de forma clara sem pesar visualmente dashboards, cards, tabelas e filas de avaliação.

---

## 9.3 FilterChip

### Classificação

**Decisão aprovada:** `Pattern de filtros`

FilterChip pertence ao Pattern de filtros, não a Badge interativo genérico.

**Regra:** Badges não devem virar botões clicáveis sem semântica adequada.

---

### Tipo

**Decisão aprovada:** `ambos separados`

FilterChip poderá ter dois usos separados:

- `selectable`: filtros selecionáveis;
- `applied/removable`: filtros aplicados que podem ser removidos.

**Regra:** não tratar FilterChip como Badge interativo genérico.

---

# 10. Surfaces

## 10.1 Card

### Border e shadow

**Decisão aprovada:** `border + shadow-rest`

Card deverá usar borda sutil e `shadow-rest` como padrão.

**Justificativa:** mantém separação visual clara sem deixar a interface pesada.

---

### Padding

**Decisão aprovada:** `20px`

Card terá 20px como padding padrão.

**Justificativa:** equilibra respiro visual e densidade nas telas de dashboard, formulários e listas.

---

### Anatomy e ownership de padding

**Decisão aprovada:** `dois modos explícitos`

Devem existir dois modos explícitos de padding:

1. Card simples pode controlar o padding.
2. Card com Header/Content/Footer pode permitir que subcomponents controlem espaçamentos.

**Regra:** evitar padding duplicado entre Card e subcomponents.

---

## 10.2 InteractiveCard

**Decisão aprovada:** `shadow no hover`

InteractiveCard deve usar shadow no hover como sinal principal de interatividade.

**Regras:**

- transição deve ser sutil;
- não alterar demais a composição visual;
- não usar card clicável sem semântica correta;
- quando navegar, considerar Link;
- quando executar ação, considerar Button.

---

## 10.3 SelectableCard

**Decisão aprovada:** `indicator + border`

SelectableCard deve usar indicador visual e borda de ação para estado selecionado.

**Regra:** não depender apenas de cor de fundo para comunicar seleção.

---

## 10.4 Highlight

**Decisão aprovada:** `Pattern`

Highlight deve ser tratado como Pattern, não como componente básico.

**Justificativa:** destaques dependem do contexto da tela, conteúdo, hierarquia e objetivo da seção.

---

## 10.5 Divider

**Decisão aprovada:** `Component simples`

Divider entra como componente simples do Design System.

**Uso recomendado:** separar blocos, listas, menus, cards, popovers e seções.

**Regra:** usar borda sutil e evitar variações excessivas.

---

# 11. Feedback

## 11.1 Alert

### Tone + appearance

**Decisão aprovada:** `soft`

Alert soft será a aparência padrão para feedback persistente.

**Uso recomendado:** mensagens de informação, atenção, sucesso ou erro dentro da página.

**Justificativa:** comunica feedback sem pesar visualmente a interface.

---

### Semântica ARIA

**Decisão aprovada:** `contextual`

Alert visual não deve usar `role="alert"` automaticamente.

**Regra:** o uso de ARIA deve depender de:

- severidade;
- urgência;
- necessidade de anúncio por tecnologia assistiva;
- contexto de interação.

**Justificativa:** nem todo alerta visual precisa ser anunciado como alerta urgente.

---

## 11.2 Toast

### Arquitetura

**Decisão aprovada:** `wrapper DS`

Toast deve ser usado por meio de wrapper do Design System.

**Regra:** evitar espalhar uso direto da biblioteca nas telas.

**O wrapper deve padronizar:**

- aparência;
- duração;
- posição;
- tipos de mensagem;
- comportamento básico.

---

### Posição

**Decisão aprovada:** `bottom-right`

Toast será exibido em `bottom-right` como padrão em desktop.

**Regra:** em mobile, a posição pode ser adaptada para melhor leitura e segurança visual.

**Justificativa:** evita conflito com Header, navegação, avatar, sino e popovers.

---

## 11.3 Skeleton

### Motion

**Decisão aprovada:** `pulse`

Skeleton deve usar `pulse` como motion padrão.

**Regra:** deve respeitar `prefers-reduced-motion` quando aplicável.

---

### Shapes

**Decisão aprovada:** `híbrido`

Skeleton deve oferecer shapes básicos e permitir composição.

**Shapes previstos:**

- block;
- line;
- circle.

**Regra:** manter flexibilidade sem criar variants excessivas.

---

## 11.4 Spinner

**Decisão aprovada:** `Component primitive`

Spinner entra como component primitive do Design System.

**Uso recomendado:** processamento em botões, login, cadastro, envio, avaliação, upload e ações assíncronas.

---

# 12. Overlays

## 12.1 Dialog

### Surface

**Decisão aprovada:** `border + shadow`

Dialog deve usar borda sutil e `shadow-overlay`.

**Justificativa:** cria separação clara entre modal e página sem depender apenas de sombra.

---

### Sizes

**Decisão aprovada:** `sm/md/lg`

Dialog deve prever tamanhos `sm`, `md` e `lg`.

**Regra:** os tamanhos devem ser responsivos e usados por contexto.

**Exemplos:**

- `sm`: confirmação curta;
- `md`: formulário comum;
- `lg`: conteúdo maior ou revisão.

---

## 12.2 Backdrop

**Decisão aprovada:** `opacity`

Backdrop deve usar opacity como padrão.

**Regra:** escurecer o fundo de forma simples e estável, sem blur obrigatório.

---

## 12.3 AlertDialog

**Decisão aprovada:** `ambos com contrato`

AlertDialog deve ser usado para ações críticas e destrutivas.

**Uso recomendado:**

- excluir;
- bloquear;
- cancelar envio;
- sair sem salvar;
- concluir avaliação;
- confirmar ação irreversível ou sensível.

**Regra:** usar contrato claro de título, descrição, ação principal e ação de cancelamento.

---

## 12.4 Popover

**Decisão aprovada:** `radius-overlay`

Popover deve usar `radius-overlay`.

**Justificativa:** mantém consistência com outras camadas flutuantes como Dialog e Dropdown.

---

## 12.5 DropdownMenu

**Decisão aprovada:** `control-height`

Itens de DropdownMenu devem ter altura alinhada aos controles do sistema.

**Regra:** garantir área de clique confortável e consistência visual.

---

## 12.6 Tooltip

### Appearance

**Decisão aprovada:** `dark`

Tooltip dark será o padrão.

**Justificativa:** oferece contraste claro, leitura rápida e diferenciação visual em relação às surfaces brancas do sistema.

---

### Timing

**Decisão aprovada:** `delay curto`

Tooltip deve aparecer com delay curto.

**Regra:** evitar aparição acidental imediata e manter ajuda rápida quando o usuário permanece sobre o elemento.

---

## 12.7 Sheet

**Decisão aprovada:** `ambos`

Sheet deve suportar placement lateral e inferior/mobile.

**Uso recomendado:**

- lateral: desktop e conteúdo operacional;
- inferior/mobile: experiências mobile quando fizer sentido.

**Regra:** Sheet não deve ser confundido com Sidebar.

---

## 12.8 Layering

**Decisão aprovada:** `escala z-index`

Deve existir escala de z-index para overlays.

**Objetivo:** evitar conflitos entre Dialog, Popover, Dropdown, Tooltip, Toast e Sheet.

---

# 13. Navigation

## 13.1 Tabs

### Visual

**Decisão aprovada:** `underline`

Tabs terão visual underline como padrão.

**Justificativa:** separam seções relacionadas de forma limpa, leve e consistente com dashboards e áreas internas do RH Connect.

---

### Estado

**Decisão aprovada:** `depende do contexto`

O estado das Tabs dependerá do contexto.

**Regras:**

- tabs internas podem usar estado local;
- tabs que representam navegação, filtro persistente ou seção compartilhável podem usar rota ou query.

---

## 13.2 SegmentedControl

### Visual

**Decisão aprovada:** `muted`

SegmentedControl terá visual muted como padrão.

**Justificativa:** funciona bem para alternância compacta de modos sem competir com botões principais.

---

### Semântica

**Decisão aprovada:** `modo/view`

SegmentedControl deve ser usado para alternância de modo ou visualização.

**Exemplos:**

- lista/cards;
- simples/detalhado;
- visualizações equivalentes.

**Regra:** não usar como substituto genérico de RadioGroup em formulário.

---

## 13.3 Pagination

### Escopo

**Decisão aprovada:** `híbrido`

Pagination será componente visual básico com contrato de uso em Patterns/DataTable/Listas.

**Regra:** manter separada a lógica de dados, API, paginação do servidor e estado da tabela.

---

### Mobile

**Decisão aprovada:** `compacta`

Pagination deve ser compacta no mobile.

**Regra:** reduzir quantidade de páginas visíveis e preservar navegação básica sem ocupar espaço excessivo.

---

## 13.4 Breadcrumb

**Decisão aprovada:** `adiar`

Breadcrumb fica adiado para etapa posterior.

**Justificativa:** depende de rotas reais, hierarquia de páginas e layout final.

**Regra:** não bloquear Components v1 nem a entrega testável.

---

# 14. Identity

## 14.1 Avatar

### Sizes

**Decisão aprovada:** `sm/md/lg`

Avatar terá escala simples de tamanhos.

**Uso recomendado:** header, listas, cards e perfil.

**Regra:** evitar variações excessivas.

---

### Fallback

**Decisão aprovada:** `híbrido`

Avatar deve usar fallback híbrido.

**Regras:**

- usar iniciais quando houver nome disponível;
- usar ícone genérico quando não houver informação suficiente do usuário ou entidade.

---

### Alt text

**Decisão aprovada:** `regra por composição`

Alt text do Avatar depende do contexto de uso.

**Regras:**

- Avatar informativo deve identificar usuário ou entidade;
- Avatar decorativo pode ser ocultado quando a informação já aparece ao lado;
- Avatar interativo deve ter nome acessível claro para a ação quando estiver dentro de Button ou Link.

---

## 14.2 AvatarGroup

**Decisão aprovada:** `adiar`

AvatarGroup fica adiado para etapa futura.

**Justificativa:** o uso recorrente ainda não está confirmado e exigiria decisões adicionais de limite visível, sobreposição, overflow e acessibilidade.

---

## 14.3 Logo

**Decisão aprovada:** `asset guideline`

A logo RH Connect deve ser tratada como asset oficial completo, preferencialmente SVG.

**Regras:**

- documentar uso da marca;
- não reconstruir o wordmark com texto HTML/CSS;
- não redesenhar a marca dentro de um componente;
- não separar tecnicamente símbolo e texto “Connect” como padrão final.

---

## 14.4 Brand Mark

**Decisão aprovada:** `usar se aprovado`

Brand Mark reduzido pode ser usado apenas quando existir variação aprovada da marca.

**Uso recomendado:**

- sidebar recolhida;
- favicon;
- avatar de organização;
- espaços reduzidos.

**Regra:** não usar crop improvisado da logo completa.

---

## 14.5 UserIdentity

**Decisão aprovada:** `composition`

UserIdentity será tratado como composição de Avatar, nome e metadata.

**Regra:** não transformar em Product Component nesta fase.

**Atenção:** a metadata deve deixar claro se representa:

- perfil do sistema;
- cargo profissional;
- função;
- outro contexto.

---

## 14.6 StatusIndicator

**Decisão aprovada:** `adiar`

StatusIndicator fica adiado como componente básico do v1.

**Regra:** quando houver necessidade de indicar estado, priorizar StatusBadge com texto ou combinação visual acessível.

**Atenção:** não comunicar status crítico apenas por cor.

---

# 15. Classificação dos itens adiados ou deslocados

## 15.1 Itens adiados

- AvatarGroup;
- Breadcrumb;
- StatusIndicator como componente básico.

## 15.2 Itens classificados como Pattern

- Highlight;
- FilterChip;
- uso de Pagination em DataTable/Listas;
- determinados estados e composições de filtro.

## 15.3 Itens fora de Components v1 básico

- Sidebar;
- Header;
- PageHeader;
- DataTable completa;
- EmptyState completo;
- LoadingState completo;
- ErrorState completo;
- Gamificação;
- Nilo;
- Árvore de Talentos;
- JobCard;
- InterviewCard;
- EvaluationCard;
- CandidateSummary;
- Dashboard Patterns.

---

# 16. Regra sobre iconografia

Ícones exibidos no Components Decision Lab eram placeholders/simulações.

Eles não devem ser considerados ícones oficiais do RH Connect.

A implementação final deve utilizar o pacote de ícones adotado pelo projeto e aplicar os ícones conforme semântica do componente.

**Exemplos:**

- SearchInput deve usar ícone oficial de busca;
- PasswordInput deve usar ícones oficiais de mostrar/ocultar senha;
- IconButton deve possuir nome acessível claro;
- indicadores visuais não devem comunicar estado crítico sem texto.

---

# 17. Regra sobre implementação

Este documento orienta a implementação futura, mas não autoriza migração ampla e automática do Front-end.

A implementação deve ocorrer de forma incremental, respeitando:

- branch própria;
- PR pequeno;
- preservação visual;
- validação local;
- testes manuais quando necessário;
- alinhamento com o plano de migração estrutural;
- separação entre refatoração técnica e mudança visual.

Durante a refatoração estrutural, a aparência atual aprovada deve ser preservada sempre que possível. Alterações visuais devem ocorrer em tarefas específicas de Design System ou UX.

---

# 18. Próximas etapas

Com Components v1 consolidado, as próximas etapas recomendadas são:

1. consolidar **Patterns/Layout v1**;
2. consolidar **Product Components v1**;
3. criar guia de implementação dos componentes no Front-end;
4. preparar migração gradual dos componentes existentes;
5. alinhar com rotas, layouts e refatoração estrutural;
6. revisar os componentes após uso real nas telas do produto.

---

## Registro de origem

Este documento foi consolidado a partir do arquivo:

```text
Components Decision Lab — Resumo local
```

O resumo apoia decisão humana e não oficializa Components v1 por si só. A oficialização ocorre neste documento após consolidação das decisões aprovadas.

---

**Fim do documento.**
