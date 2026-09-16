# Especificação do Nilo na Jornada de Desenvolvimento — RH Connect

**Documento:** 04-nilo-jornada-desenvolvimento-v1.md  
**Projeto:** RH Connect  
**Versão:** v1.0  
**Status:** Especificação funcional e de conteúdo para a V1  
**Escopo:** Candidato — Meu Desenvolvimento / Gamificação / Árvore de Talentos

---

## 1. Objetivo

Este documento define o papel do **Nilo** dentro da jornada de Desenvolvimento do candidato no RH Connect.

Ele complementa:

- `01-visao-funcional-gamificacao-v1.md`
- `02-catalogo-competencias-missoes-v1.md`
- `03-arvore-talentos-frames-v1.md`

A finalidade é fechar:

- função do personagem;
- limites de atuação;
- presença visual;
- mensagens por estado;
- relação com missões;
- relação com XP e níveis;
- relação com a Árvore de Talentos;
- tom de voz;
- comportamento da V1;
- evolução futura com animação, voz e lip-sync.

---

## 2. Papel do Nilo

Nilo é o **Guia de Carreira e Mentor de Talentos** do RH Connect.

Seu papel é:

- orientar;
- contextualizar;
- apresentar a jornada;
- indicar próxima ação;
- explicar mudanças;
- celebrar progresso;
- reduzir sensação de interface fria;
- tornar a experiência de desenvolvimento mais humana.

Nilo não deve atuar como:

- avaliador;
- recrutador;
- professor formal;
- sistema de decisão;
- responsável por aprovação;
- responsável por nota;
- responsável por cálculo de XP;
- responsável por resultado DISC.

---

## 3. Princípio central

Nilo deve **explicar e orientar sobre um estado que já existe no sistema**.

Ele não cria a regra.

Exemplo:

```text
Sistema detecta:
treeStage 5 → 6
↓
Nilo comunica:
"Você alcançou uma nova etapa da sua Árvore de Talentos."
```

Não:

```text
Nilo decide:
"Agora sua árvore sobe de nível."
```

---

## 4. Onde o Nilo aparece na V1

### 4.1 Onboarding

Nilo pode aparecer na introdução dos três perfis, com foco especial no candidato.

Função:

- apresentar rapidamente a plataforma;
- explicar que acompanhará a jornada;
- orientar primeiros passos.

### 4.2 Meu Desenvolvimento

É a principal área do Nilo na V1.

Função:

- apresentar a trilha;
- mostrar próxima ação;
- explicar missão atual;
- reagir à evolução;
- contextualizar nível e XP;
- celebrar novo estágio da árvore.

### 4.3 Dashboard do candidato

Pode aparecer de forma reduzida.

Função:

- destacar próxima missão;
- lembrar progresso;
- sugerir retorno à área Desenvolvimento.

### 4.4 Outras telas

Na V1, evitar presença excessiva.

Nilo não precisa aparecer:

- dentro da execução da entrevista;
- sobre perguntas;
- durante gravação/resposta;
- na tela de resultado DISC;
- em todas as páginas do sistema.

---

## 5. Presença na página Meu Desenvolvimento

Estrutura recomendada:

```text
┌───────────────────────────────────────┐
│ NILO                                  │
│                                       │
│ Área: TI                              │
│ Trilha: Desenvolvimento Front-end     │
│                                       │
│ "Sua próxima missão está focada       │
│ em Comunicação."                      │
│                                       │
│ Próxima ação | Nível | XP             │
└───────────────────────────────────────┘

          ÁRVORE DE TALENTOS

              MISSÃO ATUAL
```

O Nilo fica associado ao resumo superior.

Ele não deve cobrir a árvore.

---

## 6. Identidade do personagem

A identidade visual do Nilo deve permanecer consistente com o personagem institucional aprovado.

Preservar:

- rosto;
- cabelo;
- barba;
- estilo 3D;
- roupa base;
- tablet;
- cordão/crachá;
- identidade corporativa;
- aplicação da marca RH Connect.

Evitar:

- transformar o personagem em mascote infantil;
- alterar drasticamente proporções;
- usar expressões exageradas;
- criar poses excessivamente caricatas.

---

## 7. Papel institucional

Nilo representa o RH Connect como guia.

A comunicação deve transmitir:

- proximidade;
- clareza;
- profissionalismo;
- incentivo;
- neutralidade;
- apoio ao desenvolvimento.

Evitar tom:

- infantil;
- competitivo;
- exageradamente motivacional;
- julgador;
- paternalista;
- informal demais.

---

## 8. Tom de voz

O tom deve ser:

```text
claro
curto
positivo
profissional
encorajador
objetivo
```

Preferir:

> Sua próxima missão está focada em Comunicação.

> Você avançou na sua jornada.

> Um novo estágio da Árvore de Talentos foi desbloqueado.

Evitar:

> Uau! Você está arrasando demais!!!

> Você é excelente em Comunicação!

> Você já domina JavaScript!

> Você está pronto para qualquer vaga!

---

## 9. Regras das mensagens

As mensagens do Nilo devem:

1. refletir dados reais ou mock centralizado;
2. não afirmar domínio profissional;
3. não criar interpretação não suportada;
4. não prometer contratação;
5. não comparar candidatos;
6. não utilizar ranking;
7. não interpretar DISC como competência;
8. não substituir feedback humano.

---

## 10. Tipos de mensagem

A V1 pode trabalhar com os seguintes estados:

```text
WELCOME
JOURNEY_SUMMARY
NEXT_MISSION
MISSION_IN_PROGRESS
MISSION_COMPLETED
COMPETENCY_PROGRESS
TREE_STAGE_UP
LEVEL_UP
CONTENT_RECOMMENDATION
NO_ACTIVE_MISSION
```

---

## 11. Mensagem de boas-vindas

### Estado

```text
WELCOME
```

### Objetivo

Apresentar a área de Desenvolvimento.

### Exemplo

> Bem-vindo à sua jornada de desenvolvimento. Aqui você acompanha suas competências, missões e evolução na Árvore de Talentos.

Versão mais curta:

> Aqui você acompanha sua jornada, suas missões e a evolução da sua Árvore de Talentos.

---

## 12. Resumo da jornada

### Estado

```text
JOURNEY_SUMMARY
```

### Exemplo — TI

> Você está na trilha de Desenvolvimento Front-end. Continue avançando nas missões para desenvolver suas competências.

### Exemplo — RH

> Você está na trilha de Gestão de Pessoas. Suas missões ajudam a organizar sua evolução ao longo da jornada.

### Exemplo — Secretariado

> Você está na trilha de Secretariado. Continue avançando nas missões e conteúdos recomendados.

---

## 13. Próxima missão

### Estado

```text
NEXT_MISSION
```

### Estrutura

```text
Sua próxima missão está focada em {competencyName}.
```

Exemplo:

> Sua próxima missão está focada em Comunicação.

Outra opção:

> O próximo passo da sua jornada é desenvolver Comunicação.

A primeira versão é mais neutra e recomendada.

---

## 14. Missão em andamento

### Estado

```text
MISSION_IN_PROGRESS
```

### Exemplo

> Você já iniciou esta missão. Continue para concluir o próximo marco.

Com progresso:

> Você concluiu 1 de 2 etapas desta missão. Falta pouco para avançar.

Evitar excesso de celebração a cada pequeno progresso.

---

## 15. Missão concluída

### Estado

```text
MISSION_COMPLETED
```

### Exemplo

> Missão concluída. Seu progresso foi atualizado.

Se houver ganho específico:

> Missão concluída. Você ganhou 80 XP e avançou em Comunicação.

Importante:

Usar apenas valores realmente existentes no estado da aplicação.

---

## 16. Evolução de competência

### Estado

```text
COMPETENCY_PROGRESS
```

### Exemplo

> Boa evolução. Comunicação avançou para um novo estágio na sua jornada.

Ou:

> Comunicação passou para o estado Avançada na sua jornada.

Evitar:

> Agora você é avançado em Comunicação.

A diferença é importante.

---

## 17. Nova etapa da Árvore

### Estado

```text
TREE_STAGE_UP
```

### Exemplo

> Você alcançou uma nova etapa da sua Árvore de Talentos.

Pode complementar:

> Continue cumprindo suas missões para desenvolver os próximos talentos.

---

## 18. Novo nível

### Estado

```text
LEVEL_UP
```

### Exemplo

> Você alcançou o nível 4 — Talento em Evolução.

Complemento opcional:

> O nível representa seu progresso dentro da jornada RH Connect.

Evitar:

> Agora você é um profissional nível 4.

---

## 19. Recomendação de conteúdo

### Estado

```text
CONTENT_RECOMMENDATION
```

### Exemplo

> Um conteúdo de Fundamentos Web pode ajudar no próximo passo da sua trilha.

Ou:

> Há um material recomendado para continuar desenvolvendo Fundamentos Web.

---

## 20. Sem missão ativa

### Estado

```text
NO_ACTIVE_MISSION
```

### Exemplo

> Você concluiu suas missões atuais. Explore os materiais da sua trilha enquanto novas etapas são preparadas.

Na V1 mockada, o ideal é evitar deixar o candidato nesse estado durante a demonstração.

---

## 21. Relação com a missão atual

O Nilo pode ler:

```text
currentMission.title
currentMission.competencyId
currentMission.progress
currentMission.target
```

Exemplo:

```text
currentMission:
Pratique sua comunicação

progress:
1

target:
2
```

Mensagem possível:

> Sua missão de Comunicação está em andamento. Você concluiu 1 de 2 etapas.

---

## 22. Relação com a Árvore

Nilo pode reagir a:

```text
treeStageChanged
```

Exemplo:

```text
5 → 6
```

Mensagem:

> Você alcançou uma nova etapa da sua Árvore de Talentos.

Nilo não precisa narrar cada mudança de percentual.

---

## 23. Relação com XP

Nilo pode comunicar:

```text
+80 XP
```

apenas após ação concluída.

Exemplo:

> Missão concluída. Você ganhou 80 XP.

Evitar mensagens constantes como:

> Você tem 560 XP.

Esse valor já aparece na interface.

---

## 24. Relação com nível

Nilo deve reagir apenas quando houver mudança de nível.

Exemplo:

```text
Nível 3 → Nível 4
```

Mensagem:

> Novo nível alcançado: Talento em Evolução.

---

## 25. Relação com competências bloqueadas

Quando uma competência ainda estiver bloqueada, Nilo pode explicar o próximo passo sem linguagem negativa.

Preferir:

> Continue desenvolvendo Fundamentos Web para liberar a próxima etapa da trilha.

Evitar:

> JavaScript está bloqueado porque você ainda não é bom o suficiente.

---

## 26. Relação com DISC

Na V1, Nilo não usa o resultado DISC para alterar:

- XP;
- nível;
- missão;
- competência;
- frame.

Ele também não deve dizer:

> Como seu perfil é Influência, você precisa desenvolver X.

Futuramente, DISC poderá apoiar recomendações, mas isso será uma regra própria.

---

## 27. Prioridade de mensagens

Se múltiplos eventos acontecerem juntos, usar prioridade:

```text
1. LEVEL_UP
2. TREE_STAGE_UP
3. MISSION_COMPLETED
4. COMPETENCY_PROGRESS
5. NEXT_MISSION
6. JOURNEY_SUMMARY
```

Isso evita várias mensagens simultâneas.

Exemplo:

Missão concluída + árvore mudou + nível subiu.

Mostrar primeiro:

> Você alcançou o nível 4 — Talento em Evolução.

Depois a interface pode apresentar os demais resultados visualmente.

---

## 28. Frequência

Nilo não deve falar a cada clique.

Usar mensagens em momentos relevantes:

- primeiro acesso;
- nova missão;
- missão concluída;
- nova etapa da árvore;
- novo nível;
- desbloqueio importante.

Evitar:

- popup constante;
- mensagem após cada navegação;
- mensagem repetida em toda atualização.

---

## 29. Formato visual da mensagem

Recomendação:

```text
Nilo
+
título curto
+
mensagem de 1 a 3 linhas
```

Exemplo:

```text
Próxima missão

Sua próxima missão está focada
em Comunicação.
```

Evitar blocos longos.

---

## 30. Expressões e poses na V1

Como a V1 utiliza Nilo estático, não é necessário produzir muitas poses.

Conjunto mínimo recomendado:

### Pose 1 — Neutra / apresentação

Uso:

- resumo da jornada;
- primeiro acesso;
- estado padrão.

### Pose 2 — Positiva / conquista

Uso:

- missão concluída;
- novo nível;
- nova etapa da árvore.

### Pose 3 — Orientação

Uso:

- próxima missão;
- recomendação.

Importante:

A pose de orientação não precisa apontar diretamente para elementos da tela.

---

## 31. Assets do Nilo

Estrutura sugerida:

```text
apps/web/public/
└── gamification/
    └── nilo/
        ├── nilo-neutral.webp
        ├── nilo-achievement.webp
        └── nilo-guidance.webp
```

Caso uma única imagem seja suficiente para a V1:

```text
nilo-development.webp
```

também é aceitável.

---

## 32. Responsividade

### Desktop

Nilo pode aparecer ao lado do conteúdo textual.

### Tablet

Reduzir escala mantendo boa leitura.

### Mobile

Recomendação:

```text
Nilo
↓
texto
↓
informações da jornada
```

ou imagem menor ao lado do título.

Evitar que o personagem ocupe grande parte da viewport.

---

## 33. Acessibilidade

A imagem do Nilo deve possuir:

- `alt` adequado quando informativa;
- `alt=""` quando puramente decorativa;
- texto da mensagem sempre em HTML;
- não depender da imagem para transmitir informação.

Exemplo:

```text
alt="Nilo, guia de carreira do RH Connect"
```

---

## 34. Implementação conceitual

O conteúdo do Nilo deve ser derivado do estado central.

Exemplo:

```ts
type NiloMessageType =
  | "WELCOME"
  | "JOURNEY_SUMMARY"
  | "NEXT_MISSION"
  | "MISSION_IN_PROGRESS"
  | "MISSION_COMPLETED"
  | "COMPETENCY_PROGRESS"
  | "TREE_STAGE_UP"
  | "LEVEL_UP"
  | "CONTENT_RECOMMENDATION"
  | "NO_ACTIVE_MISSION";
```

Exemplo de mensagem:

```ts
{
  type: "NEXT_MISSION",
  title: "Próxima missão",
  message: "Sua próxima missão está focada em Comunicação.",
  pose: "GUIDANCE"
}
```

---

## 35. Regra para mocks

Na V1, as mensagens podem ser montadas a partir de mocks.

Exemplo:

```text
developmentState
↓
resolveNiloMessage()
↓
mensagem
+
pose
```

Evitar textos hardcoded diretamente em vários componentes.

---

## 36. Evolução futura

Futuramente, Nilo poderá ter:

- animações;
- microinterações;
- mudança de expressão;
- lip-sync;
- voz;
- áudio;
- fala contextual;
- respostas adaptadas;
- recomendações inteligentes.

Essa evolução deve preservar os mesmos limites institucionais.

Nilo continuará sendo guia, não avaliador.

---

## 37. Voz futura

Quando voz for implementada, será necessário definir separadamente:

- voz oficial;
- idade percebida;
- ritmo;
- sotaque;
- entonação;
- velocidade;
- pausas;
- acessibilidade;
- opção de mutar;
- legendas;
- sincronização labial.

Isso não entra na V1.

---

## 38. Lip-sync futuro

O lip-sync deverá ser tratado como camada visual futura.

Fluxo conceitual:

```text
texto
↓
áudio
↓
temporização
↓
movimento labial
```

Não deve bloquear o funcionamento da página.

---

## 39. O que entra na V1

- Nilo estático;
- presença em Meu Desenvolvimento;
- mensagens contextuais;
- no máximo poucas poses;
- resumo da jornada;
- próxima missão;
- mensagem de missão concluída;
- mensagem de novo estágio;
- mensagem de novo nível;
- mensagens derivadas do estado central.

---

## 40. O que não entra na V1

- voz;
- lip-sync;
- personagem animado continuamente;
- conversa livre;
- chatbot do Nilo;
- IA generativa em tempo real;
- interpretação automática de DISC;
- avaliação de candidato;
- notas;
- recomendação baseada em modelo complexo.

---

## 41. Decisões consolidadas

1. Nilo é o Guia de Carreira e Mentor de Talentos.
2. Nilo orienta; não avalia.
3. Nilo aparece principalmente em Desenvolvimento.
4. Nilo não interfere durante a entrevista.
5. Nilo não calcula XP.
6. Nilo não decide estado de competência.
7. Nilo apenas comunica estados existentes.
8. Mensagens devem ser curtas.
9. Tom deve ser profissional e positivo.
10. Não utilizar linguagem de domínio profissional.
11. DISC permanece separado na V1.
12. Nilo pode reagir a missão, árvore e nível.
13. V1 utiliza personagem estático.
14. Voz e lip-sync ficam para o futuro.
15. Mensagens devem vir de uma fonte central, não de hardcodes espalhados.

---

## 42. Próximo documento

O próximo documento deve ser:

`05-plano-implementacao-front-gamificacao-v1.md`

Ele deverá definir:

- auditoria da tela atual;
- estrutura de arquivos;
- mocks;
- tipos;
- estado central;
- persistência;
- regras de cálculo;
- seleção de missão;
- troca de frame;
- mensagens do Nilo;
- integração com assets;
- controles de demo;
- responsividade;
- testes;
- estratégia de implementação com Codex.
