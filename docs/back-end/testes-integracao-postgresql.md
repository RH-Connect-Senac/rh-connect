# Testes de integração com PostgreSQL real (R3.2.1-a)

Infraestrutura segura para testar, com PostgreSQL de verdade, a persistência
transacional de avaliações por IA (R3.2). **Esta etapa só prepara a infraestrutura:**
não cria banco nem usuário, não aplica migrations e não contém testes de persistência.

## Banco de integração

| Item | Valor (exato, não configurável) |
| --- | --- |
| Banco | `rhconnect_it` |
| Usuário | `rhconnect_it_user` |
| Host | `127.0.0.1` |
| Porta | `5432` |
| Variável | `INTEGRATION_DATABASE_URL` |

O banco de desenvolvimento nunca é usado. Não existe fallback para `DATABASE_URL`
nem para o `.env`: os scripts carregam **apenas** `apps/api/.env.integration`
(ignorado pelo Git pelo padrão `.env.*`).

## Guarda de segurança

Código em `apps/api/test/integration/support/integration-db-guard.ts`. Roda antes de
qualquer migration ou teste e recusa a execução quando:

- `NODE_ENV=production`;
- `INTEGRATION_DATABASE_URL` está ausente, vazia ou não é URL `postgresql://`;
- o host não é exatamente `127.0.0.1` (`localhost`, `::1`, outros IPs e hosts remotos são recusados);
- a porta não é `5432`; o banco não é `rhconnect_it`; o usuário não é `rhconnect_it_user`; falta senha;
- há parâmetros de query fora da lista permitida (`schema=public`, `connection_limit`, `pool_timeout`, `connect_timeout`, `sslmode`); parâmetros como `host`, `dbname`, `user` ou `options` poderiam redirecionar a conexão;
- a URL aponta para o mesmo banco da `DATABASE_URL` do ambiente ou de `apps/api/.env` (o `.env` é lido só para comparar e nunca é usado como origem da URL);
- o banco conectado não tem o **marcador de identidade** (abaixo).

Nenhuma mensagem de erro ou log contém a URL ou a senha; o objeto de configuração
também esconde a URL em `JSON.stringify`, `String()` e `util.inspect`.

## Identidade do banco (marcador)

Depois da validação da URL, a guarda abre a conexão e executa **uma única consulta de
leitura** (`SELECT`) que confirma `current_database() = rhconnect_it`,
`current_user = rhconnect_it_user` e que o `COMMENT` do banco é exatamente
`rh-connect:integration-test:v1`. Esse comentário é gravado **manualmente** na criação
do banco (procedimento abaixo). Um banco sem o marcador nunca é aceito, mesmo com URL correta.

## Permissões

O usuário `rhconnect_it_user` é `LOGIN`, sem superusuário, sem criar bancos/roles e
sem replicação, dono apenas de `rhconnect_it`. Por padrão o PostgreSQL concede
`CONNECT` a `PUBLIC` em todo banco, então ele poderia *conectar* ao banco de
desenvolvimento, mas sem nenhum privilégio sobre as tabelas de outro dono. Endurecimento
opcional (veja o procedimento): revogar o `CONNECT` público do banco de
desenvolvimento ou recusar o par usuário/banco no `pg_hba.conf`.

## Scripts (em `apps/api`)

| Script | O que faz |
| --- | --- |
| `test:integration:guard` | Testes unitários da guarda, do isolamento do Prisma e da montagem do comando de migration. Sem banco, sem variáveis. |
| `db:integration:check` | Valida a URL e confirma a identidade do banco (somente leitura). |
| `db:integration:migrate` | Prova o alvo no Prisma (`migrate status`) e aplica as migrations versionadas **somente** no banco de integração (exige `--confirm-database=rhconnect_it`). |
| `db:integration:prisma-check` | Diagnóstico somente de leitura: valida a identidade do banco e roda **apenas** `prisma migrate status` com a configuração isolada, conferindo o destino que o Prisma informa (`rhconnect_it`, `public`, `127.0.0.1:5432`). Não aplica nada. |
| `test:integration` | Roda `*.int-spec.ts` em série, depois de validar a URL e a identidade (somente leitura). |
| `test:integration:persistence` | Suíte de persistência da R3.2.1-b (**escreve** no banco de integração; só `*.persist-spec.ts`). Ver `testes-integracao-persistencia-avaliacao-ia.md`. |

Todos que usam banco começam com `dotenv -e .env.integration`. Se o arquivo não
existir, `INTEGRATION_DATABASE_URL` fica ausente e a guarda interrompe tudo.

## Proteção das migrations

Incidente (corrigido): uma execução de `db:integration:migrate` passou pela guarda,
mas o Prisma aplicou/verificou migrations no banco de **desenvolvimento**. Causa: o
processo filho recebia `DOTENV_CONFIG_OVERRIDE=false` (um *texto*); o `dotenv`
converte qualquer texto não vazio em `true`, e o `import "dotenv/config"` do
`prisma.config.ts` de desenvolvimento passava a sobrescrever `DATABASE_URL` com o
`.env` de desenvolvimento. A guarda validava a URL, mas não era ela que o Prisma lia.

Proteção atual (em camadas; qualquer falha interrompe antes da camada seguinte):

1. `--confirm-database=rhconnect_it` obrigatório.
2. Guarda de ambiente (`INTEGRATION_DATABASE_URL`, host, banco, usuário, não igual ao dev).
3. Identidade do banco por consulta de leitura (nome, usuário e marcador).
4. **Configuração Prisma isolada**: o CLI roda com
   `--config test/integration/prisma.integration.config.ts`, que não usa `dotenv`,
   não usa `env("DATABASE_URL")` e entrega ao Prisma somente a URL validada. O
   `prisma.config.ts` de desenvolvimento nunca é carregado nesse fluxo. Se
   `DATABASE_URL` apontar para outro banco, a configuração recusa
   (`PRISMA_TARGET_MISMATCH`).
5. **Ambiente saneado** do processo do Prisma: sem `DOTENV_*`, `NODE_OPTIONS`,
   `DIRECT_URL`, `SHADOW_DATABASE_URL`, `PG*`; `DATABASE_URL` e
   `INTEGRATION_DATABASE_URL` = URL de integração. O cwd é `test/integration`
   (sem `.env`).
6. **Prova do alvo no processo real do Prisma**: antes do deploy roda
   `prisma migrate status` (somente leitura) e confere a linha
   `Datasource ... database "...", schema "..." at "host:porta"` que o próprio
   Prisma imprime. Só `rhconnect_it`, schema `public`, `127.0.0.1:5432` passa; qualquer
   outro alvo ou ausência da linha interrompe (`PRISMA_TARGET_MISMATCH` /
   `PRISMA_TARGET_UNPROVEN`). A saída do `deploy` é conferida de novo.
7. Após o deploy, verificação de leitura em `_prisma_migrations`: todas as migrations
   versionadas precisam constar como concluídas (`MIGRATION_RESULT_UNPROVEN`).

Demais regras:

- Só existem `prisma migrate status` e `prisma migrate deploy` (aplica o que já está versionado). Não há `migrate reset`, `migrate dev`, `db push`, truncamento nem limpeza geral; testes automáticos garantem isso.
- A saída do Prisma repassada ao terminal tem URLs de conexão redigidas.
- O Jest **nunca** aplica migrations automaticamente.

Os testes `prisma-isolation.guard-spec.ts` reproduzem a falha com `dotenv` real e um
`.env` de desenvolvimento, e carregam a configuração Prisma de integração de verdade
(processos filhos), sem banco.

## Procedimento futuro (manual) para criar banco e usuário

Execute só quando for homologar, como administrador do PostgreSQL. Não há automação.
No CMD:

```
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

No prompt do `psql` (a senha é digitada no prompt; não a coloque em arquivos nem em comandos):

```sql
CREATE ROLE rhconnect_it_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
\password rhconnect_it_user
CREATE DATABASE rhconnect_it OWNER rhconnect_it_user ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE rhconnect_it FROM PUBLIC;
GRANT CONNECT ON DATABASE rhconnect_it TO rhconnect_it_user;
COMMENT ON DATABASE rhconnect_it IS 'rh-connect:integration-test:v1';
```

Conferências de leitura:

```sql
SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname = 'rhconnect_it';
SELECT datname, has_database_privilege('rhconnect_it_user', datname, 'CONNECT') FROM pg_database WHERE NOT datistemplate;
```

Opcional (endurecimento): impedir o usuário de integração de conectar ao banco de
desenvolvimento, via linha `host <banco_dev> rhconnect_it_user 127.0.0.1/32 reject` no
`pg_hba.conf`, **antes** das demais regras (requer recarregar a configuração). Evite
`REVOKE CONNECT ... FROM PUBLIC` no banco de desenvolvimento sem antes dar `CONNECT`
explícito aos papéis que o usam.

## Configuração e execução no Windows CMD

```
cd C:\Users\LUKAS\Repos\rh-connect\apps\api
copy test\integration\integration.env.example .env.integration
notepad .env.integration
git check-ignore -v .env.integration
pnpm run test:integration:guard
pnpm run db:integration:check
pnpm run db:integration:migrate -- --confirm-database=rhconnect_it
pnpm run test:integration
```

Substitua o marcador de senha no `.env.integration` (use codificação percentual para
caracteres especiais). Os dois últimos comandos só fazem sentido depois que o banco
for criado.

## Códigos da guarda

`PRODUCTION_ENV`, `MISSING_URL`, `INVALID_URL`, `INVALID_PROTOCOL`, `INVALID_HOST`,
`INVALID_PORT`, `INVALID_DATABASE`, `INVALID_USER`, `MISSING_PASSWORD`,
`UNSUPPORTED_PARAMETER`, `SAME_AS_DEVELOPMENT`, `DEV_ENV_UNREADABLE`,
`IDENTITY_CHECK_FAILED`, `IDENTITY_MISMATCH`, `MARKER_MISSING`,
`PRISMA_TARGET_MISMATCH`, `PRISMA_TARGET_UNPROVEN`, `MIGRATION_RESULT_UNPROVEN`,
`CONFLICTING_DATABASE_URL`.

## Reexecução segura das migrations (após homologar esta correção)

1. `pnpm run test:integration:guard` (sem banco) deve passar por completo.
2. `pnpm run db:integration:check` e `pnpm run db:integration:prisma-check` (somente leitura) devem confirmar `rhconnect_it` e o destino do Prisma.
3. `pnpm run db:integration:migrate -- --confirm-database=rhconnect_it`.
   Esperado: "Alvo do Prisma comprovado: rhconnect_it em 127.0.0.1:5432" **antes** de
   "Aplicando migrations versionadas..." e, no fim, "Migrations conferidas". Se
   aparecer qualquer outro banco ou um código `PRISMA_*`, nada foi aplicado: pare e
   investigue.
4. Confirme com `psql` conectado a `rhconnect_it` que as tabelas existem e que o banco
   de desenvolvimento não mudou.

## Fora do escopo desta etapa

Criação do banco/usuário, execução de migrations, fixtures, limpeza de dados e os
testes reais de persistência, rollback, concorrência, Decimal(3,1), JSONB e timeouts
(R3.2.1-b em diante).
