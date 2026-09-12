# Auditoria de Design System do Front-end

## Resumo executivo

O `apps/web` possui uma base visual consistente o suficiente para servir como referência do RH Connect, mas o Design System ainda não está consolidado como fonte única de verdade.

O projeto aparenta combinar três camadas visuais:

1. tokens em `apps/web/src/styles/theme.css`, que aparentam ser a base ativa da identidade azul do RH Connect;
2. componentes disponíveis em `apps/web/src/app/components/ui`, no estilo shadcn/Radix;
3. componentes locais duplicados dentro das telas, principalmente `Btn`, `Card`, `Badge`, campos de formulário, sidebars e layouts por perfil.

A identidade predominante usa base clara, azul como cor principal, azul escuro para hierarquia, verde para sucesso, âmbar para atenção e vermelho para erro/perigo. Porém, ainda existem muitos valores hardcoded, gradientes inline, SVGs com cores fixas e variações locais de componentes que deveriam ser padronizadas antes de virar produto.

Esta auditoria não propõe redesign. Todas as classificações são preliminares e toda decisão oficial permanece **Pendente de validação**.

## Metodologia e limites da auditoria

Esta auditoria foi feita por análise estática do código existente em `apps/web`. Foram lidos arquivos de estilos, componentes reutilizáveis e telas principais, além de buscas por classes Tailwind, tokens, imports, componentes Radix, valores hardcoded e padrões visuais repetidos.

Limites importantes:

- A existência de um arquivo ou componente no repositório não confirma, por si só, que ele está sendo usado em runtime.
- A presença de imports ou classes no código indica uso provável, mas não substitui validação visual no navegador.
- A análise não compara automaticamente o resultado renderizado com o protótipo aprovado.
- A validação visual do protótipo aprovado ainda é necessária antes de consolidar tokens, componentes ou qualquer decisão de Design System.
- Nenhuma classificação deste documento deve ser tratada como decisão oficial.

## Inventário técnico

Arquivos principais analisados:

- `apps/web/src/styles/theme.css`;
- `apps/web/default_shadcn_theme.css`;
- `apps/web/src/styles/index.css`;
- `apps/web/src/styles/tailwind.css`;
- `apps/web/src/styles/fonts.css`;
- `apps/web/src/app/App.tsx`;
- `apps/web/src/app/components/admin-screens.tsx`;
- `apps/web/src/app/components/eval-screens.tsx`;
- `apps/web/src/app/components/landing-screen.tsx`;
- `apps/web/src/app/components/development-screen.tsx`;
- `apps/web/src/app/components/onboarding-screens.tsx`;
- `apps/web/src/app/components/header-popovers.tsx`;
- `apps/web/src/app/components/ui/*`.

Componentes disponíveis/encontrados em `components/ui`:

- Accordion;
- Alert;
- Alert Dialog;
- Aspect Ratio;
- Avatar;
- Badge;
- Breadcrumb;
- Button;
- Calendar;
- Card;
- Carousel;
- Chart;
- Checkbox;
- Collapsible;
- Command;
- Context Menu;
- Dialog;
- Drawer;
- Dropdown Menu;
- Form;
- Hover Card;
- Input;
- Input OTP;
- Label;
- Menubar;
- Navigation Menu;
- Pagination;
- Popover;
- Progress;
- Radio Group;
- Resizable;
- Scroll Area;
- Select;
- Separator;
- Sheet;
- Sidebar;
- Skeleton;
- Slider;
- Sonner;
- Switch;
- Table;
- Tabs;
- Textarea;
- Toggle;
- Toggle Group;
- Tooltip.

## 1. Cores e usos

| Item | Registro |
|---|---|
| Padrão encontrado | Tokens em `theme.css`: `--primary: #1D4ED8`, `--background: #EEF4FF`, `--foreground: #0F1B2D`, `--card: #FFFFFF`, `--secondary: #EFF6FF`, `--accent: #DBEAFE`, `--destructive: #DC2626`, `--sidebar: #0F2652`, charts em azul/verde/âmbar/roxo/vermelho. |
| Arquivos/componentes | `src/styles/theme.css`, `default_shadcn_theme.css`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`, `header-popovers.tsx`, `components/ui/*`. |
| Variações encontradas | Uso de tokens (`bg-primary`, `text-foreground`, `border-border`) misturado com Tailwind hardcoded (`bg-blue-50`, `text-blue-700`, `bg-slate-100`, `text-green-700`, `bg-red-500`) e styles inline com hex (`#021025`, `#1560FE`, `#0075FE`, `#001640`). |
| Possível inconsistência | `theme.css` aparenta ser a base ativa de tokens do app. `default_shadcn_theme.css` também existe no repositório como tema padrão shadcn, mas seu uso/importação precisa ser confirmado antes de qualquer decisão. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

Observações:

- A paleta visual aprovada parece estar mais bem representada em `theme.css`, que aparenta ser a base ativa observada pela importação atual de estilos.
- Azul principal aparece tanto como token (`#1D4ED8`) quanto como valores diretos (`blue-700`, `#0075FE`, `#1560FE`).
- Verde, âmbar e vermelho aparecem como estados visuais, mas sem tokens semânticos específicos como `status-success`, `status-warning` ou `status-danger`.

## 2. Tipografia

| Item | Registro |
|---|---|
| Padrão encontrado | `theme.css` define `font-family: 'Plus Jakarta Sans', sans-serif` no `body`. `fonts.css` importa Plus Jakarta Sans do Google Fonts. Headings e elementos básicos têm pesos 400/500 no layer base. |
| Arquivos/componentes | `src/styles/fonts.css`, `src/styles/theme.css`, `App.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`. |
| Variações encontradas | Uso majoritário de Plus Jakarta Sans, mas alguns elementos de logo usam Poppins inline (`fontFamily: "'Poppins', sans-serif"`). Há muitos tamanhos diretos como `text-[72px]`, `text-[80px]`, `text-[11px]`, `font-extrabold`, `font-bold`, `font-semibold`. |
| Possível inconsistência | Poppins aparece em logo/wordmark sem estar importada em `fonts.css`. Os pesos e escalas de título variam por tela. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 3. Espaçamentos

| Item | Registro |
|---|---|
| Padrão encontrado | Uso extensivo de Tailwind: `p-4`, `p-5`, `p-6`, `px-4`, `py-3`, `gap-3`, `gap-4`, `gap-5`, `space-y-4`, `sm:p-6`, `lg:p-8`. |
| Arquivos/componentes | Telas em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`; componentes `ui/card.tsx`, `ui/dialog.tsx`, `ui/table.tsx`. |
| Variações encontradas | Cards usam `p-4 sm:p-5`, `p-5 sm:p-6`, `p-6 sm:p-8`, `p-6 sm:p-10`. Layouts usam `p-4 sm:p-6 lg:p-8`; landing usa `px-4 sm:px-8 py-14 sm:py-20`. |
| Possível inconsistência | Há padrões bons, mas ainda não há escala documentada de spacing para componentes e páginas. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Médio/Alto. |
| Decisão oficial | Pendente de validação. |

## 4. Border-radius

| Item | Registro |
|---|---|
| Padrão encontrado | `theme.css` define `--radius: 0.75rem`. Componentes `ui` usam `rounded-md`, `rounded-lg`, `rounded-xl`; telas locais usam muito `rounded-xl`, `rounded-2xl` e `rounded-full`. |
| Arquivos/componentes | `theme.css`, `default_shadcn_theme.css`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`, `components/ui/*`. |
| Variações encontradas | `components/ui/button.tsx` usa `rounded-md`; `Btn` local usa `rounded-xl`; `Card` local usa `rounded-2xl`; `Card` de `ui` usa `rounded-xl`; badges locais usam `rounded-full`; `ui/badge.tsx` usa `rounded-md`. |
| Possível inconsistência | Componentes locais e `components/ui` têm raios diferentes para os mesmos papéis visuais. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 5. Bordas

| Item | Registro |
|---|---|
| Padrão encontrado | Token `--border: rgba(15, 27, 45, 0.09)` em `theme.css`; uso recorrente de `border border-border`, `border-blue-100`, `border-blue-200`, `border-slate-200`, `border-red-200`, `border-dashed`. |
| Arquivos/componentes | `theme.css`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `development-screen.tsx`, `components/ui/*`. |
| Variações encontradas | Bordas semânticas por estado usam classes hardcoded; bordas estruturais usam tokens. |
| Possível inconsistência | Falta separar tokens de borda estrutural e borda de status. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 6. Sombras

| Item | Registro |
|---|---|
| Padrão encontrado | Uso comum de `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`; cards locais usam `shadow-sm`; overlays/modais usam sombras maiores. |
| Arquivos/componentes | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `onboarding-screens.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/popover.tsx`, `components/ui/chart.tsx`. |
| Variações encontradas | Hover em cards/botões usa `hover:shadow-md`; modais locais usam `shadow-2xl`; dropdowns usam `shadow-md` ou `shadow-lg`. |
| Possível inconsistência | Não há regra documentada para sombra por elevação: card, hover, dropdown, modal. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 7. Ícones

| Item | Registro |
|---|---|
| Padrão encontrado | `lucide-react` é a biblioteca de ícones usada nas telas e em componentes `ui`. Tamanhos recorrentes: `w-3 h-3`, `w-3.5 h-3.5`, `w-4 h-4`, `w-5 h-5`, `w-6 h-6`, `size-4`. |
| Arquivos/componentes | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`, `header-popovers.tsx`, `components/ui/*`. |
| Variações encontradas | SVGs de logo embutidos usam fills hardcoded. Algumas ações são botões só com ícone sem padronização completa de aria-label. |
| Possível inconsistência | Falta padrão oficial para tamanho de ícone por contexto: botão, card, sidebar, status, hero. |
| Classificação preliminar | Manter e padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 8. Breakpoints e responsividade

| Item | Registro |
|---|---|
| Padrão encontrado | Uso extensivo dos breakpoints Tailwind `sm`, `md`, `lg`, `xl`. Padrões comuns: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, `flex-col sm:flex-row`, `hidden sm:block`, `md:grid`, `xl:grid-cols-3`. |
| Arquivos/componentes | Principalmente `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `onboarding-screens.tsx`, `components/ui/sidebar.tsx`, `components/ui/table.tsx`. |
| Variações encontradas | Algumas tabelas são `overflow-x-auto`; layouts internos usam colunas adaptativas; sidebar base usa comportamento mobile com `Sheet`, mas telas locais usam sidebars próprias com largura fixa/recolhível. |
| Possível inconsistência | Responsividade está aplicada tela a tela, sem guidelines de layout por perfil. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 9. Animações e transições

| Item | Registro |
|---|---|
| Padrão encontrado | `transition-all`, `transition-colors`, `duration-200`, `duration-[220ms]`, `animate-pulse`, `animate-spin`, Radix `data-[state=open]:animate-in`, `fade-in`, `zoom-in`, `slide-in`. |
| Arquivos/componentes | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `development-screen.tsx`, `components/ui/dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `sheet.tsx`, `navigation-menu.tsx`, `tooltip.tsx`, `skeleton.tsx`. |
| Variações encontradas | Componentes base usam transições Radix/shadcn; telas locais usam transições Tailwind diretas. |
| Possível inconsistência | Falta definição de duração e uso aceitável por tipo de interação. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 10. Buttons

| Item | Registro |
|---|---|
| Padrão encontrado | Existe `components/ui/button.tsx` com `buttonVariants` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; tamanhos `default`, `sm`, `lg`, `icon`). Também existem funções locais `Btn` em múltiplos arquivos. |
| Arquivos/componentes | `components/ui/button.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`. |
| Variações encontradas | `ui/Button` usa `rounded-md`, `h-9`, `text-primary-foreground`; `Btn` local usa `rounded-xl`, `px-4 py-2.5`, `text-white`, estados `active` e variantes `danger`; `development-screen.tsx` usa cores hardcoded `bg-blue-700`, `text-slate-800`. |
| Possível inconsistência | Há dois sistemas de botão concorrentes. As telas principais usam o `Btn` local, não o `Button` consolidável. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 11. Inputs e formulários

| Item | Registro |
|---|---|
| Padrão encontrado | Existe `components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx`, `form.tsx`, `checkbox.tsx`, `radio-group.tsx`, `input-otp.tsx`. Também existem helpers locais `Field`, `FieldSelect`, `FieldArea` em `App.tsx`. |
| Arquivos/componentes | `components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `form.tsx`, `label.tsx`, `checkbox.tsx`, `radio-group.tsx`, `input-otp.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`. |
| Variações encontradas | `ui/Input` usa `h-9 rounded-md px-3 py-1`; `Field` local usa `px-4 py-3 rounded-xl`; foco varia entre `focus-visible:ring-[3px]` e `focus:ring-2 focus:ring-primary/30`. |
| Possível inconsistência | Formulários visuais ainda não estão padronizados com React Hook Form/Zod; campos locais duplicam componentes `ui`. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 12. Cards

| Item | Registro |
|---|---|
| Padrão encontrado | Existe `components/ui/card.tsx` com partes (`CardHeader`, `CardContent`, etc.). Também existem `Card` locais em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`. |
| Arquivos/componentes | `components/ui/card.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`. |
| Variações encontradas | `ui/Card`: `rounded-xl border flex flex-col gap-6`; `Card` local: `bg-card rounded-2xl border border-border shadow-sm`; `development-screen` usa `bg-white border-slate-200`. |
| Possível inconsistência | Card visual principal do protótipo é mais arredondado que o `ui/Card`. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 13. Badges

| Item | Registro |
|---|---|
| Padrão encontrado | `components/ui/badge.tsx` tem variantes shadcn (`default`, `secondary`, `destructive`, `outline`). Badges locais têm variantes semânticas (`success`, `warning`, `error`, `info`, `purple`). |
| Arquivos/componentes | `components/ui/badge.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `development-screen.tsx`, `landing-screen.tsx`. |
| Variações encontradas | `ui/Badge` usa `rounded-md border`; badges locais usam `rounded-full` e cores de status hardcoded. |
| Possível inconsistência | O produto precisa de `StatusBadge`, mas o componente base atual não cobre os estados usados nas telas. |
| Classificação preliminar | Criar/definir e padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 14. Dialogs/modals

| Item | Registro |
|---|---|
| Padrão encontrado | Existem `Dialog`, `AlertDialog`, `Sheet` e `Drawer` em `components/ui`. Também há modais locais em `App.tsx` e overlays de confirmação/logout em telas. |
| Arquivos/componentes | `components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`. |
| Variações encontradas | `ui/Dialog` usa Radix com overlay `bg-black/50`, `rounded-lg`, `shadow-lg`; modais locais usam `bg-white rounded-2xl shadow-2xl` e overlays inline `rgba(...)`. |
| Possível inconsistência | Há modais acessíveis via Radix e modais manuais sem a mesma base de acessibilidade. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 15. Dropdowns/popovers

| Item | Registro |
|---|---|
| Padrão encontrado | `components/ui/dropdown-menu.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `menubar.tsx`, `command.tsx` usam Radix/cmdk. `header-popovers.tsx` implementa popovers próprios para conta/notificações. |
| Arquivos/componentes | `components/ui/dropdown-menu.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `menubar.tsx`, `command.tsx`, `header-popovers.tsx`. |
| Variações encontradas | Radix fornece portal/estado/animação; popovers de header parecem customizados com estado local e classes próprias. |
| Possível inconsistência | Popovers críticos do header não usam necessariamente o mesmo primitive/padrão dos componentes base. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Médio/Alto. |
| Decisão oficial | Pendente de validação. |

## 16. Tabs

| Item | Registro |
|---|---|
| Padrão encontrado | `components/ui/tabs.tsx` usa Radix Tabs. `App.tsx` também usa tabs manuais em autenticação e configurações, com botões e estado local. |
| Arquivos/componentes | `components/ui/tabs.tsx`, `App.tsx`, possivelmente telas administrativas/avaliador com filtros manuais. |
| Variações encontradas | Tabs base usam `TabsPrimitive`; tabs locais usam botões com `border-b` ou chips `rounded-full`. |
| Possível inconsistência | Há tabs, filtros e segmented controls visualmente parecidos implementados de formas diferentes. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 17. Toasts

| Item | Registro |
|---|---|
| Padrão encontrado | Uso de `sonner` diretamente em `App.tsx` e `development-screen.tsx`; também existe wrapper `components/ui/sonner.tsx`. |
| Arquivos/componentes | `App.tsx`, `development-screen.tsx`, `components/ui/sonner.tsx`. |
| Variações encontradas | O `App.tsx` importa `Toaster` diretamente de `sonner`, enquanto `components/ui/sonner.tsx` expõe wrapper com tokens de tema. |
| Possível inconsistência | Há wrapper do DS, mas parte da aplicação usa Sonner diretamente. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 18. Tabelas

| Item | Registro |
|---|---|
| Padrão encontrado | `components/ui/table.tsx` define tabela responsiva com `overflow-x-auto`, linhas com hover e células compactas. Telas admin/eval usam tabelas/listagens visuais próprias. |
| Arquivos/componentes | `components/ui/table.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `App.tsx`. |
| Variações encontradas | Tabelas base existem, mas algumas listas são cards/tabelas manuais com classes locais. |
| Possível inconsistência | Falta padrão oficial para quando usar tabela, card-list ou tabela responsiva. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Médio. |
| Decisão oficial | Pendente de validação. |

## 19. Sidebar

| Item | Registro |
|---|---|
| Padrão encontrado | Existe `components/ui/sidebar.tsx` completo, com provider, estado, mobile via `Sheet`, cookie, atalhos e variantes. As telas também possuem sidebars próprias: `SidebarContent` em `App.tsx`, `AdminSidebarContent`, `EvalSidebarContent`. |
| Arquivos/componentes | `components/ui/sidebar.tsx`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`. |
| Variações encontradas | Sidebar `ui` usa tokens `sidebar-*`; sidebars locais usam `style={{ backgroundColor: "#021025" }}`, `sessionStorage`, largura `w-16`/`w-60`, e menus manuais. |
| Possível inconsistência | Há duas famílias de sidebar: uma base shadcn e outra prototipada por perfil. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 20. Header

| Item | Registro |
|---|---|
| Padrão encontrado | Headers/topbars locais por perfil: `TopBar`, `AdminTopBar`, `EvalTopBar`. Popovers de conta/notificação ficam em `header-popovers.tsx`. |
| Arquivos/componentes | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `header-popovers.tsx`. |
| Variações encontradas | Headers compartilham estrutura visual, mas são implementados separadamente. Ações ficam ocultas em mobile com `hidden sm:flex`. |
| Possível inconsistência | Falta componente compartilhado de `AppHeader`/`TopBar` por perfil. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 21. Gráficos

| Item | Registro |
|---|---|
| Padrão encontrado | `recharts` usado diretamente em `App.tsx` e wrapper `components/ui/chart.tsx`. Tokens `--chart-1` a `--chart-5` existem em `theme.css`. |
| Arquivos/componentes | `App.tsx`, `components/ui/chart.tsx`, `theme.css`. |
| Variações encontradas | Alguns gráficos usam cores/tokens diretamente pelo Recharts; o wrapper `ChartContainer` oferece configuração por tema. |
| Possível inconsistência | Falta decidir se gráficos devem usar wrapper `ui/chart` sempre ou se uso direto do Recharts é permitido. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 22. Estados de loading, empty, error, success e disabled

| Item | Registro |
|---|---|
| Padrão encontrado | Disabled em botões/campos usa `disabled:opacity-50`, `disabled:cursor-not-allowed`; loading usa spinners manuais (`animate-spin`) e textos como "Enviando..."; success usa badges verdes/checks; warning usa âmbar/pulse; error usa vermelho; skeleton existe em `components/ui/skeleton.tsx`. |
| Arquivos/componentes | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `components/ui/button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `skeleton.tsx`, `alert.tsx`. |
| Variações encontradas | Estados são visuais e locais; não há componentes oficiais `LoadingState`, `EmptyState`, `ErrorState`, `SuccessState`. |
| Possível inconsistência | Empty/error/loading aparecem por tela, sem padrão transversal. |
| Classificação preliminar | Criar/definir. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 23. Componentes Radix utilizados

| Item | Registro |
|---|---|
| Padrão encontrado | Uso de Radix em componentes base: Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Slot, Switch, Tabs, Toggle, Toggle Group, Tooltip. |
| Arquivos/componentes | `components/ui/*`. |
| Variações encontradas | A maioria dos primitives existe como componente pronto, mas muitas telas ainda não os consomem diretamente. |
| Possível inconsistência | O app tem uma biblioteca de componentes base maior que o uso real das telas. |
| Classificação preliminar | Manter e avaliar uso real. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 24. Componentes reutilizáveis existentes

| Item | Registro |
|---|---|
| Padrão encontrado | `components/ui` contém componentes reutilizáveis genéricos. Telas têm helpers locais reaproveitados dentro de arquivo: `Btn`, `Badge`, `Card`, `StatCard`, `AuthLayout`, `AdminLayout`, `EvalLayout`. |
| Arquivos/componentes | `components/ui/*`, `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`. |
| Variações encontradas | Reutilização local, mas não compartilhada entre arquivos. |
| Possível inconsistência | Componentes fundamentais existem duplicados e concorrentes. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 25. Classes Tailwind repetidas

Padrões repetidos com potencial de consolidação futura:

- Botão local: `inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`.
- Card local: `bg-card rounded-2xl border border-border shadow-sm`.
- Form field local: `w-full px-4 py-3 border border-border rounded-xl bg-input-background text-foreground ... focus:ring-2 focus:ring-primary/30`.
- Stat card icon: `w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center`.
- Header/topbar: `bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-3 sm:py-4`.
- Grid responsivo: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-*`.
- Ação de ícone: `p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors`.

| Item | Registro |
|---|---|
| Padrão encontrado | Muitas classes se repetem entre telas e perfis. |
| Arquivos/componentes | Principalmente `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`. |
| Variações encontradas | Pequenas diferenças em cor, radius, padding, foco e hover. |
| Possível inconsistência | Manutenção arriscada e divergência visual progressiva. |
| Classificação preliminar | Padronizar. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 26. Valores hardcoded

Exemplos encontrados:

- Hex em tokens e SVGs: `#1D4ED8`, `#0F2652`, `#1560FE`, `#0075FE`, `#001640`, `#021025`, `#EEF4FF`, `#DBEAFE`.
- Gradientes inline: `linear-gradient(135deg, #1D4ED8, #0F2652)`, `linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%)`, `linear-gradient(135deg, #0F2652 0%, #1D4ED8 100%)`.
- Estilo inline: `backgroundColor: "#021025"`, `backgroundColor: "rgba(15,38,82,0.92)"`, `fontFamily: "'Poppins', sans-serif"`.
- Tamanhos arbitrários: `max-w-[240px]`, `text-[72px]`, `text-[80px]`, `text-[11px]`, `duration-[220ms]`.

| Item | Registro |
|---|---|
| Padrão encontrado | Hardcodes aparecem em tokens, classes, SVGs e styles inline. |
| Arquivos/componentes | `App.tsx`, `landing-screen.tsx`, `onboarding-screens.tsx`, `development-screen.tsx`, `theme.css`, `default_shadcn_theme.css`. |
| Variações encontradas | Alguns hardcodes são identidade visual/logo; outros são estados, fundos e layout. |
| Possível inconsistência | Mistura de tokens e valores diretos dificulta auditoria de acessibilidade e manutenção. |
| Classificação preliminar | Padronizar, preservando valores de identidade quando validados. |
| Nível de confiança | Alto. |
| Decisão oficial | Pendente de validação. |

## 27. Padrões semelhantes implementados de formas diferentes

| Padrão | Implementações encontradas | Classificação preliminar | Confiança | Decisão oficial |
|---|---|---|---|---|
| Botões | `components/ui/Button` e `Btn` local em vários arquivos | Padronizar | Alto | Pendente de validação |
| Cards | `components/ui/Card` e `Card` local em vários arquivos | Padronizar | Alto | Pendente de validação |
| Badges/status | `components/ui/Badge` e `Badge` local semântico | Criar/definir | Alto | Pendente de validação |
| Inputs | `components/ui/Input` e helpers `Field` locais | Padronizar | Alto | Pendente de validação |
| Sidebar | `components/ui/Sidebar` e sidebars por perfil | Padronizar | Alto | Pendente de validação |
| Header/topbar | `TopBar`, `AdminTopBar`, `EvalTopBar` | Padronizar | Alto | Pendente de validação |
| Tabs/filtros | Radix Tabs, tabs manuais, chips filtráveis | Padronizar | Médio/Alto | Pendente de validação |
| Modais | Radix Dialog/AlertDialog e modais manuais | Padronizar | Alto | Pendente de validação |
| Toasts | `sonner` direto e wrapper `ui/sonner` | Padronizar | Alto | Pendente de validação |
| Gráficos | Recharts direto e wrapper `ui/chart` | Padronizar | Alto | Pendente de validação |

## Inconsistências principais

1. `theme.css` aparenta ser a base ativa de tokens, enquanto `default_shadcn_theme.css` existe no repositório e precisa ter seu uso/importação confirmado antes de qualquer decisão.
2. Componentes fundamentais estão duplicados: Button/Btn, Card, Badge.
3. Componentes `ui` usam radius e tamanhos mais próximos do shadcn padrão, enquanto telas usam visual mais arredondado do protótipo.
4. Cores de status estão hardcoded em classes, não em tokens semânticos.
5. Popovers/header, sidebars e modais têm implementações manuais concorrendo com Radix.
6. Tipografia mistura Plus Jakarta Sans com Poppins inline em logo/wordmark.
7. Gráficos usam Recharts diretamente e também wrapper `ui/chart`.
8. Estados de loading/empty/error/success não têm componentes oficiais.

## Duplicações

- `Btn` repetido em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`, `onboarding-screens.tsx`.
- `Badge` repetido em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`.
- `Card` repetido em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `development-screen.tsx`.
- Layouts de sidebar/topbar repetidos por perfil.
- Campos de formulário locais coexistem com `components/ui`.
- Modais manuais coexistem com `Dialog`/`AlertDialog`.

## Riscos

- Consolidar componentes sem validação pode alterar visual aprovado.
- Remover hardcodes de logo/brand sem decisão pode quebrar identidade.
- Substituir `Btn` local por `ui/Button` diretamente pode mudar radius, altura, padding e estados.
- Migrar sidebars para `ui/sidebar` pode alterar comportamento mobile e estado recolhido.
- Padronizar badges sem mapear status do produto pode perder significado visual.
- Alterar tokens sem revisar telas pode afetar todo o app.
- A ausência de validações reais de typecheck/lint/test aumenta risco de regressão silenciosa.

## Itens que precisam de decisão humana

- Qual arquivo será fonte oficial de tokens: `theme.css`, uma consolidação futura ou alguma referência derivada de `default_shadcn_theme.css`, caso seu uso seja confirmado?
- O radius visual oficial deve seguir o protótipo (`rounded-xl`/`rounded-2xl`) ou o shadcn base (`rounded-md`/`rounded-lg`)?
- `Button`, `Card`, `Badge` devem migrar para `components/ui` ou para `packages/ui` futuramente?
- A paleta de status deve virar tokens semânticos?
- Lucide React será o padrão oficial de ícones?
- O wrapper `ui/sonner` deve ser obrigatório para toasts?
- Gráficos devem sempre passar por `ui/chart`?
- `components/ui/sidebar` será usado ou os layouts por perfil serão consolidados a partir dos protótipos locais?
- Poppins deve ser importada oficialmente para o logo ou substituída por Plus Jakarta Sans?
- Quais estados oficiais serão exigidos para loading, empty, error, success e disabled?

## Recomendações para a próxima etapa

1. Não fazer redesign.
2. Preservar o visual aprovado como referência.
3. Tratar `theme.css` como candidato inicial à fonte de tokens por aparentar ser a base ativa, mas validar antes.
4. Criar uma matriz visual de tokens existentes: cor, tipografia, spacing, radius, sombra, estado.
5. Consolidar primeiro componentes pequenos e fundamentais: Button, Input, Card e Badge.
6. Comparar visualmente cada componente local com `components/ui` antes de substituir.
7. Criar tokens semânticos para status somente após validação humana.
8. Documentar uma regra para hardcodes permitidos: logo/brand versus estados/layout.
9. Antes de migrar sidebar/header, mapear diferenças entre Candidato, Avaliador e Administrador.
10. Manter todas as decisões oficiais como pendentes até revisão da equipe.

## Classificação geral preliminar

| Área | Classificação preliminar | Confiança | Decisão oficial |
|---|---|---|---|
| Tokens em `theme.css` | Manter e padronizar | Alto | Pendente de validação |
| `default_shadcn_theme.css` | Confirmar uso/importação antes de avaliar remoção ou arquivamento como referência | Médio | Pendente de validação |
| Componentes `components/ui` | Manter e auditar uso real | Alto | Pendente de validação |
| `Btn`, `Card`, `Badge` locais | Padronizar gradualmente | Alto | Pendente de validação |
| Hardcodes de marca/logo | Manter até validação | Alto | Pendente de validação |
| Hardcodes de status/layout | Padronizar gradualmente | Alto | Pendente de validação |
| Sidebars por perfil | Padronizar após mapeamento | Alto | Pendente de validação |
| Header/topbars | Padronizar após mapeamento | Alto | Pendente de validação |
| Estados visuais | Criar/definir | Alto | Pendente de validação |
