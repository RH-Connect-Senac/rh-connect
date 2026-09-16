# Catálogo de Competências e Missões por Área — RH Connect

**Documento:** 02-catalogo-competencias-missoes-v1.md  
**Projeto:** RH Connect  
**Versão:** v1.1  
**Status:** Base funcional para Gamificação / Desenvolvimento — V1  
**Escopo:** Candidato — TI, Gestão de RH e Secretariado

---

## 1. Objetivo

Este documento define o catálogo inicial de competências e missões da área **Meu Desenvolvimento** do RH Connect.

Ele complementa:

`01-visao-funcional-gamificacao-v1.md`

e transforma a lógica funcional já definida em conteúdo por área.

A proposta da V1 é:

- manter uma mecânica única de gamificação;
- variar competências e missões conforme área e subárea;
- permitir que a Árvore de Talentos represente a evolução da jornada;
- utilizar apenas gatilhos que o RH Connect consiga observar ou registrar;
- evitar que a plataforma alegue validar tecnicamente competências que ainda não consegue avaliar de fato.

---

## 2. Fontes de referência

Este catálogo utiliza como referência principal o documento **Guia de Capacitação e Formação Profissional / Guia de Cursos por Cargo**, que organiza trilhas por área e senioridade.

Referências utilizadas neste documento:

### TI — Desenvolvimento Front-end

O guia apresenta, entre outros:

- Lógica de Programação;
- Fundamentos Web;
- Git & GitHub;
- Framework Frontend;
- JavaScript Avançado & TypeScript;
- CSS Avançado;
- Responsividade / Mobile-First;
- Gerenciamento de Estado;
- Performance;
- Testes;
- Arquitetura Frontend;
- CI/CD;
- Segurança Web;
- Acessibilidade.

### Gestão de RH — Gestão de Pessoas

O guia apresenta, entre outros:

- Rotinas de RH & DP;
- Comunicação Interpessoal;
- Ferramentas de RH;
- Atração e Seleção;
- Onboarding;
- Avaliação de Desempenho;
- HRBP;
- People Analytics;
- Cargos e Salários;
- Desenvolvimento Organizacional;
- Cultura Organizacional.

### Secretariado Executivo & Assessoria

O guia apresenta, entre outros:

- Técnicas Secretariais & Recepção;
- Informática Essencial;
- Redação Empresarial;
- Gestão de Agendas;
- Organização de Viagens e Eventos;
- Gestão Documental;
- Idiomas;
- Gestão Financeira;
- Comunicação Executiva;
- Assessoria de Diretoria;
- Protocolo Executivo;
- Gestão de Crises e Projetos Especiais.

---

## 3. Regra comum às três áreas

Cada jornada utilizará:

```text
5 competências transversais
+
5 competências específicas
=
10 competências
```

As competências transversais são:

1. Comunicação
2. Organização
3. Colaboração
4. Resolução de problemas
5. Aprendizado contínuo

As competências específicas variam por área/subárea.

---

## 4. Regra de evidência da V1

A V1 só deve conceder progresso automaticamente quando houver uma ação que o RH Connect consiga registrar.

### 4.1 Regra específica para Materiais

Na V1, uma missão com fonte `MATERIAL` não avança pelo simples clique em **Abrir material**.

O fluxo válido é:

```text
abrir material
↓
visualizar página real de conteúdo
↓
Marcar como concluído
↓
MATERIAL_COMPLETED
↓
missão recebe progresso
```

Na entrega atual, o formato principal será **LEITURA**.

Materiais hoje apresentados visualmente como `Vídeo` devem ser convertidos para leitura estruturada ou retirados do catálogo funcional enquanto não houver mídia real.

`EXERCÍCIO` só deve ser utilizado quando houver interação implementada de fato.

Fontes válidas:

```text
INTERVIEW
MATERIAL
MISSION
SYSTEM_MILESTONE
```

Exemplos:

- entrevista/simulação concluída;
- conteúdo/material concluído;
- missão concluída;
- marco de jornada registrado pelo sistema.

Não considerar como evidência automática na V1:

- qualidade real de código;
- uso correto de Git;
- qualidade real de responsividade;
- domínio de ferramentas externas;
- avaliação técnica fora do sistema;
- atividade prática que não tenha mecanismo de correção.

---

# 5. TI — Desenvolvimento Front-end

## 5.1 Competências

### Transversais

1. Comunicação
2. Organização
3. Colaboração
4. Resolução de problemas
5. Aprendizado contínuo

### Específicas

6. Lógica
7. Fundamentos Web
8. JavaScript / TypeScript
9. Git e Versionamento
10. Responsividade

---

## 5.2 Estado inicial sugerido

```text
Comunicação              AVAILABLE
Organização              AVAILABLE
Colaboração              AVAILABLE
Resolução de problemas   AVAILABLE
Aprendizado contínuo     AVAILABLE
Lógica                    AVAILABLE
Fundamentos Web           AVAILABLE
JavaScript / TypeScript   LOCKED
Git e Versionamento       AVAILABLE
Responsividade            LOCKED
```

Pré-requisitos sugeridos:

```text
Fundamentos Web
↓
JavaScript / TypeScript

Fundamentos Web
↓
Responsividade
```

Importante:

Esses bloqueios organizam a jornada pedagógica. Eles não significam incapacidade profissional.

---

## 5.3 Missões V1 — TI

### Missão 1 — Pratique sua comunicação

**Competência:** Comunicação  
**Fonte:** INTERVIEW  
**Objetivo:** concluir 2 práticas de entrevista relacionadas à comunicação profissional.  
**Progresso:** `0/2` → `2/2`  
**Recompensa proposta:** `+80 XP` e `+15% Comunicação`

**Por que funciona na V1:** o RH Connect consegue registrar entrevistas/práticas concluídas.

---

### Missão 2 — Organize sua preparação

**Competência:** Organização  
**Fonte:** SYSTEM_MILESTONE  
**Objetivo:** concluir uma sequência prevista da jornada, como revisar orientação, realizar prática e consultar resultado/material relacionado.  
**Recompensa proposta:** `+60 XP` e `+10% Organização`

**Observação:** utilizar apenas marcos que realmente existam no fluxo implementado.

---

### Missão 3 — Reforce sua colaboração

**Competência:** Colaboração  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre colaboração, feedback ou trabalho em equipe.  
**Recompensa proposta:** `+60 XP` e `+10% Colaboração`

**Limite da V1:** a plataforma registra conclusão de conteúdo; não afirma avaliar a qualidade real do trabalho em equipe.

---

### Missão 4 — Enfrente um cenário profissional

**Competência:** Resolução de problemas  
**Fonte:** INTERVIEW  
**Objetivo:** concluir uma simulação ou prática que contenha cenário de resolução de problema.  
**Recompensa proposta:** `+90 XP` e `+15% Resolução de problemas`

**Limite da V1:** a conclusão pode gerar progresso de jornada sem afirmar correção técnica automática.

---

### Missão 5 — Amplie seu repertório

**Competência:** Aprendizado contínuo  
**Fonte:** MATERIAL  
**Objetivo:** concluir 1 material recomendado da trilha.  
**Recompensa proposta:** `+60 XP` e `+10% Aprendizado contínuo`

---

### Missão 6 — Reforce seu raciocínio

**Competência:** Lógica  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado de lógica ou raciocínio estruturado.  
**Recompensa proposta:** `+60 XP` e `+10% Lógica`

**Limite da V1:** representa progresso de aprendizagem, não aprovação em teste técnico.

---

### Missão 7 — Reforce sua base Web

**Competência:** Fundamentos Web  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre fundamentos Web.  
**Recompensa proposta:** `+60 XP` e `+10% Fundamentos Web`

---

### Missão 8 — Avance em JavaScript

**Competência:** JavaScript / TypeScript  
**Fonte:** MATERIAL  
**Pré-requisito:** Fundamentos Web em estado mínimo definido para desbloqueio.  
**Objetivo:** concluir conteúdo recomendado de JavaScript/TypeScript.  
**Recompensa proposta:** `+70 XP` e `+10% JavaScript / TypeScript`

**Limite da V1:** não significa que a plataforma validou domínio de JavaScript.

---

### Missão 9 — Conheça versionamento

**Competência:** Git e Versionamento  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre Git e controle de versão.  
**Recompensa proposta:** `+60 XP` e `+10% Git e Versionamento`

**Não utilizar na V1:** “faça um commit correto” ou “versione seu projeto” sem mecanismo de validação.

---

### Missão 10 — Reforce conceitos de responsividade

**Competência:** Responsividade  
**Fonte:** MATERIAL  
**Pré-requisito:** Fundamentos Web em estado mínimo definido para desbloqueio.  
**Objetivo:** concluir conteúdo recomendado sobre responsividade / mobile-first.  
**Recompensa proposta:** `+70 XP` e `+10% Responsividade`

**Não utilizar na V1:** afirmar que a plataforma validou uma interface responsiva real.

---

# 6. Gestão de RH — Gestão de Pessoas

## 6.1 Competências

### Transversais

1. Comunicação
2. Organização
3. Colaboração
4. Resolução de problemas
5. Aprendizado contínuo

### Específicas

6. Rotinas de RH
7. Recrutamento e Seleção
8. Onboarding e Experiência do Colaborador
9. Avaliação de Desempenho
10. People Analytics

Essas competências são uma seleção para a V1 baseada na trilha de Gestão de Pessoas do guia.

Outros temas do documento, como HRBP, Cargos e Salários, Desenvolvimento Organizacional e Cultura Organizacional, podem compor expansões futuras.

---

## 6.2 Estado inicial sugerido

```text
Comunicação                         AVAILABLE
Organização                         AVAILABLE
Colaboração                         AVAILABLE
Resolução de problemas              AVAILABLE
Aprendizado contínuo                AVAILABLE
Rotinas de RH                       AVAILABLE
Recrutamento e Seleção              AVAILABLE
Onboarding e Experiência            LOCKED
Avaliação de Desempenho             LOCKED
People Analytics                    LOCKED
```

Pré-requisitos sugeridos:

```text
Rotinas de RH
↓
Onboarding e Experiência

Recrutamento e Seleção
↓
Avaliação de Desempenho

Rotinas de RH
↓
People Analytics
```

---

## 6.3 Missões V1 — RH

### Missão 1 — Pratique comunicação profissional

**Competência:** Comunicação  
**Fonte:** INTERVIEW  
**Objetivo:** concluir 2 práticas de entrevista com foco em comunicação, escuta ou feedback.  
**Recompensa proposta:** `+80 XP` e `+15% Comunicação`

---

### Missão 2 — Organize sua jornada

**Competência:** Organização  
**Fonte:** SYSTEM_MILESTONE  
**Objetivo:** concluir uma sequência prevista de atividades da trilha.  
**Recompensa proposta:** `+60 XP` e `+10% Organização`

---

### Missão 3 — Reforce colaboração

**Competência:** Colaboração  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo relacionado a feedback, escuta ativa ou trabalho em equipe.  
**Recompensa proposta:** `+60 XP` e `+10% Colaboração`

---

### Missão 4 — Analise uma situação de RH

**Competência:** Resolução de problemas  
**Fonte:** INTERVIEW  
**Objetivo:** concluir uma prática/simulação com situação profissional de RH.  
**Recompensa proposta:** `+90 XP` e `+15% Resolução de problemas`

---

### Missão 5 — Amplie seu repertório em RH

**Competência:** Aprendizado contínuo  
**Fonte:** MATERIAL  
**Objetivo:** concluir 1 material recomendado da trilha.  
**Recompensa proposta:** `+60 XP` e `+10% Aprendizado contínuo`

---

### Missão 6 — Reforce fundamentos de RH

**Competência:** Rotinas de RH  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo sobre rotinas de RH/DP, admissões, desligamentos ou conceitos introdutórios de legislação.  
**Recompensa proposta:** `+60 XP` e `+10% Rotinas de RH`

---

### Missão 7 — Explore recrutamento e seleção

**Competência:** Recrutamento e Seleção  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre triagem, entrevistas por competências ou atração.  
**Recompensa proposta:** `+70 XP` e `+10% Recrutamento e Seleção`

---

### Missão 8 — Conheça a jornada de integração

**Competência:** Onboarding e Experiência do Colaborador  
**Fonte:** MATERIAL  
**Pré-requisito:** Rotinas de RH desbloqueadas/em desenvolvimento.  
**Objetivo:** concluir conteúdo recomendado sobre onboarding e integração.  
**Recompensa proposta:** `+70 XP` e `+10% Onboarding`

---

### Missão 9 — Conheça avaliação de desempenho

**Competência:** Avaliação de Desempenho  
**Fonte:** MATERIAL  
**Pré-requisito:** Recrutamento e Seleção em estado mínimo definido.  
**Objetivo:** concluir conteúdo sobre avaliação de desempenho e acompanhamento de metas.  
**Recompensa proposta:** `+70 XP` e `+10% Avaliação de Desempenho`

---

### Missão 10 — Introdução aos indicadores de pessoas

**Competência:** People Analytics  
**Fonte:** MATERIAL  
**Pré-requisito:** Rotinas de RH em estado mínimo definido.  
**Objetivo:** concluir conteúdo introdutório sobre métricas de pessoas.  
**Recompensa proposta:** `+80 XP` e `+10% People Analytics`

**Limite da V1:** conclusão de conteúdo não significa domínio de análise de dados de RH.

---

# 7. Secretariado — Secretariado Executivo & Assessoria

## 7.1 Competências

### Transversais

1. Comunicação
2. Organização
3. Colaboração
4. Resolução de problemas
5. Aprendizado contínuo

### Específicas

6. Técnicas Secretariais e Atendimento
7. Redação Empresarial
8. Gestão de Agendas
9. Gestão Documental
10. Comunicação Executiva

Essas competências são uma seleção para a V1 baseada na trilha do guia.

Conteúdos como viagens e eventos, idiomas, gestão financeira, protocolo executivo e assessoria C-Level podem compor etapas futuras.

---

## 7.2 Estado inicial sugerido

```text
Comunicação                         AVAILABLE
Organização                         AVAILABLE
Colaboração                         AVAILABLE
Resolução de problemas              AVAILABLE
Aprendizado contínuo                AVAILABLE
Técnicas Secretariais               AVAILABLE
Redação Empresarial                 AVAILABLE
Gestão de Agendas                   AVAILABLE
Gestão Documental                   LOCKED
Comunicação Executiva               LOCKED
```

Pré-requisitos sugeridos:

```text
Técnicas Secretariais
↓
Gestão Documental

Redação Empresarial
↓
Comunicação Executiva
```

---

## 7.3 Missões V1 — Secretariado

### Missão 1 — Pratique sua comunicação

**Competência:** Comunicação  
**Fonte:** INTERVIEW  
**Objetivo:** concluir 2 práticas relacionadas a comunicação profissional ou atendimento.  
**Recompensa proposta:** `+80 XP` e `+15% Comunicação`

---

### Missão 2 — Organize sua preparação

**Competência:** Organização  
**Fonte:** SYSTEM_MILESTONE  
**Objetivo:** concluir uma sequência prevista da jornada.  
**Recompensa proposta:** `+60 XP` e `+10% Organização`

---

### Missão 3 — Reforce colaboração

**Competência:** Colaboração  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre colaboração e relações profissionais.  
**Recompensa proposta:** `+60 XP` e `+10% Colaboração`

---

### Missão 4 — Enfrente uma situação profissional

**Competência:** Resolução de problemas  
**Fonte:** INTERVIEW  
**Objetivo:** concluir prática com situação de atendimento, organização ou imprevisto profissional.  
**Recompensa proposta:** `+90 XP` e `+15% Resolução de problemas`

---

### Missão 5 — Amplie seu repertório

**Competência:** Aprendizado contínuo  
**Fonte:** MATERIAL  
**Objetivo:** concluir 1 material recomendado da trilha.  
**Recompensa proposta:** `+60 XP` e `+10% Aprendizado contínuo`

---

### Missão 6 — Reforce técnicas secretariais

**Competência:** Técnicas Secretariais e Atendimento  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo recomendado sobre atendimento, recepção ou etiqueta profissional.  
**Recompensa proposta:** `+60 XP` e `+10% Técnicas Secretariais`

---

### Missão 7 — Aprimore sua redação profissional

**Competência:** Redação Empresarial  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo sobre e-mails corporativos, atas ou correspondência profissional.  
**Recompensa proposta:** `+70 XP` e `+10% Redação Empresarial`

---

### Missão 8 — Reforce gestão de agendas

**Competência:** Gestão de Agendas  
**Fonte:** MATERIAL  
**Objetivo:** concluir conteúdo sobre reuniões, priorização e gestão de compromissos.  
**Recompensa proposta:** `+70 XP` e `+10% Gestão de Agendas`

---

### Missão 9 — Conheça gestão documental

**Competência:** Gestão Documental  
**Fonte:** MATERIAL  
**Pré-requisito:** Técnicas Secretariais em estado mínimo definido.  
**Objetivo:** concluir conteúdo sobre organização de documentos e arquivo físico/digital.  
**Recompensa proposta:** `+70 XP` e `+10% Gestão Documental`

---

### Missão 10 — Desenvolva comunicação executiva

**Competência:** Comunicação Executiva  
**Fonte:** MATERIAL  
**Pré-requisito:** Redação Empresarial em estado mínimo definido.  
**Objetivo:** concluir conteúdo introdutório sobre comunicação voltada ao ambiente executivo.  
**Recompensa proposta:** `+80 XP` e `+10% Comunicação Executiva`

---

# 8. Estrutura comum de uma missão

Estrutura sugerida:

```ts
type DevelopmentMission = {
  id: string;
  area: "TI" | "RH" | "SECRETARIADO";
  track: string;
  title: string;
  description: string;
  competencyId: string;
  sourceType: "INTERVIEW" | "MATERIAL" | "MISSION" | "SYSTEM_MILESTONE";
  progress: number;
  target: number;
  rewardXp: number;
  rewardProgress: number;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
};
```

---

# 9. Estrutura comum de uma competência

```ts
type DevelopmentCompetency = {
  id: string;
  area: "TI" | "RH" | "SECRETARIADO";
  track: string;
  name: string;
  type: "TRANSVERSAL" | "SPECIFIC";
  progress: number;
  status:
    | "LOCKED"
    | "AVAILABLE"
    | "IN_PROGRESS"
    | "ADVANCED"
    | "CONSOLIDATED";
  evidenceTypes: Array<
    "INTERVIEW" |
    "MATERIAL" |
    "MISSION" |
    "SYSTEM_MILESTONE"
  >;
  prerequisites?: string[];
};
```

---

# 10. Valores de XP e progresso

Os valores deste documento são **propostas iniciais para a V1**.

Não são:

- metodologia acadêmica oficial;
- avaliação profissional;
- peso científico;
- regra definitiva de produto.

A função desses valores é permitir:

- simulação funcional;
- evolução consistente;
- demonstração do produto;
- progressão perceptível da Árvore.

Valores poderão ser recalibrados futuramente com:

- uso real;
- feedback do professor/cliente;
- análise de duração das missões;
- balanceamento de níveis;
- evolução do Back-end.

---

# 11. Regra de desbloqueio

Uma competência bloqueada pode ser liberada quando um pré-requisito atingir estado ou progresso mínimo.

Exemplo conceitual:

```text
Fundamentos Web >= 20%
↓
JavaScript / TypeScript AVAILABLE
```

ou:

```text
Redação Empresarial >= 20%
↓
Comunicação Executiva AVAILABLE
```

Na V1, esses thresholds devem ficar centralizados e não espalhados pelos componentes.

---

# 12. Relação com a Árvore de Talentos

As competências deste catálogo alimentam:

```text
competency.progress
↓
overallProgress
↓
treeStage
↓
frame visual da árvore
```

Exemplo:

```text
10 competências
↓
média = 43%
↓
Frame 5
```

A Árvore não precisa exibir todos os valores numéricos.

Ela é uma representação visual.

Os detalhes podem aparecer em:

- labels;
- cards;
- tooltip futuro;
- painel lateral futuro;
- estado da missão.

---

# 13. Relação com o Nilo

Nilo pode utilizar este catálogo para contextualizar mensagens.

Exemplos:

### TI

> Sua próxima missão está focada em Comunicação.

> Fundamentos Web já está disponível na sua trilha.

### RH

> Você desbloqueou uma nova etapa relacionada a Onboarding.

### Secretariado

> Sua próxima missão vai reforçar Redação Empresarial.

Nilo não deve afirmar:

> Você domina JavaScript.

> Você é excelente em Recrutamento.

> Você já está preparado para um cargo Sênior.

---

# 14. Relação com o DISC

DISC permanece separado da pontuação da Árvore na V1.

O DISC não deve:

- aumentar progresso;
- conceder XP;
- desbloquear competência;
- definir nível.

No futuro, pode ajudar a recomendar prioridade.

Exemplo futuro:

```text
DISC identifica oportunidade em comunicação
↓
sistema sugere missão de comunicação
```

A recomendação não equivale a pontuação automática.

---

# 15. O que fica para evolução futura

Poderão ser incluídas competências adicionais por subárea.

### TI

Exemplos:

- Frameworks Front-end;
- Gerenciamento de Estado;
- Testes;
- Performance;
- Acessibilidade;
- Segurança;
- Arquitetura Frontend.

### RH

Exemplos:

- HRBP;
- Cargos e Salários;
- Desenvolvimento Organizacional;
- Cultura Organizacional;
- Ferramentas ATS.

### Secretariado

Exemplos:

- Organização de Viagens e Eventos;
- Idiomas;
- Gestão Financeira;
- Assessoria C-Level;
- Protocolo Executivo;
- Gestão de Crises.

Essas expansões não precisam entrar na V1.

---

# 16. Decisões consolidadas

1. Cada jornada terá 10 competências.
2. Cinco serão transversais.
3. Cinco serão específicas.
4. A área define a família da árvore.
5. A subárea define o foco das competências.
6. Missões só geram progresso com eventos observáveis pelo sistema.
7. Materiais podem gerar progresso de aprendizagem somente após conclusão registrada.
8. O evento `MATERIAL_COMPLETED` é a evidência mínima para missões baseadas em materiais.
9. Entrevistas podem gerar progresso quando relacionadas a competências observáveis na jornada.
10. Competências técnicas não devem ser apresentadas como “validadas” apenas por concluir conteúdo.
11. XP e progresso de competência são métricas distintas.
12. Valores de XP/progresso são regras de gamificação da V1.
13. DISC permanece separado.
14. O mesmo modelo será utilizado nas três áreas.
15. O catálogo poderá crescer futuramente sem mudar a mecânica central.
16. Vídeo não é um formato funcional da V1 enquanto não houver mídia real.

---

# 17. Próximo documento

O próximo documento deve detalhar:

`03-arvore-talentos-frames-v1.md`

Ele deverá definir:

- padrão visual dos 10 frames;
- diferenças entre TI, RH e Secretariado;
- estados visuais dos nós;
- progressão frame a frame;
- regras para as 30 imagens;
- nomes dos assets;
- transições CSS;
- comportamento responsivo;
- relação entre imagem e labels renderizados pelo Front-end.
