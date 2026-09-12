# Guia Operacional — Migrations com Prisma

## RH Connect — Preparação para Primeira Integração

**Objetivo:** orientar a equipe Back-end na criação de migrations pequenas, rastreáveis e seguras durante a evolução do PostgreSQL + Prisma.

---

# 1. Princípio

Toda mudança estrutural relevante no banco deve estar refletida no Prisma e versionada por migration quando aplicável.

Evitar alterações manuais não rastreadas.

---

# 2. Antes de criar uma migration

Confirmar:

- regra de produto entendida;
- entidade revisada;
- campos revisados;
- relações revisadas;
- impacto conhecido;
- decisão não está pendente.

Não criar migration para congelar decisão ainda aberta, como:

```text
vaga x área/subárea
mídia/storage definitivo
```

---

# 3. Fluxo recomendado

```text
Atualizar schema.prisma
↓
Formatar
↓
Revisar diff
↓
Gerar migration
↓
Revisar migration
↓
Aplicar localmente
↓
Testar
↓
Commit
↓
PR
```

---

# 4. Tamanho das migrations

Preferir migrations pequenas e focadas.

Bom:

```text
add_user_role
create_candidate_profile
add_interview_status
```

Evitar uma única migration contendo muitos domínios diferentes.

---

# 5. Nomenclatura

Usar nomes curtos e descritivos.

Exemplos:

```text
create_users
add_account_status
create_candidate_profile
add_interview_status
create_evaluation_assignment
```

---

# 6. Revisão obrigatória

Antes do PR:

- verificar SQL gerado;
- revisar exclusões;
- revisar `NOT NULL`;
- revisar defaults;
- revisar índices;
- revisar foreign keys;
- revisar cascades;
- verificar risco de perda de dados.

---

# 7. Migrations já compartilhadas

Depois que uma migration estiver em branch compartilhada ou `main`:

- não apagar sem alinhamento;
- não reescrever histórico arbitrariamente;
- criar nova migration corretiva quando necessário.

---

# 8. Banco local

A equipe deve conseguir:

```text
subir banco
↓
aplicar migrations
↓
rodar API
↓
testar fluxo
```

A migration deve ser reproduzível por outra pessoa da equipe.

---

# 9. Seed

Usar seed somente para dados úteis ao desenvolvimento.

Exemplos:

- roles;
- usuários de desenvolvimento;
- critérios iniciais;
- dados mínimos para teste.

Evitar criar grande volume de dados fictícios sem necessidade.

---

# 10. Secrets

Nunca colocar credenciais reais em:

- `schema.prisma`;
- migration;
- seed;
- README;
- commit;
- PR.

Usar variáveis de ambiente.

---

# 11. O que não fazer

- não alterar banco manualmente sem refletir no Prisma;
- não apagar migration apenas porque houve erro;
- não misturar vários domínios numa mesma migration;
- não criar migration para decisão pendente;
- não executar mudança destrutiva sem revisar impacto;
- não commitar `.env`;
- não usar migration como lugar para regra de negócio.

---

# 12. O que informar no PR

```text
Migration:
Motivo:
Entidades afetadas:
Campos adicionados:
Campos removidos:
Relações alteradas:
Risco:
Como testar:
Seed alterado?:
Contrato impactado?:
```

---

# 13. Checklist

```text
[ ] schema revisado
[ ] migration pequena
[ ] nome claro
[ ] SQL revisado
[ ] banco local atualizado
[ ] API continua funcionando
[ ] riscos registrados
[ ] nenhum segredo incluído
[ ] PR explica como testar
```

---

# 14. Resultado esperado

> **Migration boa é pequena, compreensível, reproduzível e fácil de revisar.**
