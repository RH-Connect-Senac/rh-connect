# Guia Operacional — Validação do Mapa de Rotas

## RH Connect — Pré-Migração Estrutural

**Objetivo:** orientar a equipe Front-end responsável pela validação do mapa de rotas e da navegação proposta do RH Connect antes da implementação estrutural com React Router.

---

# 1. Objetivo desta atividade

Esta atividade existe para validar se as rotas propostas no mapa de telas representam corretamente:

- as telas que realmente existem;
- o papel de cada perfil;
- a sequência real de navegação;
- os estados do fluxo;
- as necessidades de autenticação e autorização;
- os parâmetros necessários;
- as prioridades da entrega;
- as decisões de produto já aprovadas;
- as pendências que ainda não podem ser consolidadas.

O objetivo desta frente **não é implementar rotas**.

A equipe deve analisar e devolver um parecer estruturado sobre a proposta existente.

A implementação das rotas reais deve acontecer somente depois da consolidação desta validação e do checkpoint da Pré-Migração Estrutural.

---

# 2. O que esta atividade NÃO é

Durante esta tarefa, não deve ser feito:

- instalar ou configurar React Router;
- alterar `App.tsx` para criar navegação real;
- substituir `setScreen`, `onNavigate`, `screenMap` ou mecanismos equivalentes;
- mover páginas para novas pastas;
- criar `ProtectedRoute`;
- criar `RoleGuard`;
- implementar autenticação;
- criar autorização por perfil;
- renomear telas diretamente no código;
- remover telas;
- consolidar rotas pendentes de produto;
- alterar o Back-end;
- decidir sozinho a arquitetura definitiva de navegação.

A responsabilidade da equipe é:

```text
OBSERVAR
+
COMPARAR
+
VALIDAR
+
QUESTIONAR
+
DOCUMENTAR
+
RECOMENDAR
```

---

# 3. Referências obrigatórias

Antes de iniciar, consultar:

```text
1. docs/front-end/mapa-de-telas-front-end.md
2. aplicação atual em apps/web
3. plano operacional da Pré-Migração Estrutural
4. plano de migração do App.tsx
5. escopo da entrega de 10/09
6. regras de autenticação e acesso, quando necessário
```

O mapa de telas é a referência principal desta atividade.

As rotas presentes nele são **propostas para validação**, não decisões automaticamente definitivas.

---

# 4. Preparação do ambiente

Antes de analisar as rotas:

## 4.1 Atualizar a base

```bash
git checkout main
git pull origin main
```

## 4.2 Instalar dependências

```bash
pnpm install
```

## 4.3 Rodar o Front-end

Na raiz:

```bash
pnpm run dev:web
```

Ou dentro de `apps/web`:

```bash
pnpm run dev
```

## 4.4 Confirmar o estado atual

Verificar:

- a aplicação abre;
- as telas principais estão acessíveis;
- a navegação simulada funciona;
- Candidato, Avaliador e Admin podem ser percorridos na base atual;
- não existe erro crítico impedindo a análise.

---

# 5. Método oficial de validação

Para cada tela/rota proposta:

```text
1. Localizar a entrada no mapa de telas
↓
2. Localizar a tela correspondente no produto
↓
3. Identificar de onde o usuário chega nela
↓
4. Identificar para onde ele vai depois
↓
5. Verificar o perfil responsável
↓
6. Verificar autenticação/autorização
↓
7. Analisar a URL proposta
↓
8. Verificar parâmetros necessários
↓
9. Avaliar se precisa ser uma rota própria
↓
10. Verificar prioridade
↓
11. Registrar pendências
↓
12. Recomendar aprovação, ajuste, remoção ou investigação
```

---

# 6. O que deve ser analisado em cada rota

## 6.1 Existência real da tela

Perguntas:

- a tela realmente existe na aplicação atual?
- está completa, parcial, simulada ou apenas visual?
- o nome usado no mapa corresponde ao que aparece no produto?
- existe mais de uma tela representando a mesma função?

---

## 6.2 URL proposta

Perguntas:

- a URL é fácil de entender?
- representa o domínio correto?
- está no namespace do perfil certo?
- está consistente com rotas semelhantes?
- contém termos desnecessariamente técnicos?
- possui nome que pode ficar obsoleto após decisões de produto?

Exemplo:

```text
/candidate/dashboard
```

é mais coerente com o perfil do que uma rota genérica como:

```text
/dashboard
```

quando o sistema possui múltiplos dashboards.

---

# 7. Validar se a tela realmente precisa de uma rota própria

Nem todo estado visual precisa necessariamente virar URL.

A equipe deve questionar isso.

Exemplo de fluxo atual proposto:

```text
/candidate/interviews/new/consent
/candidate/interviews/new/preparation
/candidate/interviews/new/answers
/candidate/interviews/new/review
```

A análise deve responder:

- cada etapa precisa ser acessável por URL própria?
- recarregar a página no meio da etapa deve ser suportado?
- o usuário pode voltar diretamente para aquela etapa?
- a etapa possui estado persistente suficiente?
- algumas dessas telas seriam melhores como passos internos de `/candidate/interviews/new`?

Não alterar a proposta diretamente.

Registrar a recomendação.

---

# 8. Parâmetros de rota

Verificar rotas com parâmetros como:

```text
:id
```

Perguntas:

- qual entidade o `:id` representa?
- entrevista?
- avaliação?
- relatório?
- candidato?
- o parâmetro realmente é necessário?
- a página precisa carregar um registro específico?
- existe risco de ambiguidade?

Exemplo:

```text
/candidate/reports/:id
```

Registrar se o `:id` deveria representar:

```text
reportId
```

conceitualmente, mesmo que a URL continue usando `:id`.

---

# 9. Autenticação e autorização

Para cada rota, registrar:

```text
Pública
OU
Protegida
```

Quando protegida:

```text
Role autorizada:
- Candidate
- Evaluator
- Admin
```

Perguntas:

- usuário não autenticado poderia acessar?
- um candidato poderia acessar URL de avaliador?
- um avaliador poderia acessar Admin?
- uma rota pública está corretamente fora dos namespaces privados?
- existe rota pós-login que deveria exigir onboarding concluído?

Não implementar guardas nesta atividade.

Apenas documentar a regra esperada.

---

# 10. Origem e destino da navegação

Uma rota não deve ser analisada isoladamente.

Para cada item, identificar:

```text
ORIGEM
→ ROTA ANALISADA
→ DESTINO
```

Exemplo:

```text
Dashboard do Candidato
→ /candidate/interviews/new
→ Consentimento
```

Perguntas:

- existe botão/link que leva até a rota?
- o nome do botão corresponde ao destino?
- ao concluir a ação, qual deveria ser a próxima rota?
- existe retorno claro?
- o usuário pode ficar preso na tela?
- há navegação simulada que não corresponde ao mapa?

---

# 11. Prioridade P0, P1, P2 e P3

Usar a classificação do mapa.

## P0 — Caminho crítico

Rota necessária para o fluxo principal da entrega.

## P1 — Suporte essencial

Importante para sustentar o caminho principal.

## P2 — Importante, mas não bloqueante

Pode entrar depois das rotas críticas.

## P3 — Futuro / fora do recorte obrigatório

Não deve consumir esforço estrutural prioritário.

A equipe deve avaliar se a prioridade atual faz sentido.

Se discordar:

```text
Prioridade atual:
Prioridade sugerida:
Justificativa:
```

Não alterar prioridade sem registrar motivo.

---

# 12. Áreas que exigem atenção especial

## 12.1 Vaga como contexto da entrevista

As rotas independentes de gerenciamento de vagas foram removidas da primeira entrega. A vaga permanece como contexto informado no inicio da Nova entrevista.

Rotas removidas:

```text
/candidate/jobs
/candidate/jobs/new
/candidate/jobs/:id
```

Regra:

> Nao recriar essas rotas sem nova decisao de produto.

Classificação recomendada:

```text
REMOVIDA DA PRIMEIRA ENTREGA
```

---

## 12.2 Fluxo de entrevista

Validar especialmente:

```text
/candidate/interviews/new
/candidate/interviews/new/preparation
/candidate/interviews/new/consent
/candidate/interviews/new/answers
/candidate/interviews/new/review
/candidate/interviews/:id/status
```

Perguntas principais:

- fluxo está em ordem?
- alguma etapa está faltando?
- alguma etapa não precisa de rota própria?
- `new` continua fazendo sentido depois que a entrevista é criada?
- em qual momento passa a existir um `interviewId`?
- revisão ocorre antes ou depois da criação formal do registro?
- status usa corretamente o ID da entrevista?

Registrar dúvidas técnicas para consolidação com Back-end quando necessário.

---

## 12.3 Avaliação

Validar:

```text
/evaluator/evaluations
/evaluator/evaluations/:id
/evaluator/evaluations/:id/review
```

Verificar:

- `:id` representa avaliação, entrevista ou assignment?
- fila e “em andamento” precisam de rotas diferentes?
- histórico deveria ser uma rota ou filtro?
- revisão precisa ser rota própria ou estado da avaliação?

---

## 12.4 Administração

Validar principalmente:

```text
/admin/evaluators
/admin/interviews
/admin/assignments
/admin/questions
/admin/criteria
```

Perguntas:

- essas rotas representam entidades distintas?
- telas de formulário precisam de `/new`?
- detalhes precisam de `/:id`?
- alguma tela poderia ser modal em vez de rota?
- o recorte de 10/09 realmente exige a rota?

---

# 13. Identificação de rotas redundantes

Procurar casos em que duas rotas:

- representam a mesma tela;
- representam apenas filtros diferentes;
- poderiam ser um único recurso com estado interno;
- possuem nomes diferentes para o mesmo conceito.

Exemplo hipotético:

```text
/evaluator/evaluations
/evaluator/evaluations/active
```

Perguntar:

> “Active” é uma página diferente ou apenas um filtro da fila?

Registrar a conclusão, sem implementar mudança.

---

# 14. Identificação de rotas faltantes

Ao percorrer o produto, registrar quando:

- existe uma tela importante sem rota proposta;
- existe destino de botão sem correspondência no mapa;
- existe detalhe de entidade sem rota;
- existe fluxo que termina sem destino;
- existe página pública relevante não mapeada.

Formato:

```text
Tela:
Onde aparece:
Rota sugerida:
Motivo:
Prioridade sugerida:
Dependências:
```

---

# 15. Formato obrigatório de análise por rota

Usar o seguinte modelo:

```text
Tela:

Rota proposta:

Perfil:

Status atual da tela:

Prioridade atual:
[ ] P0
[ ] P1
[ ] P2
[ ] P3
[ ] Pendente

Tipo de acesso:
[ ] Pública
[ ] Protegida

Role autorizada:

Origem da navegação:

Destino seguinte:

Parâmetros existentes:

Parâmetros necessários:

Precisa de :id?
[ ] Sim
[ ] Não
[ ] Pendente

Precisa ser rota própria?
[ ] Sim
[ ] Não
[ ] Pendente

A URL atual faz sentido?
[ ] Sim
[ ] Precisa ajuste
[ ] Pendente

Possui dependência de produto?
[ ] Não
[ ] Sim — descrever

Possui dependência de Back-end?
[ ] Não
[ ] Sim — descrever

Inconsistências encontradas:

Riscos:

Recomendação:
[ ] Aprovar
[ ] Ajustar
[ ] Remover da proposta
[ ] Adiar
[ ] Investigar mais
[ ] Pendente de produto

Rota alternativa, se houver:

Justificativa:

Nível de confiança:
[ ] Alto
[ ] Médio
[ ] Baixo

Decisão oficial:
PENDENTE
```

---

# 16. Como escrever uma boa recomendação

## Ruim

```text
Essa rota está estranha.
```

## Bom

```text
Recomenda-se revisar `/evaluator/evaluations/active`, pois a tela aparenta representar apenas um subconjunto da fila de avaliações. Se não houver comportamento ou estado independente que justifique acesso direto, pode ser mais coerente tratá-la como filtro de `/evaluator/evaluations`.
```

A recomendação deve sempre explicar:

```text
O QUE
+
POR QUÊ
+
IMPACTO
```

---

# 17. Classificações permitidas

## Aprovar

A proposta parece coerente com tela, fluxo, perfil e prioridade.

## Ajustar

A rota é necessária, mas URL, parâmetro, prioridade ou posição no fluxo precisa ser revista.

## Remover da proposta

A tela não parece justificar rota própria ou não existe mais no fluxo válido.

## Adiar

A rota pode fazer sentido futuramente, mas não deve entrar na migração prioritária.

## Investigar mais

Não há informação suficiente para concluir.

## Pendente de produto

A decisão depende de definição funcional ainda aberta.

---

# 18. Teste manual da navegação atual

Mesmo sem rotas reais, percorrer os fluxos simulados.

Registrar:

- botão clicado;
- tela de origem;
- tela de destino;
- comportamento esperado;
- comportamento atual;
- inconsistência com o mapa, se houver.

Exemplo:

```text
Origem: Dashboard Candidato
Ação: Iniciar entrevista
Destino atual: PrepScreen
Destino proposto no mapa: /candidate/interviews/new
Observação: validar se /new representa seleção de contexto antes do consentimento.
```

---

# 19. Divisão recomendada da análise

Se duas pessoas forem responsáveis por esta frente, dividir por domínio.

## Responsável A

```text
Público/Auth
+
Candidato
```

## Responsável B

```text
Avaliador
+
Administrador
```

Depois, ambos devem revisar juntos:

```text
- consistência geral dos namespaces;
- nomenclatura;
- parâmetros;
- guards esperados;
- prioridades;
- rotas pendentes.
```

Se apenas uma pessoa ficar responsável, seguir o mapa na ordem apresentada.

---

# 20. Entrega final

A entrega deve conter:

```text
1. Resumo executivo
2. Rotas analisadas
3. Rotas aprovadas sem ressalva
4. Rotas que precisam de ajuste
5. Rotas possivelmente redundantes
6. Rotas faltantes
7. Rotas que talvez não precisem existir
8. Rotas pendentes de produto
9. Dúvidas de autenticação/autorização
10. Dúvidas que dependem do Back-end
11. Recomendações
12. Checklist final
```

---

# 21. Estrutura sugerida do relatório

```markdown
# Validação do Mapa de Rotas — RH Connect

## Responsável

Nome:

## Escopo

...

## Resumo executivo

...

## Rotas públicas

...

## Candidato

...

## Avaliador

...

## Administrador

...

## Rotas aprovadas

...

## Rotas a ajustar

...

## Rotas redundantes ou questionáveis

...

## Rotas faltantes

...

## Pendências de produto

...

## Dependências com Back-end

...

## Recomendações finais

...

## Checklist

...
```

---

# 22. Checklist obrigatório antes da entrega

```text
[ ] Li o mapa de telas atualizado
[ ] Rodei a aplicação atual
[ ] Percorri os fluxos do meu escopo
[ ] Verifiquei tela por tela
[ ] Analisei origem e destino
[ ] Validei perfil
[ ] Validei pública/protegida
[ ] Registrei role esperada
[ ] Analisei parâmetros
[ ] Questionei se cada tela precisa de rota própria
[ ] Revisei prioridades
[ ] Identifiquei rotas faltantes
[ ] Identifiquei possíveis redundâncias
[ ] Marquei pendências de produto
[ ] Registrei dependências de Back-end
[ ] Não implementei React Router
[ ] Não alterei navegação estrutural
[ ] Não refatorei App.tsx
[ ] Minhas recomendações possuem justificativa
[ ] Mantive decisões oficiais como PENDENTES
```

---

# 23. Critérios para considerar a análise bem executada

A validação é considerada boa quando:

- cobre o fluxo, e não apenas nomes de URL;
- considera autenticação e perfil;
- analisa parâmetros;
- questiona rotas desnecessárias;
- identifica lacunas;
- diferencia tela de estado interno;
- respeita decisões pendentes;
- registra evidências;
- não antecipa implementação;
- produz recomendações claras e justificadas.

---

# 24. O que acontece depois

Depois da entrega:

```text
MAPA DE TELAS ATUAL
+
VALIDAÇÃO DA EQUIPE
↓
CONSOLIDAÇÃO DAS RECOMENDAÇÕES
↓
AJUSTE DO MAPA, SE NECESSÁRIO
↓
APROVAÇÃO DA ESTRUTURA DE ROTAS
↓
CHECKPOINT DE PRÉ-MIGRAÇÃO
↓
IMPLEMENTAÇÃO ESTRUTURAL
```

Somente depois disso deve ocorrer:

```text
React Router
+
Pages
+
Layouts
+
Navegação real
+
Protected Routes
+
Role Guards
```

A implementação de autorização real também deve permanecer alinhada ao Back-end.

---

# 25. Resultado esperado

Ao final da atividade, o projeto deve conseguir responder com segurança:

```text
Quais rotas públicas existirão?
Quais rotas pertencem ao Candidato?
Quais pertencem ao Avaliador?
Quais pertencem ao Admin?
Quais exigem autenticação?
Quais roles acessam cada rota?
Quais precisam de :id?
Quais telas realmente precisam de URL própria?
Quais rotas são redundantes?
Quais estão faltando?
Quais são P0/P1/P2/P3?
Quais dependem de produto?
Quais dependem do Back-end?
Qual é a sequência principal de navegação?
```

A equipe não precisa implementar essas respostas nesta fase.

Ela deve produzir evidência suficiente para que a estrutura possa ser consolidada antes da migração.

---

# 26. Regra final

> **Validar o mapa de rotas não é criar as rotas. É garantir que a arquitetura de navegação esteja coerente antes que ela vire código.**
