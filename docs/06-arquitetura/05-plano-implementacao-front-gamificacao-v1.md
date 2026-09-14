# Plano de Implementação Front-end — Gamificação V1 — RH Connect

**Documento:** 05-plano-implementacao-front-gamificacao-v1.md  
**Projeto:** RH Connect  
**Versão:** v1.1  
**Status:** Plano técnico para implementação guiada no Front-end  
**Escopo:** Candidato — Meu Desenvolvimento / Gamificação / Nilo / Árvore de Talentos

---

## 1. Objetivo

Este documento transforma as decisões funcionais dos documentos anteriores em um plano técnico de implementação para o Front-end do RH Connect.

Ele deve ser usado como referência para implementação com Codex e para revisão da equipe.

Documentos-base:

- `01-visao-funcional-gamificacao-v1.md`
- `02-catalogo-competencias-missoes-v1.md`
- `03-arvore-talentos-frames-v1.md`
- `04-nilo-jornada-desenvolvimento-v1.md`

Este documento não redefine regras de produto.

Se houver conflito:

```text
documentos funcionais
>
plano técnico
```

---

## 2. Estratégia de implementação

A V1 deve ser implementada como uma **simulação funcional centralizada no Front-end**.

Isso significa:

```text
estado central de desenvolvimento
↓
missões
↓
XP
↓
competências
↓
progresso global
↓
treeStage
↓
frame da árvore
↓
mensagem do Nilo
```

A lógica deve existir de verdade no Front-end, mesmo que ainda não exista integração completa com Back-end.

Objetivos:

- evitar hardcodes espalhados;
- manter coerência entre cards;
- permitir demonstração funcional;
- preparar substituição futura por API;
- impedir que cada componente tenha regra própria.

---

## 3. Regra de segurança da implementação

Antes de editar qualquer arquivo, o Codex deve auditar a implementação atual.

Auditar especialmente:

- tela atual de Desenvolvimento;
- rotas existentes;
- sidebar;
- mocks relacionados;
- Design System;
- componentes reutilizáveis;
- assets já existentes;
- controles de demo;
- localStorage já utilizado;
- navegação de Entrevistas;
- navegação de Materiais.

Não assumir nomes de arquivos sem verificar o repositório.

A implementação deve adaptar-se à estrutura real existente.

---

## 4. Primeira etapa — auditoria

### Objetivo

Entender o estado atual sem editar.

### Verificar

```text
[ ] onde a tela Desenvolvimento está implementada
[ ] rota atual de Desenvolvimento
[ ] como o candidato navega até ela
[ ] quais componentes já existem
[ ] se Nilo já possui asset utilizável
[ ] se a árvore atual é imagem, JSX ou mock
[ ] se já existe XP hardcoded
[ ] se já existe nível hardcoded
[ ] se já existe missão hardcoded
[ ] se existe estado local duplicado
[ ] como Materiais são representados
[ ] como Entrevistas são representadas
[ ] como o modo demo/dev funciona
[ ] como localStorage é utilizado no projeto
[ ] padrões atuais do Design System
```

### Saída esperada

Antes de editar, produzir resumo:

```text
Estado atual
Arquivos envolvidos
Riscos
Partes reutilizáveis
Partes que precisam ser substituídas
Plano de alteração
```

---

## 5. Estrutura técnica recomendada

A estrutura exata deve respeitar o repositório real.

Conceitualmente:

```text
src/app/
├── components/
│   └── development/
│       ├── development-header.tsx
│       ├── development-tree.tsx
│       ├── development-tree-node.tsx
│       ├── development-mission-card.tsx
│       ├── development-progress.tsx
│       └── nilo-development-card.tsx
│
├── domain/
│   └── development/
│       ├── development-types.ts
│       ├── development-rules.ts
│       ├── development-content.ts
│       └── nilo-messages.ts
│
├── mocks/
│   └── development/
│       ├── development-seed.ts
│       ├── missions.ts
│       └── competencies.ts
│
└── services/
    └── development-service.ts
```

Essa estrutura é recomendação, não obrigação.

Se o projeto já tiver convenção diferente, reutilizar a convenção existente.

---

## 6. Tipos de domínio

Criar tipos centralizados.

Exemplo:

```ts
type DevelopmentArea =
  | "TI"
  | "RH"
  | "SECRETARIADO";

type CompetencyType =
  | "TRANSVERSAL"
  | "SPECIFIC";

type CompetencyStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "ADVANCED"
  | "CONSOLIDATED";

type MissionStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

type EvidenceType =
  | "INTERVIEW"
  | "MATERIAL"
  | "MISSION"
  | "SYSTEM_MILESTONE";
```

---

## 7. Estrutura de competência

Exemplo:

```ts
type DevelopmentCompetency = {
  id: string;
  name: string;
  type: CompetencyType;
  progress: number;
  status: CompetencyStatus;
  evidenceTypes: EvidenceType[];
  prerequisites?: string[];
};
```

Regras:

- `progress` sempre entre `0` e `100`;
- `status` deve ser derivado por função;
- evitar salvar status incoerente manualmente se puder ser calculado.

---

## 8. Estrutura de missão

Exemplo:

```ts
type DevelopmentMission = {
  id: string;
  title: string;
  description: string;
  competencyId: string;
  sourceType: EvidenceType;
  progress: number;
  target: number;
  rewardXp: number;
  rewardProgress: number;
  status: MissionStatus;
  destination?: string;
};
```

`destination` pode apontar para rota existente.

Exemplo:

```text
entrevista
material
```

Não criar nova rota se a ação já existir em outra parte do sistema.

---

## 9. Estado central de Desenvolvimento

Criar uma única fonte de verdade.

Exemplo:

```ts
type DevelopmentState = {
  version: "v1";

  area: DevelopmentArea;
  track: string;

  xp: number;

  competencies: DevelopmentCompetency[];

  missions: DevelopmentMission[];

  currentMissionId: string | null;

  updatedAt: string;
};
```

Evitar persistir dados derivados desnecessários.

Preferir calcular:

```text
level
nextLevelXp
overallProgress
treeStage
currentMission
```

a partir do estado base.

---

## 10. Dados derivados

### 10.1 Nível

Função:

```ts
getLevelFromXp(xp)
```

Faixas iniciais:

```text
0–199      → nível 1
200–399    → nível 2
400–699    → nível 3
700–1099   → nível 4
1100+      → nível 5
```

---

### 10.2 Progresso geral

```ts
overallProgress =
  sum(competency.progress) /
  competencies.length
```

Arredondamento:

- usar inteiro para exibição geral, se necessário;
- manter cálculo interno consistente.

---

### 10.3 Estágio da árvore

```text
0–9      → 1
10–19    → 2
20–29    → 3
30–39    → 4
40–49    → 5
50–59    → 6
60–69    → 7
70–79    → 8
80–89    → 9
90–100   → 10
```

Função:

```ts
getTreeStage(overallProgress)
```

---

### 10.4 Status da competência

Regra inicial:

```text
prerequisite não cumprido
→ LOCKED

0–19
→ AVAILABLE

20–59
→ IN_PROGRESS

60–84
→ ADVANCED

85–100
→ CONSOLIDATED
```

Criar:

```ts
getCompetencyStatus(...)
```

---

## 11. Pré-requisitos

Os pré-requisitos devem ser definidos em dados, não em componentes.

Exemplo:

```ts
{
  id: "javascript-typescript",
  prerequisites: ["web-foundations"]
}
```

Regra inicial de desbloqueio:

```text
pré-requisito >= 20%
```

Esse threshold deve ficar centralizado.

Exemplo:

```ts
const COMPETENCY_UNLOCK_THRESHOLD = 20;
```

---

## 12. Catálogo de conteúdo

Separar conteúdo de regra.

Exemplo:

```text
development-content.ts
```

Pode conter:

- nomes de níveis;
- labels;
- descrições;
- mensagens fixas;
- nomes das áreas;
- trilhas;
- textos de ajuda.

Evitar strings grandes espalhadas em JSX.

---

## 13. Seeds por área

Criar seed para:

```text
TI / Desenvolvimento Front-end
RH / Gestão de Pessoas
Secretariado
```

Cada seed deve conter:

- 10 competências;
- estado inicial;
- missões;
- XP inicial para demo;
- missão atual.

A V1 pode abrir por padrão em um estado intermediário para apresentação.

Exemplo:

```text
TI
nível 3
frame 5
missão Comunicação 1/2
```

Mas também deve existir reset para estado inicial.

---

## 14. Persistência temporária

Recomendação para V1:

```text
localStorage
```

Chave sugerida:

```text
rhconnect:development:v1
```

Persistir apenas estado essencial.

Exemplo:

```ts
{
  version: "v1",
  area,
  track,
  xp,
  competencies,
  missions,
  currentMissionId,
  updatedAt
}
```

---

## 15. Versionamento de storage

Incluir:

```ts
version: "v1"
```

Se formato incompatível for encontrado:

```text
resetar com segurança para seed atual
```

Evitar quebrar a tela por storage antigo.

---

## 16. Service central

Criar uma camada responsável pelas mutações.

Exemplo conceitual:

```ts
startMission()
advanceMission()
completeMission()
resetDevelopment()
loadDevelopment()
saveDevelopment()
```

Evitar:

```text
setXp(...)
setCompetency(...)
setTreeStage(...)
```

diretamente em vários componentes.

---

## 17. Função principal de conclusão

Fluxo conceitual:

```ts
completeMission(missionId)
```

Deve:

```text
1. localizar missão
2. verificar se pode ser concluída
3. marcar missão como concluída
4. adicionar XP
5. adicionar progresso à competência
6. limitar competência a 100
7. recalcular desbloqueios
8. selecionar próxima missão
9. persistir estado
10. emitir resultado da transição
```

Retorno sugerido:

```ts
{
  xpGained,
  competencyId,
  oldCompetencyProgress,
  newCompetencyProgress,
  oldLevel,
  newLevel,
  oldTreeStage,
  newTreeStage
}
```

Esse retorno ajuda o Nilo e as animações.

---

## 18. Missão atual

A missão atual deve vir de:

```text
currentMissionId
```

e ser resolvida no estado.

Evitar duplicar objeto inteiro se não for necessário.

---

## 19. Próxima missão

Para a V1, não criar engine complexa.

Pode usar ordem fixa por área.

Exemplo:

```text
mission-01
↓
mission-02
↓
mission-03
```

Com respeito a bloqueios.

Futuramente isso poderá virar recomendação dinâmica.

---

## 20. Integração com entrevistas

Na V1, há duas possibilidades:

### Opção A — simulação isolada

A missão de entrevista possui botão de demo:

```text
Simular progresso
```

apenas em ambiente dev.

### Opção B — aproveitar evento existente

Se já houver um fluxo no Front que registra conclusão de entrevista mock:

```text
entrevista concluída
↓
developmentService.registerEvent(...)
```

Usar somente se isso puder ser feito sem risco estrutural.

Prioridade para prazo:

```text
simulação isolada e estável
>
integração frágil
```

---

## 21. Integração com materiais

Materiais passa a ser uma dependência funcional da jornada.

A tela atual de catálogo pode ser reaproveitada, mas o botão **Abrir material** não deve continuar encerrando em toast.

Fluxo alvo da V1:

```text
/candidate/materials
↓
Abrir material
↓
/candidate/materials/:materialId
↓
conteúdo textual real
↓
Marcar como concluído
↓
MATERIAL_COMPLETED
↓
missão compatível avança
```

Regras:

- criar uma única tela dinâmica de detalhe;
- não criar um componente React diferente para cada material;
- manter catálogo centralizado;
- persistir `status`, `lastAccessedAt`, `completedAt` e favorito quando aplicável;
- `Abrir material` deve registrar acesso;
- `Marcar como concluído` deve registrar conclusão;
- só `MATERIAL_COMPLETED` deve alimentar missões de material.

Na V1, priorizar `READING`.

Não implementar player de vídeo enquanto não houver mídia real.

Materiais hoje classificados como vídeo podem ser convertidos para leitura estruturada quando isso preservar o conteúdo.

`EXERCISE` só deve ser exibido se houver interação real implementada.

---

## 22. Registro de eventos

Opcionalmente criar:

```ts
registerDevelopmentEvent({
  type: "INTERVIEW_COMPLETED",
  referenceId: "..."
})
```

ou:

```ts
registerDevelopmentEvent({
  type: "MATERIAL_COMPLETED",
  referenceId: "..."
})
```

Na V1 isso pode ser simples.

A ideia é preparar a transição futura para integração real.

---

## 23. Componente da árvore

Responsabilidades:

```text
receber area
receber treeStage
resolver asset
renderizar imagem
renderizar nós
renderizar transição
```

Não deve:

- calcular XP;
- decidir missão;
- alterar competência;
- conhecer regra DISC.

---

## 24. Assets da árvore

Estrutura prevista:

```text
/public/gamification/trees/
```

Com:

```text
ti/
rh/
secretariado/
```

O componente deve resolver:

```text
area + stage
→ asset
```

---

## 25. Nós da árvore

Os nós devem ser HTML/React sobre a imagem.

Cada nó recebe:

```ts
{
  id,
  name,
  status,
  progress,
  position
}
```

Posições podem ser centralizadas em configuração.

Exemplo:

```text
tree-node-layout.ts
```

---

## 26. Layout de nós

Separar:

```text
conteúdo da competência
```

de:

```text
posição visual na árvore
```

Isso permite trocar subárea sem gerar nova imagem.

---

## 27. Estados visuais

Mapear:

```text
LOCKED
AVAILABLE
IN_PROGRESS
ADVANCED
CONSOLIDATED
```

para tokens/classes do Design System.

Não usar cores arbitrárias se já houver token adequado.

---

## 28. Destaque da missão atual

A competência relacionada à missão atual pode receber uma classe extra:

```text
isCurrentMission
```

Exemplo visual:

- halo sutil;
- border extra;
- pulse discreto.

Sem animação forte.

---

## 29. Transição de frame

Ao detectar:

```text
oldTreeStage !== newTreeStage
```

executar:

```text
crossfade
+
scale leve
```

A transição deve ser visual, não bloquear interação.

---

## 30. Pré-carregamento

Para evitar flicker:

```text
pré-carregar frame atual
e próximo frame provável
```

Opcional na primeira entrega, mas recomendado.

---

## 31. Componente do Nilo

Responsabilidades:

```text
receber mensagem resolvida
receber pose
renderizar texto
renderizar imagem
```

Não deve decidir regra de negócio.

---

## 32. Resolver mensagem do Nilo

Criar função:

```ts
resolveNiloMessage(context)
```

Contexto pode incluir:

```ts
{
  currentMission,
  lastTransition,
  area,
  track
}
```

Prioridade:

```text
LEVEL_UP
TREE_STAGE_UP
MISSION_COMPLETED
COMPETENCY_PROGRESS
NEXT_MISSION
JOURNEY_SUMMARY
```

---

## 33. Assets do Nilo

Estrutura sugerida:

```text
/public/gamification/nilo/
```

Com:

```text
nilo-neutral.webp
nilo-achievement.webp
nilo-guidance.webp
```

Se somente um asset estiver disponível:

```text
nilo-development.webp
```

e manter a arquitetura preparada para expansão.

---

## 34. Layout da página

Estrutura recomendada:

```text
DevelopmentPage

├── DevelopmentHero
│   ├── Nilo
│   ├── Área / trilha
│   ├── Próxima ação
│   ├── Nível
│   └── XP
│
├── DevelopmentTreeSection
│   ├── TreeImage
│   └── CompetencyNodes
│
└── CurrentMissionCard
    ├── título
    ├── descrição
    ├── progresso
    ├── recompensa
    └── CTA
```

---

## 35. CTA da missão

`Continuar missão` deve:

- navegar para função existente quando possível;
- não criar fluxo inexistente;
- manter rota válida.

Exemplo:

```text
INTERVIEW
→ rota de entrevistas

MATERIAL
→ rota de materiais
```

Em ambiente de demo, pode existir ação auxiliar de simulação.

---

## 36. Controles de demo

Se o projeto já utiliza:

```text
VITE_DEMO_TOOLS=true
```

aproveitar a mesma estratégia.

Controles possíveis somente em dev:

```text
Simular progresso da missão
Completar missão
Avançar frame
Resetar desenvolvimento
Trocar área
```

Esses controles devem ficar:

```text
invisíveis no deploy de apresentação
```

---

## 37. Reset de demo

Criar:

```ts
resetDevelopmentState()
```

Deve:

- limpar storage;
- carregar seed;
- retornar para estado conhecido.

Importante para apresentação e QA.

---

## 38. Responsividade

### Desktop

Priorizar:

- Nilo + resumo;
- árvore ampla;
- missão abaixo.

### Tablet

- reduzir árvore proporcionalmente;
- reposicionar cards;
- manter labels legíveis.

### Mobile

- não tentar manter desktop miniaturizado;
- reduzir quantidade de labels simultâneos;
- permitir seleção de nó;
- detalhes podem aparecer em card abaixo;
- Nilo menor;
- missão em largura total.

---

## 39. Acessibilidade

Garantir:

- botões com foco visível;
- nós acessíveis por teclado se interativos;
- não depender só de cor;
- `aria-label` nos nós;
- alt correto no Nilo;
- imagem da árvore pode ser decorativa se os dados estiverem no HTML;
- respeito a `prefers-reduced-motion`.

Para:

```css
@media (prefers-reduced-motion: reduce)
```

reduzir ou remover crossfade/scale.

---

## 40. Loading e fallback

Se asset da árvore falhar:

- não quebrar página;
- mostrar fallback;
- continuar exibindo dados.

Se localStorage estiver inválido:

- resetar para seed.

---

## 41. Tratamento de valores

Sempre aplicar:

```text
XP >= 0
0 <= progress <= 100
1 <= treeStage <= 10
mission.progress <= mission.target
```

---

## 42. Testes de regra

Testar pelo menos:

```text
getLevelFromXp
getCompetencyStatus
getOverallProgress
getTreeStage
completeMission
unlockPrerequisites
resolveNiloMessage
```

Casos críticos:

```text
0%
9%
10%
19%
20%
59%
60%
84%
85%
90%
100%
```

---

## 43. Testes de fluxo

### Caso 1

```text
missão 1/2
↓
completar evento
↓
2/2
↓
missão completa
↓
XP aumenta
↓
competência aumenta
```

### Caso 2

```text
overallProgress 49
↓
missão concluída
↓
overallProgress 51
↓
frame 5 → 6
```

### Caso 3

```text
XP 690
↓
+80
↓
770
↓
nível 3 → 4
```

### Caso 4

```text
pré-requisito 19%
→ competência bloqueada

pré-requisito 20%
→ competência disponível
```

---

## 44. Testes de persistência

Validar:

```text
recarregar página
↓
estado permanece
```

Validar também:

```text
storage incompatível
↓
reset seguro
```

---

## 45. Testes visuais

Validar:

```text
[ ] desktop
[ ] tablet
[ ] mobile
[ ] frame 1
[ ] frame 5
[ ] frame 10
[ ] todos os estados de nó
[ ] missão completa
[ ] novo nível
[ ] novo frame
[ ] reduced motion
```

---

## 46. Build e qualidade

Antes de considerar concluído:

```text
pnpm build:web
```

Também executar checks reais disponíveis no projeto.

Exemplos:

```text
typecheck
lint
tests
git diff --check
```

Não assumir scripts se ainda estiverem como placeholders.

---

## 47. O que não deve ser alterado nesta implementação

Evitar alterações não relacionadas em:

- DISC;
- Admin;
- Avaliador;
- autenticação;
- regras de perfis;
- ReportScreen;
- landing page;
- Design System global.

Se uma mudança global for necessária, documentar antes.

---

## 48. Ordem de implementação recomendada

### Fase 1 — Auditoria

Sem edição.

### Fase 2 — Domínio da Gamificação

Criar:

```text
tipos
regras
seed
service
storage
```

### Fase 3 — Materiais funcionais

Transformar o catálogo existente em fluxo funcional:

```text
catálogo
↓
detalhe dinâmico
↓
conteúdo textual
↓
conclusão
↓
MATERIAL_COMPLETED
```

### Fase 4 — Integração Material → Missão

Fazer missões de fonte `MATERIAL` reagirem ao evento real de conclusão.

### Fase 5 — Tela Desenvolvimento

Ligar:

```text
Nilo
XP
nível
missão
árvore
```

ao estado central.

### Fase 6 — Nós

Adicionar:

```text
competências
estados
destaques
```

### Fase 7 — Assets da Árvore

Começar com placeholder ou frames validados.

### Fase 8 — Interações e Transições

Adicionar:

```text
completar missão
atualizar XP
competência
frame
Nilo
```

### Fase 9 — Responsividade

Desktop → tablet → mobile.

### Fase 10 — QA

Testes funcionais e build.

---

## 49. Estratégia para os assets durante desenvolvimento

Não bloquear toda implementação esperando as 30 imagens.

Usar:

```text
placeholder controlado
```

ou:

```text
frames 1, 5 e 10 de TI
```

primeiro.

Depois que assets finais estiverem prontos:

```text
substituir caminhos
sem alterar regra
```

---

## 50. Estratégia de implementação com Codex

O trabalho com Codex deve ser dividido em etapas pequenas.

Não pedir:

> implemente toda a gamificação completa de uma vez.

Preferir:

### Etapa 1

> Audite a tela Desenvolvimento atual e os arquivos relacionados. Não edite.

### Etapa 2

> Implemente somente domínio, tipos, regras e seed.

### Etapa 3

> Conecte a tela atual ao estado central sem alterar visual desnecessariamente.

### Etapa 4

> Implemente Árvore e nós.

### Etapa 5

> Implemente missão e progressão.

### Etapa 6

> Implemente Nilo contextual.

### Etapa 7

> Persistência e reset.

### Etapa 8

> Responsividade e QA.

---

## 51. Critério de conclusão da V1

A feature pode ser considerada pronta quando:

```text
[ ] Desenvolvimento usa estado central
[ ] XP é derivado do estado
[ ] nível é calculado
[ ] 10 competências estão disponíveis
[ ] estados são calculados
[ ] missão atual funciona
[ ] completar missão altera XP
[ ] completar missão altera competência
[ ] progresso geral é recalculado
[ ] treeStage é recalculado
[ ] frame muda quando necessário
[ ] Nilo reage ao estado
[ ] persistência local funciona
[ ] reset funciona em dev
[ ] layout é responsivo
[ ] build passa
[ ] sem regressão em outros fluxos
```

---

## 52. Critério de não conclusão

Não considerar concluído se:

- XP for apenas número hardcoded;
- frame não estiver ligado a progresso;
- missão não alterar estado;
- Nilo tiver texto independente do estado;
- cada card possuir mock próprio;
- refresh perder tudo sem decisão explícita;
- árvore afirmar domínio profissional;
- a feature quebrar mobile;
- controles internos aparecerem na apresentação.

---

## 53. Evolução futura para Back-end

Quando Back estiver pronto, substituir:

```text
localStorage
+
development-service local
```

por:

```text
API
+
persistência real
```

Manter:

```text
tipos
regras visuais
componentes
selectors
```

sempre que possível.

Fluxo futuro:

```text
evento real
↓
API
↓
regra de gamificação
↓
banco
↓
estado retornado
↓
Front
```

---

## 54. Decisões técnicas consolidadas

1. A V1 usa simulação funcional centralizada.
2. O estado de Desenvolvimento deve ter uma única fonte de verdade.
3. Dados derivados não devem ser persistidos desnecessariamente.
4. localStorage é temporário.
5. Missões são atualizadas por service central.
6. Árvore apenas renderiza estado.
7. Nilo apenas comunica estado.
8. XP e treeStage são independentes.
9. DISC permanece fora desta lógica.
10. Dev tools podem simular progressão.
11. Dev tools não aparecem na apresentação.
12. A implementação deve respeitar o Design System atual.
13. A implementação deve começar por auditoria.
14. Não bloquear a implementação aguardando as 30 imagens.
15. Codex deve trabalhar em etapas pequenas e revisáveis.
16. Materiais funcionais entram antes da integração visual completa da Árvore.
17. `MATERIAL_COMPLETED` é o gatilho oficial para missões baseadas em materiais na V1.
18. Vídeo fica fora da V1 enquanto não houver mídia real.

---

## 55. Próximo documento

O próximo documento deve ser:

`06-prompts-imagens-gamificacao-arvore-v1.md`

Ele deverá transformar as decisões visuais em instruções prontas para geração das imagens, incluindo:

- prompt mestre;
- regras de consistência;
- formato;
- composição;
- frames 1, 5 e 10 para validação;
- prompts dos 10 frames de TI;
- prompts dos 10 frames de RH;
- prompts dos 10 frames de Secretariado;
- critérios de correção;
- nomenclatura dos arquivos;
- procedimento de geração em sequência.
