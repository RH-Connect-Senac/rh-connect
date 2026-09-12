# Plano de Limpeza de Dependências do Front-end

## 1. Objetivo do documento

Este documento orienta a equipe do RH Connect sobre como avaliar e remover dependências do Front-end com segurança, sem quebrar o projeto e sem transformar uma limpeza técnica em uma refatoração maior do que o necessário.

A ideia é que a equipe consiga decidir, testar e revisar cada remoção de forma pequena, clara e reversível.

## 2. Contexto

O Front-end atual do RH Connect fica em:

```text
apps/web
```

Essa base veio de uma exportação do Figma Make. Por isso, algumas dependências podem ser sobras do protótipo, bibliotecas incluídas automaticamente ou pacotes que foram úteis em algum momento da geração visual, mas que talvez não sejam necessários no produto final.

Já existe uma auditoria documental em:

```text
docs/front-end/auditoria-dependencias-front-end.md
```

Essa auditoria é um levantamento técnico. Ela não significa autorização para remover tudo que parece sem uso. A limpeza deve ser feita em etapas pequenas, com branch própria, validação local e revisão por Pull Request.

## 3. O que são dependências

Dependências são bibliotecas ou pacotes usados pelo projeto para executar, construir ou desenvolver a aplicação.

No `package.json`, elas costumam aparecer em duas áreas principais:

- `dependencies`: pacotes usados pela aplicação ou pelos componentes em tempo de execução.
- `devDependencies`: pacotes usados para desenvolvimento, build, lint, testes, formatação e ferramentas auxiliares.

Exemplos no Front-end atual:

- `React`: base da interface.
- `Vite`: servidor local e build.
- `Tailwind CSS`: estilos utilitários.
- `Lucide React`: ícones.
- `Recharts`: gráficos.
- `Sonner`: toasts/notificações.

## 4. Stack atual identificada no Front-end

Stack atual identificada no `apps/web`:

- React;
- React DOM;
- Vite;
- Tailwind CSS 4;
- Radix UI primitives;
- componentes locais no estilo shadcn/ui;
- Lucide React;
- Recharts;
- Sonner;
- pnpm.

Essa lista representa as tecnologias atualmente identificadas em uso no `apps/web` com base na auditoria de dependências. Ela serve como referência para a matriz de stack, mas ainda pode receber ajustes futuros após validação do Design System, limpeza de dependências e decisões técnicas da equipe.

## 5. Itens a validar antes de qualquer limpeza

Possíveis sobras ou itens que precisam de validação:

- MUI / Emotion;
- `@mui/icons-material`;
- `react-slick`;
- `react-responsive-masonry`;
- `react-popper` / `@popperjs/core`;
- `react-dnd`;
- `canvas-confetti`;
- `motion`;
- `@babel/runtime`.

Esses itens não devem ser removidos automaticamente. Mesmo quando uma dependência não aparece em imports diretos, ela pode estar ligada ao build, a algum componente pouco usado, ao lockfile ou a uma decisão futura ainda não consolidada.

## 6. Regra principal

A auditoria de dependências é uma fotografia técnica do estado atual. Ela não é uma ordem de remoção.

Antes de remover qualquer pacote, a equipe deve validar o motivo, o risco, o grupo de dependências, as telas afetadas e o resultado do build.

## 7. O que não deve ser feito

- Não remover várias dependências de uma vez.
- Não atualizar tudo para a versão mais nova.
- Não mexer em `package.json` sem branch própria.
- Não misturar limpeza de dependências com refatoração visual.
- Não remover dependências ligadas a gamificação, motion, rotas, UI base ou Design System sem validação.
- Não confiar apenas em "não encontrei import" como garantia absoluta.
- Não fazer merge sem testar.
- Não remover dependência porque "parece feia" ou "parece inútil" sem evidência.
- Não aproveitar a limpeza para reorganizar pastas ou componentes.

## 8. Estratégia segura de limpeza

Sequência recomendada:

1. Ler a auditoria de dependências.
2. Escolher um grupo pequeno de dependências para avaliar.
3. Criar branch específica.
4. Remover apenas o grupo aprovado.
5. Rodar `pnpm install`.
6. Rodar build.
7. Rodar o projeto localmente.
8. Testar telas principais manualmente.
9. Abrir PR pequeno.
10. Se quebrar, reverter a alteração.

O ideal é que cada PR remova um grupo pequeno e fácil de revisar. Se algo quebrar, fica simples entender a causa e desfazer.

## 9. Branches sugeridas

Exemplos:

- `chore/limpeza-dependencias-mui`;
- `chore/limpeza-dependencias-carousel`;
- `chore/limpeza-dependencias-dnd`;
- `chore/limpeza-dependencias-popper`;
- `chore/limpeza-dependencias-nao-utilizadas-front`.

## 10. Comandos de referência

Atualizar `main`:

```bash
git checkout main
git pull origin main
git status
```

Criar branch:

```bash
git checkout -b chore/limpeza-dependencias-mui
```

Remover dependência dentro de `apps/web`:

```bash
cd apps/web
pnpm remove nome-do-pacote
cd ../..
```

Ou, se aplicável no workspace:

```bash
pnpm --filter web remove nome-do-pacote
```

Instalar novamente:

```bash
pnpm install
```

Rodar build:

```bash
pnpm run build:web
```

Rodar projeto:

```bash
pnpm run dev:web
```

Verificar status:

```bash
git status
```

Observação: use `pnpm`, não `npm install`, para evitar criação de `package-lock.json` e mistura de gerenciadores.

## 11. Como testar manualmente

Os scripts atuais de `typecheck`, `lint`, `test` e `format` estão temporariamente substituídos por `echo`. Isso significa que eles não garantem validação real neste momento.

Por isso, depois de remover uma dependência, a validação manual fica ainda mais importante.

Telas mínimas para testar:

- Landing/Login;
- Onboarding;
- Dashboard do candidato;
- Perfil;
- Minhas vagas;
- Entrevista;
- Relatório;
- Dashboard do avaliador;
- Fila de avaliação;
- Admin dashboard.

Verifique:

- a tela não ficou branca;
- o console não mostra erro crítico;
- ícones aparecem;
- gráficos aparecem;
- menus/dropdowns funcionam;
- toasts aparecem;
- telas principais carregam;
- layout não quebrou;
- navegação simulada por botões ainda funciona;
- build finaliza sem erro.

## 12. Grupos de limpeza recomendados

### Grupo 1 — MUI / Emotion

Possíveis dependências:

- `@mui/material`;
- `@mui/icons-material`;
- `@emotion/react`;
- `@emotion/styled`.

Essas dependências parecem não utilizadas no código atual, mas exigem validação porque podem ter vindo da exportação do Figma Make ou de experimentos anteriores. Também representam uma possível duplicação com Radix/Tailwind/Lucide.

### Grupo 2 — Carrossel duplicado

Possível dependência:

- `react-slick`.

A auditoria identificou `embla-carousel-react` como carrossel usado atualmente em componente local. Portanto, `react-slick` pode ser sobra, mas deve ser removido apenas após validação.

### Grupo 3 — Masonry

Possível dependência:

- `react-responsive-masonry`.

Não foi identificado uso direto no código atual. Pode ser sobra do protótipo ou de uma ideia visual que não está em uso.

### Grupo 4 — Popper

Possíveis dependências:

- `react-popper`;
- `@popperjs/core`.

O projeto usa componentes Radix para popover, dropdown, tooltip e menus. Por isso, Popper pode estar redundante. Ainda assim, a remoção deve ser validada em telas com menus, popovers e dropdowns.

### Grupo 5 — Drag and drop

Possíveis dependências:

- `react-dnd`;
- `react-dnd-html5-backend`.

Não foi identificado uso direto. Pode ter sido incluído para uma funcionalidade futura ou pela exportação. Remover apenas se a equipe confirmar que não será usado no curto prazo.

### Grupo 6 — Gamificação/Motion

Possíveis dependências:

- `canvas-confetti`;
- `motion`.

Esse grupo deve aguardar definição do Lucas sobre gamificação, Nilo, Árvore de Talentos e Motion/Design System. Mesmo que `canvas-confetti` pareça sobra, ele pode estar relacionado a ideias futuras de gamificação. `motion` também pode afetar decisões de animação do Design System.

## 13. Dependências que não devem ser removidas agora

Não remover agora:

- React;
- React DOM;
- Vite;
- Tailwind CSS;
- `@tailwindcss/vite`;
- Radix UI primitives usados pelos componentes base;
- Lucide React;
- Recharts;
- Sonner;
- `class-variance-authority`;
- `clsx`;
- `tailwind-merge`;
- React Hook Form;
- React Router;
- `tw-animate-css`.

Motivos:

- React, React DOM, Vite e Tailwind sustentam a aplicação atual.
- Radix UI primitives sustentam os componentes base.
- Lucide React é a biblioteca de ícones realmente usada.
- Recharts sustenta gráficos e dashboards.
- Sonner sustenta toasts/notificações.
- `class-variance-authority`, `clsx` e `tailwind-merge` sustentam composição de classes e variantes dos componentes.
- React Hook Form está previsto para formulários e já aparece em componente base.
- React Router ainda não está em uso real, mas faz parte da arquitetura planejada para rotas futuras.
- `tw-animate-css` está importado nos estilos atuais.

## 14. Modelo de PR para limpeza

```markdown
## Resumo

Descreva brevemente qual grupo de dependências foi avaliado e removido.

## Dependências removidas

- `nome-do-pacote`

## Motivo

Explique por que a remoção foi proposta, citando a auditoria quando aplicável.

## Validação realizada

- [ ] `pnpm install`
- [ ] `pnpm run build:web`
- [ ] `pnpm run dev:web`
- [ ] telas principais testadas manualmente
- [ ] nenhum erro crítico no console

## Observação

Este PR não altera layout, fluxo, regra de negócio nem Design System. Apenas remove dependências previamente avaliadas.
```

## 15. Critérios para considerar uma limpeza pronta

- Dependências removidas estavam aprovadas para remoção.
- Remoção feita em branch específica.
- `package.json` e `pnpm-lock.yaml` atualizados corretamente.
- Build funcionando.
- Projeto rodando localmente.
- Telas principais testadas.
- PR pequeno aberto.
- Revisão feita antes do merge.
- Se houver erro, a alteração é revertida ou corrigida no próprio PR.

## 16. Próximos passos

- Validar a auditoria com Front/Back.
- Atualizar matriz de stack.
- Definir o que pode ser removido.
- Começar por grupos pequenos.
- Restaurar validações reais de typecheck/lint/test em etapa futura.
- Não misturar limpeza com Design System ou refatoração.
- Registrar decisões importantes em documentação ou ADR quando necessário.
- Manter o foco: limpar dependências para reduzir risco, não para redesenhar ou reestruturar o produto.
