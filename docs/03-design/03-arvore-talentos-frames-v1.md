# Especificação da Árvore de Talentos — Estados, Frames e Assets — RH Connect

**Documento:** 03-arvore-talentos-frames-v1.md  
**Projeto:** RH Connect  
**Versão:** v1.0  
**Status:** Especificação funcional e visual para a V1  
**Escopo:** Candidato — Meu Desenvolvimento / Árvore de Talentos

---

## 1. Objetivo

Este documento define como a **Árvore de Talentos** deve funcionar e evoluir visualmente na V1 do RH Connect.

Ele complementa:

- `01-visao-funcional-gamificacao-v1.md`
- `02-catalogo-competencias-missoes-v1.md`

A finalidade deste documento é fechar:

- lógica dos 10 estágios;
- relação entre progresso e frame;
- diferenças entre TI, Gestão de RH e Secretariado;
- estados visuais dos nós;
- padrão dos 30 assets;
- regras de consistência entre imagens;
- nomes e organização dos arquivos;
- transições CSS;
- comportamento responsivo;
- separação entre imagem-base e informações renderizadas pelo Front-end.

---

## 2. Papel da Árvore de Talentos

A Árvore de Talentos é a principal representação visual da evolução do candidato dentro da área **Meu Desenvolvimento**.

Ela representa:

- progresso da jornada;
- amadurecimento gradual;
- competências em evolução;
- avanço visual;
- sensação de continuidade;
- conquistas do ciclo.

Ela não representa:

- senioridade profissional real;
- certificação;
- domínio absoluto de uma competência;
- aprovação em processo seletivo;
- ranking;
- resultado DISC.

A árvore deve funcionar como uma metáfora visual de crescimento.

---

## 3. Estrutura geral

Cada uma das três áreas iniciais terá uma família visual própria:

```text
TI
Gestão de RH
Secretariado
```

Cada família terá:

```text
10 frames
```

Total:

```text
3 áreas × 10 frames = 30 imagens
```

---

## 4. Relação entre área, subárea e imagem

### 4.1 Área

A área determina qual conjunto de imagens deve ser usado.

Exemplo:

```text
area = "TI"
treeStage = 4
```

Resultado:

```text
/trees/ti/frame-04.webp
```

### 4.2 Subárea

A subárea não troca a família visual.

Exemplo:

```text
Área: TI
Subárea: Desenvolvimento Front-end
```

continua usando:

```text
/trees/ti/
```

A subárea influencia:

- competências;
- labels;
- missões;
- prioridade dos nós;
- mensagens;
- possíveis destaques.

Isso evita precisar criar novos 10 frames para cada subárea.

---

## 5. Regra dos 10 frames

O frame exibido depende do progresso geral da jornada.

Regra inicial:

```text
0–9%      → Frame 1
10–19%    → Frame 2
20–29%    → Frame 3
30–39%    → Frame 4
40–49%    → Frame 5
50–59%    → Frame 6
60–69%    → Frame 7
70–79%    → Frame 8
80–89%    → Frame 9
90–100%   → Frame 10
```

Função conceitual:

```ts
function getTreeStage(overallProgress: number) {
  if (overallProgress >= 90) return 10;
  return Math.floor(overallProgress / 10) + 1;
}
```

Com limitação entre 1 e 10.

---

## 6. Significado de cada estágio

### Frame 1 — Início

Objetivo visual:

- árvore jovem;
- poucos galhos;
- pouco volume;
- sensação clara de começo;
- poucos pontos de interesse.

Mensagem visual:

> A jornada começou.

---

### Frame 2 — Primeiros avanços

Objetivo visual:

- novos galhos;
- primeiras folhas;
- estrutura ainda simples;
- início de expansão.

Mensagem visual:

> Os primeiros talentos começam a se desenvolver.

---

### Frame 3 — Ativação

Objetivo visual:

- mais nós perceptíveis;
- folhas mais presentes;
- primeiros sinais de estrutura consistente.

Mensagem visual:

> O desenvolvimento já está visível.

---

### Frame 4 — Crescimento inicial

Objetivo visual:

- maior volume;
- novos ramos;
- árvore mais equilibrada;
- aumento gradual da densidade.

Mensagem visual:

> A jornada começa a ganhar forma.

---

### Frame 5 — Estágio intermediário

Objetivo visual:

- árvore bem estabelecida;
- vários galhos ativos;
- mais folhas;
- visual intermediário claro.

Mensagem visual:

> O candidato já construiu uma base relevante.

---

### Frame 6 — Expansão

Objetivo visual:

- novos ramos;
- maior densidade;
- árvore mais robusta;
- diferença clara em relação ao frame 5.

Mensagem visual:

> A jornada está se expandindo.

---

### Frame 7 — Desenvolvimento robusto

Objetivo visual:

- árvore madura;
- mais ramos preenchidos;
- sensação forte de evolução;
- mais elementos visuais ligados a conquistas.

Mensagem visual:

> Diversas competências já avançaram.

---

### Frame 8 — Desenvolvimento avançado

Objetivo visual:

- alta densidade;
- árvore muito desenvolvida;
- pequenas marcas de conquista;
- visual próximo do estágio final.

Mensagem visual:

> A jornada está em estágio avançado.

---

### Frame 9 — Quase completa

Objetivo visual:

- árvore muito próxima da maturidade;
- poucos elementos ainda em desenvolvimento;
- maior riqueza visual.

Mensagem visual:

> O ciclo está próximo da conclusão.

---

### Frame 10 — Ciclo plenamente desenvolvido

Objetivo visual:

- árvore madura;
- grande volume;
- folhas;
- frutos/conquistas;
- visual de plenitude.

Mensagem visual:

> O candidato atingiu o estágio máximo daquele ciclo de desenvolvimento.

Importante:

Frame 10 não significa:

- Sênior;
- especialista;
- domínio absoluto;
- certificação.

---

## 7. Estados visuais dos nós

Os nós podem representar competências e devem ter estados visuais distintos.

Estados:

```text
LOCKED
AVAILABLE
IN_PROGRESS
ADVANCED
CONSOLIDATED
```

### 7.1 LOCKED

Características:

- cinza;
- menor contraste;
- aparência inativa;
- sem brilho;
- pode usar ícone de cadeado, se necessário.

---

### 7.2 AVAILABLE

Características:

- contorno azul;
- fundo claro;
- baixa intensidade;
- aparência acessível.

---

### 7.3 IN_PROGRESS

Características:

- amarelo / dourado suave;
- destaque moderado;
- sensação de movimento;
- pode usar glow discreto.

---

### 7.4 ADVANCED

Características:

- azul vibrante;
- maior contraste;
- destaque forte;
- glow leve.

---

### 7.5 CONSOLIDATED

Características:

- verde;
- aparência de conquista;
- pode utilizar check ou brilho sutil.

---

## 8. Imagem-base versus elementos do Front-end

As imagens devem conter:

- árvore;
- fundo;
- galhos;
- folhas;
- frutos;
- elementos decorativos;
- áreas visuais para nós.

As imagens **não devem conter textos de competências**.

Não inserir diretamente na imagem:

```text
Comunicação
JavaScript
Git
People Analytics
Redação Empresarial
```

Esses elementos devem ser renderizados no Front-end.

Vantagens:

- permite reutilizar a mesma imagem;
- evita gerar nova imagem por subárea;
- facilita responsividade;
- facilita correções;
- permite trocar nomes;
- permite alterar estados dos nós;
- reduz retrabalho.

---

## 9. Distribuição dos nós

A árvore deve prever 10 posições principais de nós.

Essas posições devem permanecer estáveis entre os frames de uma mesma área.

Exemplo conceitual:

```text
N1
N2
N3
N4
N5
N6
N7
N8
N9
N10
```

As coordenadas podem ser mantidas por configuração no Front-end.

Exemplo:

```ts
const nodePositions = {
  n1: { x: 18, y: 72 },
  n2: { x: 29, y: 56 },
  n3: { x: 38, y: 38 },
  n4: { x: 50, y: 27 },
  n5: { x: 62, y: 39 },
  n6: { x: 73, y: 54 },
  n7: { x: 82, y: 70 },
  n8: { x: 40, y: 70 },
  n9: { x: 58, y: 69 },
  n10:{ x: 50, y: 50 }
}
```

Os valores acima são apenas ilustrativos.

As posições reais devem ser fechadas após a primeira imagem-base ser aprovada.

---

## 10. Regra de consistência entre frames

Esta é uma regra crítica.

Dentro de uma mesma área, os frames 1 a 10 devem preservar:

- enquadramento;
- proporção;
- perspectiva;
- posição da árvore;
- posição do tronco;
- posição-base das raízes;
- fundo;
- direção da iluminação;
- escala da árvore;
- distribuição geral dos nós;
- estilo visual;
- linguagem de materiais;
- identidade cromática.

O que pode mudar:

- quantidade de folhas;
- tamanho de galhos;
- ramificações adicionais;
- densidade;
- frutos;
- glow;
- marcas de conquista;
- maturidade visual.

---

## 11. Compatibilidade entre frames

Cada frame deve ser visualmente compatível com o anterior e o seguinte.

Regra:

```text
FRAME N
deve parecer uma evolução natural de
FRAME N-1
e uma preparação para
FRAME N+1
```

Evitar:

- mudar ângulo de câmera;
- trocar fundo;
- reposicionar árvore;
- alterar proporção;
- mudar estilo 3D;
- mudar luz;
- mudar perspectiva;
- trocar paleta radicalmente.

Essa consistência é essencial para o efeito de “animação falsa” por crossfade.

---

## 12. Diferenciação visual por área

As três áreas devem pertencer à mesma identidade visual do RH Connect, mas podem possuir pequenas diferenças temáticas.

### TI

Possíveis elementos sutis:

- linhas de conexão;
- padrões geométricos;
- pequenos elementos tecnológicos;
- nós com linguagem visual mais técnica.

Evitar:

- excesso de neon;
- aparência cyberpunk;
- circuitos exagerados.

---

### Gestão de RH

Possíveis elementos sutis:

- conexões entre pessoas;
- formas mais orgânicas;
- sensação de interação;
- elementos que remetam a desenvolvimento humano.

Evitar:

- ícones clichês demais;
- visual infantil;
- excesso de pessoas desenhadas na própria árvore.

---

### Secretariado

Possíveis elementos sutis:

- organização;
- linhas limpas;
- pequenos sinais de agenda/documentação;
- composição elegante e corporativa.

Evitar:

- aparência burocrática;
- muitos objetos;
- poluição visual.

---

## 13. Identidade compartilhada

Todas as três árvores devem manter:

- fundo claro;
- linguagem visual institucional;
- mesma qualidade;
- mesma proporção;
- mesma lógica de evolução;
- coerência com o Design System;
- tons de azul como base;
- verde para estados consolidados;
- amarelo/dourado para progresso intermediário;
- cinza para bloqueado.

---

## 14. Formato e resolução

Recomendação para geração:

```text
1920 × 1080
16:9
```

Motivos:

- fácil uso em desktop;
- compatível com apresentação;
- permite crop responsivo;
- boa qualidade para exportação.

Formato final preferencial:

```text
.webp
```

Durante geração/edição:

```text
.png
```

pode ser utilizado como intermediário.

---

## 15. Nome dos arquivos

### TI

```text
tree-ti-01.webp
tree-ti-02.webp
tree-ti-03.webp
tree-ti-04.webp
tree-ti-05.webp
tree-ti-06.webp
tree-ti-07.webp
tree-ti-08.webp
tree-ti-09.webp
tree-ti-10.webp
```

### RH

```text
tree-rh-01.webp
tree-rh-02.webp
tree-rh-03.webp
tree-rh-04.webp
tree-rh-05.webp
tree-rh-06.webp
tree-rh-07.webp
tree-rh-08.webp
tree-rh-09.webp
tree-rh-10.webp
```

### Secretariado

```text
tree-secretariado-01.webp
tree-secretariado-02.webp
tree-secretariado-03.webp
tree-secretariado-04.webp
tree-secretariado-05.webp
tree-secretariado-06.webp
tree-secretariado-07.webp
tree-secretariado-08.webp
tree-secretariado-09.webp
tree-secretariado-10.webp
```

---

## 16. Estrutura de pastas sugerida

```text
apps/web/public/
└── gamification/
    └── trees/
        ├── ti/
        │   ├── tree-ti-01.webp
        │   ├── tree-ti-02.webp
        │   └── ...
        ├── rh/
        │   ├── tree-rh-01.webp
        │   ├── tree-rh-02.webp
        │   └── ...
        └── secretariado/
            ├── tree-secretariado-01.webp
            ├── tree-secretariado-02.webp
            └── ...
```

---

## 17. Regra de seleção de asset

Exemplo conceitual:

```ts
function getTreeAsset(area: string, stage: number) {
  const normalizedStage = String(stage).padStart(2, "0");

  switch (area) {
    case "TI":
      return `/gamification/trees/ti/tree-ti-${normalizedStage}.webp`;

    case "RH":
      return `/gamification/trees/rh/tree-rh-${normalizedStage}.webp`;

    case "SECRETARIADO":
      return `/gamification/trees/secretariado/tree-secretariado-${normalizedStage}.webp`;
  }
}
```

---

## 18. Transição entre frames

A V1 deve utilizar transições simples.

Sugestão:

```text
crossfade
+
scale sutil
+
glow discreto
```

Duração sugerida:

```text
300–600 ms
```

Evitar:

- bounce;
- zoom excessivo;
- transição longa;
- efeitos chamativos;
- animação com aparência de jogo infantil.

---

## 19. Exemplo conceitual de CSS

```css
.tree-frame {
  transition:
    opacity 420ms ease,
    transform 420ms ease;
}

.tree-frame--entering {
  opacity: 0;
  transform: scale(0.985);
}

.tree-frame--active {
  opacity: 1;
  transform: scale(1);
}
```

O efeito final deve ser discreto.

---

## 20. Comportamento responsivo

### Desktop

A árvore pode ocupar maior área central.

Labels podem ficar ao redor dos nós.

### Tablet

Reduzir escala proporcionalmente.

Evitar sobreposição de labels.

### Mobile

A imagem pode:

- reduzir;
- utilizar container com aspect-ratio;
- ocultar labels secundários;
- exibir detalhes de competência em card abaixo;
- permitir toque no nó para selecionar.

A árvore não deve depender exclusivamente de hover.

---

## 21. Labels de competências

Os textos das competências devem ser HTML/React.

Exemplo:

```text
Comunicação
Organização
JavaScript
Git
Responsividade
```

Eles devem:

- ter contraste adequado;
- respeitar Design System;
- evitar texto muito pequeno;
- ser responsivos;
- não fazer parte da imagem.

---

## 22. Relação entre nó e estado

Cada nó deve receber o estado real da competência.

Exemplo:

```ts
{
  id: "communication",
  label: "Comunicação",
  status: "IN_PROGRESS",
  progress: 55
}
```

Renderização:

```text
posição fixa do nó
+
estilo IN_PROGRESS
+
label Comunicação
```

---

## 23. Regra de visualização numérica

A árvore não precisa exibir percentual em todos os nós.

Evitar:

```text
Comunicação 65%
Git 20%
JavaScript 35%
...
```

diretamente sobre a árvore se isso gerar poluição.

A prioridade é:

- estado visual;
- nome da competência;
- leitura da evolução.

Percentuais podem aparecer:

- ao selecionar um nó;
- em card;
- painel de detalhes;
- tooltip futuro;
- área inferior.

---

## 24. Relação com as missões

A missão atual pode destacar visualmente a competência relacionada.

Exemplo:

```text
Missão atual:
Pratique sua comunicação
```

Então:

```text
nó Comunicação
→ recebe destaque sutil
```

Esse destaque deve ser diferente do estado normal.

Pode usar:

- halo leve;
- pulse discreto;
- contorno adicional.

Não usar animação forte.

---

## 25. Relação com o Nilo

Nilo pode reagir à mudança de frame.

Exemplo:

```text
Frame 5 → Frame 6
```

Mensagem:

> Você alcançou uma nova etapa da sua Árvore de Talentos.

O Nilo não precisa ficar sobre a árvore.

A recomendação é manter:

```text
Nilo no bloco superior
Árvore em seção própria
```

---

## 26. Relação com XP e níveis

XP e nível não controlam diretamente o frame.

Regra:

```text
XP
→ nível

competências
→ overallProgress
→ treeStage
```

Isso é importante.

Exemplo:

```text
XP aumenta
mas competência relacionada muda pouco
```

Pode ocorrer:

```text
nível sobe
árvore permanece no mesmo frame
```

ou:

```text
árvore muda de frame
nível permanece
```

Ambos são válidos.

---

## 27. Relação com DISC

DISC não altera:

- frame;
- nó;
- progresso;
- estado;
- XP.

Na V1, são sistemas independentes.

---

## 28. Regras de acessibilidade

A árvore não pode depender apenas de cor.

Os estados devem combinar:

- cor;
- contorno;
- ícone;
- contraste;
- eventualmente texto/aria-label.

Exemplo:

```text
Comunicação — Em desenvolvimento — 55%
```

para leitores de tela.

---

## 29. Regras para geração das 30 imagens

Antes de gerar todas as imagens:

1. gerar apenas 1 imagem-base de TI;
2. validar composição;
3. validar posição dos nós;
4. validar escala;
5. validar fundo;
6. validar estilo;
7. validar enquadramento;
8. só então gerar os 10 frames de TI;
9. validar crossfade;
10. replicar para RH;
11. replicar para Secretariado.

Não gerar as 30 imagens de uma vez sem validar a primeira família.

---

## 30. Ordem recomendada de produção visual

```text
1. TI frame 1
2. TI frame 5
3. TI frame 10
```

Primeiro validar:

- começo;
- meio;
- fim.

Depois:

```text
TI frames 2, 3, 4, 6, 7, 8, 9
```

Após TI aprovada:

```text
RH 1–10
Secretariado 1–10
```

Essa ordem reduz retrabalho.

---

## 31. Critérios de aprovação de um frame

Um frame só deve ser aprovado se:

- mantém mesma composição;
- mantém mesmo enquadramento;
- mantém mesma perspectiva;
- respeita estágio correspondente;
- não contém textos fixos de competência;
- não possui elementos incompatíveis com o RH Connect;
- não parece infantil;
- não parece game fantasy;
- não parece cyberpunk;
- mantém visual corporativo e moderno;
- permite overlay dos nós;
- funciona em 16:9.

---

## 32. Checklist de consistência entre frames

Antes de aprovar uma sequência:

```text
[ ] mesma posição da árvore
[ ] mesma escala
[ ] mesmo fundo
[ ] mesma perspectiva
[ ] mesma luz
[ ] mesmo estilo
[ ] mesmos pontos-base dos nós
[ ] crescimento gradual
[ ] sem saltos visuais
[ ] frame N coerente com N-1
[ ] frame N coerente com N+1
[ ] nenhum texto embutido
[ ] espaço suficiente para labels
```

---

## 33. Escopo da V1

### Entra

- 30 imagens;
- 3 famílias visuais;
- 10 estágios;
- nós sobrepostos via Front-end;
- estados visuais;
- labels HTML/React;
- crossfade;
- scale sutil;
- destaque de missão atual;
- responsividade;
- acessibilidade básica.

### Não entra

- SVG procedural;
- Canvas;
- física;
- animação orgânica real;
- crescimento de galhos em tempo real;
- árvore 3D interativa;
- GSAP obrigatório;
- Motion obrigatório;
- WebGL;
- drag and drop.

---

## 34. Decisões consolidadas

1. Cada área terá 10 frames.
2. Serão 30 imagens no total.
3. A subárea não cria novos assets.
4. A imagem não conterá textos de competências.
5. Os nós serão renderizados pelo Front-end.
6. As posições dos nós serão fixadas após aprovação da imagem-base.
7. O progresso geral define o frame.
8. XP não define o frame.
9. DISC não altera a árvore.
10. Os frames precisam ser visualmente compatíveis.
11. A transição será simples e discreta.
12. O primeiro conjunto a ser produzido será TI.
13. Primeiro devem ser validados frames 1, 5 e 10 de TI.
14. Só depois serão gerados os demais frames.
15. O documento de prompts será responsável por transformar estas regras em instruções de geração de imagem.

---

## 35. Próximo documento

O próximo documento deve ser:

`04-nilo-jornada-desenvolvimento-v1.md`

Ele deverá definir:

- papel do Nilo;
- presença por tela/estado;
- mensagens;
- tom;
- limites;
- comportamento na V1;
- relação com missão;
- relação com árvore;
- mensagens de avanço;
- mensagens de nível;
- mensagens de conclusão;
- versão futura com animação, voz e lip-sync.
