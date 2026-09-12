# Guia Operacional — Contratos de API do Back-end

## RH Connect — Preparação para Primeira Integração

**Objetivo:** orientar a equipe Back-end na definição e documentação dos contratos de API antes da integração com o Front-end.

---

# 1. Quando usar este guia

Usar sempre que um fluxo começar a sair da modelagem e passar para implementação de endpoint.

A regra é:

> **Front-end e Back-end não devem começar uma integração sem saber exatamente o que será enviado, recebido e validado.**

O primeiro contrato prioritário é o de **autenticação**.

---

# 2. O que um contrato precisa definir

Para cada endpoint, registrar no mínimo:

```text
Nome do fluxo
Método HTTP
Endpoint
Autenticação
Role autorizada
Parâmetros de rota
Query params
Request body
Response de sucesso
Status HTTP
Erros esperados
Validações
Regras de autorização
Observações
```

---

# 3. Modelo padrão

```text
Nome:

Objetivo:

Método:

Endpoint:

Autenticação:
[ ] Pública
[ ] Obrigatória

Roles autorizadas:

Parâmetros de rota:

Query params:

Body:

Resposta de sucesso:

Status HTTP:

Erros esperados:

Validações:

Regras de autorização:

Observações:
```

---

# 4. Requests

Todo request deve deixar claro:

- nome do campo;
- tipo;
- se é obrigatório;
- formato;
- limites;
- validações;
- valores permitidos, quando aplicável.

Exemplo conceitual:

```json
{
  "email": "string",
  "password": "string"
}
```

Não deixar campos implícitos.

---

# 5. Responses

A resposta deve ser previsível.

Exemplo conceitual:

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "role": "CANDIDATE"
  }
}
```

Evitar mudar formato de resposta sem necessidade.

---

# 6. Erros

Padronizar pelo menos:

```text
400 — requisição inválida
401 — não autenticado
403 — sem permissão
404 — não encontrado
409 — conflito
500 — erro interno
```

Exemplo conceitual:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Credenciais inválidas."
  }
}
```

O formato final deve ser confirmado pela equipe e mantido.

---

# 7. Autenticação e autorização

Todo contrato protegido precisa responder:

```text
Quem precisa estar autenticado?
Qual role pode acessar?
Existe regra de propriedade do recurso?
Existe status que impede acesso?
```

Exemplo:

```text
GET /evaluations/:id

Auth: obrigatória
Role: EVALUATOR
Regra: avaliador só pode acessar avaliações atribuídas a ele.
```

---

# 8. Ordem atual dos contratos

Prioridade recomendada:

```text
Auth
↓
Perfil
↓
Contexto
↓
Entrevista
↓
Vídeo
↓
Avaliação
↓
Relatório
↓
Gamificação base
```

O contrato definitivo de vídeo deve esperar a decisão técnica de mídia/storage.

---

# 9. Primeiro contrato — Auth

O primeiro contrato deve definir pelo menos:

- email;
- senha;
- resposta de sucesso;
- usuário;
- role;
- status da conta;
- estado do onboarding, se necessário;
- sessão/token;
- credenciais inválidas;
- conta inativa;
- acesso negado.

---

# 10. Mudança de contrato

Quando um contrato mudar:

- atualizar a documentação;
- avisar o Front-end;
- revisar impacto;
- evitar quebra silenciosa;
- atualizar exemplos;
- revisar testes.

---

# 11. O que não fazer

- não criar endpoint sem objetivo claro;
- não expor senha/hash;
- não confiar em role enviada pelo Front;
- não retornar erro genérico para tudo;
- não alterar request/response sem comunicar;
- não deixar autorização apenas no Front;
- não criar dois endpoints equivalentes sem justificativa.

---

# 12. Critério de aprovação

```text
[ ] método definido
[ ] endpoint definido
[ ] auth definida
[ ] roles definidas
[ ] request documentado
[ ] response documentado
[ ] status HTTP definido
[ ] erros documentados
[ ] validações descritas
[ ] autorização descrita
[ ] Front e Back entendem o mesmo fluxo
```

---

# 13. Resultado esperado

> **Contrato aprovado significa que Front e Back conseguem implementar a integração sem precisar adivinhar regras um do outro.**
