# Auditoria de Dependências do Front-end

## 1. Objetivo da auditoria

Registrar o estado atual das dependências do Front-end do RH Connect em `apps/web`, identificando o que parece essencial, o que está ligado ao Design System, o que vem da exportação do Figma Make e o que precisa ser avaliado antes de qualquer remoção, atualização ou substituição.

Esta auditoria é documental. Ela não autoriza remoção automática de pacotes nem alteração do `package.json`.

## 2. Contexto

O RH Connect é um monorepo e o Front-end atual está em:

```text
apps/web
```

A base atual do Front veio de uma exportação do Figma Make. Por isso, o `apps/web/package.json` ainda possui dependências típicas de protótipo e de componentes gerados, incluindo bibliotecas que existem no `package.json`, mas não aparecem em uso direto no código atual.

O package manager oficial do projeto é:

```text
pnpm
```

O lockfile versionado é:

```text
pnpm-lock.yaml
```

## 3. Como a auditoria foi feita

Foram analisados:

- `apps/web/package.json`;
- `pnpm-lock.yaml`;
- imports e ocorrências em `apps/web/src`;
- configuração de build em `apps/web/vite.config.ts`;
- configuração relacionada a Tailwind em `apps/web/src/styles`.

Critério usado para "uso real no código":

- **Sim**: há import ou referência direta no código-fonte/configuração atual.
- **Parcial**: existe uso em componentes base, mas não necessariamente em telas finais.
- **Não encontrado**: não foi encontrada referência direta em `apps/web/src` ou configurações analisadas.

Observação importante:

- `react` e `react-dom` aparecem como `peerDependencies` no `apps/web/package.json`, mas são essenciais para a aplicação. Eles também aparecem resolvidos no `pnpm-lock.yaml`.
- Os scripts atuais de `typecheck`, `lint`, `test` e `format` estão temporariamente substituídos por `echo`, então esta auditoria não dependeu deles.

## 4. Matriz completa de dependências

### Core e runtime

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `react` | `18.3.1` | peerDependencies | core | Biblioteca base da UI. | Sim | `src/main.tsx`, componentes `.tsx` | Nenhuma equivalente no projeto | Alto | Base de todos os componentes | Deve constar como stack oficial | Manter |
| `react-dom` | `18.3.1` | peerDependencies | core | Renderização React no DOM. | Sim | `src/main.tsx` | Nenhuma equivalente no projeto | Alto | Base de montagem da UI | Deve constar como stack oficial | Manter |
| `@babel/runtime` | `^8.0.0` | dependencies | core/outros | Runtime auxiliar de Babel, provavelmente trazido pela exportação. | Não encontrado | Não encontrado | Vite/SWC/Babel indireto | Médio | Nenhum direto | Avaliar se é necessário ao build | Avaliar |

### UI, componentes e Design System

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `@radix-ui/react-accordion` | `1.2.3` | dependencies | UI/componentes | Primitive acessível para Accordion. | Sim | `components/ui/accordion.tsx` | MUI Accordion | Médio | Pode compor DS | Registrar como base UI atual | Manter |
| `@radix-ui/react-alert-dialog` | `1.1.6` | dependencies | UI/componentes | Dialog de alerta. | Sim | `components/ui/alert-dialog.tsx` | MUI Dialog, Radix Dialog | Médio | Pode compor DS | Registrar como base UI atual | Manter |
| `@radix-ui/react-aspect-ratio` | `1.1.2` | dependencies | UI/componentes | Controle de proporção visual. | Sim | `components/ui/aspect-ratio.tsx` | CSS nativo | Baixo/Médio | Útil para mídia/vídeo | Registrar como suporte UI | Avaliar |
| `@radix-ui/react-avatar` | `1.1.3` | dependencies | UI/componentes | Avatar acessível. | Sim | `components/ui/avatar.tsx` | MUI Avatar | Médio | Útil para header/perfis | Registrar como base UI atual | Manter |
| `@radix-ui/react-checkbox` | `1.1.4` | dependencies | UI/componentes | Checkbox acessível. | Sim | `components/ui/checkbox.tsx` | MUI Checkbox | Médio | Fundamental para formulários | Registrar como base UI atual | Manter |
| `@radix-ui/react-collapsible` | `1.1.3` | dependencies | UI/componentes | Áreas recolhíveis. | Sim | `components/ui/collapsible.tsx` | Disclosure próprio | Baixo/Médio | Útil em sidebars/filtros | Registrar como suporte UI | Avaliar |
| `@radix-ui/react-context-menu` | `2.2.6` | dependencies | UI/componentes | Menu de contexto. | Sim | `components/ui/context-menu.tsx` | MUI Menu | Baixo/Médio | Não parece central agora | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-dialog` | `1.1.6` | dependencies | UI/componentes | Dialog/modal acessível. | Sim | `components/ui/dialog.tsx`, `components/ui/sheet.tsx` | MUI Dialog, Vaul Drawer | Alto | Base para Modal/Dialog/Sheet | Registrar como base UI atual | Manter |
| `@radix-ui/react-dropdown-menu` | `2.1.6` | dependencies | UI/componentes | Dropdown acessível. | Sim | `components/ui/dropdown-menu.tsx` | MUI Menu, Popover | Médio | Útil para header e ações | Registrar como base UI atual | Manter |
| `@radix-ui/react-hover-card` | `1.1.6` | dependencies | UI/componentes | Card ao passar mouse. | Sim | `components/ui/hover-card.tsx` | Tooltip/Popover | Baixo | Pode ser opcional | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-label` | `2.1.2` | dependencies | UI/componentes | Label acessível para campos. | Sim | `components/ui/label.tsx`, `components/ui/form.tsx` | Label HTML | Médio | Fundamental para acessibilidade | Registrar como base UI atual | Manter |
| `@radix-ui/react-menubar` | `1.1.6` | dependencies | UI/componentes | Menubar. | Sim | `components/ui/menubar.tsx` | Navigation/Menu próprio | Baixo/Médio | Pode ser opcional | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-navigation-menu` | `1.2.5` | dependencies | UI/componentes | Menu de navegação. | Sim | `components/ui/navigation-menu.tsx` | React Router + layout próprio | Baixo/Médio | Pode apoiar navegação futura | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-popover` | `1.1.6` | dependencies | UI/componentes | Popover acessível. | Sim | `components/ui/popover.tsx` | React Popper, MUI Popover | Médio | Útil para filtros, menus e header | Registrar como base UI atual | Manter |
| `@radix-ui/react-progress` | `1.1.2` | dependencies | UI/componentes | Barra de progresso. | Sim | `components/ui/progress.tsx` | HTML progress | Médio | Útil para entrevista/upload | Registrar como base UI atual | Manter |
| `@radix-ui/react-radio-group` | `1.2.3` | dependencies | UI/componentes | Radio group acessível. | Sim | `components/ui/radio-group.tsx` | MUI Radio | Médio | Fundamental para formulários | Registrar como base UI atual | Manter |
| `@radix-ui/react-scroll-area` | `1.2.3` | dependencies | UI/componentes | Área com scroll customizado. | Sim | `components/ui/scroll-area.tsx` | CSS overflow | Baixo/Médio | Pode apoiar menus/tabelas | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-select` | `2.1.6` | dependencies | UI/componentes | Select acessível. | Sim | `components/ui/select.tsx` | MUI Select, HTML select | Médio | Fundamental para formulários | Registrar como base UI atual | Manter |
| `@radix-ui/react-separator` | `1.1.2` | dependencies | UI/componentes | Separador visual/acessível. | Sim | `components/ui/separator.tsx` | CSS border | Baixo | Baixo impacto | Registrar como suporte UI | Avaliar |
| `@radix-ui/react-slider` | `1.2.3` | dependencies | UI/componentes | Slider acessível. | Sim | `components/ui/slider.tsx` | HTML range, MUI Slider | Baixo/Médio | Pode apoiar configurações/filtros | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-slot` | `1.1.2` | dependencies | UI/componentes | Composição `asChild` de componentes. | Sim | `button.tsx`, `badge.tsx`, `form.tsx`, `sidebar.tsx` | Nenhuma direta | Alto | Importante para Button/Badge | Registrar como base UI atual | Manter |
| `@radix-ui/react-switch` | `1.1.3` | dependencies | UI/componentes | Switch acessível. | Sim | `components/ui/switch.tsx` | MUI Switch | Médio | Fundamental para preferências | Registrar como base UI atual | Manter |
| `@radix-ui/react-tabs` | `1.1.3` | dependencies | UI/componentes | Abas acessíveis. | Sim | `components/ui/tabs.tsx` | MUI Tabs | Médio | Útil para dashboards | Registrar como base UI atual | Manter |
| `@radix-ui/react-toggle` | `1.1.2` | dependencies | UI/componentes | Toggle acessível. | Sim | `components/ui/toggle.tsx`, `toggle-group.tsx` | Switch/Checkbox | Baixo/Médio | Pode ser opcional | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-toggle-group` | `1.1.2` | dependencies | UI/componentes | Grupo de toggles. | Sim | `components/ui/toggle-group.tsx` | Radio group | Baixo/Médio | Pode ser opcional | Registrar como UI opcional | Avaliar |
| `@radix-ui/react-tooltip` | `1.1.8` | dependencies | UI/componentes | Tooltip acessível. | Sim | `components/ui/tooltip.tsx` | MUI Tooltip | Médio | Útil para UX e acessibilidade | Registrar como base UI atual | Manter |
| `vaul` | `1.1.2` | dependencies | UI/componentes | Drawer para mobile/overlays. | Sim | `components/ui/drawer.tsx` | Radix Dialog/Sheet | Médio | Pode apoiar mobile | Registrar como suporte UI | Avaliar |
| `cmdk` | `1.1.1` | dependencies | UI/componentes | Command palette/lista pesquisável. | Sim | `components/ui/command.tsx` | Combobox próprio | Baixo/Médio | Pode ser opcional | Registrar como UI opcional | Avaliar |
| `input-otp` | `1.4.2` | dependencies | UI/componentes | Campo de código OTP. | Sim | `components/ui/input-otp.tsx` | Inputs próprios | Médio | Útil para verificação/ativação | Registrar se auth usar OTP | Avaliar |
| `react-day-picker` | `8.10.1` | dependencies | UI/componentes/datas | Calendário. | Sim | `components/ui/calendar.tsx` | MUI Date Picker | Médio | Pode integrar formulários | Registrar como UI opcional | Avaliar |
| `react-resizable-panels` | `2.1.7` | dependencies | UI/componentes | Painéis redimensionáveis. | Sim | `components/ui/resizable.tsx` | CSS/layout próprio | Baixo | Pouco impacto no DS atual | Registrar como opcional | Avaliar |
| `embla-carousel-react` | `8.6.0` | dependencies | UI/componentes | Carrossel. | Sim | `components/ui/carousel.tsx` | `react-slick` | Baixo/Médio | Pode apoiar landing/onboarding | Registrar duplicação com slick | Avaliar |
| `react-slick` | `0.31.0` | dependencies | UI/componentes | Carrossel. | Não encontrado | Não encontrado | `embla-carousel-react` | Baixo | Duplicação provável | Sinalizar para limpeza futura | Remover, após validação |
| `react-responsive-masonry` | `2.7.1` | dependencies | UI/componentes | Layout masonry responsivo. | Não encontrado | Não encontrado | CSS grid | Baixo | Pouco impacto | Sinalizar como provável sobra | Remover, após validação |

### Ícones, gráficos, motion e feedback

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `lucide-react` | `0.487.0` | dependencies | ícones | Ícones da interface. | Sim | `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx`, `components/ui/*` | `@mui/icons-material` | Alto | Deve ser padrão de ícones | Registrar como stack visual oficial | Manter |
| `@mui/icons-material` | `7.3.5` | dependencies | ícones/UI | Ícones Material UI. | Não encontrado | Não encontrado | `lucide-react` | Baixo/Médio | Pode conflitar com padrão visual | Sinalizar duplicação | Remover, após validação |
| `recharts` | `2.15.2` | dependencies | gráficos | Gráficos/radar/dashboards. | Sim | `App.tsx`, `components/ui/chart.tsx` | MUI X Charts, Chart.js | Alto | Define visual de gráficos | Registrar como stack de gráficos atual | Manter |
| `motion` | `12.23.24` | dependencies | motion/animações | Animações; possivelmente equivalente moderno ao Framer Motion. | Parcial | `components/ui/navigation-menu.tsx` | CSS/Tailwind animations | Médio | Pode afetar transições do DS | Registrar como animação a avaliar | Avaliar |
| `tw-animate-css` | `1.3.8` | dependencies | motion/animações | Animações utilitárias para Tailwind. | Sim | `src/styles/tailwind.css` | `motion`, CSS nativo | Médio | Pode afetar estados animados | Registrar como suporte Tailwind | Manter |
| `canvas-confetti` | `1.9.4` | dependencies | motion/animações | Efeito de confete, provável gamificação/protótipo. | Não encontrado | Não encontrado | CSS/motion próprio | Baixo | Pode destoar do DS se usado sem critério | Sinalizar como futuro/gamificação | Avaliar/Remover |
| `sonner` | `2.0.3` | dependencies | UI/componentes | Toasts/notificações. | Sim | `App.tsx`, `development-screen.tsx`, `components/ui/sonner.tsx` | Toast próprio/MUI Snackbar | Médio/Alto | Pode ser padrão de feedback | Registrar como componente de feedback | Manter |
| `next-themes` | `0.4.6` | dependencies | UI/componentes | Tema claro/escuro em wrapper de toaster. | Parcial | `components/ui/sonner.tsx` | Contexto próprio de tema | Baixo/Médio | Pode ser desnecessário se não houver tema escuro | Avaliar na consolidação do DS | Avaliar |

### Formulários, datas e utilitários

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `react-hook-form` | `7.55.0` | dependencies | formulários | Gerenciamento de formulários. | Parcial | `components/ui/form.tsx` | Form state manual | Médio/Alto | Deve orientar FormField | Stack já prevista | Manter |
| `date-fns` | `3.6.0` | dependencies | datas | Utilitários de data, suporte ao DayPicker. | Não encontrado diretamente | Não encontrado direto; lock vincula ao `react-day-picker` | Intl/Day.js | Médio se calendário for mantido | Apoia calendários | Registrar como dependência de calendário | Avaliar |
| `class-variance-authority` | `0.7.1` | dependencies | utilitários | Variantes de componentes, ex. Button/Badge. | Sim | `button.tsx`, `badge.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `toggle.tsx` | Classes manuais | Alto | Muito relevante para DS | Registrar como utilitário do DS | Manter |
| `clsx` | `2.1.1` | dependencies | utilitários | Composição condicional de classes. | Sim | `components/ui/utils.ts` | `classnames` | Alto | Base da função `cn` | Registrar como utilitário do DS | Manter |
| `tailwind-merge` | `3.2.0` | dependencies | utilitários | Merge seguro de classes Tailwind. | Sim | `components/ui/utils.ts` | Classes manuais | Alto | Base da função `cn` | Registrar como utilitário do DS | Manter |
| `@popperjs/core` | `2.11.8` | dependencies | utilitários/UI | Posicionamento de popovers/tooltips. | Não encontrado | Não encontrado | Radix Popover, React Popper | Baixo/Médio | Pode ser redundante | Sinalizar duplicação | Avaliar/Remover |
| `react-popper` | `2.3.0` | dependencies | utilitários/UI | Wrapper React para Popper. | Não encontrado | Não encontrado | Radix Popover | Baixo/Médio | Pode ser redundante | Sinalizar duplicação | Avaliar/Remover |
| `react-dnd` | `16.0.1` | dependencies | utilitários/outros | Drag and drop. | Não encontrado | Não encontrado | DnD próprio/futuro | Baixo/Médio | Não impacta DS atual | Sinalizar como possível sobra | Avaliar/Remover |
| `react-dnd-html5-backend` | `16.0.1` | dependencies | utilitários/outros | Backend HTML5 para React DnD. | Não encontrado | Não encontrado | DnD próprio/futuro | Baixo/Médio | Não impacta DS atual | Sinalizar como possível sobra | Avaliar/Remover |

### MUI e Emotion

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `@mui/material` | `7.3.5` | dependencies | UI/componentes | Biblioteca de componentes Material UI. | Não encontrado | Não encontrado | Radix/shadcn local | Médio | Pode conflitar com DS atual se adotada sem decisão | Decisão de stack pendente | Avaliar/Remover |
| `@emotion/react` | `11.14.0` | dependencies | UI/componentes | CSS-in-JS usado pelo MUI. | Não encontrado | Não encontrado | Tailwind CSS | Médio se MUI for mantido | Pode criar segunda estratégia de styling | Decisão depende do MUI | Avaliar/Remover |
| `@emotion/styled` | `11.14.1` | dependencies | UI/componentes | Styled API usada pelo MUI. | Não encontrado | Não encontrado | Tailwind CSS | Médio se MUI for mantido | Pode criar segunda estratégia de styling | Decisão depende do MUI | Avaliar/Remover |

### Build e estilos

| Dependência | Versão | Tipo | Categoria | Finalidade provável | Uso real no código | Arquivos principais | Biblioteca parecida | Risco de remoção | Impacto no Design System | Impacto na matriz de stack | Decisão proposta |
|---|---:|---|---|---|---|---|---|---|---|---|---|
| `vite` | `6.3.5` | devDependencies | build | Dev server e build. | Sim | `vite.config.ts`, scripts `dev`/`build` | Webpack, Next.js | Alto | Indireto | Deve constar como stack oficial | Manter |
| `@vitejs/plugin-react` | `4.7.0` | devDependencies | build | Plugin React para Vite. | Sim | `vite.config.ts` | SWC/plugin alternativo | Alto | Indireto | Deve constar como stack oficial | Manter |
| `tailwindcss` | `4.1.12` | devDependencies | build/estilos | Framework utilitário de CSS. | Sim | `src/styles/tailwind.css`, `vite.config.ts` | CSS Modules, MUI sx | Alto | Base visual atual | Deve constar como stack oficial | Manter |
| `@tailwindcss/vite` | `4.1.12` | devDependencies | build/estilos | Integração Tailwind 4 com Vite. | Sim | `vite.config.ts` | PostCSS manual | Alto | Base visual atual | Deve constar como stack oficial | Manter |

### Lint, format e testes

Não há dependências diretas de lint, format ou testes declaradas atualmente em `apps/web/package.json`.

Observação:

- Os scripts `typecheck`, `lint`, `test:run`, `format` e `format:check` existem, mas estão temporariamente substituídos por mensagens `echo`.
- Isso deve entrar na matriz de stack como lacuna técnica, não como validação real.

## 5. Dependências essenciais

Essenciais para rodar ou construir a aplicação:

- `react`;
- `react-dom`;
- `vite`;
- `@vitejs/plugin-react`;
- `tailwindcss`;
- `@tailwindcss/vite`;
- `lucide-react`;
- `recharts`;
- `sonner`;
- `clsx`;
- `tailwind-merge`;
- `class-variance-authority`;
- principais primitives Radix usadas por `components/ui`.

Essas dependências não devem ser removidas sem uma etapa específica de validação com build e revisão visual.

## 6. Dependências ligadas ao Design System

Dependências diretamente relevantes para o Design System atual:

- família `@radix-ui/react-*`;
- `class-variance-authority`;
- `clsx`;
- `tailwind-merge`;
- `tailwindcss`;
- `tw-animate-css`;
- `lucide-react`;
- `sonner`;
- `vaul`;
- `cmdk`;
- `input-otp`;
- `react-hook-form`;
- `react-day-picker`.

Impactos principais:

- Radix fornece comportamento acessível para componentes base.
- Tailwind define a camada visual principal.
- `class-variance-authority`, `clsx` e `tailwind-merge` sustentam variantes e composição de classes.
- `lucide-react` deve ser tratado como candidato a padrão oficial de ícones.
- MUI/Emotion aparecem no `package.json`, mas não são usados no código atual; se forem mantidos, criam uma segunda direção visual concorrente.

## 7. Dependências ligadas a Motion/animações

Dependências encontradas:

- `motion`;
- `tw-animate-css`;
- `canvas-confetti`.

Leitura atual:

- `tw-animate-css` está importado em `src/styles/tailwind.css`.
- `motion` aparece em componente de navegação, mas não está presente de forma ampla nas telas.
- `canvas-confetti` não teve uso direto encontrado e parece ligado a protótipo/gamificação.

Recomendação:

- manter `tw-animate-css` por enquanto;
- avaliar `motion` antes de padronizar animações;
- não usar `canvas-confetti` em produto sem decisão de UX/gamificação.

## 8. Dependências ligadas a gráficos/dashboards

Dependência principal:

- `recharts`.

Uso observado:

- gráficos no `App.tsx`;
- wrapper em `components/ui/chart.tsx`.

Recomendação:

- manter `recharts` como biblioteca atual de gráficos;
- registrar na matriz de stack como solução provisória atual;
- revisar futuramente se dashboards administrativos exigirem gráficos mais avançados.

## 9. Possíveis duplicações

Possíveis sobreposições encontradas:

- `lucide-react` e `@mui/icons-material`: duas bibliotecas de ícones; o código usa `lucide-react`.
- Radix/shadcn local e `@mui/material`: duas estratégias de UI; o código usa Radix/shadcn local.
- Tailwind CSS e Emotion/MUI: duas estratégias de styling; o código usa Tailwind.
- `embla-carousel-react` e `react-slick`: duas bibliotecas de carrossel; o código usa Embla.
- Radix Popover e `react-popper`/`@popperjs/core`: duas abordagens para posicionamento/popover; o código usa Radix Popover.
- `motion`, `tw-animate-css` e `canvas-confetti`: múltiplas formas de animação; apenas `tw-animate-css` tem uso claro em estilos.

Essas duplicações não devem ser removidas automaticamente agora. Elas devem ser tratadas em etapa específica de limpeza de dependências.

## 10. Dependências possivelmente sem uso

Não foi encontrado uso direto no código atual para:

- `@babel/runtime`;
- `@emotion/react`;
- `@emotion/styled`;
- `@mui/icons-material`;
- `@mui/material`;
- `@popperjs/core`;
- `canvas-confetti`;
- `date-fns` como import direto;
- `react-dnd`;
- `react-dnd-html5-backend`;
- `react-popper`;
- `react-responsive-masonry`;
- `react-router`;
- `react-slick`.

Observações:

- `date-fns` pode ser dependência funcional do `react-day-picker`, mesmo sem import direto.
- `react-router` está instalado, mas a navegação atual é por estado interno em `App.tsx`; ele deve ser usado futuramente quando as rotas reais forem implementadas.
- MUI e Emotion parecem sobras da exportação ou de experimentos, pois não há uso direto encontrado.

## 11. Riscos de remoção

Risco alto:

- remover React, Vite, Tailwind, Lucide, Recharts, Sonner, Radix usado, `class-variance-authority`, `clsx` ou `tailwind-merge` pode quebrar build, telas ou componentes base.

Risco médio:

- remover componentes Radix não usados diretamente pelas telas, mas presentes em `components/ui`, pode quebrar import futuro ou componentes ainda pouco explorados.
- remover `date-fns` pode impactar `react-day-picker`.
- remover `react-router` agora não quebraria a navegação atual pelo uso direto, mas contraria a arquitetura planejada para rotas reais.

Risco baixo, mas ainda exige validação:

- remover MUI, Emotion, `react-slick`, `react-responsive-masonry`, `react-popper`, `react-dnd`, `canvas-confetti` parece tecnicamente plausível, mas deve acontecer apenas em PR próprio com build e revisão.

## 12. Decisões que precisam de validação humana

Decisões pendentes:

- O Design System oficial será baseado em Radix/shadcn local, Tailwind e componentes próprios?
- MUI deve ser removido ou existe intenção real de usá-lo?
- `lucide-react` será o padrão oficial de ícones?
- `recharts` será mantido como biblioteca oficial de gráficos?
- `motion` será adotado como padrão de animações ou será evitado no MVP?
- `react-router` deve permanecer instalado aguardando a etapa de rotas reais?
- `react-hook-form` deve permanecer como base oficial de formulários?
- `react-day-picker` e `input-otp` fazem parte do escopo real de curto prazo?
- `canvas-confetti` deve ser removido até haver decisão de gamificação?

## 13. Recomendações para complementar a matriz de stack

Registrar como stack atual/provisória do Front:

- React;
- ReactDOM;
- Vite;
- Tailwind CSS 4;
- Radix UI primitives;
- componentes estilo shadcn locais;
- Lucide React;
- Recharts;
- Sonner;
- React Hook Form, como dependência prevista e parcialmente preparada;
- React Router, como dependência prevista para rotas futuras, ainda sem uso real.

Registrar como lacunas:

- ausência de `tsconfig` ativo no app atual;
- scripts de `typecheck`, `lint`, `test` e `format` temporariamente desativados;
- ausência de dependências diretas de ESLint, Prettier, Vitest e Testing Library no `apps/web/package.json` atual;
- excesso de dependências herdadas do Figma Make;
- duplicação potencial entre MUI/Emotion e Radix/Tailwind.

Registrar como candidatos a auditoria de remoção futura:

- MUI/Emotion;
- `@popperjs/core` e `react-popper`;
- `react-slick`;
- `react-responsive-masonry`;
- `react-dnd` e `react-dnd-html5-backend`;
- `canvas-confetti`;
- `@babel/runtime`, se o build comprovar que não é necessário.

## 14. Próximos passos

1. Validar esta auditoria com a equipe de Front.
2. Complementar a matriz de stack com as categorias e decisões acima.
3. Definir a direção oficial do Design System antes de remover bibliotecas de UI.
4. Criar uma etapa específica para restaurar TypeScript, lint, format e testes reais.
5. Criar uma etapa específica para limpeza de dependências sem uso.
6. Não remover dependências junto com refatorações visuais.
7. Quando iniciar React Router, revisar se a versão instalada atende à arquitetura planejada.
8. Quando iniciar formulários reais, validar `react-hook-form` e futura integração com Zod.
9. Antes de qualquer remoção, rodar build e revisar telas principais.
10. Documentar decisões aprovadas na matriz de stack e/ou ADRs apropriados.
