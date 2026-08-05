# RH Connect

Plataforma web educacional para preparação de candidatos em entrevistas de emprego por meio de personalização por área, subárea, vaga e perfil profissional.

O **RH Connect** utiliza tecnologia e Inteligência Artificial para aproximar o treinamento do contexto real de cada candidato, oferecendo perguntas técnicas, comportamentais, situacionais e de apresentação pessoal, além de feedback e acompanhamento do desempenho.

> Projeto desenvolvido por estudantes do SENAC-DF com foco em inovação aplicada a Recursos Humanos.

---


## Objetivo

O RH Connect busca ajudar candidatos que apresentam insegurança, pouca experiência em entrevistas ou dificuldade para organizar suas respostas.

A plataforma pretende oferecer:

- simulações personalizadas de entrevistas;
- preparação baseada no perfil ou em uma vaga;
- perguntas técnicas e comportamentais;
- prática por texto, áudio, vídeo;
- revisão das respostas;
- feedback e relatório de desempenho;
- exportação de relatórios em PDF;
- experiência acessível e responsiva.

---

## Personalização da entrevista

A área cadastrada no perfil será utilizada como **recomendação**, mas não limitará o candidato.

O usuário poderá escolher entre:

1. **Baseada no perfil** — utiliza a área e a subárea cadastradas;
2. **Baseada em uma vaga** — considera cargo, requisitos, nível e competências;
3. **Escolha livre** — permite selecionar outra área e subárea;
4. **Entrevista geral** — utiliza perguntas comuns a diferentes processos seletivos.

### Fluxo planejado

```text
Formato da resposta
        ↓
Origem da personalização
        ↓
Área
        ↓
Subárea
        ↓
Foco da entrevista
        ↓
Configuração
        ↓
Teste de equipamento
        ↓
Entrevista
        ↓
Revisão da resposta
```

---

## Formatos de resposta

### Texto

Permite avaliar:

- coerência;
- argumentação;
- organização;
- síntese;
- gramática.

### Áudio

Permite praticar:

- clareza;
- dicção;
- ritmo;
- entonação;
- objetividade;
- organização da fala.

### Vídeo

É uma funcionalidade desejada para etapas futuras e poderá permitir a análise de:

- comunicação verbal;
- postura;
- contato visual;
- expressão;
- clareza;
- segurança.

---

## Tipos de perguntas

O sistema poderá trabalhar com os seguintes grupos:

- **Técnicas:** ferramentas, processos, metodologias e conhecimentos da área;
- **Comportamentais:** comunicação, iniciativa, responsabilidade, trabalho em equipe e adaptabilidade;
- **Apresentação pessoal:** trajetória, formação, experiências, objetivos e pontos fortes;
- **Situacionais:** tomada de decisão, prioridades, conflitos, imprevistos e resolução de problemas;
- **Gerais:** perguntas comuns a diferentes processos seletivos.

As perguntas serão apoiadas por uma base previamente preparada pela equipe de Recursos Humanos e poderão ser complementadas por Inteligência Artificial de acordo com a vaga e o perfil escolhido.

---

## Escopo inicial

A primeira versão será desenvolvida para **Web**.

O MVP prioriza:

- escolha do formato;
- personalização por perfil, vaga, área ou entrevista geral;
- seleção de área e subárea;
- escolha do foco da entrevista;
- resumo da configuração;
- teste de microfone;
- entrevista por áudio;
- revisão da resposta;
- responsividade;
- acessibilidade básica;
- uso de dados simulados enquanto o back-end estiver em evolução.

Funcionalidades mais avançadas, como análise completa de vídeo, recomendações por currículo, busca inteligente e personalização por histórico, poderão ser implementadas posteriormente.

---

## Estrutura do monorepositório

```text
rh-connect/
├── .github/          # Templates e configurações do GitHub
├── backend/          # API, IA, regras de negócio e persistência
├── docs/             # Documentação funcional e técnica
├── frontend/         # Interface, componentes e integração com a API
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

### Front-end

Responsável por:

- telas e navegação;
- cards de personalização;
- seleção de área, subárea e foco;
- gravador e player de áudio;
- temporizador e progresso;
- responsividade;
- acessibilidade;
- mensagens de erro e carregamento;
- integração com a API.

### Back-end

Responsável por:

- áreas e subáreas;
- perfil e vagas cadastradas;
- geração e filtragem de perguntas;
- configuração da entrevista;
- respostas e histórico;
- arquivos de áudio;
- status da entrevista;
- integração com Inteligência Artificial;
- futuras regras de autenticação e banco de dados.

---

## Tecnologias

### Utilizadas atualmente

- HTML;
- CSS;
- JavaScript;
- Node.js;
- Express;
- API da Groq;
- Git e GitHub.

### Planejadas ou em avaliação

- banco de dados em nuvem;
- processamento de linguagem natural;
- reconhecimento e transcrição de voz;
- análise de vídeo;
- geração de relatórios em PDF;
- autenticação de usuários.

---

## Como instalar

### 1. Clonar o repositório

```bash
git clone URL_DO_REPOSITORIO
cd rh-connect
```

### 2. Instalar o back-end

```bash
cd backend
npm install
```

### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Preencha o arquivo `.env`:

```env
PORT=3000
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Nunca envie o arquivo `.env` para o GitHub.

---

## Como executar

### Back-end

Dentro da pasta `backend`:

```bash
npm start
```

### Front-end

No estágio atual, abra o projeto da pasta `frontend` com uma extensão como **Live Server** ou com o método definido pela equipe.

Caso o front-end passe a utilizar um framework, os comandos desta seção deverão ser atualizados.

---

## Como contribuir

As regras completas estão no arquivo [`CONTRIBUTING.md`](./CONTRIBUTING.md).

Fluxo básico:

```bash
git checkout main
git pull origin main
git checkout -b feature/nome-da-tarefa
```

Depois das alterações:

```bash
git add .
git commit -m "feat: descreve a funcionalidade"
git push -u origin feature/nome-da-tarefa
```

Em seguida, abra um Pull Request para a branch `main`.

### Padrões de branch

```text
feature/nome-da-funcionalidade
fix/nome-do-problema
docs/nome-da-documentacao
refactor/nome-da-reorganizacao
```

### Padrões de commit

```text
feat: nova funcionalidade
fix: correção de erro
docs: documentação
refactor: reorganização do código
style: alteração visual
test: testes
chore: configuração ou manutenção
```

---

## Acessibilidade

O RH Connect deverá considerar:

- navegação por teclado;
- foco visível;
- contraste adequado;
- leitores de tela;
- seleção sem depender apenas de cor;
- áreas de toque adequadas;
- redução de animações;
- alternativas entre texto, áudio e vídeo;
- mensagens claras e objetivas.

O candidato não deverá ser penalizado por utilizar um formato de resposta acessível.

---

## Identidade visual

A interface deverá seguir o Design System do RH Connect:

---

## Status do projeto

> Em desenvolvimento.

A estrutura inicial do monorepositório está sendo organizada e as equipes estão divididas entre **Front-end** e **Back-end**.

---

## Documentação

Os documentos complementares devem ser mantidos na pasta [`docs`](./docs).

Sugestão de arquivos:

```text
docs/
├── DOCUMENTACAO_PROJETO.md
├── API.md
├── ARCHITECTURE.md
└── GIT_GUIDE.md
```

---

## Uso

O RH Connect possui finalidade **educacional** e, nesta etapa, não é destinado ao uso direto por empresas em processos seletivos reais.
