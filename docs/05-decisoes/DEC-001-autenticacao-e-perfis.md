# DEC-001 — Autenticação e Perfis de Acesso

**Status:** Aprovado  
**Data:** 11/08/2026  
**Versão:** 1.0  
**Escopo:** V1 do RH Connect

---

## 1. Contexto

O RH Connect possui três perfis principais na V1:

- Candidato;
- Avaliador;
- Administrador.

Durante a evolução do protótipo para produto, tornou-se necessário definir uma regra única e explícita para:

- criação de contas;
- autenticação;
- ativação de usuários;
- recuperação de senha;
- redirecionamento por perfil;
- autorização de acesso.

A decisão precisava evitar cadastro indevido de perfis internos, reduzir complexidade desnecessária na V1 e garantir coerência com a Matriz de Permissões e com a arquitetura futura do sistema.

---

## 2. Decisão

Fica definido que:

### 2.1. Candidato

- possui cadastro público;
- a conta é criada com role `CANDIDATE`;
- deve realizar verificação de e-mail;
- utiliza o login único do RH Connect;
- possui recuperação de senha;
- realiza onboarding completo no primeiro acesso.

### 2.2. Avaliador

- não possui cadastro público;
- é criado/convidado por processo administrativo;
- recebe convite;
- define a própria senha;
- a conta é criada com role `EVALUATOR`;
- utiliza o login único do RH Connect;
- possui recuperação de senha;
- realiza onboarding operacional curto.

### 2.3. Administrador

- não possui cadastro público;
- é criado por provisionamento técnico/controlado;
- a conta é criada com role `ADMIN`;
- utiliza o login único do RH Connect;
- possui recuperação de senha;
- recebe apenas introdução operacional curta ou opcional;
- não poderá criar outros Administradores pela interface na V1.

### 2.4. Login

Será utilizado um único ponto de autenticação:

```text
/login
```

Após autenticação, o sistema identifica a role e direciona o usuário para o ambiente correspondente.

```text
CANDIDATE
→ /candidate/dashboard

EVALUATOR
→ /evaluator/dashboard

ADMIN
→ /admin/dashboard
```

### 2.5. Autorização

O controle de acesso deverá ser feito por role e permissões reais do sistema.

Não será considerado suficiente apenas ocultar itens da interface.

### 2.6. Troca de perfil

O usuário não poderá alterar sua própria role.

### 2.7. Recuperação de senha

Os três perfis utilizarão o mesmo fluxo geral de recuperação de senha.

A recuperação não deverá:

- revelar o tipo de conta;
- alterar a role;
- reativar automaticamente contas bloqueadas ou inativas.

### 2.8. Administração avançada

Não será implementado `SUPER_ADMIN` na V1.

Também não será implementada, nesta versão, criação normal de novos Administradores por outro Administrador na interface.

---

## 3. Justificativa

Esta decisão foi adotada pelos seguintes motivos:

1. **Menor privilégio**  
   Cada usuário recebe apenas o nível de acesso necessário à sua função.

2. **Controle de perfis internos**  
   Avaliadores e Administradores não devem poder se registrar livremente.

3. **Simplicidade da V1**  
   Evita introduzir `SUPER_ADMIN`, hierarquias administrativas adicionais e fluxos complexos antes de existir necessidade real.

4. **Segurança operacional**  
   Contas administrativas permanecem sob provisionamento controlado.

5. **Experiência consistente**  
   Um único login reduz duplicação e simplifica a experiência de acesso.

6. **Separação entre autenticação e autorização**  
   O sistema primeiro identifica o usuário e depois aplica as permissões correspondentes.

7. **Escalabilidade futura**  
   A decisão permite adicionar controles mais avançados futuramente sem reconstruir todo o modelo de acesso.

---

## 4. Consequências

### Consequências positivas

- reduz risco de criação indevida de contas privilegiadas;
- simplifica o fluxo de autenticação;
- reduz duplicação de telas;
- facilita proteção de rotas;
- cria uma base clara para Backend e Front-end;
- facilita testes por perfil;
- mantém a V1 mais simples.

### Consequências técnicas

A implementação deverá prever:

- roles `CANDIDATE`, `EVALUATOR` e `ADMIN`;
- estados de conta;
- autenticação única;
- autorização por role;
- proteção de rotas;
- fluxo de convite para Avaliador;
- provisionamento controlado de Admin;
- recuperação de senha comum aos três perfis.

---

## 5. Alternativas consideradas

### 5.1. Cadastro público para os três perfis

**Não adotado.**

Motivo:

permitiria criação indevida de contas internas e privilegiadas.

---

### 5.2. Um login diferente para cada perfil

Exemplo:

```text
/login-candidato
/login-avaliador
/login-admin
```

**Não adotado.**

Motivo:

aumentaria duplicação e complexidade sem necessidade funcional na V1.

---

### 5.3. Admin criar outro Admin pela interface

**Não adotado na V1.**

Motivo:

é uma ação crítica e não é necessária para o primeiro escopo.

---

### 5.4. Criar `SUPER_ADMIN`

**Não adotado na V1.**

Motivo:

introduziria complexidade prematura de permissões administrativas.

Pode ser reavaliado futuramente caso surja necessidade real.

---

## 6. Impacto no produto

Esta decisão afeta diretamente:

- cadastro;
- login;
- recuperação de senha;
- onboarding;
- dashboards;
- rotas;
- permissões;
- gestão de Avaliadores;
- criação de contas administrativas;
- arquitetura do Front-end;
- arquitetura do Backend;
- banco de dados;
- testes de autorização.

---

## 7. Impacto no Figma Make

A referência funcional/visual deverá representar:

### Candidato

```text
Cadastro
↓
Verificação de e-mail
↓
Login
↓
Onboarding
↓
Dashboard
```

### Avaliador

```text
Convite
↓
Definir senha
↓
Login
↓
Onboarding operacional
↓
Dashboard
```

### Admin

```text
Conta provisionada
↓
Login
↓
Introdução operacional
↓
Dashboard
```

Não é necessário que o Figma Make implemente a lógica técnica real de autenticação, tokens, banco ou envio de e-mails.

---

## 8. Impacto no repositório

Antes da implementação completa da autenticação, o repositório deverá ser preparado para suportar os três ambientes:

```text
candidate
evaluator
admin
```

A implementação deve evitar continuar expandindo apenas a navegação prototípica.

As roles e proteções deverão ser incorporadas à arquitetura real do sistema.

---

## 9. Relação com outros documentos

Esta decisão deve ser lida em conjunto com:

- `regras-de-autenticacao-e-acesso.md`;
- Plano Mestre de Implementação;
- Matriz de Permissões;
- Inventário e Especificação de Telas;
- PRD vigente;
- documentação futura de arquitetura de autenticação.

O documento detalhado de regras funcionais continua sendo:

```text
docs/01-produto-e-escopo/
regras-de-autenticacao-e-acesso.md
```

Este DEC apenas registra a decisão e sua justificativa.

---

## 10. Critério para revisão futura

Esta decisão poderá ser revista caso surja necessidade concreta de:

- múltiplos níveis administrativos;
- `SUPER_ADMIN`;
- criação de Admin por interface;
- MFA obrigatório;
- permissões administrativas mais granulares;
- RBAC mais avançado;
- login corporativo;
- autenticação externa;
- SSO.

Qualquer mudança relevante deverá gerar uma nova decisão ou atualização formal deste registro.

---

## 11. Resultado da decisão

Para a V1, o modelo oficial será:

```text
CANDIDATO
→ cadastro público

AVALIADOR
→ convite administrativo

ADMIN
→ provisionamento técnico/controlado

TODOS
→ login único
→ recuperação de senha
→ autorização por role
```

---

**Fim do documento.**
