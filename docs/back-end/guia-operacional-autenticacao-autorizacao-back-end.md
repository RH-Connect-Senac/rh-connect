# Guia Operacional — Autenticação e Autorização do Back-end

## RH Connect — Preparação para Primeira Integração

**Objetivo:** orientar a equipe Back-end na implementação do primeiro fluxo real de autenticação e controle de acesso do RH Connect.

---

# 1. Perfis oficiais

O sistema possui três perfis:

```text
CANDIDATE
EVALUATOR
ADMIN
```

Não existe cadastro público para todos.

---

# 2. Candidato

O candidato possui:

- cadastro público;
- login comum;
- onboarding após autenticação;
- acesso ao ambiente de candidato.

---

# 3. Avaliador

O avaliador:

- não possui cadastro público;
- deve ter conta criada/convidada de forma controlada;
- define credenciais conforme o fluxo adotado;
- faz login;
- acessa apenas o ambiente permitido para avaliador.

---

# 4. Admin

O Admin:

- não possui cadastro público;
- deve ser provisionado de forma controlada;
- faz login;
- acessa operações administrativas previstas no escopo.

Não criar `SUPER_ADMIN` sem decisão formal.

---

# 5. Login único

O sistema deve trabalhar com um único ponto de login.

Fluxo conceitual:

```text
Credenciais
↓
API valida
↓
Usuário identificado
↓
Role identificada
↓
Status da conta validado
↓
Sessão estabelecida
↓
Front recebe estado
↓
Redirecionamento conforme perfil
```

---

# 6. Autenticação x autorização

Autenticação responde:

> Quem é o usuário?

Autorização responde:

> O que esse usuário pode fazer?

As duas precisam existir no Back-end.

---

# 7. Regra principal

Não é suficiente:

```text
esconder botão
ou
bloquear rota no Front
```

Toda operação protegida deve validar no Back:

- usuário autenticado;
- role;
- status da conta;
- propriedade/relação com o recurso, quando aplicável.

---

# 8. Exemplos de autorização

```text
CANDIDATE
pode acessar o próprio perfil e suas entrevistas.

EVALUATOR
pode acessar avaliações atribuídas a ele.

ADMIN
pode executar operações administrativas previstas no escopo.
```

As regras finais devem ser documentadas por endpoint.

---

# 9. Estado da conta

Modelar apenas os estados necessários.

Exemplos possíveis:

```text
ACTIVE
INACTIVE
PENDING_ACTIVATION
```

Os nomes finais devem ser alinhados pela equipe.

---

# 10. Onboarding

O onboarding ocorre após autenticação.

A API pode precisar informar um estado como:

```text
onboardingCompleted
```

para permitir ao Front decidir o destino inicial.

Não transformar isso em decisão rígida sem necessidade do fluxo.

---

# 11. Senhas

A implementação deve:

- armazenar hash, nunca senha em texto puro;
- usar biblioteca adequada;
- nunca retornar hash;
- não registrar senha em log;
- validar requisitos definidos pelo projeto.

Recuperação de senha não é prioridade da entrega atual.

---

# 12. Sessão / token

A estratégia técnica ainda deve ser confirmada pela equipe, caso não esteja fechada.

Independentemente da escolha, documentar:

- como autentica;
- validade;
- renovação, se houver;
- logout;
- armazenamento seguro;
- comportamento de sessão inválida.

Não assumir tecnologia específica sem validação.

---

# 13. Erros esperados

Exemplos:

```text
INVALID_CREDENTIALS
ACCOUNT_INACTIVE
UNAUTHORIZED
FORBIDDEN
```

O formato final deve seguir o padrão de contratos da API.

---

# 14. Primeiro contrato

O primeiro contrato de Auth deve responder:

```text
Como faço login?
Quem sou eu?
Qual é minha role?
Minha conta está ativa?
Meu onboarding terminou?
Qual é o estado da sessão?
```

---

# 15. O que não fazer

- não criar cadastro público de avaliador;
- não criar cadastro público de Admin;
- não confiar em role enviada pelo Front;
- não expor senha/hash;
- não aplicar autorização apenas na interface;
- não priorizar recuperação de senha antes do fluxo crítico;
- não criar `SUPER_ADMIN` sem decisão;
- não misturar Auth com funcionalidades não relacionadas.

---

# 16. Checklist

```text
[ ] login único definido
[ ] Candidate público
[ ] Evaluator controlado
[ ] Admin controlado
[ ] hash de senha
[ ] role validada no Back
[ ] status da conta tratado
[ ] onboarding considerado quando necessário
[ ] erros padronizados
[ ] contrato documentado
[ ] autorização aplicada
[ ] teste local realizado
```

---

# 17. Resultado esperado

> **Autenticação identifica o usuário. Autorização controla o acesso. As duas precisam estar funcionando no Back-end antes de considerar o fluxo concluído.**
