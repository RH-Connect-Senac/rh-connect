# Back-end — RH Connect

Esta pasta concentra a documentação técnica e operacional do Back-end do RH Connect.

O objetivo é orientar a equipe durante a preparação da API, modelagem, banco de dados, autenticação, contratos e primeiras integrações com o Front-end.

---

## Estado atual

O Back-end está na fase de:

> **Preparação para primeira integração**

O foco atual é:

- estruturar e validar `apps/api`;
- confirmar e documentar a stack;
- trabalhar com PostgreSQL + Prisma;
- desenvolver a modelagem mínima necessária;
- criar migrations;
- implementar autenticação e roles;
- definir contratos de API;
- preparar o primeiro endpoint integrável.

O Back-end não precisa estar completamente pronto antes de começar a integração com o Front-end.

---

## Documentos

### Plano operacional

- [Plano Operacional Back-end — Preparação para Integração](./plano-operacional-back-end-preparacao-integracao.md)

Documento principal da fase atual. Organiza a sequência de preparação do Back-end, checkpoints e ordem das futuras integrações.

### Guias operacionais

- [Guia Operacional — Modelagem de Banco](./guia-operacional-modelagem-banco-back-end.md)
- [Guia Operacional — Contratos de API](./guia-operacional-contratos-api-back-end.md)
- [Guia Operacional — Migrations com Prisma](./guia-operacional-migrations-prisma-back-end.md)
- [Guia Operacional — Autenticação e Autorização](./guia-operacional-autenticacao-autorizacao-back-end.md)

Os guias explicam como executar as principais frentes da fase atual.

---

## Fluxo atual

```text
PREPARAÇÃO DO BACK-END
↓
apps/api
↓
confirmação da stack
↓
PostgreSQL + Prisma
↓
modelagem mínima
↓
migrations
↓
Auth / roles
↓
contrato de autenticação
↓
primeiro endpoint
↓
CHECKPOINT DE PRIMEIRA INTEGRAÇÃO