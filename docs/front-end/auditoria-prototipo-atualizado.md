# Auditoria do Prototipo Atualizado

## Resumo do estado atual

O `apps/web` contem a versao atualizada do prototipo exportado do Figma Make. Esta versao inclui a evolucao do fluxo do Candidato e novas areas visuais para Avaliador e Administrador, alem de telas de ativacao, onboarding, recuperacao de senha e suporte ao fluxo de entrega testavel.

O projeto roda como aplicacao Vite/React, mas ainda preserva caracteristicas fortes de prototipo:

- navegacao por estado local;
- telas concentradas em arquivos grandes;
- mocks e hardcodes misturados com componentes;
- ausencia de rotas reais;
- ausencia de integracao real com API;
- scripts de `typecheck`, `lint` e `test` temporariamente substituidos por `echo`;
- build real via Vite.

O codigo deve ser tratado como referencia visual e funcional atualizada, nao como arquitetura definitiva.

## Stack real encontrada

Front-end encontrado em `apps/web`:

- React;
- Vite;
- TypeScript por arquivos `.tsx`, mas sem configuracao ativa de `tsconfig` no app;
- Tailwind CSS 4;
- componentes base estilo Radix/shadcn em `src/app/components/ui`;
- Lucide React para icones;
- Recharts para graficos;
- Sonner para toasts;
- dependencias presentes como `react-hook-form`, `react-router`, MUI, Motion e outras.

Observacao importante: embora `react-router` esteja instalado, nao foi encontrado uso real de `BrowserRouter`, `Routes`, `Route`, `useNavigate` ou configuracao equivalente.

## Estrutura atual do apps/web

Estrutura principal observada:

```text
apps/web/
├── index.html
├── package.json
├── vite.config.ts
├── postcss.config.mjs
├── default_shadcn_theme.css
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   └── components/
    │       ├── admin-screens.tsx
    │       ├── eval-screens.tsx
    │       ├── header-popovers.tsx
    │       ├── onboarding-screens.tsx
    │       ├── landing-screen.tsx
    │       ├── development-screen.tsx
    │       ├── figma/
    │       └── ui/
    ├── imports/
    └── styles/
```

Arquivos mais concentrados:

- `src/app/App.tsx`: arquivo central, com telas do Candidato, auth, fluxo de entrevista, mapas de navegacao, tipos e componentes locais.
- `src/app/components/admin-screens.tsx`: telas e mocks da area administrativa.
- `src/app/components/eval-screens.tsx`: telas e mocks da area do avaliador.
- `src/app/components/landing-screen.tsx`: landing page.
- `src/app/components/development-screen.tsx`: centro de desenvolvimento/gamificacao visual.

## Ponto de entrada

O ponto de entrada e:

```text
apps/web/src/main.tsx
```

Ele importa:

- `./app/App.tsx`;
- `./styles/index.css`;
- `createRoot` de `react-dom/client`.

## Navegacao atual

A navegacao atual e simulada por estado local dentro de `App.tsx`.

Padrao observado:

```ts
const [screen, setScreen] = useState<Screen>("landing");
const navigate = (s: Screen) => setScreen(s);
const screenMap: Record<Screen, React.ReactNode> = { ... };
```

Os botoes, menus, sidebars, popovers e CTAs chamam `onNavigate(...)`. Isso troca o componente renderizado, mas nao altera URL, nao cria historico de navegador, nao aplica guarda de rota e nao representa sessao real.

Tambem existe uma navegacao exploratoria (`FlowNav`) que facilita visitar telas do prototipo, mas nao deve ser confundida com navegacao final do produto.

## Pontos bons

- A referencia visual esta mais completa que a versao anterior.
- Existem telas representativas para Candidato, Avaliador e Administrador.
- O fluxo principal do Candidato esta bem desenhado para fins de demonstracao.
- Avaliador possui fila, avaliacao, revisao, historico e criterios.
- Administrador possui dashboard, gestao de candidatos, avaliadores, entrevistas, atribuicoes, perguntas, criterios, consentimentos, auditoria e configuracoes.
- Ha componentes base em `components/ui` que podem apoiar a consolidacao futura do Design System.
- A identidade visual aprovada continua reconhecivel.

## Pontos perigosos

- `App.tsx` ainda concentra responsabilidades demais.
- As areas de Avaliador e Administrador tambem estao concentradas em arquivos grandes.
- Nao ha rotas reais.
- Nao ha autenticacao real.
- Nao ha autorizacao real por perfil.
- Nao ha persistencia real.
- Dados de usuario, entrevistas, perguntas, criterios e relatorios estao mockados ou hardcoded.
- Camera, microfone, gravacao, upload e avaliacao continuam simulados.
- Existem componentes duplicados, como `Btn`, `Card` e `Badge`, definidos localmente em mais de um arquivo.
- Os scripts de qualidade foram temporariamente neutralizados no `package.json` do app.
- A CI pode passar sem executar validacoes reais de TypeScript, lint e testes.

## Recomendacoes

1. Preservar esta versao como referencia visual atualizada.
2. Definir e documentar o recorte da entrega testavel de 10/09.
3. Restaurar gradualmente validacoes reais de TypeScript, lint e testes.
4. Separar mocks antes de introduzir API real.
5. Reduzir `App.tsx` em etapas pequenas.
6. Consolidar layouts por perfil antes das rotas reais.
7. Introduzir React Router somente depois de mapear telas prioritarias.
8. Manter o Design System sem redesign, consolidando componentes equivalentes.
9. Tratar autenticacao e autorizacao reais como dependencia de contratos e Back-end.

## O que nao mexer ainda

- Nao refatorar todas as telas de uma vez.
- Nao mover o `src` inteiro novamente.
- Nao criar rotas reais sem plano de migracao.
- Nao implementar autenticacao real no Front antes dos contratos.
- Nao alterar visual, cores ou Design System sem auditoria especifica.
- Nao remover dependencias apenas por suspeita nesta fase.
- Nao tratar mocks como integracao real.
- Nao iniciar `apps/api` nesta etapa.
