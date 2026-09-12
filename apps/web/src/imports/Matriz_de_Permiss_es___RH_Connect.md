# **Matriz de Permissões — RH Connect**

**Versão:** 0.1  
**Status:** Proposta inicial para discussão  
**Perfis considerados:** Candidato, Avaliador e Administrador

---

# **1\. Versão resumida**

## **1.1 Legenda**

| Símbolo | Significado |
| ----- | ----- |
| ✅ | Possui acesso |
| ⚠️ | Possui acesso limitado ou condicionado |
| ❌ | Não possui acesso |
| 🔒 | Apenas aos próprios dados ou itens atribuídos |

## **1.2 Matriz geral de permissões**

| Módulo ou funcionalidade | Candidato | Avaliador | Administrador |
| ----- | ----- | ----- | ----- |
| Acessar o sistema | ✅ | ✅ | ✅ |
| Editar o próprio perfil | ✅ | ✅ | ✅ |
| Visualizar dashboard próprio | ✅ | ✅ | ✅ |
| Cadastrar vaga para treinamento | ✅ | ❌ | ⚠️ |
| Editar vaga cadastrada | 🔒 | ❌ | ✅ |
| Excluir vaga cadastrada | 🔒 | ❌ | ✅ |
| Iniciar entrevista simulada | ✅ | ❌ | ❌ |
| Responder perguntas | ✅ | ❌ | ❌ |
| Gravar e enviar vídeos | ✅ | ❌ | ❌ |
| Visualizar os próprios vídeos | 🔒 | ❌ | ✅ |
| Visualizar vídeos de candidatos | ❌ | 🔒 | ✅ |
| Avaliar entrevistas | ❌ | 🔒 | ✅ |
| Salvar avaliação como rascunho | ❌ | ✅ | ✅ |
| Concluir avaliação | ❌ | ✅ | ✅ |
| Editar avaliação concluída | ❌ | ⚠️ | ✅ |
| Visualizar o próprio relatório | ✅ | ❌ | ✅ |
| Visualizar relatórios de outros usuários | ❌ | 🔒 | ✅ |
| Consultar histórico de entrevistas | 🔒 | ❌ | ✅ |
| Consultar histórico de avaliações | ❌ | 🔒 | ✅ |
| Gerenciar candidatos | ❌ | ❌ | ✅ |
| Gerenciar avaliadores | ❌ | ❌ | ✅ |
| Gerenciar administradores | ❌ | ❌ | ⚠️ |
| Gerenciar banco de perguntas | ❌ | ❌ | ✅ |
| Gerenciar cargos e áreas | ❌ | ❌ | ✅ |
| Gerenciar critérios de avaliação | ❌ | ❌ | ✅ |
| Atribuir entrevista ao avaliador | ❌ | ❌ | ✅ |
| Gerenciar materiais de apoio | ❌ | ❌ | ✅ |
| Visualizar relatórios administrativos | ❌ | ❌ | ✅ |
| Gerenciar consentimentos | 🔒 | ❌ | ✅ |
| Solicitar exclusão dos próprios dados | ✅ | ✅ | ✅ |
| Excluir dados de outros usuários | ❌ | ❌ | ⚠️ |
| Consultar registros de auditoria | ❌ | ❌ | ✅ |
| Gerenciar configurações do sistema | ❌ | ❌ | ✅ |
| Acompanhar dados de treinamento da IA | ❌ | ❌ | ✅ |
| Aprovar dados para treinamento da IA | ❌ | ❌ | ⚠️ |

---

# **2\. Interpretação resumida por perfil**

## **2.1 Candidato**

O candidato deverá possuir acesso apenas às informações relacionadas à própria conta, às próprias vagas, entrevistas, gravações e resultados.

Não poderá:

* avaliar entrevistas;  
* acessar vídeos de outros candidatos;  
* alterar perguntas;  
* gerenciar usuários;  
* consultar relatórios administrativos;  
* acessar dados internos de treinamento da IA.

## **2.2 Avaliador**

O avaliador deverá acessar apenas entrevistas atribuídas a ele.

Poderá:

* assistir às gravações atribuídas;  
* consultar as perguntas e dados necessários da vaga;  
* preencher notas;  
* registrar comentários;  
* salvar rascunhos;  
* concluir avaliações;  
* consultar o próprio histórico.

Não deverá acessar dados pessoais que não sejam necessários para a avaliação.

## 

## 

## 

## **2.3 Administrador**

O administrador terá acesso à gestão operacional da plataforma.

Poderá:

* gerenciar usuários;  
* cadastrar avaliadores;  
* distribuir entrevistas;  
* gerenciar perguntas e critérios;  
* acompanhar avaliações;  
* consultar relatórios;  
* gerenciar configurações e consentimentos;  
* controlar quais dados poderão ser utilizados no desenvolvimento da IA.

Algumas ações críticas deverão exigir confirmação, justificativa ou registro em log.

---

# **3\. Versão detalhada**

## **3.1 Conta, autenticação e perfil**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Criar conta própria | ✅ | ❌ | ⚠️ | O cadastro de avaliadores pode ser realizado apenas pelo administrador |
| Fazer login | ✅ | ✅ | ✅ | O sistema direciona cada usuário ao seu ambiente |
| Recuperar senha | ✅ | ✅ | ✅ | Apenas para a própria conta |
| Alterar a própria senha | ✅ | ✅ | ✅ | Deve exigir confirmação da senha atual ou validação |
| Visualizar o próprio perfil | ✅ | ✅ | ✅ | Cada usuário acessa os próprios dados |
| Editar o próprio perfil | ✅ | ✅ | ✅ | Algumas informações podem exigir validação |
| Alterar o próprio e-mail | ✅ | ✅ | ✅ | Pode exigir confirmação pelo novo endereço |
| Alterar o próprio tipo de perfil | ❌ | ❌ | ⚠️ | Não deve ser permitido livremente |
| Desativar a própria conta | ✅ | ✅ | ✅ | Deve ser definida a diferença entre desativar e excluir |
| Solicitar exclusão da própria conta | ✅ | ✅ | ✅ | Deve seguir regras de privacidade e retenção |
| Visualizar perfil de outro usuário | ❌ | ⚠️ | ✅ | Avaliador vê somente informações necessárias |
| Editar perfil de outro usuário | ❌ | ❌ | ✅ | Ação administrativa registrada em log |
| Bloquear usuário | ❌ | ❌ | ✅ | Administrador deve informar o motivo |
| Reativar usuário | ❌ | ❌ | ✅ | Ação registrada |

---

## **3.2 Dashboard**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Visualizar dashboard do candidato | ✅ | ❌ | ⚠️ | Administrador pode visualizar para suporte |
| Visualizar dashboard do avaliador | ❌ | ✅ | ⚠️ | Administrador pode acompanhar indicadores |
| Visualizar dashboard administrativo | ❌ | ❌ | ✅ | Somente perfil administrativo |
| Visualizar indicadores próprios | ✅ | ✅ | ✅ | De acordo com o perfil |
| Visualizar indicadores gerais | ❌ | ❌ | ✅ | Dados consolidados da plataforma |
| Personalizar cards do dashboard | ⚠️ | ⚠️ | ⚠️ | Funcionalidade futura |

---

## **3.3 Perfil profissional do candidato**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Cadastrar formação acadêmica | ✅ | ❌ | ⚠️ | Administrador apenas em situação de suporte |
| Cadastrar cursos | ✅ | ❌ | ⚠️ | Dados pertencem ao candidato |
| Cadastrar experiências | ✅ | ❌ | ⚠️ | Dados pertencem ao candidato |
| Cadastrar habilidades | ✅ | ❌ | ⚠️ | Pode usar lista padronizada futuramente |
| Enviar currículo | ✅ | ❌ | ✅ | Upload pode ficar para segunda fase |
| Editar informações profissionais | ✅ | ❌ | ⚠️ | Apenas dados próprios |
| Visualizar perfil profissional completo | ✅ | ⚠️ | ✅ | Avaliador recebe somente o necessário |
| Excluir informações profissionais | ✅ | ❌ | ✅ | Administrador apenas por solicitação ou regra válida |

---

## **3.4 Vagas do candidato**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Cadastrar vaga | ✅ | ❌ | ⚠️ | Administrador pode auxiliar ou criar modelos |
| Visualizar próprias vagas | ✅ | ❌ | ✅ | Candidato vê apenas as próprias |
| Visualizar vaga relacionada à avaliação | ❌ | ✅ | ✅ | Avaliador vê os dados necessários |
| Editar própria vaga | ✅ | ❌ | ✅ | Alterações após iniciar entrevista podem ser limitadas |
| Excluir própria vaga | ✅ | ❌ | ✅ | Não deve apagar entrevistas já concluídas automaticamente |
| Duplicar vaga | ⚠️ | ❌ | ✅ | Recurso proposto |
| Iniciar entrevista usando uma vaga | ✅ | ❌ | ❌ | Ação exclusiva do candidato |
| Gerenciar categorias de vagas | ❌ | ❌ | ✅ | Tipos, áreas e níveis |

---

## **3.5 Banco de perguntas**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Visualizar pergunta durante entrevista | ✅ | ❌ | ✅ | Candidato vê conforme o fluxo |
| Visualizar pergunta durante avaliação | ❌ | ✅ | ✅ | Associada à resposta analisada |
| Cadastrar pergunta | ❌ | ❌ | ✅ | Pode existir gestor de conteúdo futuramente |
| Editar pergunta | ❌ | ❌ | ✅ | Não deve alterar entrevistas já concluídas |
| Excluir pergunta | ❌ | ❌ | ✅ | Preferível desativar em vez de apagar |
| Ativar ou desativar pergunta | ❌ | ❌ | ✅ | Mantém histórico |
| Definir tipo da pergunta | ❌ | ❌ | ✅ | Comportamental ou técnica |
| Associar pergunta a cargo | ❌ | ❌ | ✅ | Pode possuir múltiplas associações |
| Definir nível de dificuldade | ❌ | ❌ | ✅ | Proposta para fases posteriores |
| Visualizar respostas esperadas | ❌ | ⚠️ | ✅ | Apenas apoio interno do avaliador |
| Gerar perguntas por IA | ❌ | ❌ | ⚠️ | Funcionalidade futura e supervisionada |

---

## **3.6 Entrevistas simuladas**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Criar entrevista | ✅ | ❌ | ⚠️ | Gerada a partir da vaga e configuração |
| Iniciar entrevista | ✅ | ❌ | ❌ | Apenas o candidato |
| Pausar entrevista | ⚠️ | ❌ | ❌ | Depende das regras definidas |
| Retomar entrevista | ⚠️ | ❌ | ✅ | Pode ser permitido em situações específicas |
| Cancelar entrevista não enviada | ✅ | ❌ | ✅ | Não deve manter vídeos não confirmados sem necessidade |
| Visualizar entrevista própria | ✅ | ❌ | ✅ | Restrita ao próprio candidato |
| Visualizar entrevista atribuída | ❌ | ✅ | ✅ | Restrita ao avaliador responsável |
| Visualizar todas as entrevistas | ❌ | ❌ | ✅ | Uso administrativo |
| Alterar status da entrevista | ❌ | ⚠️ | ✅ | Avaliador altera conforme o fluxo de avaliação |
| Reabrir entrevista concluída | ❌ | ❌ | ⚠️ | Apenas em situações justificadas |
| Excluir entrevista | ⚠️ | ❌ | ✅ | Deve considerar relatório, vídeo e retenção |
| Atribuir entrevista a avaliador | ❌ | ❌ | ✅ | Manual na primeira versão |
| Reatribuir entrevista | ❌ | ❌ | ✅ | Deve registrar o histórico |
| Definir prioridade | ❌ | ❌ | ✅ | Proposta para gestão da fila |

---

## **3.7 Câmera, áudio e vídeos**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Testar câmera e microfone | ✅ | ❌ | ❌ | Antes da entrevista |
| Gravar resposta | ✅ | ❌ | ❌ | Mediante consentimento |
| Assistir à gravação antes do envio | ✅ | ❌ | ❌ | Etapa de revisão |
| Gravar novamente | ⚠️ | ❌ | ❌ | Quantidade deverá ser definida |
| Enviar vídeo | ✅ | ❌ | ❌ | Após confirmação |
| Assistir ao próprio vídeo enviado | ✅ | ❌ | ✅ | Pode ser limitado após certo prazo |
| Assistir ao vídeo atribuído | ❌ | ✅ | ✅ | Apenas para avaliação |
| Baixar vídeo | ⚠️ | ❌ | ⚠️ | Recomenda-se não permitir no MVP |
| Compartilhar vídeo externamente | ❌ | ❌ | ❌ | Não recomendado |
| Excluir vídeo próprio | ⚠️ | ❌ | ✅ | Deve considerar entrevistas e avaliações existentes |
| Excluir vídeo de outro usuário | ❌ | ❌ | ⚠️ | Apenas por motivo válido e registrado |
| Ver transcrição | ✅ | ✅ | ✅ | Quando a função estiver disponível |
| Editar transcrição automática | ⚠️ | ⚠️ | ✅ | Recurso futuro |
| Comentar em trecho do vídeo | ❌ | ⚠️ | ✅ | Proposto para segunda fase |

---

## **3.8 Avaliações humanas**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Criar avaliação | ❌ | ✅ | ✅ | Avaliador apenas em entrevista atribuída |
| Visualizar formulário de avaliação | ❌ | ✅ | ✅ | Conforme critérios ativos |
| Preencher notas | ❌ | ✅ | ✅ | Deve respeitar escala definida |
| Registrar pontos fortes | ❌ | ✅ | ✅ | Campo destinado ao candidato |
| Registrar pontos de melhoria | ❌ | ✅ | ✅ | Linguagem respeitosa e educativa |
| Registrar recomendação | ❌ | ✅ | ✅ | Deve orientar evolução |
| Adicionar observação interna | ❌ | ✅ | ✅ | Não aparece ao candidato |
| Salvar como rascunho | ❌ | ✅ | ✅ | Não libera o relatório |
| Editar rascunho | ❌ | ✅ | ✅ | Somente autor ou administrador |
| Concluir avaliação | ❌ | ✅ | ✅ | Libera conforme fluxo definido |
| Editar avaliação concluída | ❌ | ⚠️ | ✅ | Recomendável exigir reabertura |
| Excluir avaliação | ❌ | ❌ | ⚠️ | Preferível cancelar ou invalidar |
| Solicitar revisão | ✅ | ⚠️ | ✅ | Funcionalidade proposta |
| Aprovar avaliação para publicação | ❌ | ⚠️ | ✅ | Pode ser automática ou exigir supervisor |
| Comparar avaliações | ❌ | ⚠️ | ✅ | Recurso futuro para qualidade |
| Avaliar entrevista não atribuída | ❌ | ❌ | ✅ | Administrador apenas em contingência |

---

## **3.9 Resultados e relatórios**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Visualizar resultado próprio | ✅ | ❌ | ✅ | Após liberação |
| Visualizar notas por critério | ✅ | ✅ | ✅ | Avaliador vê avaliações relacionadas |
| Visualizar pontos fortes | ✅ | ✅ | ✅ | Conforme acesso |
| Visualizar pontos de melhoria | ✅ | ✅ | ✅ | Conforme acesso |
| Visualizar observações internas | ❌ | ✅ | ✅ | Nunca deve aparecer ao candidato |
| Visualizar histórico próprio | ✅ | ❌ | ✅ | Candidato vê apenas o próprio |
| Visualizar evolução | ✅ | ❌ | ✅ | Pode entrar na segunda fase |
| Exportar próprio relatório | ⚠️ | ❌ | ✅ | PDF pode ser recurso futuro |
| Exportar relatórios gerais | ❌ | ❌ | ✅ | Deve respeitar privacidade |
| Compartilhar relatório | ⚠️ | ❌ | ⚠️ | Apenas por decisão do candidato |
| Corrigir relatório | ❌ | ⚠️ | ✅ | Conforme fluxo de reabertura |

---

## **3.10 Gestão de avaliadores**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Cadastrar avaliador | ❌ | ❌ | ✅ | Pode exigir aprovação |
| Editar dados do avaliador | ❌ | 🔒 | ✅ | Avaliador altera apenas o próprio perfil |
| Ativar ou desativar avaliador | ❌ | ❌ | ✅ | Ações registradas |
| Atribuir áreas de especialidade | ❌ | ❌ | ✅ | Pode ser usado na distribuição |
| Visualizar desempenho do avaliador | ❌ | 🔒 | ✅ | Avaliador pode ver métricas próprias |
| Definir limite de avaliações | ❌ | ❌ | ✅ | Funcionalidade proposta |
| Consultar disponibilidade | ❌ | 🔒 | ✅ | Recurso futuro |
| Suspender avaliador | ❌ | ❌ | ✅ | Deve registrar justificativa |
| Consultar divergências de notas | ❌ | ⚠️ | ✅ | Recurso futuro de qualidade |

---

## **3.11 Administração de usuários**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Listar candidatos | ❌ | ❌ | ✅ | Acesso administrativo |
| Listar avaliadores | ❌ | ❌ | ✅ | Acesso administrativo |
| Pesquisar usuário | ❌ | ❌ | ✅ | Conforme necessidade operacional |
| Visualizar status da conta | 🔒 | 🔒 | ✅ | Cada usuário vê o próprio |
| Bloquear conta | ❌ | ❌ | ✅ | Exige justificativa |
| Desbloquear conta | ❌ | ❌ | ✅ | Ação registrada |
| Redefinir acesso | ❌ | ❌ | ✅ | Sem visualizar a senha |
| Alterar perfil de acesso | ❌ | ❌ | ⚠️ | Ação crítica |
| Excluir permanentemente usuário | ❌ | ❌ | ⚠️ | Deve seguir regras legais e de retenção |

---

## **3.12 Critérios de avaliação**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Visualizar critérios gerais | ✅ | ✅ | ✅ | Ajuda na transparência |
| Visualizar manual detalhado | ⚠️ | ✅ | ✅ | Algumas orientações podem ser internas |
| Cadastrar critério | ❌ | ❌ | ✅ | Pode ser função futura de supervisor |
| Editar critério | ❌ | ❌ | ✅ | Alterações não devem afetar avaliações antigas |
| Desativar critério | ❌ | ❌ | ✅ | Mantém histórico |
| Definir escala de nota | ❌ | ❌ | ✅ | Exemplo: 0 a 10 |
| Definir peso | ❌ | ❌ | ✅ | Caso o projeto utilize pesos |
| Definir campos obrigatórios | ❌ | ❌ | ✅ | Garante avaliações completas |
| Associar critério ao tipo de entrevista | ❌ | ❌ | ✅ | Recurso proposto |

---

## **3.13 Materiais de apoio**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Visualizar materiais publicados | ✅ | ✅ | ✅ | De acordo com o público |
| Salvar material como favorito | ⚠️ | ❌ | ❌ | Recurso futuro |
| Cadastrar material | ❌ | ❌ | ✅ | Pode existir gestor de conteúdo |
| Editar material | ❌ | ❌ | ✅ | Acesso administrativo |
| Publicar ou despublicar | ❌ | ❌ | ✅ | Mantém histórico |
| Relacionar material a critério | ❌ | ❌ | ✅ | Exemplo: conteúdo sobre objetividade |
| Receber recomendação de material | ✅ | ❌ | ❌ | Manual no MVP ou automática no futuro |

---

## **3.14 Consentimento, privacidade e dados**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Aceitar termos de uso | ✅ | ✅ | ✅ | Obrigatório para utilização |
| Aceitar gravação de imagem e voz | ✅ | ❌ | ❌ | Antes da entrevista |
| Autorizar armazenamento do vídeo | ✅ | ❌ | ❌ | Deve ser informado claramente |
| Autorizar uso para treinamento da IA | ✅ | ❌ | ❌ | Deve ser separado e opcional |
| Revogar autorização de treinamento | ✅ | ❌ | ✅ | Consequências devem ser explicadas |
| Consultar consentimentos próprios | ✅ | ✅ | ✅ | Cada usuário vê os próprios |
| Consultar consentimentos de terceiros | ❌ | ❌ | ✅ | Apenas necessidade administrativa |
| Alterar consentimento de terceiros | ❌ | ❌ | ❌ | Administrador não deve consentir pelo usuário |
| Solicitar cópia dos próprios dados | ✅ | ✅ | ✅ | Conforme regras adotadas |
| Solicitar exclusão de dados | ✅ | ✅ | ✅ | Deve existir fluxo de análise |
| Anonimizar dados | ❌ | ❌ | ✅ | Antes de uso técnico quando possível |

---

## **3.15 Inteligência Artificial e dados de treinamento**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Receber pergunta gerada por IA | ⚠️ | ❌ | ✅ | Recurso futuro |
| Receber feedback sugerido por IA | ⚠️ | ❌ | ✅ | Somente após validação |
| Visualizar sugestão da IA | ❌ | ✅ | ✅ | Na fase supervisionada |
| Aprovar sugestão da IA | ❌ | ✅ | ✅ | Avaliador valida o resultado |
| Corrigir sugestão da IA | ❌ | ✅ | ✅ | Correção pode gerar dado de melhoria |
| Visualizar nível de confiança | ❌ | ✅ | ✅ | Recomendado |
| Selecionar dados para treinamento | ❌ | ❌ | ⚠️ | Apenas dados autorizados |
| Aprovar conjunto de dados | ❌ | ❌ | ⚠️ | Pode exigir responsável específico |
| Exportar conjunto de dados | ❌ | ❌ | ⚠️ | Ação crítica e controlada |
| Visualizar vídeos sem autorização | ❌ | ❌ | ❌ | Não permitido |
| Comparar humano e IA | ❌ | ✅ | ✅ | Fase futura |
| Publicar avaliação automática sem revisão | ❌ | ❌ | ⚠️ | Não recomendado nas primeiras fases |

---

## **3.16 Configurações e segurança**

| Permissão | Candidato | Avaliador | Administrador | Observação |
| ----- | ----- | ----- | ----- | ----- |
| Alterar preferências pessoais | ✅ | ✅ | ✅ | Notificações e conta |
| Alterar configurações gerais | ❌ | ❌ | ✅ | Parâmetros da plataforma |
| Definir limite de gravação | ❌ | ❌ | ✅ | Tempo e tamanho |
| Definir número de perguntas | ❌ | ❌ | ✅ | Pode variar por entrevista |
| Definir prazo de avaliação | ❌ | ❌ | ✅ | Recurso proposto |
| Configurar notificações globais | ❌ | ❌ | ✅ | Mensagens do sistema |
| Visualizar logs próprios | ⚠️ | ⚠️ | ✅ | Apenas atividades relevantes |
| Visualizar logs gerais | ❌ | ❌ | ✅ | Auditoria administrativa |
| Excluir logs | ❌ | ❌ | ⚠️ | Deve seguir política de retenção |
| Gerenciar funções e permissões | ❌ | ❌ | ⚠️ | Ação crítica de segurança |

---

# **4\. Regras de negócio relacionadas às permissões**

## **RN-PERM-001 — Acesso baseado em perfil**

Cada usuário deverá acessar apenas os módulos e ações autorizados para o seu perfil.

## **RN-PERM-002 — Acesso restrito do candidato**

O candidato somente poderá visualizar, alterar ou excluir informações relacionadas à própria conta.

## **RN-PERM-003 — Acesso restrito do avaliador**

O avaliador somente poderá acessar entrevistas atribuídas a ele ou liberadas especificamente pelo administrador.

## **RN-PERM-004 — Dados mínimos para avaliação**

O avaliador deverá receber apenas as informações necessárias para analisar a entrevista.

## **RN-PERM-005 — Avaliação em rascunho**

Uma avaliação salva como rascunho não deverá ficar disponível ao candidato.

## **RN-PERM-006 — Avaliação concluída**

Depois de concluída, uma avaliação não poderá ser modificada livremente pelo avaliador.

A alteração deverá exigir:

* reabertura;  
* motivo;  
* identificação do responsável;  
* registro da versão anterior.

## **RN-PERM-007 — Observações internas**

Comentários classificados como internos não poderão ser exibidos ao candidato.

## **RN-PERM-008 — Exclusão controlada**

A exclusão de entrevistas, vídeos, avaliações e usuários deverá considerar:

* consentimento;  
* histórico;  
* relatórios existentes;  
* dados usados em treinamento;  
* regras de retenção;  
* necessidade de auditoria.

## **RN-PERM-009 — Consentimento para IA**

Autorizar a avaliação da entrevista não significa autorizar automaticamente o uso do vídeo no treinamento da IA.

Os consentimentos deverão ser separados.

## **RN-PERM-010 — Uso de dados autorizado**

Somente entrevistas autorizadas poderão ser selecionadas para treinamento ou testes da IA.

## **RN-PERM-011 — Registro de ações críticas**

Ações administrativas importantes deverão ser registradas, incluindo:

* bloqueio de usuário;  
* alteração de perfil;  
* reabertura de avaliação;  
* exclusão de vídeo;  
* alteração de nota;  
* acesso a dados de treinamento;  
* exportação de informações.

## **RN-PERM-012 — Menor privilégio**

Cada perfil deverá possuir apenas as permissões necessárias para exercer sua função.

---

# **5\. Decisões ainda necessárias**

A turma ainda deverá definir:

1. O candidato poderá assistir aos vídeos depois do envio?  
2. Quantas vezes será possível regravar cada resposta?  
3. O candidato poderá cancelar uma entrevista depois de iniciá-la?  
4. O avaliador visualizará o nome completo do candidato?  
5. O avaliador poderá escolher entrevistas ou apenas receber atribuições?  
6. Uma avaliação concluída poderá ser alterada pelo próprio avaliador?  
7. O relatório será liberado automaticamente ou precisará de aprovação?  
8. O candidato poderá solicitar revisão da avaliação?  
9. Administradores poderão assistir a todos os vídeos?  
10. Vídeos poderão ser baixados?  
11. Por quanto tempo os vídeos serão armazenados?  
12. O candidato poderá apagar somente o vídeo e manter o relatório?  
13. Haverá mais de um nível de administrador?  
14. Quem poderá aprovar dados para treinamento da IA?  
15. O consentimento para treinamento será opcional?  
16. O avaliador poderá acessar entrevistas antigas do mesmo candidato?  
17. As avaliações serão anônimas para o candidato?  
18. Quem poderá consultar observações internas?  
19. Haverá supervisor de avaliações?  
20. Como serão tratadas divergências entre avaliadores?

---

# **6\. Recomendação para o MVP**

Para a primeira entrega, recomenda-se manter as permissões simples:

## **Candidato**

* gerencia o próprio perfil;  
* cadastra vagas;  
* realiza entrevistas;  
* envia vídeos;  
* acompanha o status;  
* consulta os próprios resultados.

## **Avaliador**

* recebe entrevistas atribuídas;  
* assiste aos vídeos;  
* preenche a avaliação;  
* salva rascunhos;  
* conclui a avaliação;  
* consulta seu histórico.

## **Administrador**

* gerencia usuários;  
* cadastra avaliadores;  
* atribui entrevistas;  
* gerencia perguntas;  
* gerencia critérios;  
* acompanha o andamento;  
* controla consentimentos e configurações básicas.

Permissões avançadas, como supervisão, comparação entre avaliadores e gerenciamento técnico da IA, podem ser acrescentadas quando os novos perfis forem definidos.

---

# **7\. Status desta matriz**

Esta matriz representa uma proposta inicial baseada no escopo atualmente conhecido do RH Connect.

Ela não deve ser considerada uma definição definitiva.

Antes do desenvolvimento, recomenda-se que a turma revise principalmente:

* acesso aos vídeos;  
* edição de avaliações;  
* consentimento para treinamento;  
* poder dos administradores;  
* privacidade do candidato;  
* eventual criação de supervisor de avaliações;  
* eventual criação de perfil técnico de IA.

