# Contribuição — RH Connect

Este documento define o fluxo de trabalho e as regras para contribuir com o projeto **RH Connect**. O objetivo é manter o repositório organizado, facilitar revisões, reduzir conflitos e garantir que a `main` permaneça estável.

---

## 1. Estrutura do projeto

O RH Connect utiliza um **monorepositório (monorepo)**:

```text
rh-connect/
├── apps/
├── packages/
├── docs/
├── .github/
├── .gitignore
└── README.md
```

As responsabilidades de cada área devem ser respeitadas conforme a arquitetura atual do projeto.

- `apps/`: aplicações executáveis do projeto.
- `packages/`: pacotes compartilhados, tipos, componentes, validações e outros recursos reutilizáveis.
- `docs/`: documentação técnica e funcional.
- `.github/`: configurações do GitHub, workflows, templates de Issues e Pull Requests.

Cada integrante deve alterar principalmente os arquivos relacionados à tarefa atribuída.

> A estrutura acima deve ser atualizada caso a arquitetura do projeto seja modificada.

---

## 2. Fluxo de trabalho

Toda alteração deve seguir, preferencialmente, este fluxo:

```text
Issue
   ↓
Atualizar a main
   ↓
Criar branch
   ↓
Desenvolver
   ↓
Testar e validar
   ↓
Fazer commits
   ↓
Enviar branch
   ↓
Abrir Pull Request
   ↓
Revisão
   ↓
Aprovação
   ↓
Merge na main
   ↓
Excluir branch
```

Não desenvolva diretamente na `main`.

---

## 3. Issues

Sempre que possível, cada tarefa deve estar relacionada a uma **Issue** do GitHub.

Antes de começar:

1. Crie uma Issue ou escolha uma Issue existente.
2. Entenda claramente o objetivo da tarefa.
3. Crie uma branch específica para essa tarefa.
4. Trabalhe somente no escopo definido pela Issue.

Evite desenvolver funcionalidades sem uma tarefa claramente definida.

Quando aplicável, o Pull Request deve estar relacionado à Issue correspondente.

---

## 4. Não trabalhar diretamente na `main`

A branch `main` representa a versão principal e estável do projeto.

Não faça alterações diretamente nela e não utilize:

```bash
git push origin main
```

como fluxo normal de desenvolvimento.

Todas as alterações devem ser feitas em uma branch própria e enviadas por Pull Request.

---

## 5. Atualizar o projeto antes de começar

Antes de iniciar uma nova tarefa:

```bash
git checkout main
git pull origin main
```

Isso garante que sua branch seja criada a partir da versão mais recente do projeto.

---

## 6. Criar uma branch para cada tarefa

Crie uma branch específica para cada funcionalidade, correção, teste ou alteração.

```bash
git checkout -b tipo/nome-da-tarefa
```

### Padrões permitidos

```text
feature/nome-da-funcionalidade
fix/nome-do-problema
docs/nome-da-documentacao
refactor/nome-da-reorganizacao
test/nome-do-teste
chore/nome-da-manutencao
ci/nome-da-configuracao
spike/nome-do-experimento
```

### Exemplos

```text
feature/web-login
feature/api-login
fix/sidebar-mobile
docs/api-auth
refactor/app-layout
test/login-flow
chore/typescript-config
ci/github-actions
spike/auth-strategy
```

### Regras

Os nomes devem ser:

- curtos;
- descritivos;
- relacionados à tarefa;
- escritos preferencialmente em inglês;
- sem nomes de pessoas.

Não utilize branches como:

```text
adryan
joao
maria
minha-branch
teste
```

---

## 7. Escopo da branch

Cada branch deve possuir **um objetivo claro**.

Evite misturar tarefas diferentes.

Por exemplo, não faça na mesma branch:

```text
- corrigir login;
- criar uma nova página;
- alterar o banco;
- reorganizar componentes;
- corrigir documentação.
```

Se as tarefas não estiverem relacionadas, crie branches separadas.

Isso torna o Pull Request menor, mais fácil de revisar e mais seguro para fazer o merge.

---

## 8. Fazer alterações e testar

Durante o desenvolvimento:

1. Implemente somente o escopo da tarefa.
2. Execute as validações relevantes.
3. Teste as alterações.
4. Verifique se alterações não relacionadas foram incluídas.
5. Confirme que o projeto continua funcionando.

Antes de enviar a branch:

```bash
git status
```

Verifique cuidadosamente os arquivos modificados.

---

## 9. Padrão de commits

Utilize mensagens de commit claras e objetivas.

Padrão:

```text
tipo: descrição da alteração
```

Tipos recomendados:

- `feat`: nova funcionalidade.
- `fix`: correção de erro.
- `docs`: alteração na documentação.
- `refactor`: reorganização do código sem alteração intencional de comportamento.
- `test`: criação ou alteração de testes.
- `style`: alterações de formatação ou estilo do código sem mudança de comportamento.
- `chore`: manutenção ou configuração do projeto.
- `ci`: alterações relacionadas à integração/automação contínua.
- `spike`: experimentação ou investigação técnica.

### Exemplos

```text
feat: adiciona login web
fix: corrige responsividade da sidebar
docs: atualiza documentação da API
refactor: reorganiza layout da aplicação
test: adiciona testes do fluxo de login
chore: atualiza configuração do TypeScript
ci: adiciona workflow de testes
spike: avalia estratégia de autenticação
```

Evite mensagens genéricas como:

```text
alterações
mudanças
teste
atualização
final
coisas
```

---

## 10. Fazer commits pequenos

Cada commit deve representar uma alteração coerente.

Exemplo:

```bash
git add .
git commit -m "feat: adiciona formulário de cadastro"
```

Evite acumular várias funcionalidades diferentes em um único commit.

Commits pequenos facilitam:

- revisão;
- identificação de problemas;
- reversão de alterações;
- entendimento do histórico.

---

## 11. Arquivos que não podem ser enviados

Nunca envie informações sensíveis ou arquivos desnecessários para o repositório.

Não devem ser versionados:

```text
.env
node_modules/
builds/
dist/
arquivos temporários
chaves de API
tokens de acesso
senhas
credenciais
dados pessoais de usuários
```

Utilize arquivos `.env.example` para documentar variáveis necessárias sem valores reais.

Exemplo:

```text
GROQ_API_KEY=
GROQ_MODEL=
PORT=
DATABASE_URL=
```

Antes de realizar o commit:

```bash
git status
```

Confira se nenhum arquivo sensível foi incluído.

---

## 12. Enviar a branch para o GitHub

Depois de concluir e testar a tarefa:

```bash
git add .
git commit -m "tipo: descrição da alteração"
git push -u origin nome-da-branch
```

Exemplo:

```bash
git push -u origin feature/web-login
```

Não envie diretamente para `main`.

---

## 13. Pull Requests

Toda alteração destinada à `main` deve passar por um **Pull Request (PR)**.

Mantenha os PRs:

- pequenos;
- objetivos;
- fáceis de revisar;
- relacionados a uma única tarefa ou Issue.

O Pull Request deve informar:

- resumo da alteração;
- Issue relacionada;
- arquivos ou áreas principais alteradas;
- como a alteração foi testada;
- impacto visual, quando aplicável;
- riscos, limitações ou pendências conhecidas.

Antes de abrir o PR:

- teste suas alterações;
- confirme que o projeto inicia;
- execute as validações relevantes;
- confirme que não enviou `.env`;
- confirme que não enviou `node_modules`;
- confirme que não incluiu alterações não relacionadas;
- atualize a documentação quando necessário.

---

## 14. Revisão e aprovação

O Pull Request deve receber **pelo menos uma aprovação** antes do merge.

O autor do Pull Request **não deve aprovar o próprio PR**.

Sempre que possível:

- alterações de uma determinada área devem ser revisadas por alguém familiarizado com aquela área;
- alterações de backend devem ser revisadas por integrantes com conhecimento do backend;
- alterações de frontend devem ser revisadas por integrantes com conhecimento do frontend;
- alterações de integração ou arquitetura podem ser revisadas por integrantes de diferentes áreas.

Não aprove um Pull Request sem verificar os arquivos alterados e os passos de teste.

---

## 15. Discussões do Pull Request

Comentários e solicitações de alteração devem ser tratados antes do merge.

Quando uma alteração for solicitada:

1. Faça a correção.
2. Responda ao comentário quando necessário.
3. Confirme que a alteração foi realizada.
4. Resolva a discussão somente quando ela estiver realmente concluída.

Não faça merge enquanto existirem questões relevantes pendentes.

---

## 16. Atualizar a branch antes do merge

Se a `main` receber novas alterações enquanto sua tarefa estiver em desenvolvimento, atualize sua branch.

Uma forma simples:

```bash
git checkout main
git pull origin main
git checkout nome-da-sua-branch
git merge main
```

Caso ocorram conflitos, resolva-os cuidadosamente e execute novamente as validações do projeto.

---

## 17. Conflitos de Git

Se ocorrer um conflito, não escolha arquivos ou trechos aleatoriamente.

Procedimento recomendado:

1. Identifique os arquivos envolvidos.
2. Entenda o que cada alteração pretendia fazer.
3. Analise as duas versões.
4. Converse com os integrantes envolvidos quando necessário.
5. Resolva o conflito preservando o comportamento correto.
6. Execute os testes e validações.
7. Só então finalize o merge/commit da resolução.

Se não compreender o conflito, peça ajuda antes de continuar.

---

## 18. Após o merge

Depois que o Pull Request for integrado à `main`:

Atualize sua `main`:

```bash
git checkout main
git pull origin main
```

Exclua a branch local:

```bash
git branch -d nome-da-branch
```

Se a branch ainda existir no GitHub:

```bash
git push origin --delete nome-da-branch
```

Atualize as referências locais:

```bash
git fetch --prune
```

A branch só deve ser excluída depois que o Pull Request tiver sido integrado ou quando houver confirmação de que ela não é mais necessária.

---

## 19. Regras principais

- Não trabalhar diretamente na `main`.
- Criar uma Issue para cada tarefa sempre que possível.
- Criar uma branch para cada tarefa.
- Atualizar a `main` antes de começar.
- Utilizar nomes de branches descritivos.
- Manter cada branch dentro de um escopo claro.
- Fazer commits pequenos e objetivos.
- Seguir o padrão de mensagens de commit.
- Abrir Pull Request para alterações destinadas à `main`.
- Manter Pull Requests pequenos e revisáveis.
- Exigir pelo menos uma aprovação antes do merge.
- Não aprovar o próprio Pull Request.
- Não fazer merge com questões relevantes pendentes.
- Não enviar `.env`, senhas, tokens, chaves ou credenciais.
- Não enviar `node_modules`, builds ou artefatos temporários.
- Testar as alterações antes do Pull Request.
- Resolver conflitos com cuidado.
- Pedir ajuda quando não compreender um conflito.
- Atualizar a documentação quando o funcionamento do projeto mudar.
- Excluir branches concluídas após o merge.

---

## 20. Resumo do fluxo

```text
Criar/selecionar Issue
        ↓
Atualizar main
        ↓
Criar branch
        ↓
Desenvolver
        ↓
Testar e validar
        ↓
Fazer commits
        ↓
Enviar branch
        ↓
Abrir Pull Request
        ↓
Revisão
        ↓
Aprovação
        ↓
Merge na main
        ↓
Excluir branch
        ↓
Atualizar repositório local
```
