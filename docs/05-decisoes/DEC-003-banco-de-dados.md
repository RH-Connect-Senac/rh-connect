# DEC-003 — Banco de Dados

**Status:** Aprovado
**Data:** 11/10/2026
**Versão:** 1.0
**Escopo:** V1 do RH Connect

---

## 1. Contexto

O `AGENTS.md` (seção 16.3) listava MySQL como banco "adotado provisoriamente", pendente de decisão posterior para confirmar ou substituir.

Uma auditoria do repositório (código + documentação) identificou que o Back-end já está implementado sobre PostgreSQL via Prisma, com schema, modelos e migrations reais:

- `apps/api/prisma/schema.prisma` declara `provider = "postgresql"`;
- `apps/api/.env.example` usa `DATABASE_URL` no formato de conexão PostgreSQL;
- os guias operacionais em `docs/back-end/guia-operacional-modelagem-banco-back-end.md` e `docs/back-end/guia-operacional-migrations-prisma-back-end.md` já orientam modelagem e migrations com PostgreSQL + Prisma.

Não havia, até este documento, um registro formal (ADR/DEC) amarrando essa escolha como decisão aprovada — apenas o fato já implementado no código.

---

## 2. Decisão

Fica confirmado:

- o banco de dados relacional do RH Connect é **PostgreSQL**;
- o acesso ao banco é feito via **Prisma** (`@prisma/client` + `prisma`, versão 6.18.0 no momento deste registro);
- migrations devem seguir o fluxo já documentado em `docs/back-end/guia-operacional-migrations-prisma-back-end.md`.

---

## 3. Alternativas consideradas

### 3.1. MySQL

Era a opção listada como provisória no `AGENTS.md` §16.3, por familiaridade da equipe.

**Não adotado.** A implementação real já seguiu PostgreSQL antes de este documento existir; manter MySQL como referência oficial estava desatualizado em relação ao código.

---

## 4. Justificativa

1. **Aderência ao que já está implementado** — o schema, as migrations e os guias operacionais do Back-end já assumem PostgreSQL; registrar a decisão formaliza o que já é fato.
2. **Recursos relacionais necessários ao domínio** — perfis, relações entre candidato/avaliador/entrevista e consultas administrativas se beneficiam de um banco relacional maduro.
3. **Ecossistema Prisma** — PostgreSQL tem suporte de primeira classe no Prisma, incluindo os recursos usados pelo schema atual.

---

## 5. Consequências

- `AGENTS.md` §16.3 passa a declarar PostgreSQL como banco adotado (não mais "provisório").
- Qualquer proposta de trocar o banco exige uma nova decisão registrada, substituindo este documento.
- Os guias operacionais de back-end (`docs/back-end/`) continuam sendo a referência de modelagem e migrations.

---

## 6. Critério para revisão futura

Esta decisão poderá ser revista caso surjam requisitos que o PostgreSQL não atenda de forma razoável (ex.: necessidade de um modelo de dados não relacional para um subdomínio específico, como armazenamento de mídia — tratado separadamente em `DEC-004`).

---

**Fim do documento.**
