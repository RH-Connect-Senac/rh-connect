# Prompts para Geração das Imagens — Gamificação e Árvore de Talentos — RH Connect

**Documento:** 06-prompts-imagens-gamificacao-arvore-v1.md  
**Projeto:** RH Connect  
**Versão:** v1.0  
**Status:** Guia de geração e validação visual  
**Escopo:** Árvore de Talentos — TI, Gestão de RH e Secretariado

---

## 1. Objetivo

Este documento reúne os prompts, regras de consistência e critérios de validação necessários para gerar as imagens da Árvore de Talentos do RH Connect.

Ele complementa:

- `01-visao-funcional-gamificacao-v1.md`
- `02-catalogo-competencias-missoes-v1.md`
- `03-arvore-talentos-frames-v1.md`
- `04-nilo-jornada-desenvolvimento-v1.md`
- `05-plano-implementacao-front-gamificacao-v1.md`

A finalidade é garantir que os 30 frames:

- pareçam parte da mesma família visual;
- possam ser usados em sequência;
- permitam transição por crossfade;
- respeitem o Design System;
- não tragam textos embutidos;
- mantenham espaço adequado para os nós renderizados pelo Front-end.

---

## 2. Estratégia de geração

Não gerar as 30 imagens de uma vez.

Ordem recomendada:

```text
1. TI — Frame 1
2. TI — Frame 5
3. TI — Frame 10
4. validar composição
5. gerar TI frames 2, 3, 4, 6, 7, 8 e 9
6. validar sequência completa
7. gerar RH frames 1–10
8. gerar Secretariado frames 1–10
```

A primeira família, TI, funciona como referência visual para as demais.

---

## 3. Regra crítica de continuidade

Cada novo frame deve preservar:

- mesma composição;
- mesma perspectiva;
- mesma câmera;
- mesma posição da árvore;
- mesmo enquadramento;
- mesma proporção;
- mesmo fundo;
- mesma iluminação;
- mesma direção de luz;
- mesma escala;
- mesma posição-base dos galhos;
- mesma linguagem visual;
- mesma distribuição das áreas de nós.

A única mudança deve ser o grau de desenvolvimento.

Regra principal:

> **O frame N deve parecer uma evolução natural do frame N-1, sem parecer uma nova ilustração independente.**

---

## 4. Formato

Gerar em:

```text
1920 × 1080
16:9
```

Preferência:

```text
PNG durante geração
WEBP para uso final no projeto
```

Não gerar:

- imagem quadrada;
- retrato;
- composição vertical;
- enquadramento excessivamente fechado.

---

## 5. Linguagem visual geral

A Árvore de Talentos deve ter aparência:

- corporativa;
- moderna;
- limpa;
- elegante;
- tecnológica sem exagero;
- institucional;
- compatível com RH Connect.

Evitar:

- fantasia medieval;
- RPG;
- árvore mágica exagerada;
- floresta;
- cyberpunk;
- visual infantil;
- excesso de neon;
- UI de videogame;
- elementos caricatos.

---

## 6. Fundo

Recomendação:

- fundo claro;
- ambiente abstrato;
- baixa poluição visual;
- profundidade sutil;
- espaço negativo suficiente;
- tons frios e neutros.

O fundo deve facilitar a aplicação de:

- labels;
- cards;
- nós;
- overlays do Front-end.

---

## 7. Árvore

Características desejadas:

- árvore estilizada e contemporânea;
- tronco central forte;
- estrutura equilibrada;
- galhos distribuídos em ambos os lados;
- aparência orgânica;
- leve linguagem tecnológica;
- espaço entre galhos para nós;
- volume suficiente para progressão em 10 estágios.

A árvore não deve parecer:

- realista fotográfica demais;
- desenhada à mão;
- cartoon;
- árvore de fantasia.

---

## 8. Nós

A imagem pode sugerir pontos de conexão, mas não deve conter:

- texto;
- nome de competência;
- percentual;
- status escrito;
- número.

Os nós reais serão renderizados pelo Front-end.

A imagem deve apenas reservar espaços naturais onde os nós possam ser sobrepostos.

---

## 9. Paleta

Base visual:

```text
azul institucional
azul claro
branco
cinzas frios
verde em elementos de consolidação
amarelo/dourado muito discreto em progresso
```

Evitar grande variedade cromática.

---

# 10. Prompt mestre — base visual

Usar este prompt como base para todos os frames:

```text
Crie uma ilustração em 1920x1080, proporção 16:9, para uma plataforma corporativa de desenvolvimento profissional chamada RH Connect.

A cena deve mostrar uma única Árvore de Talentos centralizada, moderna, elegante e institucional, vista frontalmente com leve profundidade 3D.

A árvore deve ter tronco forte, galhos organizados, composição equilibrada e áreas naturais para aproximadamente 10 pontos de competência que serão adicionados posteriormente pela interface do sistema.

Não inclua nenhum texto, número, label, ícone de competência ou nome de habilidade dentro da imagem.

Use fundo claro, limpo e abstrato, com tons frios, branco, azul e cinza suave. A iluminação deve ser profissional, discreta e consistente.

A composição deve deixar espaço ao redor da árvore para que elementos HTML possam ser posicionados sobre ou próximos aos galhos.

O estilo deve ser corporativo e moderno, sem aparência infantil, sem fantasia, sem videogame, sem floresta, sem cyberpunk e sem neon exagerado.

Esta imagem faz parte de uma sequência de 10 frames. Preserve rigorosamente a mesma câmera, perspectiva, enquadramento, escala, fundo, posição do tronco e distribuição-base dos galhos em todos os frames. Apenas o grau de desenvolvimento da árvore deve mudar entre os estágios.
```

---

# 11. Família TI — direção visual

A árvore de TI pode incluir elementos sutis inspirados em:

- conexões;
- linhas geométricas;
- padrões tecnológicos;
- pequenas estruturas abstratas;
- organização lógica.

Não incluir:

- chips gigantes;
- código na imagem;
- telas;
- computadores;
- circuitos chamativos;
- símbolos de linguagem de programação.

---

## 12. TI — Frame 1

Adicionar ao prompt mestre:

```text
ÁREA: Tecnologia da Informação.

FRAME 1 DE 10 — INÍCIO DA JORNADA.

A árvore deve estar no estágio inicial de desenvolvimento.

Use:
- tronco jovem, mas visualmente estável;
- poucos galhos principais;
- poucas folhas;
- baixa densidade;
- aproximadamente 3 a 4 áreas de nós já perceptíveis;
- demais ramificações apenas sugeridas;
- aparência de início de crescimento.

Inclua detalhes tecnológicos muito sutis, como pequenas linhas de conexão geométricas integradas à composição, sem parecer circuito eletrônico.

A árvore deve claramente parecer o primeiro estágio de uma sequência que crescerá progressivamente.
```

---

## 13. TI — Frame 2

```text
Use exatamente a mesma composição do Frame 1.

FRAME 2 DE 10.

Faça uma evolução pequena e natural:
- adicione alguns galhos secundários;
- aumente discretamente a quantidade de folhas;
- torne 1 ou 2 novas áreas de nós perceptíveis;
- mantenha a árvore ainda jovem;
- não altere enquadramento, perspectiva, escala ou fundo.

A diferença em relação ao Frame 1 deve ser perceptível, mas sutil.
```

---

## 14. TI — Frame 3

```text
Use exatamente a mesma composição dos Frames 1 e 2.

FRAME 3 DE 10.

A árvore começa a apresentar desenvolvimento claro:
- mais ramificações;
- mais folhas;
- melhor definição das áreas de nós;
- aproximadamente metade da estrutura potencial já perceptível;
- leve aumento de volume.

Preserve completamente câmera, tronco, fundo e perspectiva.
```

---

## 15. TI — Frame 4

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 4 DE 10.

A árvore deve mostrar expansão inicial:
- novos ramos laterais;
- copa mais presente;
- mais áreas de nós disponíveis;
- maior densidade visual;
- ainda sem aparência madura.

A evolução deve ser contínua e natural.
```

---

## 16. TI — Frame 5

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 5 DE 10 — ESTÁGIO INTERMEDIÁRIO.

A árvore deve parecer claramente no meio da jornada:
- tronco mais robusto;
- copa equilibrada;
- diversos galhos desenvolvidos;
- folhas em quantidade moderada;
- aproximadamente 7 a 8 áreas de nós bem integradas;
- visual estável e profissional.

Este frame será referência intermediária da família TI.
```

---

## 17. TI — Frame 6

```text
Use exatamente a mesma composição do Frame 5.

FRAME 6 DE 10.

Faça uma evolução moderada:
- mais ramificações;
- maior densidade da copa;
- preenchimento gradual de áreas vazias;
- mais sinais visuais de desenvolvimento;
- sem introduzir frutos ainda ou apenas sinais mínimos.

Preserve todas as características-base.
```

---

## 18. TI — Frame 7

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 7 DE 10.

A árvore deve parecer robusta:
- maior número de ramos;
- copa mais cheia;
- todas ou quase todas as áreas de nós perceptíveis;
- estrutura madura;
- pequenos sinais de conquista de forma abstrata e discreta.

Não use símbolos literais de troféu ou medalha.
```

---

## 19. TI — Frame 8

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 8 DE 10.

Mostre desenvolvimento avançado:
- alta densidade de folhas;
- ramificações completas;
- estrutura muito estável;
- pequenos detalhes visuais que indiquem amadurecimento;
- início muito sutil de frutos ou pontos de conquista.

Mantenha o visual corporativo.
```

---

## 20. TI — Frame 9

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 9 DE 10.

A árvore deve estar quase plenamente desenvolvida:
- copa praticamente completa;
- todos os principais ramos maduros;
- maior riqueza visual;
- poucos sinais de crescimento ainda pendentes;
- frutos discretos ou marcas abstratas de conquista.

Não torne a cena carregada.
```

---

## 21. TI — Frame 10

```text
Use exatamente a mesma composição dos frames anteriores.

FRAME 10 DE 10 — CICLO PLENAMENTE DESENVOLVIDO.

A árvore deve representar o estágio máximo deste ciclo dentro do RH Connect:
- tronco maduro;
- copa completa;
- galhos plenamente desenvolvidos;
- folhas abundantes;
- todos os espaços de nós integrados;
- frutos ou sinais de conquista elegantes e discretos;
- aparência de plenitude e desenvolvimento.

Não represente senioridade profissional, graduação ou certificação.

Este deve parecer claramente o estágio final da mesma árvore iniciada no Frame 1.
```

---

# 22. Família RH — direção visual

Preservar a identidade estrutural da família TI, mas com personalidade própria.

Elementos sutis:

- conexões orgânicas;
- sensação de relações humanas;
- formas suaves;
- maior sensação de acolhimento;
- equilíbrio entre estrutura e organicidade.

Evitar:

- pessoas desenhadas nos galhos;
- mãos;
- corações;
- ícones de recrutamento;
- figuras humanas explícitas.

---

## 23. Prompt base RH

Adicionar ao prompt mestre:

```text
ÁREA: Gestão de Recursos Humanos.

A árvore deve transmitir desenvolvimento humano, colaboração, conexão e evolução profissional por meio de formas orgânicas e conexões sutis.

Use elementos abstratos muito discretos que sugiram relações e desenvolvimento de pessoas, mantendo aparência corporativa.

Não use pessoas desenhadas, mãos, corações, bonecos ou ícones de RH.

Preserve a mesma lógica visual e de progressão da família TI.
```

---

## 24. RH — Frames 1 a 10

Utilizar exatamente a mesma progressão definida para TI:

```text
Frame 1  → início
Frame 2  → primeiros avanços
Frame 3  → ativação
Frame 4  → crescimento inicial
Frame 5  → intermediário
Frame 6  → expansão
Frame 7  → robusto
Frame 8  → avançado
Frame 9  → quase completo
Frame 10 → ciclo plenamente desenvolvido
```

Em cada prompt:

```text
Preserve exatamente a mesma árvore-base da família RH, a mesma posição, escala, perspectiva, iluminação, fundo e distribuição de áreas de nós.

Modifique apenas o grau de desenvolvimento conforme o estágio.
```

Para cada frame, reutilizar a descrição correspondente do frame TI, substituindo apenas a direção temática por RH.

---

# 25. Família Secretariado — direção visual

Elementos sutis:

- organização;
- estrutura;
- precisão;
- elegância;
- linhas limpas;
- ritmo visual mais ordenado.

Evitar:

- pilhas de papel;
- agendas visíveis;
- canetas;
- calendários;
- ícones literais de escritório;
- aparência burocrática.

---

## 26. Prompt base Secretariado

Adicionar ao prompt mestre:

```text
ÁREA: Secretariado Executivo e Assessoria.

A árvore deve transmitir organização, clareza, precisão e desenvolvimento profissional.

Use composição refinada, linhas limpas e pequenos elementos abstratos que sugiram estrutura e organização, sem utilizar objetos literais de escritório.

Não use agendas, papéis, canetas, calendários, pastas ou ícones burocráticos.

Preserve a mesma lógica visual e de progressão das demais famílias.
```

---

## 27. Secretariado — Frames 1 a 10

Utilizar a mesma progressão:

```text
Frame 1  → início
Frame 2  → primeiros avanços
Frame 3  → ativação
Frame 4  → crescimento inicial
Frame 5  → intermediário
Frame 6  → expansão
Frame 7  → robusto
Frame 8  → avançado
Frame 9  → quase completo
Frame 10 → ciclo plenamente desenvolvido
```

Cada prompt deve reforçar:

```text
Manter exatamente a mesma composição, perspectiva, posição, escala, iluminação e fundo da família Secretariado.
```

---

# 28. Prompt de continuidade para edição de frame

Quando um frame anterior já existir e for utilizado como referência, preferir:

```text
Edite a imagem de referência mantendo integralmente:

- câmera;
- perspectiva;
- posição da árvore;
- tronco;
- raízes;
- fundo;
- iluminação;
- escala;
- composição;
- estilo;
- enquadramento.

Transforme apenas o estágio de desenvolvimento da árvore para o próximo frame da sequência.

Não redesenhe a cena do zero.

Adicione crescimento gradual nos galhos, folhas e sinais de maturidade conforme o estágio solicitado.

O resultado deve parecer o mesmo objeto alguns passos depois no tempo.
```

Esse tipo de edição é preferível a gerar cada frame isoladamente.

---

# 29. Prompt de correção — árvore mudou de posição

```text
Corrija a imagem para que a árvore volte exatamente à posição, escala e enquadramento da imagem de referência anterior.

Não altere o grau de desenvolvimento atual.

Preserve o mesmo fundo, câmera, iluminação, perspectiva e composição.

A sequência precisa funcionar por crossfade sem salto visual.
```

---

# 30. Prompt de correção — fundo mudou

```text
Mantenha a árvore atual exatamente como está, mas restaure o fundo, iluminação e atmosfera da imagem de referência aprovada.

O fundo deve ser visualmente idêntico entre todos os frames.

Não altere câmera, escala, posição ou maturidade da árvore.
```

---

# 31. Prompt de correção — imagem ficou infantil

```text
Refine a imagem para uma linguagem mais corporativa, moderna e institucional.

Remova qualquer aparência infantil, cartoon, fantasia ou videogame.

Mantenha a mesma composição, estrutura da árvore, estágio, posição e fundo.

Use materiais, iluminação e acabamento mais sóbrios e profissionais.
```

---

# 32. Prompt de correção — excesso de tecnologia

```text
Reduza significativamente os elementos tecnológicos.

Mantenha apenas referências abstratas e sutis a conexões e estrutura.

Remova neon, circuitos evidentes, elementos cyberpunk e efeitos futuristas exagerados.

Preserve a árvore, composição, estágio e identidade institucional.
```

---

# 33. Prompt de correção — pouca diferença entre frames

```text
Aumente moderadamente a percepção de evolução em relação ao frame anterior.

Adicione crescimento orgânico em galhos, folhas, densidade e maturidade, sem mudar composição, câmera, escala ou fundo.

A diferença deve ser claramente perceptível no crossfade, mas ainda parecer um avanço gradual.
```

---

# 34. Prompt de correção — diferença grande demais

```text
Reduza a diferença visual em relação ao frame anterior.

Preserve o estágio de evolução solicitado, mas torne a progressão mais gradual.

Não introduza grandes galhos novos, mudanças de proporção ou excesso de folhas de uma única vez.

O frame deve parecer uma transição natural entre o anterior e o próximo.
```

---

# 35. Regra para textos

Nunca solicitar texto dentro da imagem.

Evitar:

```text
Comunicação
Git
RH
TI
Secretariado
XP
Nível
```

Todo texto deve ser renderizado pelo Front-end.

---

# 36. Regra para logo

A logo RH Connect não precisa aparecer dentro da imagem da árvore.

A identidade será garantida por:

- página;
- Design System;
- cores;
- Nilo;
- header.

Isso evita transformar a árvore em peça publicitária.

---

# 37. Regra para Nilo

Nilo não deve aparecer dentro dos frames da árvore.

Ele terá assets próprios e será renderizado em outro bloco da página.

---

# 38. Critérios de aprovação visual

Um frame é aprovado quando:

```text
[ ] 1920x1080
[ ] 16:9
[ ] sem textos
[ ] sem logo embutida
[ ] sem Nilo
[ ] mesma câmera
[ ] mesmo fundo
[ ] mesma perspectiva
[ ] mesma escala
[ ] árvore no mesmo local
[ ] espaços para 10 nós
[ ] progressão coerente
[ ] estilo corporativo
[ ] sem aparência infantil
[ ] sem excesso de fantasia
[ ] sem excesso de tecnologia
[ ] funciona com overlay
```

---

# 39. Checklist de sequência

Depois de gerar os 10 frames de uma área:

```text
[ ] Frame 1 → 2 natural
[ ] Frame 2 → 3 natural
[ ] Frame 3 → 4 natural
[ ] Frame 4 → 5 natural
[ ] Frame 5 → 6 natural
[ ] Frame 6 → 7 natural
[ ] Frame 7 → 8 natural
[ ] Frame 8 → 9 natural
[ ] Frame 9 → 10 natural
[ ] nenhum salto de câmera
[ ] nenhum salto de posição
[ ] nenhum salto de fundo
[ ] nenhum salto de iluminação
[ ] nenhum frame parece outra árvore
```

---

# 40. Teste de crossfade

Antes de aprovar a sequência inteira:

```text
frame N
↓
opacity 1 → 0
↓
frame N+1
↓
opacity 0 → 1
```

Verificar:

- tronco permanece alinhado;
- copa não “teleporta”;
- fundo não pulsa;
- câmera não muda;
- escala não muda;
- crescimento parece natural.

---

# 41. Nomenclatura final

### TI

```text
tree-ti-01.webp
...
tree-ti-10.webp
```

### RH

```text
tree-rh-01.webp
...
tree-rh-10.webp
```

### Secretariado

```text
tree-secretariado-01.webp
...
tree-secretariado-10.webp
```

---

# 42. Procedimento recomendado de geração

```text
PASSO 1
Gerar TI Frame 1.

PASSO 2
Validar:
composição
estilo
fundo
escala
áreas de nós

PASSO 3
Usar Frame 1 como referência para Frame 5.

PASSO 4
Validar se parece a mesma árvore em estágio intermediário.

PASSO 5
Usar a mesma referência para Frame 10.

PASSO 6
Comparar 1 / 5 / 10.

PASSO 7
Ajustar linguagem visual.

PASSO 8
Gerar frames intermediários usando edição baseada no frame anterior.

PASSO 9
Testar crossfade.

PASSO 10
Somente depois replicar para RH e Secretariado.
```

---

# 43. Observação sobre geração com IA

A geração de imagens pode introduzir pequenas variações entre frames.

Por isso, a prioridade deve ser:

```text
editar imagem anterior
>
gerar nova imagem isolada
```

Sempre que possível.

Quanto mais a geração reutilizar o frame anterior como referência, maior a chance de manter consistência.

---

# 44. O que não fazer

Não:

- gerar 30 imagens de uma vez;
- usar um prompt diferente para cada frame sem base comum;
- colocar textos dentro das imagens;
- trocar a árvore completamente entre frames;
- criar cenários diferentes;
- mudar horário/luz;
- alterar lente/câmera;
- colocar Nilo na árvore;
- colocar logo na árvore;
- usar elementos específicos de competência dentro do asset;
- tentar simular a interface completa dentro da imagem.

---

# 45. Resultado esperado

Ao final, cada área deve possuir uma sequência como:

```text
Frame 1
↓
Frame 2
↓
Frame 3
↓
...
↓
Frame 10
```

que visualmente pareça:

> a mesma Árvore de Talentos evoluindo gradualmente ao longo da jornada.

O Front-end será responsável por:

- labels;
- nós;
- estados;
- destaque da missão;
- interação;
- XP;
- nível;
- Nilo;
- transições.

A imagem é apenas a base visual evolutiva.

---

## 46. Decisões consolidadas

1. As imagens serão 1920x1080.
2. Serão 30 frames no total.
3. TI será produzida primeiro.
4. Frames 1, 5 e 10 serão validados antes dos demais.
5. Imagens não terão textos.
6. Nilo não aparece nos frames.
7. Logo não aparece nos frames.
8. Nós são renderizados pelo Front-end.
9. A câmera deve permanecer fixa.
10. Fundo deve permanecer estável.
11. Crescimento deve ser gradual.
12. Edição baseada no frame anterior é preferível a geração isolada.
13. Cada área possui identidade sutil própria.
14. Todas devem continuar pertencendo à mesma identidade RH Connect.
15. O crossfade é o principal critério de consistência visual.
