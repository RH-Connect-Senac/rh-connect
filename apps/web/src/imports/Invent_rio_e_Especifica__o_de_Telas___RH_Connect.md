# **Inventário e Especificação de Telas — RH Connect**

**Versão:** 0.1  
**Tipo de documento:** Especificação preliminar de UX/UI e funcionalidades  
**Projeto:** RH Connect  
**Instituição:** SENAC-DF  
**Status:** Documento de trabalho para discussão e validação coletiva  
**Documento relacionado:** PRD Preliminar do RH Connect — versão 0.1

---

## **1\. Objetivo deste documento**

Este documento apresenta o inventário preliminar das telas previstas para o RH Connect e descreve, de forma organizada, o objetivo, o conteúdo, as ações, os estados e as regras relacionadas a cada interface.

O objetivo é servir como referência para:

* equipe de Produto e Requisitos;  
* equipe de UX/UI;  
* equipe de Front-end;  
* equipe de Back-end;  
* equipe de Banco de Dados;  
* equipe de Testes;  
* equipe de Recursos Humanos;  
* equipe responsável pela futura integração com Inteligência Artificial.

O documento não representa uma definição definitiva. Algumas telas, regras e funcionalidades ainda deverão ser discutidas e aprovadas pela turma.

O PRD preliminar define que o RH Connect será uma plataforma web responsiva, com três perfis principais no MVP: candidato, avaliador e administrador. Também estabelece como fluxo principal o cadastro do candidato, o registro da vaga, a entrevista em vídeo, a avaliação humana e a liberação do relatório.

---

# **2\. Legenda e padrões utilizados**

## **2.1 Status**

### **Confirmado**

Informação já definida pela apresentação ou pela turma.

### **Proposto**

Sugestão considerada adequada para a primeira versão, mas ainda sujeita à aprovação.

### **A definir**

Decisão que ainda depende da turma.

### **Futuro**

Funcionalidade prevista para fases posteriores.

---

## **2.2 Prioridade**

### **Must**

Obrigatória para validar o funcionamento principal do produto.

### **Should**

Importante, mas pode ser simplificada ou adiada caso o prazo seja reduzido.

### **Could**

Desejável, mas não necessária para a primeira entrega.

### **Won’t now**

Não deverá entrar na primeira entrega.

---

## **2.3 Fases do produto**

### **MVP — Avaliação humana**

Primeira versão funcional do sistema.

### **Fase 2 — Experiência e evolução**

Aprimoramentos de acompanhamento, relatórios, notificações e produtividade.

### **Fase 3 — IA supervisionada**

A IA começa a sugerir perguntas, notas ou feedbacks, sempre revisados por humanos.

### **Fase 4 — Automação controlada**

Automação parcial de critérios que tenham alcançado nível adequado de confiabilidade.

---

## **2.4 Prefixos das telas**

| Prefixo | Área |
| ----- | ----- |
| PUB | Área pública |
| AUT | Autenticação |
| CAN | Área do candidato |
| ENT | Fluxo de entrevista |
| AVL | Área do avaliador |
| ADM | Área administrativa |
| CFG | Configurações |
| LEG | Privacidade, termos e consentimentos |
| IA | Inteligência Artificial futura |
| ERR | Estados de erro e sistema |

---

# **3\. Visão geral do inventário**

## **3.1 Telas da área pública**

1. PUB-001 — Página inicial  
2. PUB-002 — Como funciona  
3. PUB-003 — Sobre o projeto  
4. LEG-001 — Termos de uso  
5. LEG-002 — Política de privacidade

## 

## **3.2 Telas de autenticação**

6. AUT-001 — Login  
7. AUT-002 — Cadastro do candidato  
8. AUT-003 — Verificação de e-mail  
9. AUT-004 — Recuperação de senha  
10. AUT-005 — Redefinição de senha

## **3.3 Telas do candidato**

11. CAN-001 — Dashboard do candidato  
12. CAN-002 — Meu perfil  
13. CAN-003 — Perfil profissional  
14. CAN-004 — Minhas vagas  
15. CAN-005 — Cadastro de vaga  
16. CAN-006 — Detalhes da vaga  
17. CAN-007 — Histórico de entrevistas  
18. CAN-008 — Detalhes da entrevista  
19. CAN-009 — Resultado e relatório  
20. CAN-010 — Minha evolução  
21. CAN-011 — Materiais de apoio  
22. CFG-001 — Configurações do candidato

## **3.4 Telas do fluxo de entrevista**

23. ENT-001 — Seleção da vaga  
24. ENT-002 — Configuração da entrevista  
25. ENT-003 — Orientações iniciais  
26. ENT-004 — Consentimento para gravação  
27. ENT-005 — Teste de câmera e microfone  
28. ENT-006 — Entrevista simulada  
29. ENT-007 — Revisão da resposta  
30. ENT-008 — Confirmação de envio  
31. ENT-009 — Entrevista concluída  
32. ENT-010 — Avaliação pendente

## **3.5 Telas do avaliador**

33. AVL-001 — Dashboard do avaliador  
34. AVL-002 — Fila de avaliações  
35. AVL-003 — Avaliações em andamento  
36. AVL-004 — Tela de avaliação  
37. AVL-005 — Revisão da avaliação  
38. AVL-006 — Avaliação concluída  
39. AVL-007 — Histórico de avaliações  
40. AVL-008 — Guia de critérios  
41. CFG-002 — Configurações do avaliador

## **3.6 Telas do administrador**

42. ADM-001 — Dashboard administrativo  
43. ADM-002 — Gestão de candidatos  
44. ADM-003 — Detalhes do candidato  
45. ADM-004 — Gestão de avaliadores  
46. ADM-005 — Cadastro e edição de avaliador  
47. ADM-006 — Gestão de entrevistas  
48. ADM-007 — Atribuição de avaliações  
49. ADM-008 — Banco de perguntas  
50. ADM-009 — Cadastro e edição de pergunta  
51. ADM-010 — Cargos e áreas  
52. ADM-011 — Critérios de avaliação  
53. ADM-012 — Relatórios administrativos  
54. ADM-013 — Consentimentos e privacidade  
55. ADM-014 — Logs de auditoria  
56. ADM-015 — Configurações gerais

## **3.7 Telas futuras de Inteligência Artificial**

57. IA-001 — Dashboard da IA  
58. IA-002 — Comparação humano versus IA  
59. IA-003 — Revisão da sugestão da IA  
60. IA-004 — Dados elegíveis para treinamento  
61. IA-005 — Métricas e versões do modelo

## **3.8 Estados gerais do sistema**

62. ERR-001 — Acesso negado  
63. ERR-002 — Página não encontrada  
64. ERR-003 — Erro inesperado  
65. ERR-004 — Falha de conexão  
66. ERR-005 — Manutenção  
67. ERR-006 — Sessão expirada

---

# 

# 

# **4\. Especificação das telas públicas**

# **PUB-001 — Página inicial**

**Perfil de acesso:** Público  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Apresentar a proposta do RH Connect e conduzir o visitante para o cadastro ou login.

## **Conteúdo principal**

* cabeçalho com identidade do RH Connect;  
* menu principal;  
* chamada principal;  
* frase de posicionamento;  
* explicação resumida do problema;  
* apresentação da solução;  
* seção “Como funciona”;  
* principais benefícios;  
* público-alvo;  
* chamada para iniciar o treinamento;  
* informações sobre avaliação humana;  
* menção à evolução futura com IA supervisionada;  
* rodapé;  
* links para termos e política de privacidade.

## **Chamada principal sugerida**

> Seu treinamento inteligente para conquistar a vaga dos seus sonhos.

## **Ações disponíveis**

* criar conta;  
* entrar;  
* conhecer o funcionamento;  
* acessar informações sobre o projeto;  
* consultar termos;  
* consultar política de privacidade.

## **Estados da tela**

* carregamento normal;  
* falha ao carregar conteúdo;  
* usuário já autenticado;  
* navegação mobile aberta;  
* navegação mobile fechada.

## **Regras relacionadas**

* usuários autenticados podem ser direcionados ao dashboard;  
* a página deve funcionar sem autenticação;  
* o botão principal deve permanecer visível em dispositivos móveis;  
* a comunicação não deve prometer aprovação em processos seletivos.

## **Critérios de aceite**

* o visitante consegue compreender a proposta sem precisar criar conta;  
* os botões de cadastro e login funcionam;  
* a página é utilizável em desktop, tablet e celular;  
* os textos legais são acessíveis pelo rodapé.

---

# **PUB-002 — Como funciona**

**Perfil de acesso:** Público  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Explicar de forma visual e simples a jornada do candidato.

## **Etapas apresentadas**

1. Crie sua conta;  
2. Complete seu perfil;  
3. Cadastre a vaga;  
4. Faça a entrevista;  
5. Envie suas respostas;  
6. Receba a avaliação;  
7. Consulte o relatório;  
8. Pratique novamente.

## **Conteúdo adicional**

* explicação sobre avaliação humana;  
* orientação sobre gravação;  
* expectativa de tempo;  
* aviso de que a plataforma é de treinamento;  
* explicação de que a nota não representa garantia de contratação.

## **Ações**

* criar conta;  
* voltar para a página inicial;  
* entrar no sistema.

## **Critérios de aceite**

* cada etapa apresenta título e descrição;  
* a sequência é compreensível no celular;  
* o conteúdo não contradiz o PRD.

---

# **PUB-003 — Sobre o projeto**

**Perfil de acesso:** Público  
**Fase:** MVP  
**Prioridade:** Could  
**Status:** Proposto

## **Objetivo**

Apresentar a origem acadêmica, o propósito e a visão do projeto.

## **Conteúdo sugerido**

* apresentação do RH Connect;  
* contexto do SENAC-DF;  
* propósito educacional;  
* problema identificado;  
* missão;  
* visão;  
* equipe ou turma responsável;  
* professor orientador;  
* tecnologias como tema de pesquisa;  
* evolução prevista para IA supervisionada.

## **Observação**

A exposição dos nomes dos participantes deverá ser aprovada pela turma.

---

# **LEG-001 — Termos de uso**

**Perfil de acesso:** Público e autenticado  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Apresentar as regras de utilização da plataforma.

## **Conteúdo mínimo**

* finalidade educacional;  
* responsabilidades do usuário;  
* regras de conduta;  
* uso de câmera e microfone;  
* envio de vídeos;  
* limitações do serviço;  
* proibição de conteúdo impróprio;  
* suspensão e exclusão de contas;  
* propriedade e uso de conteúdos;  
* ausência de garantia de contratação;  
* alterações dos termos;  
* contato.

## **Ações**

* voltar;  
* aceitar, quando exibido no cadastro;  
* acessar política de privacidade.

---

# **LEG-002 — Política de privacidade**

**Perfil de acesso:** Público e autenticado  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Explicar como os dados serão coletados, utilizados, armazenados e protegidos.

## **Conteúdo mínimo**

* dados pessoais coletados;  
* dados profissionais;  
* imagem e voz;  
* vídeos;  
* finalidade da avaliação;  
* quem poderá acessar;  
* armazenamento;  
* retenção;  
* exclusão;  
* consentimento;  
* uso futuro em IA;  
* diferença entre consentimento de gravação e consentimento de treinamento;  
* direitos do usuário;  
* canal de contato.

## **Regra importante**

A autorização para gravação e avaliação não poderá representar automaticamente autorização para treinamento da IA.

---

# **5\. Especificação das telas de autenticação**

# **AUT-001 — Login**

**Perfis:** Candidato, avaliador e administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Permitir acesso seguro ao sistema.

## **Componentes**

* campo de e-mail;  
* campo de senha;  
* opção de mostrar ou ocultar senha;  
* opção “Lembrar meu acesso”, caso aprovada;  
* botão “Entrar”;  
* link “Esqueci minha senha”;  
* link “Criar conta”;  
* mensagem de erro;  
* link para termos e privacidade.

## **Ações**

* entrar;  
* recuperar senha;  
* criar conta.

## **Estados**

* formulário vazio;  
* validação dos campos;  
* credenciais inválidas;  
* conta bloqueada;  
* conta inativa;  
* e-mail não verificado;  
* carregamento;  
* erro de conexão;  
* acesso realizado.

## **Regras**

* o usuário deve ser direcionado ao ambiente correspondente ao perfil;  
* a senha não deve ser exibida por padrão;  
* mensagens de erro não devem revelar se determinado e-mail existe;  
* tentativas suspeitas devem ser registradas.

## **Critérios de aceite**

* cada perfil acessa seu dashboard correto;  
* usuários bloqueados não conseguem entrar;  
* os campos possuem rótulos acessíveis;  
* o sistema apresenta feedback durante o carregamento.

---

# **AUT-002 — Cadastro do candidato**

**Perfil:** Público  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Criar a conta inicial do candidato.

## **Campos mínimos**

* nome completo;  
* e-mail;  
* senha;  
* confirmação da senha;  
* aceite dos termos;  
* aceite da política de privacidade.

## **Campos opcionais**

* telefone;  
* data de nascimento;  
* cidade;  
* foto.

## **Ações**

* criar conta;  
* entrar;  
* abrir termos;  
* abrir política de privacidade.

## **Estados**

* formulário inicial;  
* campo inválido;  
* e-mail já utilizado;  
* senha fraca;  
* senhas diferentes;  
* termos não aceitos;  
* cadastro em andamento;  
* cadastro concluído;  
* erro ao cadastrar.

## **Regras**

* o cadastro público deverá criar somente perfil de candidato;  
* avaliadores serão cadastrados ou convidados pelo administrador;  
* a senha deverá respeitar critérios mínimos;  
* o aceite deverá registrar data e versão dos documentos.

---

# **AUT-003 — Verificação de e-mail**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Confirmar que o e-mail pertence ao usuário.

## **Conteúdo**

* mensagem de envio;  
* e-mail parcialmente ocultado;  
* instrução para verificar caixa de entrada;  
* botão para reenviar;  
* opção para corrigir e-mail.

## **Estados**

* aguardando confirmação;  
* código ou link expirado;  
* reenviado;  
* e-mail confirmado;  
* falha.

---

# **AUT-004 — Recuperação de senha**

**Perfis:** Todos  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Permitir que o usuário solicite a redefinição da senha.

## **Componentes**

* campo de e-mail;  
* botão de envio;  
* link para retornar ao login.

## **Regra**

A mensagem apresentada deve ser genérica, independentemente de o e-mail existir ou não.

---

# **AUT-005 — Redefinição de senha**

**Perfis:** Todos  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Conteúdo**

* nova senha;  
* confirmação;  
* indicadores de segurança;  
* botão para confirmar.

## **Estados**

* link válido;  
* link expirado;  
* senha inválida;  
* senha redefinida;  
* falha.

---

# **6\. Especificação das telas do candidato**

# **CAN-001 — Dashboard do candidato**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Apresentar uma visão geral da situação do candidato e destacar as principais ações.

## **Conteúdo do MVP**

* saudação;  
* progresso do perfil;  
* botão “Iniciar nova entrevista”;  
* entrevistas em andamento;  
* entrevistas aguardando avaliação;  
* último resultado;  
* quantidade de entrevistas;  
* histórico recente;  
* atalho para cadastrar vaga.

## **Conteúdo futuro**

* média geral;  
* gráfico de evolução;  
* principal ponto forte;  
* principal ponto de melhoria;  
* materiais recomendados;  
* metas;  
* sequência de práticas.

## **Ações**

* iniciar entrevista;  
* continuar entrevista;  
* completar perfil;  
* cadastrar vaga;  
* abrir resultado;  
* abrir histórico.

## **Estados**

### **Usuário novo**

* perfil incompleto;  
* nenhuma vaga;  
* nenhuma entrevista;  
* instrução inicial.

### **Perfil completo, sem entrevista**

* destaque para cadastrar vaga;  
* destaque para iniciar prática.

### **Entrevista em andamento**

* botão “Continuar entrevista”;  
* progresso salvo.

### **Avaliação pendente**

* status;  
* data de envio;  
* mensagem de espera.

### **Resultado disponível**

* nota;  
* classificação;  
* botão “Ver relatório”.

### **Erro**

* cards indisponíveis;  
* botão para tentar novamente.

## **Regras**

* exibir somente dados do usuário autenticado;  
* não apresentar nota antes da conclusão da avaliação;  
* estados vazios devem orientar a próxima ação.

---

# **CAN-002 — Meu perfil**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Gerenciar dados pessoais e informações básicas da conta.

## **Campos sugeridos**

* nome;  
* foto;  
* e-mail;  
* telefone;  
* data de nascimento;  
* cidade;  
* estado;  
* apresentação pessoal curta.

## **Ações**

* editar;  
* salvar;  
* cancelar;  
* alterar foto;  
* remover foto.

## **Estados**

* visualização;  
* edição;  
* salvando;  
* salvo;  
* erro;  
* campo inválido.

## **Regras**

* alteração do e-mail pode exigir nova confirmação;  
* dados não necessários não devem ser obrigatórios;  
* informações sensíveis devem ser protegidas.

---

# **CAN-003 — Perfil profissional**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Registrar o contexto profissional utilizado nas entrevistas.

## **Seções**

### **Objetivo profissional**

* área de interesse;  
* cargo desejado;  
* nível profissional;  
* resumo profissional.

### **Formação acadêmica**

* curso;  
* instituição;  
* nível;  
* situação;  
* início;  
* conclusão.

### **Cursos complementares**

* nome;  
* instituição;  
* carga horária;  
* conclusão.

### **Experiências**

* empresa;  
* cargo;  
* período;  
* descrição das atividades.

### **Habilidades**

* habilidades técnicas;  
* habilidades comportamentais;  
* ferramentas;  
* idiomas.

## **Ações**

* adicionar item;  
* editar;  
* excluir;  
* salvar;  
* concluir perfil.

## **Estados**

* perfil vazio;  
* parcialmente preenchido;  
* completo;  
* salvando;  
* erro.

## **Regras**

* o candidato pode editar apenas o próprio perfil;  
* o percentual de conclusão deve considerar apenas campos definidos como essenciais;  
* exclusões devem solicitar confirmação.

---

# **CAN-004 — Minhas vagas**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Listar as vagas usadas como contexto para as entrevistas.

## **Informações por vaga**

* cargo;  
* empresa;  
* área;  
* tipo;  
* data de cadastro;  
* número de entrevistas relacionadas;  
* status.

## **Ações**

* cadastrar nova vaga;  
* visualizar;  
* editar;  
* excluir;  
* iniciar entrevista;  
* duplicar, futuramente.

## **Filtros sugeridos**

* empresa;  
* cargo;  
* área;  
* data.

## **Estados**

* nenhuma vaga;  
* vagas cadastradas;  
* resultado de busca vazio;  
* carregando;  
* erro.

## **Regras**

* o candidato vê somente as próprias vagas;  
* uma vaga vinculada a entrevista concluída não deve ser apagada sem tratamento do histórico;  
* pode ser preferível arquivar em vez de excluir definitivamente.

---

# **CAN-005 — Cadastro de vaga**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Registrar as informações da oportunidade desejada.

## **Campos mínimos**

* cargo;  
* empresa;  
* área;  
* tipo de vaga;  
* nível;  
* descrição;  
* requisitos principais.

## **Tipos possíveis**

* jovem aprendiz;  
* estágio;  
* trainee;  
* CLT;  
* temporário;  
* outro.

## **Campos futuros**

* link da vaga;  
* arquivo da descrição;  
* modalidade presencial, híbrida ou remota;  
* faixa salarial;  
* localização;  
* competências exigidas.

## **Ações**

* salvar;  
* salvar e iniciar entrevista;  
* cancelar.

## **Estados**

* formulário vazio;  
* edição;  
* validação;  
* salvamento;  
* sucesso;  
* erro.

---

# **CAN-006 — Detalhes da vaga**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Apresentar todas as informações da vaga e as entrevistas relacionadas.

## **Conteúdo**

* empresa;  
* cargo;  
* área;  
* tipo;  
* descrição;  
* requisitos;  
* data de cadastro;  
* entrevistas realizadas;  
* melhor resultado, futuramente.

## **Ações**

* editar;  
* iniciar entrevista;  
* arquivar;  
* excluir;  
* voltar.

---

# **CAN-007 — Histórico de entrevistas**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Permitir o acompanhamento das entrevistas realizadas.

## **Informações por entrevista**

* vaga;  
* empresa;  
* data;  
* quantidade de perguntas;  
* status;  
* nota, quando liberada;  
* classificação;  
* ação principal.

## **Status possíveis**

* não iniciada;  
* em preparação;  
* em andamento;  
* aguardando envio;  
* enviada;  
* aguardando avaliação;  
* em avaliação;  
* concluída;  
* cancelada;  
* erro de envio.

## **Ações**

* continuar;  
* visualizar detalhes;  
* consultar resultado;  
* cancelar, quando permitido;  
* excluir, quando permitido.

## **Filtros**

* status;  
* data;  
* vaga;  
* empresa.

---

# **CAN-008 — Detalhes da entrevista**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Apresentar os dados completos de uma entrevista específica.

## **Conteúdo**

* vaga;  
* data de criação;  
* data de envio;  
* status;  
* perguntas;  
* respostas enviadas;  
* vídeos;  
* avaliação;  
* relatório;  
* eventos do fluxo.

## **Ações**

* continuar entrevista;  
* assistir a vídeo próprio, se permitido;  
* abrir relatório;  
* solicitar suporte;  
* solicitar exclusão.

## **Decisões pendentes**

* o candidato poderá assistir aos vídeos após o envio?  
* poderá excluir apenas o vídeo?  
* poderá solicitar revisão da avaliação?

---

# **CAN-009 — Resultado e relatório**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Confirmado em conceito

## **Objetivo**

Apresentar a avaliação final de forma clara, educativa e acionável.

## **Conteúdo principal**

* identificação da entrevista;  
* nota geral;  
* classificação;  
* resumo;  
* notas por critério;  
* pontos fortes;  
* pontos de melhoria;  
* recomendações;  
* mensagem de incentivo;  
* botão para nova prática.

## **Critérios preliminares**

* clareza;  
* objetividade;  
* comunicação;  
* segurança;  
* coerência;  
* domínio do assunto;  
* organização das ideias;  
* postura;  
* contato visual.

## **Classificações preliminares**

* excelente;  
* boa;  
* precisa melhorar.

## **Classificação geral prevista na apresentação**

* apto para entrevistas;  
* parcialmente preparado;  
* necessita de mais treinamento.

## **Estados**

* avaliação ainda não disponível;  
* relatório disponível;  
* relatório parcialmente carregado;  
* avaliação reaberta;  
* erro.

## **Regras**

* a nota não deve ser apresentada como garantia de aprovação;  
* toda nota deve vir acompanhada de explicação;  
* observações internas não podem aparecer;  
* avaliações em rascunho não podem ser visualizadas.

---

# **CAN-010 — Minha evolução**

**Perfil:** Candidato  
**Fase:** Fase 2  
**Prioridade:** Could  
**Status:** Futuro

## **Objetivo**

Mostrar a evolução do candidato ao longo das entrevistas.

## **Conteúdo**

* gráfico de nota geral;  
* evolução por critério;  
* comparação entre tentativas;  
* melhor resultado;  
* critério com maior avanço;  
* critério que precisa de atenção;  
* frequência de práticas.

## **Estado vazio**

Caso o candidato ainda não tenha entrevistas suficientes, apresentar orientação para realizar novas práticas.

---

# **CAN-011 — Materiais de apoio**

**Perfil:** Candidato  
**Fase:** Fase 2  
**Prioridade:** Could  
**Status:** Futuro

## **Objetivo**

Disponibilizar conteúdos de preparação.

## **Categorias possíveis**

* apresentação pessoal;  
* comunicação;  
* postura;  
* perguntas comportamentais;  
* perguntas técnicas;  
* pesquisa sobre empresas;  
* organização de respostas;  
* método STAR;  
* primeiro emprego;  
* estágio;  
* jovem aprendiz.

## **Ações**

* abrir conteúdo;  
* salvar como favorito;  
* marcar como concluído;  
* iniciar entrevista relacionada.

---

# **CFG-001 — Configurações do candidato**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Seções**

* conta;  
* senha;  
* notificações;  
* privacidade;  
* consentimentos;  
* dados e vídeos;  
* exclusão da conta;  
* sair.

## **Ações críticas**

* revogar consentimento;  
* solicitar dados;  
* solicitar exclusão;  
* excluir conta.

---

# **7\. Especificação do fluxo de entrevista**

# **ENT-001 — Seleção da vaga**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Escolher qual vaga será usada como contexto da entrevista.

## **Conteúdo**

* lista de vagas;  
* resumo de cada uma;  
* opção para cadastrar nova vaga;  
* última vaga utilizada.

## **Ações**

* selecionar;  
* cadastrar;  
* continuar.

## **Regra**

Uma vaga válida deve estar selecionada antes da configuração da entrevista.

---

# **ENT-002 — Configuração da entrevista**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Definir os parâmetros básicos da simulação.

## **Configurações possíveis**

* tipo de entrevista;  
* nível de dificuldade;  
* quantidade de perguntas;  
* perguntas comportamentais;  
* perguntas técnicas;  
* duração aproximada.

## **Decisões pendentes**

* quais campos serão controlados pelo candidato;  
* quantas perguntas haverá;  
* se as perguntas serão fixas, sorteadas ou escolhidas;  
* se o nível de dificuldade entrará no MVP.

## **Recomendação para o MVP**

Manter uma configuração simples, definida automaticamente conforme a vaga e o banco de perguntas.

---

# **ENT-003 — Orientações iniciais**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Preparar o candidato antes do início.

## **Conteúdo**

* duração estimada;  
* quantidade de perguntas;  
* funcionamento;  
* necessidade de câmera e microfone;  
* orientações de iluminação;  
* ambiente silencioso;  
* enquadramento;  
* conexão;  
* postura;  
* política de regravação;  
* aviso sobre envio.

## **Ações**

* continuar;  
* cancelar;  
* acessar ajuda.

---

# **ENT-004 — Consentimento para gravação**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Registrar autorização informada para gravação e armazenamento.

## **Consentimentos separados**

### **Obrigatório para participar**

* gravação de imagem e voz;  
* armazenamento para avaliação;  
* acesso por avaliador autorizado.

### **Opcional**

* uso anonimizado para estudos e treinamento futuro da IA.

## **Regras**

* consentimento opcional de IA não pode bloquear o uso normal;  
* versão e data devem ser registradas;  
* o texto deve ser claro;  
* o usuário deve poder consultar ou revogar o consentimento opcional.

---

# **ENT-005 — Teste de câmera e microfone**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Confirmado em conceito

## **Objetivo**

Verificar se o dispositivo está preparado para a entrevista.

## **Componentes**

* pré-visualização da câmera;  
* indicador do microfone;  
* seleção de câmera;  
* seleção de microfone;  
* teste de áudio;  
* instruções;  
* status dos dispositivos;  
* botão de continuar.

## **Estados**

* aguardando permissão;  
* câmera permitida;  
* câmera negada;  
* microfone permitido;  
* microfone negado;  
* dispositivo não encontrado;  
* dispositivo ocupado;  
* navegador incompatível;  
* teste aprovado;  
* conexão insuficiente.

## **Ações**

* permitir acesso;  
* repetir teste;  
* trocar dispositivo;  
* abrir ajuda;  
* continuar.

## **Critérios de aceite**

* o sistema identifica permissões negadas;  
* o candidato consegue visualizar sua imagem;  
* o sistema informa quando nenhum microfone é detectado;  
* não é possível avançar sem os requisitos mínimos definidos.

---

# **ENT-006 — Entrevista simulada**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Confirmado em conceito

## **Objetivo**

Apresentar as perguntas e registrar as respostas em vídeo.

## **Layout desktop sugerido**

* pergunta em destaque;  
* vídeo do candidato;  
* progresso;  
* cronômetro;  
* controles de gravação;  
* instruções.

## **Layout mobile sugerido**

* pergunta no topo;  
* vídeo ocupando a maior largura possível;  
* controles grandes;  
* progresso visível;  
* ações principais fixadas na parte inferior.

## **Conteúdo**

* cargo e empresa;  
* pergunta atual;  
* número da pergunta;  
* total;  
* tempo de preparação, se houver;  
* tempo de resposta;  
* visualização da câmera;  
* status da gravação.

## **Ações**

* iniciar gravação;  
* finalizar;  
* pausar, caso permitido;  
* cancelar;  
* abrir ajuda.

## **Estados**

* preparando pergunta;  
* aguardando gravação;  
* gravando;  
* pausado;  
* finalizando;  
* processando;  
* erro da câmera;  
* erro do microfone;  
* conexão perdida;  
* tempo encerrado;  
* resposta concluída.

## **Regras**

* uma resposta deve estar associada a uma pergunta;  
* o sistema deve informar claramente quando está gravando;  
* a troca de página durante a gravação deve gerar aviso;  
* falhas não podem gerar confirmação falsa;  
* a duração máxima ainda precisa ser definida.

---

# **ENT-007 — Revisão da resposta**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Permitir que o candidato confira a gravação antes de enviar.

## **Conteúdo**

* player de vídeo;  
* pergunta;  
* duração;  
* qualidade detectada;  
* tamanho aproximado;  
* aviso sobre envio.

## **Ações**

* assistir;  
* gravar novamente;  
* confirmar resposta;  
* voltar, quando permitido.

## **Decisão pendente**

Definir quantas regravações serão permitidas.

## **Estados**

* processando vídeo;  
* vídeo disponível;  
* vídeo corrompido;  
* falha ao carregar;  
* regravação indisponível;  
* resposta confirmada.

---

# **ENT-008 — Confirmação de envio**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Confirmar o envio das respostas.

## **Conteúdo**

* quantidade de respostas;  
* lista de perguntas respondidas;  
* status dos vídeos;  
* aviso de que o envio pode não ser reversível;  
* consentimentos relacionados.

## **Ações**

* enviar entrevista;  
* voltar para revisar;  
* cancelar.

## **Estados**

* pronto para envio;  
* enviando;  
* progresso;  
* falha parcial;  
* falha total;  
* envio concluído.

---

# **ENT-009 — Entrevista concluída**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Confirmar que a entrevista foi recebida.

## **Conteúdo**

* mensagem de sucesso;  
* protocolo ou identificação;  
* vaga;  
* data;  
* status;  
* próxima etapa;  
* orientação sobre avaliação humana.

## **Ações**

* voltar ao dashboard;  
* abrir histórico;  
* consultar detalhes.

## **Regra**

A tela só pode afirmar que o envio foi concluído após confirmação real do servidor.

---

# **ENT-010 — Avaliação pendente**

**Perfil:** Candidato  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Informar que a entrevista está aguardando avaliação.

## **Conteúdo**

* status atual;  
* data do envio;  
* etapas;  
* mensagem explicativa;  
* prazo, caso seja definido;  
* canal de suporte.

## **Status possíveis**

* aguardando atribuição;  
* atribuída;  
* em avaliação;  
* aguardando revisão;  
* concluída.

---

# **8\. Especificação das telas do avaliador**

# **AVL-001 — Dashboard do avaliador**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Apresentar a carga de trabalho e os atalhos principais.

## **Conteúdo**

* avaliações pendentes;  
* avaliações em andamento;  
* avaliações concluídas;  
* entrevistas prioritárias, se houver;  
* últimas avaliações;  
* acesso ao guia de critérios;  
* notificações.

## **Conteúdo futuro**

* tempo médio;  
* quantidade mensal;  
* divergências;  
* indicadores de qualidade.

## **Ações**

* iniciar avaliação;  
* continuar rascunho;  
* consultar histórico;  
* abrir guia.

---

# **AVL-002 — Fila de avaliações**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Listar as entrevistas atribuídas.

## **Informações**

* candidato ou identificador;  
* cargo;  
* empresa;  
* área;  
* data de envio;  
* quantidade de respostas;  
* prioridade;  
* status;  
* prazo, se existir.

## **Filtros**

* status;  
* área;  
* cargo;  
* data;  
* prioridade.

## **Ações**

* iniciar;  
* continuar;  
* abrir detalhes.

## **Regras**

* o avaliador vê apenas entrevistas atribuídas;  
* dados pessoais desnecessários devem ser ocultados;  
* a turma precisa decidir se o nome completo será exibido.

---

# **AVL-003 — Avaliações em andamento**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Listar avaliações salvas como rascunho.

## **Conteúdo**

* entrevista;  
* progresso;  
* última alteração;  
* campos pendentes;  
* botão “Continuar”.

---

# **AVL-004 — Tela de avaliação**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Confirmado em conceito

## **Objetivo**

Permitir a análise estruturada da entrevista.

## **Área principal**

* vídeo;  
* pergunta;  
* dados da vaga;  
* duração;  
* controles;  
* respostas seguintes e anteriores.

## **Painel de avaliação**

* clareza;  
* objetividade;  
* comunicação;  
* segurança;  
* coerência;  
* domínio do assunto;  
* organização;  
* postura;  
* contato visual.

## **Campos textuais**

* pontos fortes;  
* pontos de melhoria;  
* recomendação;  
* observação interna.

## **Ações**

* reproduzir vídeo;  
* avançar;  
* voltar;  
* atribuir nota;  
* salvar rascunho;  
* revisar;  
* concluir;  
* sair.

## **Estados**

* vídeo carregando;  
* vídeo disponível;  
* falha de reprodução;  
* rascunho salvo;  
* salvamento automático;  
* campo obrigatório pendente;  
* avaliação completa;  
* sessão expirada.

## **Regras**

* somente entrevistas atribuídas podem ser avaliadas;  
* notas devem respeitar a escala;  
* campos obrigatórios devem estar preenchidos;  
* observações internas não aparecem no relatório;  
* sair sem salvar deve gerar aviso;  
* uma avaliação concluída não deve ser alterada livremente.

---

# **AVL-005 — Revisão da avaliação**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Permitir a conferência antes da conclusão.

## **Conteúdo**

* notas;  
* média;  
* classificação;  
* pontos fortes;  
* melhorias;  
* recomendação;  
* campos ausentes;  
* aviso de conclusão.

## **Ações**

* voltar e editar;  
* concluir;  
* salvar rascunho.

---

# **AVL-006 — Avaliação concluída**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Confirmar o encerramento da análise.

## **Conteúdo**

* mensagem de sucesso;  
* data;  
* candidato ou identificador;  
* vaga;  
* status do relatório;  
* informação sobre liberação.

## **Ações**

* voltar à fila;  
* abrir histórico;  
* visualizar avaliação.

---

# **AVL-007 — Histórico de avaliações**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Consultar avaliações concluídas pelo próprio avaliador.

## **Informações**

* candidato ou código;  
* vaga;  
* data;  
* nota;  
* status;  
* revisão.

## **Ações**

* visualizar;  
* solicitar reabertura, se permitido;  
* filtrar.

---

# **AVL-008 — Guia de critérios**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Padronizar a interpretação dos critérios.

## **Conteúdo por critério**

* nome;  
* definição;  
* o que observar;  
* exemplos;  
* escala;  
* erros comuns;  
* aspectos que não devem influenciar;  
* orientações contra vieses.

## **Exemplo**

### **Clareza**

**Definição:** facilidade para compreender a mensagem.

**Nota baixa:** resposta confusa e difícil de acompanhar.

**Nota intermediária:** resposta compreensível, mas desorganizada.

**Nota alta:** resposta clara, estruturada e adequada à pergunta.

---

# **CFG-002 — Configurações do avaliador**

**Perfil:** Avaliador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Seções**

* dados pessoais;  
* senha;  
* notificações;  
* disponibilidade futura;  
* área de especialidade;  
* privacidade;  
* sair.

---

# **9\. Especificação das telas administrativas**

# **ADM-001 — Dashboard administrativo**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Apresentar uma visão geral da operação.

## **Indicadores**

* candidatos;  
* avaliadores;  
* entrevistas enviadas;  
* aguardando avaliação;  
* em avaliação;  
* concluídas;  
* perguntas ativas;  
* falhas de upload;  
* alertas.

## **Ações**

* cadastrar avaliador;  
* atribuir entrevista;  
* cadastrar pergunta;  
* visualizar pendências;  
* abrir relatórios.

---

# **ADM-002 — Gestão de candidatos**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Pesquisar e administrar contas de candidatos.

## **Informações**

* nome;  
* e-mail;  
* status;  
* cadastro;  
* entrevistas;  
* consentimentos;  
* última atividade.

## **Ações**

* visualizar;  
* ativar;  
* bloquear;  
* reativar;  
* consultar histórico;  
* atender exclusão.

## **Regras**

* ações críticas devem registrar responsável e motivo;  
* o administrador não deve visualizar senhas;  
* acesso a vídeos deve ser controlado.

---

# **ADM-003 — Detalhes do candidato**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Conteúdo**

* dados básicos;  
* perfil;  
* vagas;  
* entrevistas;  
* avaliações;  
* consentimentos;  
* solicitações;  
* logs relacionados.

## **Ações**

* bloquear;  
* reativar;  
* consultar entrevista;  
* tratar solicitação;  
* adicionar nota administrativa interna.

---

# **ADM-004 — Gestão de avaliadores**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Gerenciar avaliadores.

## **Informações**

* nome;  
* e-mail;  
* área;  
* status;  
* avaliações pendentes;  
* avaliações concluídas;  
* última atividade.

## **Ações**

* cadastrar;  
* editar;  
* ativar;  
* desativar;  
* atribuir entrevistas;  
* visualizar desempenho;  
* redefinir acesso.

---

# **ADM-005 — Cadastro e edição de avaliador**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Campos**

* nome;  
* e-mail;  
* área de conhecimento;  
* formação;  
* status;  
* permissões;  
* observações internas.

## **Ações**

* salvar;  
* enviar convite;  
* cancelar.

---

# **ADM-006 — Gestão de entrevistas**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Acompanhar todas as entrevistas.

## **Informações**

* candidato;  
* vaga;  
* data;  
* status;  
* avaliador;  
* quantidade de vídeos;  
* falhas;  
* relatório.

## **Filtros**

* status;  
* candidato;  
* avaliador;  
* área;  
* data;  
* erro.

## **Ações**

* abrir;  
* atribuir;  
* reatribuir;  
* alterar prioridade;  
* cancelar;  
* consultar logs.

---

# **ADM-007 — Atribuição de avaliações**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Vincular uma entrevista a um avaliador.

## **Conteúdo**

* entrevista;  
* área;  
* cargo;  
* avaliadores disponíveis;  
* carga de trabalho;  
* especialidade;  
* prazo.

## **Ações**

* atribuir;  
* reatribuir;  
* remover atribuição;  
* confirmar.

## **Regra**

A primeira versão pode utilizar distribuição manual.

---

# **ADM-008 — Banco de perguntas**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Gerenciar perguntas comportamentais e técnicas.

## **Informações**

* pergunta;  
* tipo;  
* área;  
* cargo;  
* dificuldade;  
* status;  
* data;  
* uso.

## **Ações**

* cadastrar;  
* editar;  
* duplicar;  
* ativar;  
* desativar;  
* excluir, quando permitido;  
* filtrar.

## **Regra**

Perguntas utilizadas em entrevistas concluídas devem ser preservadas no histórico.

---

# **ADM-009 — Cadastro e edição de pergunta**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Campos**

* texto da pergunta;  
* tipo;  
* área;  
* cargo;  
* nível;  
* orientação para avaliador;  
* critérios relacionados;  
* status.

## **Tipos**

* comportamental;  
* técnica;  
* apresentação;  
* situação prática.

## **Ações**

* salvar;  
* salvar como rascunho;  
* ativar;  
* cancelar.

---

# **ADM-010 — Cargos e áreas**

**Perfil:** Administrador  
**Fase:** MVP ou Fase 2  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Padronizar categorias profissionais.

## **Conteúdo**

* áreas;  
* cargos;  
* níveis;  
* tipos de vaga;  
* status.

## **Ações**

* cadastrar;  
* editar;  
* ativar;  
* desativar;  
* relacionar perguntas.

---

# **ADM-011 — Critérios de avaliação**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Configurar a rubrica de avaliação.

## **Conteúdo**

* nome;  
* definição;  
* escala;  
* peso;  
* obrigatoriedade;  
* tipo de entrevista;  
* status.

## **Ações**

* cadastrar;  
* editar;  
* ativar;  
* desativar;  
* ordenar;  
* visualizar guia.

## **Regra**

Alterações não devem modificar avaliações históricas.

---

# **ADM-012 — Relatórios administrativos**

**Perfil:** Administrador  
**Fase:** Fase 2  
**Prioridade:** Could  
**Status:** Futuro

## **Conteúdo**

* usuários;  
* entrevistas;  
* avaliações;  
* tempo médio;  
* critérios;  
* áreas;  
* falhas;  
* retenção;  
* exportações.

## **Ações**

* filtrar;  
* exportar;  
* comparar períodos.

---

# **ADM-013 — Consentimentos e privacidade**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Must  
**Status:** Proposto

## **Objetivo**

Consultar e operar solicitações relacionadas a dados.

## **Conteúdo**

* usuário;  
* consentimentos;  
* versão;  
* data;  
* revogação;  
* uso em IA;  
* solicitações de exclusão;  
* retenção.

## **Ações**

* consultar;  
* registrar atendimento;  
* iniciar anonimização;  
* concluir exclusão;  
* exportar evidência administrativa.

## **Regra**

O administrador não pode aceitar um consentimento em nome do usuário.

---

# **ADM-014 — Logs de auditoria**

**Perfil:** Administrador autorizado  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Objetivo**

Registrar ações críticas.

## **Eventos**

* login suspeito;  
* bloqueio;  
* alteração de perfil;  
* acesso a vídeo;  
* atribuição;  
* reabertura;  
* alteração de avaliação;  
* exclusão;  
* exportação;  
* operação em dados de IA.

## **Informações**

* responsável;  
* ação;  
* data;  
* contexto;  
* resultado;  
* motivo.

---

# **ADM-015 — Configurações gerais**

**Perfil:** Administrador  
**Fase:** MVP  
**Prioridade:** Should  
**Status:** Proposto

## **Configurações possíveis**

* quantidade de perguntas;  
* duração;  
* tamanho de vídeo;  
* formatos;  
* prazo de avaliação;  
* notificações;  
* textos;  
* critérios ativos;  
* retenção;  
* manutenção.

## **Regra**

Alterações críticas devem ser registradas.

---

# **10\. Telas futuras de Inteligência Artificial**

# **IA-001 — Dashboard da IA**

**Fase:** Fase 3  
**Prioridade:** Won’t now  
**Status:** Futuro

## **Objetivo**

Apresentar métricas da IA supervisionada.

## **Conteúdo**

* avaliações humanas;  
* sugestões da IA;  
* concordância;  
* divergência;  
* confiança;  
* casos pendentes;  
* dados elegíveis.

---

# **IA-002 — Comparação humano versus IA**

## **Conteúdo**

* nota humana;  
* nota sugerida;  
* diferença;  
* justificativa;  
* correção;  
* histórico.

## **Regra**

O candidato não deverá receber sugestão não revisada na primeira fase de IA.

---

# **IA-003 — Revisão da sugestão da IA**

## **Ações**

* aprovar;  
* corrigir;  
* rejeitar;  
* justificar;  
* encaminhar para revisão.

---

# **IA-004 — Dados elegíveis para treinamento**

## **Conteúdo**

* entrevistas autorizadas;  
* anonimização;  
* qualidade;  
* status;  
* origem;  
* consentimento.

## **Regra**

Somente dados com consentimento específico podem ser elegíveis.

---

# **IA-005 — Métricas e versões do modelo**

## **Conteúdo**

* versão;  
* data;  
* critérios;  
* desempenho;  
* vieses;  
* limitações;  
* responsáveis;  
* status.

---

# **11\. Estados gerais e telas de erro**

# **ERR-001 — Acesso negado**

## **Mensagem**

> Você não possui permissão para acessar esta área.

## **Ações**

* voltar ao dashboard;  
* entrar com outra conta;  
* solicitar suporte.

---

# **ERR-002 — Página não encontrada**

## **Mensagem**

> Não encontramos a página que você tentou acessar.

## **Ações**

* voltar ao início;  
* abrir dashboard;  
* pesquisar, caso aplicável.

---

# **ERR-003 — Erro inesperado**

## **Mensagem**

> Ocorreu um erro inesperado. Tente novamente.

## **Ações**

* tentar novamente;  
* voltar;  
* informar problema.

---

# **ERR-004 — Falha de conexão**

## **Mensagem**

> Sua conexão foi interrompida.

## **Comportamento recomendado**

* preservar dados preenchidos;  
* tentar reconectar;  
* não confirmar envio;  
* apresentar status claro.

---

# **ERR-005 — Manutenção**

## **Conteúdo**

* mensagem;  
* previsão, quando disponível;  
* canal de suporte.

---

# **ERR-006 — Sessão expirada**

## **Mensagem**

> Sua sessão expirou por segurança.

## **Ações**

* entrar novamente;  
* preservar rascunho, quando possível.

---

# **12\. Mapa de navegação preliminar**

## **Área pública**

Página inicial  
├── Como funciona  
├── Sobre o projeto  
├── Login  
├── Cadastro  
├── Termos de uso  
└── Política de privacidade

## **Área do candidato**

Dashboard  
├── Meu perfil  
│   ├── Dados pessoais  
│   └── Perfil profissional  
├── Minhas vagas  
│   ├── Lista  
│   ├── Nova vaga  
│   └── Detalhes  
├── Nova entrevista  
│   ├── Seleção da vaga  
│   ├── Configuração  
│   ├── Orientações  
│   ├── Consentimento  
│   ├── Teste técnico  
│   ├── Entrevista  
│   ├── Revisão  
│   └── Envio  
├── Histórico  
│   └── Detalhes  
├── Resultados  
│   └── Relatório  
├── Minha evolução  
├── Materiais de apoio  
└── Configurações

## **Área do avaliador**

Dashboard  
├── Avaliações pendentes  
├── Avaliações em andamento  
├── Tela de avaliação  
├── Revisão  
├── Histórico  
├── Guia de critérios  
└── Configurações

## **Área administrativa**

Dashboard  
├── Candidatos  
├── Avaliadores  
├── Entrevistas  
├── Atribuições  
├── Banco de perguntas  
├── Cargos e áreas  
├── Critérios  
├── Relatórios  
├── Consentimentos  
├── Logs  
└── Configurações

---

# **13\. Telas prioritárias para wireframes**

Para não tentar desenhar todas as telas de uma vez, recomenda-se iniciar pelos fluxos mais críticos.

## **Prioridade 1**

1. Página inicial;  
2. Login;  
3. Dashboard do candidato;  
4. Perfil profissional;  
5. Cadastro de vaga;  
6. Teste de câmera e microfone;  
7. Entrevista simulada;  
8. Revisão da resposta;  
9. Histórico;  
10. Resultado e relatório;  
11. Dashboard do avaliador;  
12. Fila de avaliações;  
13. Tela de avaliação;  
14. Dashboard administrativo;  
15. Banco de perguntas;  
16. Atribuição de avaliações.

## **Prioridade 2**

17. Cadastro;  
18. Orientações;  
19. Consentimento;  
20. Confirmação de envio;  
21. Entrevista concluída;  
22. Detalhes da entrevista;  
23. Revisão da avaliação;  
24. Gestão de candidatos;  
25. Gestão de avaliadores;  
26. Critérios de avaliação;  
27. Configurações.

## **Prioridade futura**

28. Minha evolução;  
29. Materiais;  
30. Comentários por tempo;  
31. Transcrição;  
32. Dashboard de IA;  
33. Comparação humano versus IA.

---

# **14\. Componentes compartilhados**

A equipe de design deve criar componentes reutilizáveis para evitar inconsistências.

## **Componentes gerais**

* cabeçalho;  
* sidebar;  
* menu mobile;  
* rodapé;  
* botão primário;  
* botão secundário;  
* botão de perigo;  
* campo de texto;  
* campo de senha;  
* seleção;  
* área de texto;  
* checkbox;  
* radio;  
* modal;  
* alerta;  
* toast;  
* breadcrumb;  
* abas;  
* tabela;  
* paginação;  
* filtro;  
* busca;  
* avatar;  
* badge de status;  
* card;  
* gráfico;  
* estado vazio;  
* skeleton;  
* tooltip;  
* confirmação.

## **Componentes de entrevista**

* player de vídeo;  
* câmera;  
* indicador de gravação;  
* cronômetro;  
* progresso;  
* pergunta;  
* controle de microfone;  
* teste técnico;  
* upload;  
* barra de progresso;  
* confirmação de envio.

## **Componentes de avaliação**

* escala de nota;  
* critério;  
* comentário;  
* ponto forte;  
* melhoria;  
* recomendação;  
* observação interna;  
* status de rascunho;  
* resumo de notas.

---

# **15\. Padrões de status**

## **Entrevista**

* rascunho;  
* configurada;  
* em preparação;  
* em andamento;  
* aguardando envio;  
* enviada;  
* aguardando atribuição;  
* atribuída;  
* em avaliação;  
* concluída;  
* cancelada;  
* com erro.

## **Avaliação**

* não iniciada;  
* em rascunho;  
* em revisão;  
* concluída;  
* reaberta;  
* invalidada.

## **Usuário**

* pendente;  
* ativo;  
* bloqueado;  
* inativo;  
* excluído.

## **Pergunta**

* rascunho;  
* ativa;  
* inativa;  
* arquivada.

---

# **16\. Diretrizes responsivas**

## **Desktop**

* sidebar fixa ou recolhível;  
* cards em múltiplas colunas;  
* tabelas completas;  
* vídeo e formulário lado a lado;  
* filtros visíveis;  
* ações secundárias disponíveis.

## **Tablet**

* sidebar recolhível;  
* uma ou duas colunas;  
* vídeo acima ou ao lado do formulário;  
* tabelas com rolagem;  
* filtros em painel.

## **Celular**

* menu hambúrguer;  
* cards em coluna;  
* formulários divididos;  
* vídeo na largura disponível;  
* botões grandes;  
* ações principais fixas;  
* tabelas convertidas em cards;  
* textos reduzidos sem perder contexto.

---

# **17\. Diretrizes de acessibilidade**

* contraste adequado;  
* navegação por teclado;  
* foco visível;  
* rótulos associados aos campos;  
* mensagens de erro compreensíveis;  
* ícones acompanhados de texto;  
* legendas futuras;  
* não depender apenas de cores;  
* botões com tamanho confortável;  
* linguagem simples;  
* aviso visual e textual de gravação;  
* compatibilidade com leitores de tela sempre que possível.

---

# **18\. Decisões pendentes**

A turma ainda deverá definir:

1. Quantas perguntas existirão por entrevista?  
2. O candidato poderá escolher a quantidade?  
3. Haverá tempo de preparação?  
4. Haverá tempo máximo de resposta?  
5. Será possível pausar?  
6. Quantas regravações serão permitidas?  
7. O candidato poderá assistir aos vídeos após o envio?  
8. O avaliador verá o nome completo?  
9. O avaliador escolherá entrevistas ou receberá atribuições?  
10. O administrador poderá assistir a todos os vídeos?  
11. O relatório será liberado automaticamente?  
12. O candidato poderá solicitar revisão?  
13. Quem poderá reabrir avaliações?  
14. Qual será a escala?  
15. Haverá pesos?  
16. Qual será a fórmula da nota final?  
17. Quais critérios entram no MVP?  
18. Quanto tempo os vídeos ficarão armazenados?  
19. O candidato poderá excluir o vídeo e manter o relatório?  
20. Haverá notificações por e-mail?  
21. Haverá materiais de apoio no MVP?  
22. Cargos e áreas serão livres ou padronizados?  
23. A transcrição entra na segunda fase?  
24. Quais dispositivos serão oficialmente suportados?  
25. Quem poderá aprovar dados para treinamento da IA?

---

# **19\. Recomendação de uso deste documento**

Este inventário deve ser utilizado como base para:

* criação do mapa de navegação;  
* produção dos wireframes;  
* protótipo no Figma;  
* definição do design system;  
* levantamento de requisitos;  
* criação das histórias de usuário;  
* elaboração dos critérios de aceite;  
* planejamento do front-end;  
* planejamento da API;  
* modelagem do banco;  
* criação dos testes.

Cada tela deverá ser revisada pela equipe responsável e receber um dos seguintes estados:

* aprovada;  
* aprovada com alterações;  
* pendente;  
* removida;  
* movida para fase futura.

---

# **20\. Conclusão**

A primeira entrega do RH Connect deve priorizar o fluxo essencial:

> O candidato cria sua conta, completa o perfil, cadastra a vaga, grava a entrevista, envia as respostas, aguarda a avaliação humana e consulta seu relatório.

Para que esse fluxo funcione, também será necessário que o avaliador tenha acesso a uma fila organizada e a uma tela de avaliação estruturada, enquanto o administrador deverá gerenciar usuários, avaliadores, perguntas, entrevistas, critérios e atribuições.

As telas futuras relacionadas à evolução, transcrição e Inteligência Artificial devem ser planejadas desde o início, mas não devem comprometer a entrega do MVP.

Este documento deverá evoluir junto com o projeto. Após a validação da turma, recomenda-se publicar a versão **0.2**, já contendo:

* telas aprovadas;  
* regras definidas;  
* responsáveis;  
* wireframes;  
* links do Figma;  
* requisitos relacionados;  
* critérios de aceite finais.

