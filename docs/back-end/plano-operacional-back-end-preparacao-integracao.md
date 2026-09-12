# Plano Operacional Back-end — Preparação para Integração

**Projeto:** RH Connect  
**Status:** Preparação do Back-end e primeira integração  
**Objetivo:** organizar os próximos passos do Back-end até o ponto em que Front-end e Back-end possam iniciar integrações reais por fluxo.

---

## 1. Objetivo do documento

Este plano orienta a equipe Back-end sobre o que precisa ser preparado antes e durante o início das integrações com o Front-end.

O foco não é implementar todo o Back-end de uma vez. A ideia é criar uma base estável, consolidar as decisões técnicas essenciais, avançar na modelagem mínima, definir contratos claros e liberar integrações por etapas.

O trabalho deve ser incremental, com branches próprias, Pull Requests pequenos, revisão antes do merge e validação local do que foi implementado.

A equipe Back-end não precisa esperar toda a preparação estrutural do Front-end ser concluída. Enquanto o Front organiza sua Pré-Migração, o Back pode avançar em:

- `apps/api`;
- stack e configuração;
- banco;
- modelagem;
- autenticação;
- contratos;
- primeiros endpoints integráveis.

---

## 2. Estado atual do Back-end

O RH Connect já possui:

- Front-end em `apps/web`;
- monorepositório com `pnpm`;
- três perfis definidos: `CANDIDATE`, `EVALUATOR` e `ADMIN`;
- regra de login único e autorização por perfil;
- fluxo principal da entrega testável de 10/09 definido em nível de produto;
- Front-end ainda com mocks, dados hardcoded e navegação simulada em partes do sistema;
- preparação gradual do Front-end para migração estrutural e rotas reais.

No Back-end, a equipe ainda está em fase inicial de preparação, com foco em:

- consolidação da estrutura da API;
- confirmação e documentação da stack adotada;
- modelagem inicial;
- banco de dados;
- definição dos primeiros contratos;
- preparação para autenticação e perfis.

O diretório planejado para o Back-end é:

```text
apps/api
```

As decisões técnicas já alinhadas até o momento para persistência são:

```text
PostgreSQL
+
Prisma
```

As demais decisões de stack ainda devem ser confirmadas e documentadas pela equipe Back-end antes de serem tratadas como padrão oficial.

Entre os pontos que ainda podem permanecer em validação estão:

- framework HTTP;
- estratégia de autenticação;
- estratégia de sessão/token;
- biblioteca de validação;
- biblioteca de testes;
- estratégia de logs;
- estrutura interna de módulos;
- solução de armazenamento de mídia;
- estratégia de upload e acesso aos vídeos.

Não assumir como definitivo nenhum componente técnico que ainda não tenha sido validado pela equipe.

---

## 3. Princípios de trabalho

Durante esta fase, a equipe deve seguir alguns princípios:

- avançar por domínio e por fluxo;
- evitar modelar o sistema inteiro antes de existir necessidade;
- não congelar decisões de produto ainda pendentes;
- manter migrations pequenas;
- documentar contratos antes da integração;
- evitar endpoints sem regra clara;
- separar preparação estrutural de funcionalidades de produto;
- não misturar muitas responsabilidades em um mesmo PR;
- validar localmente antes de abrir Pull Request;
- manter segredos e credenciais fora do repositório.

O objetivo é reduzir incerteza e chegar rapidamente ao primeiro fluxo integrável sem comprometer a evolução futura.

---

## 4. Ordem de trabalho recomendada

### Etapa 1 — Preparar e validar `apps/api`

Objetivo:

- criar ou validar a aplicação Back-end dentro do monorepositório;
- garantir que ela rode localmente;
- integrar scripts ao workspace `pnpm`;
- preparar configuração de ambiente;
- definir estrutura inicial simples;
- garantir que o projeto consiga evoluir por módulos/domínios sem complexidade desnecessária.

Resultado esperado:

```text
apps/api
→ instala
→ roda localmente
→ possui scripts básicos
→ está integrado ao workspace
→ possui configuração de ambiente
→ está pronto para conexão com banco
```

Esta etapa não exige implementar todas as funcionalidades da API.

---

### Etapa 2 — Confirmar e registrar stack do Back-end

A equipe deve registrar o que já está decidido e o que ainda está pendente.

#### Confirmado

```text
Banco: PostgreSQL
ORM: Prisma
Gerenciador do monorepo: pnpm
```

#### Ainda deve ser confirmado/documentado quando necessário

- runtime e versão do Node;
- framework HTTP adotado;
- estratégia de validação de dados;
- estratégia de autenticação;
- estratégia de sessão/token;
- tratamento de erros;
- estrutura de pastas/módulos;
- biblioteca de testes;
- estratégia de logs;
- padrão de variáveis de ambiente.

A equipe deve evitar adicionar bibliotecas apenas por preferência.

Cada dependência nova deve ter função clara no projeto.

---

### Etapa 3 — Consolidar modelagem mínima

A modelagem deve avançar por domínio e por fluxo.

Não tentar fechar todo o banco de uma vez.

#### Primeiro grupo — autenticação e perfis

Priorizar entidades e conceitos relacionados a:

- usuário;
- role;
- status da conta;
- perfil do candidato;
- avaliador;
- administrador;
- estado de onboarding, quando necessário;
- credenciais/sessão conforme a arquitetura de autenticação adotada.

Esse grupo deve ser tratado primeiro porque libera o fluxo inicial de autenticação e acesso.

A modelagem deve responder pelo menos:

```text
Quem é o usuário?
Qual é sua role?
Sua conta está ativa?
Seu perfil está completo?
Seu onboarding foi concluído?
Como a API identifica sua sessão?
```

---

#### Segundo grupo — contexto de treinamento

Modelar definitivamente somente depois que a regra de produto estiver confirmada.

Hoje existe uma decisão pendente sobre o contexto da entrevista:

```text
vaga
OU
área/subárea relacionada ao perfil
```

Enquanto essa decisão permanecer aberta:

- não estruturar todo o domínio em torno de `Job`;
- não exigir `jobId` em entidades centrais;
- não criar relacionamentos difíceis de remover depois;
- preferir estruturas evolutivas;
- registrar a dependência de decisão.

Essa pendência não deve bloquear autenticação, perfil, banco ou primeira integração.

---

#### Terceiro grupo — entrevista

Preparar conceitos relacionados a:

- entrevista;
- pergunta;
- resposta;
- consentimento;
- status da entrevista;
- vínculo com candidato;
- contexto da entrevista;
- metadados de mídia;
- datas relevantes.

A modelagem deve permitir acompanhar a entrevista desde sua criação até o envio.

---

#### Quarto grupo — avaliação e relatório

Preparar conceitos relacionados a:

- atribuição de avaliador;
- avaliador responsável;
- avaliação;
- critérios;
- notas;
- feedback;
- status da avaliação;
- relatório;
- liberação do resultado ao candidato.

O fluxo deve preservar a avaliação humana como regra principal da entrega atual.

---

#### Quinto grupo — progresso e gamificação base

Somente após os fluxos principais estarem mais estáveis, preparar o mínimo necessário para:

- progresso da jornada;
- eventos de conclusão;
- estado visual da gamificação base;
- informações necessárias para a Árvore de Talentos reformulada.

Evitar modelagem excessiva de XP, conquistas ou gamificação avançada nesta fase.

---

## 5. Banco de dados e migrations

Depois da modelagem inicial de cada domínio:

1. atualizar o schema do Prisma;
2. gerar migration pequena e focada;
3. validar criação/atualização do banco;
4. confirmar que a migration pode ser reproduzida;
5. registrar mudanças relevantes;
6. utilizar seed quando ajudar testes e desenvolvimento.

Evitar:

- migration gigante com vários domínios ao mesmo tempo;
- alteração manual do banco sem refletir no Prisma;
- apagar migrations compartilhadas sem alinhamento;
- criar tabelas “para o futuro” sem necessidade atual;
- modelagem excessivamente complexa.

O schema deve evoluir junto com o fluxo real do produto.

---

## 6. Ambientes e configuração

A API deve utilizar variáveis de ambiente para informações sensíveis ou específicas de ambiente.

Exemplos:

```text
DATABASE_URL
PORT
AUTH_SECRET
STORAGE_...
```

O repositório pode manter um:

```text
.env.example
```

com nomes e exemplos seguros, sem credenciais reais.

Nunca commitar:

- senha de banco;
- tokens;
- secrets;
- chaves privadas;
- credenciais de armazenamento;
- `.env` real.

A equipe deve documentar qualquer variável obrigatória para rodar a API localmente.

---

## 7. Contratos entre Front-end e Back-end

Os contratos devem ser definidos antes da integração de cada funcionalidade.

Cada contrato deve esclarecer pelo menos:

- rota/endpoint;
- método HTTP;
- objetivo;
- autenticação necessária;
- perfil autorizado;
- parâmetros;
- body enviado;
- resposta de sucesso;
- status HTTP;
- erros esperados;
- validações principais;
- estados relevantes.

Exemplo de ordem:

```text
Auth
↓
Perfil
↓
Contexto de treinamento
↓
Entrevista
↓
Vídeo
↓
Avaliação
↓
Relatório
↓
Progresso/Gamificação base
```

O Front-end não deve precisar adivinhar formatos de request ou response.

Quando um contrato mudar, a alteração deve ser comunicada e documentada antes de quebrar uma integração existente.

---

## 8. Primeiro contrato prioritário — autenticação e perfis

O primeiro contrato recomendado é autenticação e identificação do usuário.

O fluxo mínimo esperado é:

```text
Login
↓
API valida credenciais
↓
API identifica usuário
↓
API identifica role
↓
API retorna estado de autenticação
↓
Front direciona para o ambiente correto
```

Perfis:

```text
CANDIDATE
EVALUATOR
ADMIN
```

O contrato deve deixar claro:

- dados necessários para login;
- resposta de sucesso;
- dados mínimos do usuário;
- role;
- status da conta;
- estado de onboarding quando necessário;
- resposta de credenciais inválidas;
- comportamento de conta inativa;
- regra de autorização.

A autorização real deve ser aplicada no Back-end.

Ocultar uma tela, rota ou botão apenas no Front-end não é controle de acesso suficiente.

---

## 9. Fluxos de integração recomendados

Depois de autenticação, avançar verticalmente.

### Fluxo 1 — Autenticação

```text
Login
↓
Sessão/Token
↓
Usuário
↓
Role
↓
Redirecionamento
```

---

### Fluxo 2 — Perfil do candidato

```text
Front envia dados
↓
API valida
↓
Banco persiste
↓
API retorna estado atualizado
↓
Front atualiza interface
```

O perfil deve conter apenas os dados necessários para sustentar a jornada atual.

---

### Fluxo 3 — Contexto de treinamento

Implementar somente quando a decisão de produto estiver suficientemente definida.

```text
Contexto selecionado
↓
API valida
↓
Contexto é relacionado ao candidato/entrevista
↓
Fluxo de entrevista é iniciado
```

---

### Fluxo 4 — Entrevista com vídeo

```text
Candidato inicia
↓
API cria entrevista
↓
Consentimento é registrado
↓
Perguntas são associadas
↓
Respostas são registradas
↓
Mídia é persistida conforme arquitetura validada
↓
Referências/metadados necessários são associados
↓
Status é atualizado
↓
Entrevista é enviada
```

A entrevista com vídeo faz parte do caminho crítico da entrega.

---

### Fluxo 5 — Avaliação humana

```text
Admin atribui entrevista
↓
Assignment é registrado
↓
Avaliador recebe
↓
Vídeo autorizado é disponibilizado
↓
Avaliação é salva
↓
Avaliação é concluída
↓
Status é atualizado
↓
Relatório pode ser liberado
```

---

### Fluxo 6 — Relatório

```text
Avaliação concluída
↓
Dados finais são consolidados
↓
Relatório fica disponível
↓
Candidato acessa resultado
```

---

### Fluxo 7 — Progresso/Gamificação base

Depois do fluxo principal:

```text
Evento real da jornada
↓
Back registra/deriva progresso
↓
API devolve estado
↓
Front representa progresso visual
```

A gamificação base deve refletir eventos reais, evitando depender apenas de estados fictícios no Front.

---

## 10. Vídeos e armazenamento de mídia

A entrevista com vídeo é requisito funcional da entrega, mas a arquitetura definitiva de armazenamento da mídia **ainda deve ser validada tecnicamente pela equipe Back-end**.

Nesta fase, o projeto não deve tratar como decisão fechada:

- onde o arquivo de vídeo será armazenado;
- qual serviço/provider será utilizado;
- se haverá object storage, serviço especializado de mídia ou outra solução;
- se o upload será direto para o storage ou intermediado pela API;
- como serão geradas e protegidas as referências de acesso;
- como funcionará retenção e exclusão.

Como hipótese técnica inicial, a equipe deve avaliar a separação entre:

```text
dados relacionais / metadados
+
arquivo de mídia
```

Essa separação é uma direção recomendada para análise, **não uma decisão arquitetural definitiva nesta fase**.

A equipe deve comparar as alternativas considerando:

- simplicidade de implementação;
- segurança;
- custo;
- compatibilidade com o prazo da entrega;
- facilidade de upload;
- reprodução pelo avaliador;
- controle de acesso;
- duração dos vídeos;
- tamanho máximo;
- formatos aceitos;
- comportamento em mobile;
- falhas e retry;
- retenção;
- exclusão;
- escalabilidade necessária para a entrega.

Independentemente da solução final, o sistema deverá conseguir relacionar a mídia à entrevista e controlar seu estado e acesso.

Antes da implementação definitiva do upload real, a equipe deve registrar a decisão técnica adotada e seu impacto na modelagem, API e Front-end.

---

## 11. Tratamento de erros

A API deve começar com um padrão simples e consistente de erros.

Evitar respostas diferentes para situações semelhantes.

Os contratos devem registrar pelo menos:

```text
400 — requisição inválida
401 — não autenticado
403 — sem permissão
404 — recurso não encontrado
409 — conflito quando aplicável
500 — erro interno
```

A estrutura de resposta deve ser previsível para o Front-end.

Exemplo conceitual:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Credenciais inválidas."
  }
}
```

O formato definitivo deve ser decidido pela equipe e documentado.

---

## 12. Testes mínimos nesta fase

Não é necessário construir uma suíte completa antes da primeira integração.

Mas cada fluxo implementado deve ter validação mínima.

A equipe deve confirmar:

- API inicia;
- banco conecta;
- migration funciona;
- endpoint responde;
- validação rejeita dados inválidos;
- autorização básica funciona;
- erro esperado possui resposta coerente;
- comportamento principal funciona localmente.

Quando testes automatizados forem adicionados, priorizar primeiro os fluxos críticos e regras de autorização.

---

## 13. Pendência técnica prioritária — mídia e storage

A solução de mídia deve ser tratada como uma decisão técnica pendente do Back-end.

A equipe deverá produzir uma recomendação antes da implementação definitiva do fluxo de vídeo.

A análise deve responder:

```text
Onde o arquivo será persistido?
Como será enviado?
Como será acessado?
Como o acesso será protegido?
Que dados precisam ficar no PostgreSQL?
Qual serviço ou tecnologia será utilizado?
Qual o impacto no Front-end?
Qual o impacto no prazo?
```

Essa pendência:

### Não bloqueia

- `apps/api`;
- PostgreSQL;
- Prisma;
- autenticação;
- roles;
- perfil;
- migrations iniciais;
- contrato de autenticação;
- primeira integração de Auth.

### Bloqueia

- implementação definitiva do upload;
- persistência real da mídia;
- reprodução autorizada pelo avaliador;
- contrato final do fluxo de vídeo;
- modelagem definitiva dos dados de mídia.

A decisão deve ser documentada antes que o fluxo de vídeo seja consolidado.

---

## 14. O que pode ser feito agora

- criar ou validar `apps/api`;
- confirmar/documentar stack;
- configurar ambiente local;
- integrar a API ao workspace `pnpm`;
- preparar PostgreSQL;
- configurar Prisma;
- avançar na modelagem de autenticação e perfis;
- criar migrations iniciais;
- criar seed quando útil;
- definir contrato de autenticação;
- documentar endpoints planejados;
- preparar tratamento básico de erros;
- estruturar autorização por perfil;
- implementar primeiro endpoint integrável;
- alinhar contratos com o Front-end.

---

## 15. O que não deve ser feito agora

- não implementar todo o Back-end de uma vez;
- não decidir regras de produto sem validação;
- não congelar o domínio de vagas antes da decisão vaga x área/subárea;
- não exigir `jobId` como base estrutural enquanto essa decisão estiver aberta;
- não implementar IA avaliadora;
- não congelar a estratégia de armazenamento de vídeo antes da validação técnica;
- não implementar gamificação avançada;
- não criar arquitetura excessivamente complexa para o prazo atual;
- não instalar bibliotecas ou serviços de storage/mídia sem necessidade clara e validação técnica;
- não misturar muitos domínios no mesmo Pull Request;
- não expor segredos, tokens ou credenciais;
- não criar endpoints dependentes do Front sem contrato minimamente definido;
- não esperar o Back-end inteiro ficar pronto para começar integração.

---

## 16. Critério para o Back-end estar pronto para a primeira integração

A primeira integração pode começar quando houver:

- `apps/api` operacional localmente;
- stack principal registrada;
- PostgreSQL conectado;
- Prisma configurado;
- modelagem mínima de usuário/role definida;
- migrations funcionando;
- contrato de autenticação documentado;
- endpoint inicial implementado;
- validação básica funcionando;
- tratamento básico de erros;
- regra de autorização do fluxo definida;
- execução/build da API estáveis;
- Front-end alinhado ao contrato.

Não é necessário esperar o Back-end inteiro ficar pronto.

Esse ponto representa o:

```text
CHECKPOINT DE PRIMEIRA INTEGRAÇÃO
```

---

## 17. Critério de conclusão de cada fluxo

Um fluxo pode ser considerado pronto para integração quando:

- regra de produto está definida;
- entidades necessárias estão modeladas;
- migration necessária existe;
- contrato está documentado;
- endpoint está implementado;
- validações principais funcionam;
- erros esperados são tratados;
- acesso por perfil está correto;
- comportamento foi testado localmente;
- dependências externas necessárias estão documentadas;
- PR foi revisado e integrado à `main`.

Quando aplicável, o fluxo deve ser testado ponta a ponta com o Front-end antes de seguir para o próximo.

---

## 18. Relação com o Front-end

O Back-end não precisa esperar o Front-end ficar totalmente pronto.

A integração deve ocorrer verticalmente:

```text
Contrato definido
↓
Back implementa endpoint
↓
Front integra
↓
Equipe testa ponta a ponta
↓
Ajustes
↓
Próximo fluxo
```

Durante a Pré-Migração Estrutural do Front-end, o Back pode continuar avançando em:

```text
apps/api
+
modelagem
+
banco
+
migrations
+
auth
+
contratos
```

Assim que existir:

```text
Page
+
Route
+
Contrato
+
Endpoint
```

um fluxo pode começar a ser integrado.

---

## 19. Organização de Pull Requests

Preferir PRs pequenos e com escopo claro.

Exemplos:

```text
chore: prepara estrutura inicial da api
chore: configura prisma e postgres
feat: adiciona modelagem inicial de usuarios
docs: adiciona contrato de autenticacao
feat: implementa login inicial
feat: adiciona autorizacao por perfil
```

Evitar PRs como:

```text
feat: implementa backend
```

com muitas funcionalidades misturadas.

Cada PR deve informar:

- objetivo;
- arquivos/domínio afetado;
- migration adicionada, se houver;
- contrato alterado, se houver;
- como testar;
- limitações ou pendências.

---

## 20. Próximos passos imediatos

Considerando o estágio atual da equipe:

```text
1. Confirmar o estado atual do apps/api
↓
2. Registrar stack já decidida e pendências técnicas
↓
3. Finalizar modelagem mínima de autenticação e perfis
↓
4. Configurar/validar PostgreSQL + Prisma
↓
5. Criar migrations iniciais
↓
6. Documentar contrato de autenticação
↓
7. Implementar primeiro endpoint integrável
↓
8. Validar autenticação/autorização localmente
↓
9. Alinhar o contrato com o Front-end
↓
10. Realizar primeira integração real de Auth
↓
11. Em paralelo, validar arquitetura de mídia/storage antes do fluxo de entrevista
```

A decisão vaga x área/subárea deve continuar em paralelo e não deve bloquear esses passos.

---

## 21. Resultado esperado da preparação

Ao final desta fase, o Back-end deve estar em uma situação em que:

```text
apps/api OPERACIONAL
+
STACK PRINCIPAL DOCUMENTADA
+
POSTGRESQL / PRISMA CONFIGURADOS
+
MODELAGEM MÍNIMA DEFINIDA
+
MIGRATIONS FUNCIONANDO
+
CONTRATO DE AUTH DOCUMENTADO
+
PRIMEIRO ENDPOINT DISPONÍVEL
+
AUTORIZAÇÃO BÁSICA DEFINIDA
+
API ESTÁVEL LOCALMENTE
↓
CHECKPOINT DE PRIMEIRA INTEGRAÇÃO
↓
INTEGRAÇÕES VERTICAIS
```

A partir desse ponto, Front-end e Back-end deixam de evoluir de forma isolada e passam a avançar por fluxos reais e incrementais.

---

## 22. Visão geral da evolução

```text
PREPARAÇÃO DO BACK-END
↓
apps/api
Stack
PostgreSQL
Prisma
Modelagem mínima
Migrations
Contrato Auth
Endpoint Auth
↓
CHECKPOINT DE PRIMEIRA INTEGRAÇÃO
↓
INTEGRAÇÃO VERTICAL
↓
Auth
Perfil
Contexto
Entrevista/Vídeo
Avaliação
Relatório
Gamificação base
```

O objetivo não é construir toda a arquitetura antes de integrar.

O objetivo é construir o necessário, validar cedo e evoluir com segurança.
