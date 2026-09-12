# Guia Operacional — Modelagem de Banco do Back-end

## RH Connect — Preparação para Integração

**Objetivo:** orientar a equipe Back-end na modelagem do banco de dados do RH Connect com PostgreSQL + Prisma, evitando decisões prematuras, excesso de complexidade e acoplamento a regras de produto ainda pendentes.

---

# 1. Objetivo desta atividade

A modelagem deve transformar regras de produto já validadas em uma estrutura de dados simples, evolutiva e suficiente para os fluxos atuais.

A atividade não consiste em “modelar o sistema inteiro”.

A equipe deve modelar por domínio e por fluxo, priorizando o que desbloqueia a primeira integração.

Ordem recomendada:

```text
Autenticação e perfis
↓
Perfil do candidato
↓
Contexto de treinamento
↓
Entrevista
↓
Vídeo / metadados
↓
Avaliação
↓
Relatório
↓
Progresso / gamificação base
```

---

# 2. Regras principais

Durante a modelagem:

- modelar apenas o necessário para os fluxos atuais;
- evitar tabelas “para o futuro” sem necessidade comprovada;
- registrar decisões importantes;
- manter nomes claros e coerentes;
- usar relações somente quando houver necessidade real;
- evitar duplicar informação;
- não congelar regras de produto ainda pendentes;
- não exigir `jobId` como base estrutural enquanto vaga x área/subárea estiver aberta;
- preservar possibilidade de evolução;
- revisar impacto antes de alterar entidades já integradas.

---

# 3. Referências obrigatórias

Consultar antes de modelar:

- escopo atual da entrega;
- regras de autenticação e perfis;
- mapa de telas;
- plano operacional do Back-end;
- contratos existentes;
- decisões de produto já aprovadas.

Quando houver conflito entre documentos, registrar a dúvida antes de modelar.

---

# 4. Ordem de modelagem

## 4.1 Autenticação e perfis

Priorizar conceitos como:

- `User`;
- `Role`;
- status da conta;
- perfil do candidato;
- avaliador;
- administrador;
- onboarding concluído, se necessário;
- campos necessários para autenticação.

Perguntas mínimas:

```text
Quem é o usuário?
Qual é sua role?
A conta está ativa?
O perfil está completo?
O onboarding foi concluído?
Como o usuário é identificado pela API?
```

---

## 4.2 Contexto de treinamento

Esta área permanece pendente de produto.

Hoje o contexto pode ser:

```text
vaga
OU
área/subárea
```

Enquanto não houver decisão:

- não estruturar o sistema inteiro em torno de `Job`;
- não exigir `jobId` em entidades centrais;
- não criar relações rígidas difíceis de remover;
- documentar alternativas;
- manter a modelagem evolutiva.

Essa pendência não deve bloquear auth, perfil ou entrevista base.

---

## 4.3 Entrevista

Modelar o mínimo necessário para:

- criar entrevista;
- associar candidato;
- associar contexto;
- registrar consentimento;
- associar perguntas;
- registrar respostas;
- acompanhar status;
- relacionar metadados de mídia;
- registrar datas importantes.

---

## 4.4 Avaliação e relatório

Modelar:

- atribuição;
- avaliador;
- avaliação;
- critérios;
- notas;
- feedback;
- status;
- relatório;
- liberação do resultado.

A avaliação humana permanece a regra principal.

---

## 4.5 Progresso / gamificação base

Somente depois dos fluxos centrais.

Modelar apenas o suficiente para representar progresso real da jornada.

Evitar nesta fase:

- sistema complexo de XP;
- conquistas avançadas;
- economia;
- árvore dinâmica sofisticada.

---

# 5. Como propor uma entidade

Para cada entidade nova, registrar:

```text
Nome:
Domínio:
Objetivo:
Fluxo que depende dela:
Campos:
Campos obrigatórios:
Campos opcionais:
Chave primária:
Relações:
Enums:
Índices necessários:
Regras de unicidade:
Riscos:
Pendências:
```

---

# 6. Como propor um campo

Antes de adicionar um campo, responder:

- qual regra de produto ele representa?
- quem grava esse dado?
- quem lê esse dado?
- ele é obrigatório?
- pode mudar?
- precisa ser indexado?
- pode ser derivado em vez de persistido?
- contém informação sensível?
- pertence realmente a essa entidade?

Evitar campos genéricos sem significado claro.

---

# 7. Relações

Ao criar relação:

- definir cardinalidade;
- justificar necessidade;
- definir comportamento de exclusão;
- avaliar se a relação pode ficar pendente;
- evitar cascatas perigosas;
- revisar impacto em migrations.

Exemplo:

```text
User 1 — 0..1 CandidateProfile
Interview N — 1 Candidate
Evaluation N — 1 Interview
Assignment N — 1 Evaluator
```

A estrutura final deve ser validada pela equipe, não assumida automaticamente.

---

# 8. Enums

Usar enums quando houver conjunto realmente controlado de valores.

Exemplos possíveis:

```text
Role
AccountStatus
InterviewStatus
EvaluationStatus
```

Evitar enum para valor que provavelmente mudará com frequência ou poderá virar entidade própria.

---

# 9. Dados derivados

Perguntar sempre:

> Esse dado precisa ser persistido ou pode ser calculado?

Evitar duplicar:

- contagens;
- percentuais;
- status derivados;
- informações calculáveis a partir de outras entidades;

quando a persistência não for necessária.

---

# 10. Vídeos e persistência de mídia

A modelagem definitiva de mídia ainda depende de uma decisão técnica da equipe Back-end.

Nesta fase, **não tratar como decisão fechada**:

- onde o arquivo de vídeo será armazenado;
- qual serviço/provider será utilizado;
- se haverá object storage, serviço especializado de mídia ou outra solução;
- se o upload será direto ou intermediado pela API;
- quais referências de acesso serão persistidas;
- como funcionarão retenção, exclusão e controle de acesso.

Como hipótese inicial para análise, a equipe deve avaliar uma arquitetura em que o banco relacional concentre dados estruturados e metadados, enquanto o arquivo de mídia seja persistido em uma solução apropriada para esse tipo de conteúdo.

Essa é uma **direção técnica a validar**, não uma regra definitiva.

A modelagem só deve ser consolidada depois que a equipe responder:

```text
Onde o arquivo será persistido?
Que dados precisam existir no PostgreSQL?
Como a mídia será relacionada à entrevista?
Como será controlado o status do upload?
Como o avaliador autorizado terá acesso?
Como serão tratadas falhas, retry e exclusão?
```

Exemplos de dados que podem vir a ser necessários no banco, caso a arquitetura validada siga essa direção:

```text
id
reference / storageKey
duration
size
format
status
interviewId
questionId quando necessário
createdAt
```

Os nomes e campos finais devem depender da arquitetura aprovada.

A decisão de mídia não deve bloquear a modelagem de:

- usuário;
- role;
- perfil;
- autenticação;
- entrevista base;
- consentimento;
- migrations iniciais.

Por outro lado, ela deve estar resolvida antes de consolidar a modelagem definitiva do upload, persistência e reprodução do vídeo.

---

# 11. Prisma

Ao alterar o schema:

1. revisar entidade;
2. revisar relações;
3. validar nomes;
4. formatar schema;
5. gerar migration pequena;
6. testar em ambiente local;
7. revisar SQL gerado quando relevante;
8. atualizar seed se necessário;
9. documentar impacto.

---

# 12. O que não fazer

- não modelar tudo de uma vez;
- não criar entidade sem fluxo real;
- não usar JSON genérico para evitar modelagem sem justificativa;
- não congelar a estratégia de persistência de vídeo antes da validação técnica;
- não apagar migration compartilhada;
- não alterar banco manualmente e esquecer o Prisma;
- não criar dependência rígida de vaga enquanto a decisão estiver aberta;
- não criar campos definitivos de mídia/storage enquanto a arquitetura de vídeo estiver pendente;
- não fazer migration gigante;
- não introduzir dados sensíveis sem necessidade;
- não misturar refatoração e nova feature na mesma mudança.

---

# 13. Como registrar decisões ainda pendentes

Quando a modelagem depender de uma decisão de produto ou arquitetura que ainda não foi fechada, não completar a lacuna por preferência técnica.

Registrar:

```text
DECISÃO PENDENTE

Tema:
Regra/necessidade já definida:
O que ainda precisa ser decidido:
Alternativa A:
Alternativa B:
Impacto no schema:
Impacto nas migrations:
Impacto nos contratos:
Fluxos bloqueados:
Fluxos que podem continuar:
Recomendação técnica:
Nível de confiança:
```

Exemplos atuais de pendência:

```text
vaga x área/subárea
mídia / storage de vídeo
estratégia final de upload e acesso
```

A recomendação da equipe é importante, mas só deve virar padrão oficial depois da validação correspondente.

---

# 14. Entrega esperada

Para cada bloco modelado:

```text
Domínio:
Entidades:
Relações:
Enums:
Regras:
Pendências:
Riscos:
Migration prevista:
Fluxos desbloqueados:
```

Quando houver dúvida:

```text
DECISÃO PENDENTE
Motivo:
Alternativa A:
Alternativa B:
Impacto de cada uma:
```

---

# 15. Checklist

```text
[ ] Regra de produto está clara
[ ] Entidades têm objetivo definido
[ ] Campos possuem justificativa
[ ] Relações foram revisadas
[ ] Não congelei decisão pendente
[ ] Não criei complexidade futura sem necessidade
[ ] Prisma está coerente
[ ] Migration é pequena
[ ] Banco local foi testado
[ ] Riscos foram registrados
[ ] Fluxos desbloqueados foram identificados
```

---

# 16. Resultado esperado

A modelagem deve permitir que o Back-end evolua por fluxo sem exigir reestruturações grandes a cada nova integração.

> **Modelar bem nesta fase significa modelar o necessário, com clareza e margem para evolução.**
