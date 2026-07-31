# Guia de Contribuição — RH Connect

Este documento define as regras para contribuir com o projeto **RH Connect**. Todos os integrantes devem seguir este fluxo para manter o repositório organizado e reduzir conflitos.

## 1. Estrutura do projeto

O projeto utiliza um monorepositório:

```text
rh-connect/
├── frontend/
├── backend/
├── docs/
├── .github/
├── .gitignore
└── README.md
```

Responsabilidades principais:

- `frontend/`: interface, páginas, componentes, estilos e integração com a API.
- `backend/`: servidor, API, Inteligência Artificial e regras de negócio.
- `docs/`: documentação técnica e funcional.
- `.github/`: templates e configurações do GitHub.

Cada integrante deve alterar principalmente os arquivos relacionados à sua equipe.

## 2. Não trabalhar diretamente na `main`

A branch `main` representa a versão principal e estável do projeto.

Não faça alterações diretamente nela e não utilize:

```bash
git push origin main
```

Toda alteração deve ser feita em uma branch própria e enviada por Pull Request.

## 3. Atualizar o projeto antes de começar

Antes de iniciar qualquer tarefa:

```bash
git checkout main
git pull origin main
```

Isso garante que sua branch seja criada com a versão mais recente do projeto.

## 4. Criar uma branch para cada tarefa

Crie uma branch específica para cada funcionalidade ou correção:

```bash
git checkout -b tipo/nome-da-tarefa
```

Padrões permitidos:

```text
feature/nome-da-funcionalidade
fix/nome-do-problema
docs/nome-da-documentacao
refactor/nome-da-reorganizacao
```

Exemplos:

```text
feature/cadastro-vaga
feature/geracao-perguntas
fix/erro-envio-respostas
docs/guia-de-instalacao
```

Não utilize branches com nomes de pessoas, como `adryan`, `joao` ou `maria`.

## 5. Fazer alterações pequenas e organizadas

Evite colocar várias tarefas diferentes na mesma branch.

Uma branch deve possuir um objetivo claro. Por exemplo, não misture uma correção no back-end com uma mudança visual sem relação no front-end.

## 6. Padrão de commits

Utilize mensagens claras e no seguinte padrão:

```text
tipo: descrição da alteração
```

Tipos permitidos:

- `feat`: nova funcionalidade.
- `fix`: correção de erro.
- `docs`: alteração na documentação.
- `refactor`: reorganização do código sem mudar o comportamento.
- `style`: mudança visual ou de formatação.
- `test`: criação ou alteração de testes.
- `chore`: configuração ou manutenção do projeto.

Exemplos:

```text
feat: adiciona formulário de cadastro da vaga
fix: corrige erro ao gerar perguntas
docs: atualiza instruções de instalação
refactor: reorganiza serviço de inteligência artificial
style: ajusta layout da tela de entrevista
chore: atualiza arquivo gitignore
```

Evite mensagens genéricas como:

```text
alterações
mudanças
teste
atualização
final
```

## 7. Fazer commits pequenos

Cada commit deve representar uma alteração específica.

Fluxo recomendado:

```bash
git add .
git commit -m "feat: adiciona cadastro da vaga"
```

Não espere concluir várias funcionalidades diferentes para criar um único commit.

## 8. Arquivos que não podem ser enviados

Nunca envie:

```text
.env
node_modules/
arquivos com senhas
chaves de API
tokens de acesso
dados pessoais de usuários
```

Utilize arquivos `.env.example` sem valores reais:

```env
GROQ_API_KEY=
GROQ_MODEL=
PORT=
```

Antes do commit, confira os arquivos preparados:

```bash
git status
```

## 9. Enviar a branch para o GitHub

Depois de concluir e testar a tarefa:

```bash
git add .
git commit -m "tipo: descrição da alteração"
git push -u origin nome-da-branch
```

Exemplo:

```bash
git push -u origin feature/cadastro-vaga
```

## 10. Abrir um Pull Request

Toda alteração deve ser enviada por Pull Request para a branch `main`.

O Pull Request deve informar:

- o que foi desenvolvido;
- qual parte do projeto foi alterada;
- como testar;
- possíveis limitações ou erros conhecidos;
- Issue relacionada, quando existir.

Antes de abrir o Pull Request:

- teste suas alterações;
- confirme que o projeto inicia;
- verifique se não enviou `.env`;
- verifique se não enviou `node_modules`;
- atualize a documentação quando necessário.

## 11. Revisão e aprovação

O Pull Request deve receber pelo menos uma aprovação antes do merge.

Sempre que possível:

- alterações em `frontend/` devem ser revisadas por alguém do front-end;
- alterações em `backend/` devem ser revisadas por alguém do back-end;
- alterações de integração podem ser revisadas por integrantes dos dois times.

Não aprove um Pull Request sem verificar os arquivos alterados e os passos de teste.

## 12. Não realizar o merge com discussões pendentes

Comentários e solicitações de alteração devem ser resolvidos antes do merge.

Quando uma correção for feita, responda ao comentário e marque a discussão como resolvida somente após confirmar a alteração.

## 13. Conflitos de Git

Se aparecer um conflito, não tente resolvê-lo sozinho sem compreender os arquivos envolvidos.

Procedimento:

1. Não apague arquivos ou trechos aleatoriamente.
2. Avise o responsável pelo repositório ou integrante que alterou o mesmo arquivo.
3. Analise as duas versões antes de escolher o conteúdo correto.
4. Teste novamente após resolver o conflito.
5. Só então faça o commit da resolução.

## 14. Atualizar a branch antes do merge

Quando a `main` receber novas alterações enquanto sua tarefa estiver em desenvolvimento:

```bash
git checkout main
git pull origin main
git checkout nome-da-sua-branch
git merge main
```

Caso haja conflito, solicite ajuda antes de continuar.

## 15. Após o merge

Depois que o Pull Request for integrado à `main`, atualize o projeto:

```bash
git checkout main
git pull origin main
```

Exclua a branch local:

```bash
git branch -d nome-da-branch
```

Exclua a branch do GitHub:

```bash
git push origin --delete nome-da-branch
```

Atualize a lista de branches:

```bash
git fetch --prune
```

A branch só deve ser excluída depois do merge.

## 16. Resumo do fluxo

```text
Atualizar a main
       ↓
Criar uma branch
       ↓
Desenvolver e testar
       ↓
Fazer commits pequenos
       ↓
Enviar a branch
       ↓
Abrir Pull Request
       ↓
Receber revisão e aprovação
       ↓
Fazer merge na main
       ↓
Excluir a branch concluída
```

## 17. Regras principais

- Não trabalhar diretamente na `main`.
- Criar uma branch para cada tarefa.
- Executar `git pull` antes de começar.
- Fazer commits pequenos e claros.
- Seguir o padrão de mensagens de commit.
- Abrir Pull Request para toda alteração.
- Exigir pelo menos uma aprovação.
- Não enviar `.env`, chaves, senhas ou `node_modules`.
- Testar as alterações antes do Pull Request.
- Pedir ajuda antes de resolver conflitos desconhecidos.
- Atualizar a documentação quando o funcionamento do projeto mudar.
