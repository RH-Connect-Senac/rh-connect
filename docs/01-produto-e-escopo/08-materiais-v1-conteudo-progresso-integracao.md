# Materiais V1 — Conteúdo, Progresso e Integração — RH Connect

**Documento:** 08-materiais-v1-conteudo-progresso-integracao.md  
**Projeto:** RH Connect  
**Versão:** v1.0  
**Status:** Especificação funcional para implementação da V1  
**Escopo:** Candidato — Materiais de Apoio e integração com Meu Desenvolvimento

---

## 1. Objetivo

Este documento define como a área **Materiais de Apoio** deve funcionar na V1 do RH Connect.

A tela atual já funciona visualmente como catálogo, mas o CTA **Abrir material** ainda termina em uma simulação/toast.

Na V1, Materiais passa a ser uma funcionalidade real do Front-end e uma fonte válida de progresso para missões da área Desenvolvimento.

---

## 2. Princípio central

A regra da V1 é:

> **Clicar em “Abrir material” não significa concluir um material.**

O fluxo correto é:

```text
Materiais
↓
Abrir material
↓
página real de conteúdo
↓
candidato consome o conteúdo
↓
Marcar como concluído
↓
MATERIAL_COMPLETED
```

Somente `MATERIAL_COMPLETED` pode alimentar missões baseadas em material.

---

## 3. O que reaproveitar da tela atual

A tela de catálogo atual pode ser preservada visualmente.

Estruturas reaproveitáveis:

- Recomendados para você;
- Acessados recentemente;
- Todos os materiais;
- busca;
- filtro por categoria;
- favoritos;
- duração estimada;
- badge de tipo;
- categoria;
- botão Abrir material.

O objetivo não é redesenhar o catálogo.

É torná-lo funcional.

---

## 4. Tipos de material na V1

### 4.1 READing / Leitura

É o formato principal e obrigatório da V1.

Pode conter:

- título;
- introdução;
- seções;
- listas;
- exemplos;
- dicas;
- resumo;
- conclusão.

### 4.2 EXERCISE / Exercício

Só deve aparecer se houver interação real implementada.

Caso não haja tempo para implementar exercício corretamente, o tipo não deve ser exibido como funcional.

### 4.3 VIDEO / Vídeo

Fica fora da V1.

Motivo:

- não há mídia real disponível;
- não deve existir card que prometa um player inexistente.

Materiais atualmente apresentados como vídeo podem:

```text
ser convertidos para leitura estruturada
```

quando o conteúdo puder ser preservado dessa forma.

---

## 5. Rota

Catálogo:

```text
/candidate/materials
```

Detalhe:

```text
/candidate/materials/:materialId
```

Exemplo:

```text
/candidate/materials/como-se-apresentar-em-entrevistas
```

A rota deve continuar protegida pelo perfil de candidato conforme o padrão atual da aplicação.

---

## 6. Uma única tela dinâmica

Não criar um componente React para cada material.

Criar uma tela genérica:

```text
MaterialDetailScreen
```

Ela recebe `materialId`, resolve o item no catálogo e renderiza o conteúdo.

Fluxo:

```text
route param
↓
materialId
↓
catalog lookup
↓
material content
↓
MaterialDetailScreen
```

---

## 7. Estrutura conceitual de material

```ts
type MaterialType =
  | "READING"
  | "EXERCISE";

type MaterialStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

type SupportMaterial = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: MaterialType;
  durationMinutes: number;
  category: string;

  area?: "TI" | "RH" | "SECRETARIADO";
  track?: string;

  competencyIds: string[];

  recommended?: boolean;

  content: MaterialContent;

  status?: MaterialStatus;
  isFavorite?: boolean;
  lastAccessedAt?: string;
  completedAt?: string;
};
```

---

## 8. Conteúdo de leitura

Exemplo conceitual:

```ts
type ReadingMaterialContent = {
  intro?: string;
  sections: Array<{
    id: string;
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    example?: string;
    tip?: string;
  }>;
  summary?: string;
};
```

A estrutura deve permitir criar conteúdos sem hardcode pesado no JSX.

---

## 9. Estado do material

Estados mínimos:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

### NOT_STARTED

Nunca foi aberto.

### IN_PROGRESS

Foi aberto, mas não concluído.

### COMPLETED

Foi marcado como concluído.

---

## 10. Eventos

### MATERIAL_OPENED

Disparado ao abrir o conteúdo.

Efeitos possíveis:

```text
status → IN_PROGRESS
lastAccessedAt → agora
```

### MATERIAL_COMPLETED

Disparado ao marcar como concluído.

Efeitos:

```text
status → COMPLETED
completedAt → agora
lastAccessedAt → agora
```

É este evento que pode alimentar gamificação.

---

## 11. Persistência temporária

Na V1, o progresso pode ser salvo em `localStorage`.

Chave sugerida:

```text
rhconnect:materials:v1
```

Persistir somente estado do candidato:

```text
materialId
status
isFavorite
lastAccessedAt
completedAt
```

O conteúdo do catálogo não precisa ser duplicado no storage.

---

## 12. Favoritos

Favoritar não gera XP.

Favorito serve apenas para organização pessoal.

Fluxo:

```text
favoritar
↓
isFavorite = true
↓
aparece em Favoritos
```

---

## 13. Acessados recentemente

A seção deve ser derivada de:

```text
lastAccessedAt
```

Não precisa permanecer hardcoded.

Ordenar do acesso mais recente para o mais antigo.

---

## 14. Recomendados para você

Na V1, recomendação pode ser simples e determinística.

Fontes:

- área;
- subárea;
- missão atual;
- competência relacionada.

Não é necessário criar engine de recomendação.

Exemplo:

```text
missão atual:
Amplie seu repertório

competência:
Aprendizado contínuo

↓
material recomendado da trilha
```

---

## 15. Relação com Gamificação

Fluxo:

```text
DevelopmentMission
sourceType = MATERIAL
↓
material recomendado
↓
MATERIAL_COMPLETED
↓
mission.progress += 1
↓
se target atingido
↓
completeMission()
↓
XP
+
progresso da competência
```

---

## 16. Regra de idempotência na V1

Mesmo no Front, concluir o mesmo material repetidamente não deve conceder progresso várias vezes para a mesma missão.

Exemplo:

```text
material já COMPLETED
↓
novo clique em concluir
↓
não gera novo MATERIAL_COMPLETED válido
```

A futura versão no Back-end deverá aplicar idempotência de forma autoritativa.

---

## 17. Relação com competências

Concluir um material significa:

> evidência de aprendizagem/participação dentro da jornada.

Não significa:

> domínio profissional validado.

Exemplo:

```text
Material:
Introdução ao Git

↓
MATERIAL_COMPLETED

↓
pode apoiar progresso de
Git e Versionamento
```

Mas a plataforma não deve dizer:

> Você domina Git.

---

## 18. Catálogo atual — preparação para entrevistas

Os conteúdos atuais podem continuar fazendo parte do catálogo.

Exemplos observados:

- Como se apresentar em entrevistas;
- Elevator pitch para entrevistas;
- Postura e linguagem corporal;
- Como articular ideias com clareza;
- O método STAR explicado;
- STAR na prática;
- Perguntas comportamentais mais comuns;
- Como responder “fale sobre você”;
- Primeiro emprego: como se preparar;
- Jovem Aprendiz: direitos e oportunidades;
- Como conquistar uma vaga de estágio;
- Recolocação profissional: por onde começar;
- Perguntas técnicas: como se preparar.

Itens atualmente marcados como vídeo devem ser convertidos para leitura se forem mantidos na V1.

---

## 19. Materiais de Desenvolvimento — TI

Catálogo mínimo recomendado:

1. Fundamentos de Lógica
2. Fundamentos da Web
3. Introdução ao JavaScript
4. Introdução ao Git e Versionamento
5. Responsividade e Mobile First

Competências relacionadas:

```text
Lógica
Fundamentos Web
JavaScript / TypeScript
Git e Versionamento
Responsividade
```

---

## 20. Materiais de Desenvolvimento — Gestão de RH

Catálogo mínimo recomendado:

1. Fundamentos de Rotinas de RH
2. Introdução a Recrutamento e Seleção
3. Onboarding e Integração
4. Avaliação de Desempenho
5. Introdução a People Analytics

---

## 21. Materiais de Desenvolvimento — Secretariado

Catálogo mínimo recomendado:

1. Técnicas Secretariais e Atendimento
2. Redação Empresarial
3. Gestão de Agendas
4. Gestão Documental
5. Comunicação Executiva

---

## 22. Materiais transversais

Podem ser compartilhados entre áreas:

- Comunicação profissional;
- Trabalho em equipe;
- Organização;
- Resolução de problemas;
- Aprendizado contínuo;
- Método STAR;
- apresentação pessoal.

Isso evita duplicação desnecessária.

---

## 23. Página de detalhe — estrutura recomendada

```text
← Voltar para Materiais

[LEITURA] 8 min
Categoria

Título

Descrição

────────────────────

Conteúdo

Seção 1
Seção 2
Exemplo
Dica
Resumo

────────────────────

Status

[ Marcar como concluído ]
```

---

## 24. CTA de conclusão

Texto recomendado:

```text
Marcar como concluído
```

Depois de concluir:

```text
Concluído
```

Pode também existir:

```text
Voltar para Materiais
```

---

## 25. Comportamento após conclusão

Após `MATERIAL_COMPLETED`:

- atualizar o estado visual;
- atualizar Recentes;
- notificar Development quando houver missão relacionada;
- evitar toast enganoso;
- mostrar feedback simples.

Exemplo:

> Material concluído.

Se uma missão também for concluída:

> Material concluído. Sua missão também avançou.

---

## 26. Navegação vinda de missão

Quando o candidato clicar em:

```text
Continuar missão
```

e a missão for de material, o ideal é apontar diretamente para o material relevante quando houver um alvo definido.

Exemplo:

```text
/candidate/materials/fundamentos-da-web
```

Se não houver material único:

```text
/candidate/materials
```

com filtro/recomendação adequada.

---

## 27. Conteúdo e Design System

Reutilizar componentes existentes:

- Button;
- Card;
- Badge;
- Progress, se necessário;
- tipografia;
- espaçamentos;
- tokens.

Não criar uma identidade visual separada para Materiais.

---

## 28. Responsividade

### Desktop

Conteúdo central com largura confortável para leitura.

### Tablet

Manter boa hierarquia e largura de linha.

### Mobile

- uma coluna;
- CTA em largura adequada;
- tipografia legível;
- evitar linhas muito longas;
- botão de voltar acessível.

---

## 29. Acessibilidade

Garantir:

- headings semânticos;
- foco visível;
- botões reais;
- contraste;
- leitura por teclado;
- labels adequados;
- não depender apenas de cor para status.

---

## 30. O que entra na V1

- catálogo existente reaproveitado;
- rota dinâmica de detalhe;
- materiais de leitura;
- conteúdo real;
- favoritos;
- recentes;
- status;
- conclusão;
- localStorage;
- `MATERIAL_OPENED`;
- `MATERIAL_COMPLETED`;
- integração com missões compatíveis;
- catálogo mínimo por área.

---

## 31. O que não entra na V1

- vídeos;
- player;
- streaming;
- upload de mídia;
- quizzes complexos;
- correção automática de exercício;
- certificados;
- trilhas externas;
- SCORM;
- LMS completo;
- recomendação por IA.

---

## 32. Ordem de implementação

```text
1. auditar componente atual de Materiais
2. extrair catálogo hardcoded
3. criar tipos
4. criar rota de detalhe
5. criar MaterialDetailScreen
6. implementar READINGS
7. implementar estado local
8. favoritos/recentes
9. MATERIAL_COMPLETED
10. integrar com gamificação
11. responsividade
12. QA
```

---

## 33. Critério de conclusão

```text
[ ] Abrir material navega para uma página real
[ ] Conteúdo é renderizado por catálogo
[ ] Não há vídeo falso
[ ] Material pode ficar IN_PROGRESS
[ ] Material pode ser COMPLETED
[ ] Refresh preserva estado
[ ] Recentes usa lastAccessedAt
[ ] Favoritos funciona
[ ] MATERIAL_COMPLETED é emitido uma vez
[ ] Missão compatível pode avançar
[ ] Mobile funciona
[ ] Build passa
```

---

## 34. Evolução futura

Futuramente poderão entrar:

```text
VIDEO
EXERCISE
QUIZ
INTERACTIVE
EXTERNAL_RESOURCE
```

Vídeo exigirá mídia real e infraestrutura apropriada.

O modelo de domínio deve ser extensível, mas a interface da V1 não deve prometer formatos ainda inexistentes.

---

## 35. Decisões consolidadas

1. Materiais deixa de ser somente catálogo simulado.
2. A V1 terá conteúdo real no Front-end.
3. `Abrir material` navega para detalhe real.
4. A V1 prioriza leitura.
5. Vídeo fica fora enquanto não houver mídia real.
6. Exercício só entra se houver interação real.
7. Conclusão é explícita.
8. `MATERIAL_COMPLETED` alimenta gamificação.
9. Clique em Abrir material não gera recompensa.
10. Materiais técnicos representam aprendizagem, não validação de domínio.
11. O catálogo pode atender preparação para entrevistas e Desenvolvimento na mesma área.
12. Uma única tela dinâmica renderiza todos os materiais.
