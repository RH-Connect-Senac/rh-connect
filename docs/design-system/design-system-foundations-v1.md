# Design System Foundations v1 — RH Connect

**Status:** Oficial  
**Versão:** 1.0  
**Data de consolidação:** 31/08/2026  
**Fonte de decisão:** Foundations Decision Lab v0.2.1  
**Escopo:** Colors, Typography, Spacing, Radius, Borders & Shadows

---

## 1. Objetivo

Este documento consolida os fundamentos visuais oficiais do Design System do RH Connect.

Ele representa somente as decisões finais aprovadas para a versão 1 dos Foundations. Não contém propostas intermediárias, alternativas rejeitadas, estados de decisão ou histórico de comparação visual.

Os valores definidos aqui devem servir como referência para a etapa de Components, para a implementação futura dos tokens no Front-end e para a migração das telas do produto.

---

## 2. Princípios de uso

Os Foundations devem ser utilizados de forma semântica, e não apenas pela semelhança visual entre valores.

Isso significa que dois tokens podem compartilhar valores próximos ou até idênticos e ainda assim possuir responsabilidades diferentes dentro do sistema.

Exemplos:

- cor de marca não é cor de ação;
- cor de ação não é automaticamente cor de gráfico ou progresso;
- `type-title-sm` define um estilo tipográfico, enquanto `type-contract-surface-title` define onde esse estilo deve ser aplicado;
- `color-surface-inverse` é uma surface institucional escura reutilizável, e não uma cor exclusiva da Sidebar.

---

# 3. Colors

## 3.1 Marca

### `color-brand-primary`

```css
#0075FE
```

**Uso:** cor primária da identidade visual do RH Connect.

Não deve ser confundida semanticamente com a cor de ação, charts ou progress.

---

## 3.2 Actions

### `color-action-primary`

```css
#1D4ED8
```

**Uso:** ação principal do sistema.

**Regra:** permanece semanticamente separada da cor de marca e de charts/progress.

### `color-action-primary-hover`

```css
#1E40AF
```

**Uso:** estado `hover` da ação principal.

### `color-action-primary-active`

```css
#1E3A8A
```

**Uso:** estado `active` da ação principal.

---

## 3.3 Surfaces

### `color-surface-page`

```css
#EEF4FF
```

**Uso:** fundo principal de páginas.

### `color-surface-default`

```css
#FFFFFF
```

**Uso:** surface padrão para cards, popovers e containers principais.

### `color-surface-muted`

```css
#F8FAFC
```

**Uso:** surface neutra suave.

**Regra:** não vincular automaticamente este token a Inputs. O background de Input deverá ser validado na etapa de Components.

### `color-surface-secondary`

```css
#EFF6FF
```

**Uso:** surface secundária e destaque azul leve.

### `color-surface-inverse`

```css
#021025
```

**Uso:** surface escura institucional reutilizável.

Aplicações confirmadas:

- Sidebar;
- Footer da página principal;
- outras surfaces escuras compatíveis, quando necessário.

Este token não deve ser tratado como exclusivo da Sidebar.

---

## 3.4 Borders e texto

### `color-border-subtle`

```css
rgba(15, 27, 45, 0.09)
```

**Uso:** cor base para bordas sutis.

### `color-text-primary`

```css
#0F1B2D
```

**Uso:** texto principal.

### `color-text-secondary`

```css
#64748B
```

**Uso:** texto secundário, metadata e microcopy.

**Regra:** não utilizar para informação crítica ou texto que precise de grande destaque. Em componentes com texto de 12px, validar contraste e legibilidade no contexto real.

---

## 3.5 Status

### `color-status-success`

```css
#16A34A
```

**Uso:** estados de sucesso.

### `color-status-warning`

```css
#D97706
```

**Uso:** estados de alerta.

### `color-status-danger`

```css
#DC2626
```

**Uso:** estados destrutivos, erro ou perigo.

Os tokens de status não devem ser confundidos automaticamente com cores de charts, progress ou gamificação, mesmo quando valores semelhantes forem utilizados.

---

## 3.6 Sidebar

### `sidebar-border`

```css
rgba(255,255,255,0.10)
```

**Uso:** divisores e contornos internos da Sidebar.

### `sidebar-item-hover`

```css
rgba(255,255,255,0.10)
```

**Uso:** background de item de navegação em `hover`.

### `sidebar-item-active`

```css
rgba(255,255,255,0.15)
```

**Uso:** background de item de navegação ativo.

Embora `sidebar-border` e `sidebar-item-hover` possuam o mesmo valor nesta versão, eles são tokens semanticamente diferentes.

---

# 4. Typography

## 4.1 Famílias

### `font-family-ui`

```css
"Plus Jakarta Sans", sans-serif
```

**Uso:** tipografia operacional da interface.

Aplicações:

- títulos do sistema;
- body;
- labels;
- controles;
- metadata;
- conteúdo operacional.

### `font-family-brand`

```css
"Poppins", sans-serif
```

**Uso:** identidade institucional da marca.

**Regra:** não utilizar Poppins como justificativa para reconstruir a logo oficial através de texto HTML/CSS.

A logo oficial do RH Connect deverá futuramente ser utilizada como asset completo, preferencialmente SVG, preservando símbolo e wordmark em uma única aplicação de marca.

---

## 4.2 Escala tipográfica oficial

### `type-body-xs`

```text
12px / 500 / 1.5
```

**Uso:** metadata, captions, hints, badges, timestamps e microcopy.

**Regra:** 12px é o menor tamanho tipográfico operacional oficial da versão 1.

### `type-body-sm`

```text
14px / 500 / 1.5
```

**Uso:** corpo operacional denso, controles, listas e conteúdo de interface compacto.

### `type-body-md`

```text
16px / 400 / 1.5
```

**Uso:** corpo principal e conteúdo de leitura.

### `type-title-sm`

```text
18px / 700 / 1.35
```

**Uso:** título pequeno, título de card e seção interna.

### `type-title-md`

```text
24px / 700 / 1.25
```

**Uso:** título forte e título de seção.

---

## 4.3 Tamanhos fora da escala oficial

Os seguintes tamanhos não entram na escala tipográfica operacional da versão 1:

### 10px

Não utilizar como padrão oficial.

Micro labels e timestamps devem utilizar no mínimo 12px, salvo exceção futura validada especificamente na etapa de Components.

### 11px

Não utilizar como padrão oficial.

Captions e metadata densa devem utilizar 12px como base.

---

## 4.4 Contratos tipográficos

### `type-contract-control`

```text
14px / 500 / 1.5
```

**Uso:** contrato tipográfico para controls.

Este contrato referencia a mesma escala utilizada por `type-body-sm`.

### `type-contract-surface-title`

```text
18px / 700 / 1.35
```

**Uso:** título de cards, painéis e outras surfaces.

Este contrato referencia `type-title-sm`.

A existência do contrato não cria uma nova escala tipográfica. Ele define a aplicação semântica de um estilo já existente.

---

# 5. Spacing

## 5.1 Escala oficial

### `space-2`
```css
8px
```
**Uso:** spacing compacto.

### `space-3`
```css
12px
```
**Uso:** spacing compacto/default.

### `space-4`
```css
16px
```
**Uso:** baseline de spacing.

### `space-5`
```css
20px
```
**Uso:** spacing recorrente de cards.

### `space-6`
```css
24px
```
**Uso:** surfaces amplas.

### `space-8`
```css
32px
```
**Uso:** spacing macro de layout.

---

## 5.2 Contratos de Controls

### `spacing-control-sm`
```text
px 12px / py 6px / gap 8px
```
**Uso:** controls compactos.

### `spacing-control-md`
```text
px 16px / py 10px / gap 8px
```
**Uso:** tamanho padrão dos controls.

### `spacing-control-lg`
```text
px 24px / py 14px / gap 8px
```
**Uso:** controls de maior destaque.

**Regra:** a existência de `sm`, `md` e `lg` nos Foundations não obriga todos os Components a oferecerem os três tamanhos. A disponibilidade real de variantes será definida na etapa de Components.

---

## 5.3 Cards

### `spacing-surface-card-default`
```css
20px
```
**Uso:** padding padrão de cards.

### `spacing-surface-card-lg`
```css
24px
```
**Uso:** padding de cards amplos.

O uso em overlays deverá ser confirmado na etapa de Components.

---

## 5.4 Layout de página

### `spacing-layout-page`
```text
Mobile: 16px
Tablet: 24px
Desktop: 32px
```

**Uso:** respiro lateral macro do container da página.

Este contrato não define sozinho:
- `max-width`;
- comportamento Sidebar + Content;
- grids;
- largura de containers específicos.

Essas decisões pertencem à etapa de Patterns/Layout.

---

# 6. Radius

### `radius-control`
```css
12px
```
**Uso:** Buttons, Inputs, Selects e outros controls principais.

### `radius-surface`
```css
16px
```
**Uso:** cards e containers/surfaces principais.

### `radius-overlay`
```css
16px
```
**Uso:** Modal, Popover e outros overlays.

### `radius-pill`
```text
full
```
Equivalente conceitualmente a um raio máximo, como:
```css
9999px
```
**Uso:** pills, badges, avatars circulares e indicadores compatíveis.

### `radius-inline-subtle`
```css
8px
```
**Uso restrito:** micro-surfaces, chips e elementos compactos.

**Não utilizar como raio padrão de:**
- controls;
- cards;
- overlays.

---

# 7. Borders & Shadows

## 7.1 Borders

### `border-contract-subtle`
```css
1px solid rgba(15, 27, 45, 0.09)
```
**Uso:** borda default do sistema.

Aplicações típicas:
- cards;
- Inputs;
- linhas de tabela;
- divisores;
- containers;
- TopBar.

### `border-contract-inverse`
```css
1px solid rgba(255,255,255,0.10)
```
**Uso:** divisores e contornos sutis sobre `color-surface-inverse`.

Aplicações:
- Sidebar;
- Footer;
- outras surfaces escuras compatíveis.

### `border-contract-interactive-focus`
```text
border 1px #1D4ED8
+
ring 4px rgba(29,78,216,0.24)
```
**Uso:** estado de foco de elementos interativos.

**Regra de acessibilidade:** aplicar o estado de foco visível principalmente em navegação por teclado através de `:focus-visible`.

Não remover o indicador de foco sem fornecer alternativa visual equivalente.

**Aplicação específica em Forms:** campos de formulário podem utilizar um foco mais discreto quando o contrato do Component exigir maior sobriedade visual, desde que a acessibilidade de teclado seja preservada. Para `Input`, `Textarea` e `SelectTrigger`, o padrão aplicado no Front usa borda visual equivalente a `#2563EB`, sombra sutil equivalente a `0 0 0 1px rgba(37,99,235,0.12)`, `transition-[border-color,box-shadow]` e `duration-150`, sem halo/ring azul grosso.

Esse ajuste não cria novo token oficial nesta etapa. A possível centralização futura desse padrão em tokens ou contratos próprios deve ser avaliada após validação visual e recorrência em outros Components.

---

## 7.2 Shadows

### `shadow-surface-rest`
```css
0 1px 2px rgba(15, 27, 45, 0.06)
```
**Uso:** elevação sutil de repouso.

### `shadow-surface-hover`
```css
0 4px 12px rgba(15, 27, 45, 0.08)
```
**Uso:** elevação moderada para surfaces interativas em `hover`.

**Regra:** utilizar somente em elementos realmente interativos. Cards estáticos permanecem no estado `surface-rest` ou sem elevação adicional, conforme o Component.

### `shadow-overlay`
```css
0 16px 40px rgba(15, 27, 45, 0.16)
```
**Uso:** elevação para overlays.

Aplicações:
- Modal;
- Popover;
- Dropdown.

Não utilizar como sombra padrão de cards ou surfaces comuns.

---

## 7.3 Fora da versão 1

### `shadow-hero-feature`

Não faz parte dos Foundations v1.

A evidência disponível não foi considerada suficiente para consolidar um contrato oficial. Poderá ser reavaliado caso uma necessidade real do produto seja confirmada posteriormente.

---

# 8. Regras globais dos Foundations v1

1. **Dark Mode não faz parte desta versão.**
2. Os tokens devem ser aplicados de acordo com sua função semântica.
3. Valores iguais não tornam tokens semanticamente equivalentes.
4. A menor escala tipográfica operacional oficial é **12px**.
5. Inputs não assumem automaticamente `color-surface-muted`; essa decisão será feita em Components.
6. `color-surface-inverse` é reutilizável e atualmente atende Sidebar e Footer.
7. Foco visível deve ser preservado para acessibilidade.
8. Variantes de tamanho dos Foundations não obrigam todos os Components a implementar todas as variantes.
9. Gamificação, Nilo e Árvore de Talentos não devem direcionar os Foundations v1 enquanto seus padrões visuais estiverem em evolução.
10. Novas necessidades visuais devem primeiro tentar reutilizar os Foundations existentes antes da criação de novos tokens.

---

# 9. Brand Asset — regra para implementação futura

A implementação atual/prototipada da marca não deve ser considerada padrão definitivo quando o símbolo e o texto “Connect” estiverem separados tecnicamente.

A versão oficial do produto deverá utilizar a logo RH Connect como um **asset oficial completo**, preferencialmente em SVG.

Não reconstruir o wordmark oficial usando:
- parte da logo em SVG;
- “Connect” como texto HTML/CSS separado.

A tipografia `font-family-brand = Poppins` permanece válida como referência institucional, mas não substitui o asset oficial da logo.

---

# 10. Próximas etapas

Com os Foundations v1 consolidados, o próximo trabalho do Design System deve seguir para:

1. Components;
2. Patterns/Layout;
3. Product Components;
4. implementação dos tokens e Components no Front-end;
5. criação da página oficial `/design-system`;
6. migração gradual das telas do produto;
7. alinhamento posterior com Figma.

Os Foundations não devem ser reabertos durante a etapa de Components sem evidência concreta de conflito, deficiência de acessibilidade ou necessidade real não coberta pela versão 1.

---

## Registro de origem

Este documento foi consolidado a partir das decisões finais exportadas pelo:

```text
Foundations Decision Lab v0.2.1
schemaVersion: 0.2.1
data: 2026-08-31
```

As decisões rejeitadas de 10px e 11px foram preservadas neste documento como regras explícitas de exclusão da escala oficial, enquanto propostas intermediárias e histórico de comparação não fazem parte desta especificação.
