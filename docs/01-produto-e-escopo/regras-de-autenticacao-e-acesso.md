# Regras de Autenticação e Acesso — RH Connect

**Versão:** 1.0  
**Data:** 11/08/2026  
**Status:** Aprovado para implementação  
**Escopo:** V1 do RH Connect

---

## 1. Objetivo

Este documento define as regras oficiais de:

- criação de contas;
- autenticação;
- ativação de usuários;
- recuperação de senha;
- autorização por perfil;
- primeiro acesso;
- onboarding;
- bloqueio e estados de conta.

O objetivo é garantir que Front-end, Backend, Design e documentação implementem o mesmo comportamento para os três perfis da V1:

- **Candidato**
- **Avaliador**
- **Administrador**

---

## 2. Princípios gerais

A autenticação do RH Connect deve seguir os seguintes princípios:

1. existir **um único login** para todos os perfis;
2. o usuário **não escolhe sua própria role**;
3. a role é definida pela forma como a conta foi criada;
4. apenas o Candidato possui cadastro público;
5. Avaliador entra por convite controlado;
6. Administrador entra por provisionamento técnico/controlado;
7. nenhum usuário pode transformar a própria conta em outro perfil;
8. autorização deve ser validada pelo sistema, e não apenas pela interface;
9. ações e áreas devem respeitar o princípio de menor privilégio;
10. contas bloqueadas, inativas ou ainda não ativadas não devem acessar áreas protegidas.

---

# 3. Perfis da V1

A V1 possui somente três perfis:

```text
CANDIDATE
EVALUATOR
ADMIN
```

Não será criado `SUPER_ADMIN` nesta versão.

Também não será implementado gerenciamento de novos Administradores pela interface na V1.

---

# 4. Cadastro e criação de contas

## 4.1. Candidato

O Candidato é o único perfil com **cadastro público**.

### Fluxo

```text
Landing / Login
↓
Criar conta
↓
Cadastro do Candidato
↓
Verificação de e-mail
↓
Conta ativada
↓
Primeiro acesso
↓
Onboarding
↓
Dashboard do Candidato
```

### Campos mínimos do cadastro

- nome completo;
- e-mail;
- senha;
- confirmação da senha;
- aceite dos Termos de Uso;
- aceite da Política de Privacidade.

### Regras

- o cadastro público sempre cria uma conta com role `CANDIDATE`;
- o usuário não escolhe entre Candidato, Avaliador ou Administrador;
- informações profissionais mais detalhadas não devem ser exigidas no cadastro inicial;
- dados como formação, experiências, competências e informações profissionais devem ser coletados posteriormente no perfil ou onboarding;
- consentimentos específicos de uso de IA não devem ser colocados de forma genérica no cadastro inicial;
- consentimentos específicos devem aparecer no contexto em que forem necessários.

---

## 4.2. Avaliador

O Avaliador **não possui cadastro público**.

A conta deve ser criada por processo administrativo controlado.

### Fluxo

```text
Administrador
↓
Gestão de Avaliadores
↓
Cadastrar / Convidar Avaliador
↓
Sistema cria convite
↓
Avaliador recebe convite
↓
Acessa link de ativação
↓
Define a própria senha
↓
Conta é ativada
↓
Primeiro acesso
↓
Onboarding operacional
↓
Dashboard do Avaliador
```

### Dados mínimos para o convite

- nome;
- e-mail;
- área de atuação ou especialidade, quando aplicável.

Outros dados podem ser adicionados conforme necessidade funcional.

### Regras

- o Administrador não deve definir uma senha permanente para o Avaliador;
- o Avaliador deve criar a própria senha;
- o convite deve estar vinculado à conta correta;
- a conta inicia em estado de convite;
- somente após ativação a conta pode realizar login normal;
- a role criada deve ser `EVALUATOR`;
- o Avaliador não pode transformar sua própria conta em Candidato ou Administrador.

---

## 4.3. Administrador

O Administrador **não possui cadastro público**.

Na V1, contas administrativas devem ser criadas por **provisionamento técnico/controlado**.

### Fluxo

```text
Provisionamento técnico/controlado
↓
Conta ADMIN autorizada
↓
Ativação ou definição segura de credenciais
↓
Primeiro acesso
↓
Introdução operacional
↓
Dashboard Administrativo
```

### Regras

- não deve existir botão público de “Criar conta como Administrador”;
- não deve existir seleção de perfil no cadastro;
- não deve existir, na V1, tela comum para um Admin criar outro Admin;
- novos Administradores devem ser provisionados de forma técnica e autorizada;
- a role criada deve ser `ADMIN`;
- mecanismos como `SUPER_ADMIN` ficam fora do escopo da V1;
- permissões administrativas adicionais poderão ser avaliadas futuramente.

---

# 5. Login único

Todos os perfis utilizam a mesma tela de login.

### Rota conceitual

```text
/login
```

### Campos

- e-mail;
- senha.

### Fluxo

```text
E-mail + senha
↓
Autenticação
↓
Verificação do estado da conta
↓
Identificação da role
↓
Autorização
↓
Redirecionamento para o ambiente correto
```

### Redirecionamento por role

```text
CANDIDATE
→ /candidate/dashboard

EVALUATOR
→ /evaluator/dashboard

ADMIN
→ /admin/dashboard
```

### Regras

- o usuário não escolhe o perfil na tela de login;
- o sistema identifica a role da conta autenticada;
- contas inválidas ou bloqueadas não devem receber acesso;
- o redirecionamento deve respeitar a role registrada no sistema.

---

# 6. Autenticação x autorização

## 6.1. Autenticação

Responde:

> **Quem é o usuário?**

Exemplos:

- validação de e-mail e senha;
- criação de sessão;
- recuperação de senha;
- verificação de conta.

## 6.2. Autorização

Responde:

> **O que esse usuário pode acessar ou fazer?**

A autorização deve usar role e permissões definidas pelo sistema.

Não é suficiente esconder opções de menu.

---

# 7. Controle de acesso por perfil

## Candidato

```text
✅ /candidate/*
❌ /evaluator/*
❌ /admin/*
```

## Avaliador

```text
❌ /candidate/*
✅ /evaluator/*
❌ /admin/*
```

## Administrador

```text
✅ /admin/*
```

Acesso do Administrador a recursos específicos de outros contextos deve ocorrer por funcionalidades administrativas próprias, e não por assumir automaticamente a experiência de outro perfil.

---

# 8. Proteção de rotas

Toda rota protegida deve validar:

```text
Usuário está autenticado?
↓
SIM
↓
Conta está ativa?
↓
SIM
↓
Role possui acesso à rota?
↓
SIM → permitir acesso
NÃO → negar acesso
```

Casos esperados:

### Usuário não autenticado

```text
rota protegida
↓
redirecionar para login
```

### Usuário autenticado sem permissão

```text
rota protegida
↓
acesso negado
```

O comportamento visual final pode utilizar página de acesso negado, redirecionamento controlado ou outra solução definida pela implementação.

---

# 9. Estados de conta

A implementação deve prever estados de conta suficientes para representar os fluxos da V1.

Sugestão inicial:

```text
PENDING_VERIFICATION
INVITED
ACTIVE
BLOCKED
INACTIVE
```

## Significado

### `PENDING_VERIFICATION`

Conta criada, mas aguardando verificação de e-mail.

Uso principal:

- Candidato recém-cadastrado.

### `INVITED`

Conta criada por convite, mas ainda não ativada.

Uso principal:

- Avaliador convidado.

### `ACTIVE`

Conta habilitada para uso normal.

### `BLOCKED`

Conta temporariamente impedida de acessar o sistema.

### `INACTIVE`

Conta desativada.

Os nomes técnicos podem ser ajustados durante a implementação, desde que os estados funcionais sejam preservados.

---

# 10. Verificação de e-mail

## Candidato

Após o cadastro:

```text
Cadastro concluído
↓
PENDING_VERIFICATION
↓
Envio de e-mail
↓
Usuário confirma o endereço
↓
ACTIVE
```

A conta não deve pular diretamente do cadastro público para o dashboard se a verificação de e-mail fizer parte do fluxo aprovado.

---

# 11. Recuperação de senha

A funcionalidade **Esqueci minha senha** deve estar disponível para:

```text
Candidato ✅
Avaliador ✅
Administrador ✅
```

Não serão criadas páginas de recuperação separadas por perfil.

### Fluxo

```text
Login
↓
Esqueci minha senha
↓
Informar e-mail
↓
Solicitação processada
↓
Receber link seguro
↓
Definir nova senha
↓
Senha alterada
↓
Login
```

### Regras

- o fluxo deve ser comum aos três perfis;
- a resposta não deve revelar publicamente o tipo de conta daquele e-mail;
- a interface não deve informar se o endereço pertence a Candidato, Avaliador ou Admin;
- redefinir senha não deve alterar a role;
- redefinir senha não deve ativar automaticamente uma conta bloqueada ou inativa;
- proteções adicionais para contas administrativas poderão ser adicionadas futuramente.

---

# 12. Primeiro acesso

O comportamento de primeiro acesso depende do perfil.

---

## 12.1. Candidato

O Candidato terá onboarding completo.

### Fluxo

```text
Primeiro login
↓
Onboarding com orientação da jornada
↓
Apresentação do RH Connect
↓
Configurações ou informações iniciais necessárias
↓
Completar perfil quando aplicável
↓
Dashboard
```

O personagem Nilo pode atuar como mentor e guia neste processo.

---

## 12.2. Avaliador

O Avaliador terá onboarding curto e operacional.

### Deve apresentar

- funcionamento da área do Avaliador;
- fila de avaliações;
- entrevistas atribuídas;
- critérios de avaliação;
- processo de preenchimento;
- diferença entre rascunho e conclusão;
- diferença entre feedback destinado ao Candidato e observações internas, quando aplicável.

### Fluxo

```text
Primeiro login
↓
Boas-vindas
↓
Orientação operacional
↓
Dashboard do Avaliador
```

O onboarding deve ser curto e profissional.

---

## 12.3. Administrador

O Administrador terá apenas uma introdução operacional curta ou opcional na V1.

### Pode apresentar

- gestão de usuários;
- gestão de Avaliadores;
- entrevistas e atribuições;
- perguntas;
- critérios;
- principais ferramentas administrativas.

### Fluxo

```text
Primeiro login
↓
Introdução rápida
↓
Dashboard Administrativo
```

Não é necessário criar onboarding longo ou gamificado para o Administrador.

---

# 13. Troca de role

O usuário não pode alterar sua própria role.

Não devem existir opções como:

```text
“Tornar-me Avaliador”
“Tornar-me Administrador”
“Alterar tipo da minha conta”
```

Exemplos proibidos:

```text
CANDIDATE → EVALUATOR
CANDIDATE → ADMIN
EVALUATOR → ADMIN
```

Qualquer alteração excepcional deve ocorrer por procedimento autorizado e documentado.

---

# 14. Logout

Os três perfis devem possuir logout.

### Fluxo

```text
Usuário autenticado
↓
Sair
↓
Sessão encerrada
↓
Redirecionamento para área pública ou login
```

Após logout, rotas protegidas não devem continuar acessíveis usando a sessão encerrada.

---

# 15. Contas bloqueadas e inativas

## Conta bloqueada

Uma conta `BLOCKED`:

- não pode acessar áreas protegidas;
- não deve recuperar acesso somente redefinindo a senha;
- deve depender do processo autorizado de desbloqueio.

## Conta inativa

Uma conta `INACTIVE`:

- não deve realizar login normal;
- pode ser reativada somente por processo autorizado.

---

# 16. Segurança futura

Os seguintes recursos podem ser avaliados após a V1:

- MFA para Administradores;
- políticas de autenticação reforçada;
- sessões administrativas com exigências adicionais;
- permissões administrativas mais granulares;
- modelo mais avançado de RBAC;
- auditoria ampliada de acessos.

Eles não devem bloquear a implementação da V1.

---

# 17. Fora do escopo da V1

Não implementar nesta versão, salvo mudança formal de decisão:

- cadastro público de Avaliador;
- cadastro público de Administrador;
- `SUPER_ADMIN`;
- criação normal de Admin por outro Admin na interface;
- escolha manual de role no login;
- troca de role pelo próprio usuário;
- três páginas de login diferentes;
- três fluxos separados de recuperação de senha;
- onboarding completo e gamificado para todos os perfis.

---

# 18. Resumo dos perfis

| Perfil | Cadastro público | Forma de criação | Ativação | Login | Esqueci minha senha | Onboarding |
|---|---|---|---|---|---|---|
| Candidato | Sim | Próprio usuário | Verificação de e-mail | Login único | Sim | Completo |
| Avaliador | Não | Convite administrativo | Define própria senha | Login único | Sim | Curto e operacional |
| Administrador | Não | Provisionamento técnico/controlado | Processo controlado | Login único | Sim | Introdução curta/opcional |

---

# 19. Fluxo consolidado

```text
                         RH CONNECT
                             │
                        LOGIN ÚNICO
                             │
                    autenticação + role
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
        CANDIDATE        EVALUATOR          ADMIN
             │               │               │
      cadastro público     convite       provisionamento
             │               │            controlado
             ▼               ▼               ▼
      verificação         definição        ativação
        de e-mail          de senha       controlada
             │               │               │
             ▼               ▼               ▼
       onboarding         onboarding       introdução
        completo           curto           operacional
             │               │               │
             ▼               ▼               ▼
        Dashboard         Dashboard        Dashboard
       Candidato          Avaliador         Admin
```

---

# 20. Critérios de aceite para implementação

A implementação desta especificação será considerada coerente quando:

- [ ] somente Candidato possuir cadastro público;
- [ ] cadastro público sempre criar `CANDIDATE`;
- [ ] Avaliador entrar por convite;
- [ ] Avaliador definir a própria senha;
- [ ] Admin não possuir cadastro público;
- [ ] Admin ser provisionado de forma controlada;
- [ ] não existir `SUPER_ADMIN` na V1;
- [ ] existir um único login;
- [ ] o sistema redirecionar por role;
- [ ] rotas forem protegidas por autorização;
- [ ] Candidato não acessar ambiente do Avaliador;
- [ ] Candidato não acessar ambiente Admin;
- [ ] Avaliador não acessar ambiente Admin;
- [ ] os três perfis possuírem recuperação de senha;
- [ ] redefinição de senha não alterar role;
- [ ] contas bloqueadas não recuperarem acesso apenas redefinindo senha;
- [ ] Candidato passar pelo onboarding completo;
- [ ] Avaliador possuir onboarding operacional;
- [ ] Admin possuir introdução curta ou opcional;
- [ ] usuário não puder alterar a própria role.

---

# 21. Relação com outros documentos

Este documento deve ser lido em conjunto com:

- PRD do RH Connect;
- Matriz de Permissões;
- Inventário e Especificação de Telas;
- Especificação do Nilo e Gamificação;
- Plano Mestre de Implementação;
- registros de decisão arquitetural;
- documentação futura de autenticação do Backend.

Em caso de alteração destas regras, a mudança deve ser registrada formalmente e refletida nos documentos relacionados.

---

# 22. Próximo passo

Após aprovação deste documento:

```text
Regras de autenticação aprovadas
↓
Criar DEC-001 — Autenticação e Perfis
↓
Atualizar os fluxos correspondentes no Figma Make
↓
Definir baseline da referência
↓
Auditoria comparativa com Codex
↓
Implementação no repositório oficial
```

---

**Fim do documento.**
