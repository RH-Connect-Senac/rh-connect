# **9\. Jornada detalhada do administrador**

# **Etapa 1 — Acesso**

## **Objetivo**

Entrar no ambiente administrativo.

## **Tela**

* AUT-001 — Login.

## **Regras**

* autenticação segura;  
* perfil autorizado;  
* registro de acesso.

---

# **Etapa 2 — Visão operacional**

## **Objetivo**

Identificar pendências e problemas.

## **Tela**

* ADM-001 — Dashboard administrativo.

## **Indicadores**

* usuários;  
* avaliadores;  
* entrevistas;  
* pendências;  
* falhas;  
* perguntas;  
* alertas.

## **Possíveis dificuldades**

* excesso de métricas;  
* ausência de ação;  
* dados desatualizados.

## **Oportunidades de UX**

* indicadores prioritários;  
* atalhos;  
* alertas;  
* atualização visível.

---

# **Etapa 3 — Gestão de usuários**

## **Objetivo**

Gerenciar candidatos e avaliadores.

## **Telas**

* ADM-002 — Gestão de candidatos;  
* ADM-004 — Gestão de avaliadores;  
* ADM-005 — Cadastro de avaliador.

## **Ações**

* pesquisar;  
* ativar;  
* bloquear;  
* reativar;  
* cadastrar;  
* editar;  
* consultar histórico.

## **Riscos**

* alteração indevida;  
* acesso excessivo;  
* falta de registro.

## **Oportunidades**

* confirmação;  
* justificativa;  
* logs;  
* permissões claras.

---

# **Etapa 4 — Gestão de perguntas**

## **Objetivo**

Manter o banco de perguntas.

## **Telas**

* ADM-008 — Banco de perguntas;  
* ADM-009 — Cadastro de pergunta.

## **Ações**

* cadastrar;  
* editar;  
* categorizar;  
* ativar;  
* desativar;  
* associar a cargos.

## **Possíveis dificuldades**

* perguntas duplicadas;  
* categorias inconsistentes;  
* alterações no histórico.

## **Oportunidades**

* filtros;  
* status;  
* desativação em vez de exclusão;  
* validação pela equipe de RH.

---

# **Etapa 5 — Gestão de critérios**

## **Objetivo**

Manter a rubrica de avaliação.

## **Tela**

* ADM-011 — Critérios de avaliação.

## **Ações**

* cadastrar;  
* editar;  
* definir escala;  
* definir obrigatoriedade;  
* ativar;  
* desativar.

## **Regra**

Mudanças não devem alterar avaliações antigas.

---

# **Etapa 6 — Acompanhamento das entrevistas**

## **Objetivo**

Monitorar o fluxo.

## **Tela**

* ADM-006 — Gestão de entrevistas.

## **Ações**

* buscar;  
* filtrar;  
* abrir;  
* consultar erro;  
* acompanhar status;  
* cancelar, se necessário.

---

# **Etapa 7 — Atribuição**

## **Objetivo**

Vincular entrevistas a avaliadores.

## **Tela**

* ADM-007 — Atribuição de avaliações.

## **Ações**

* consultar avaliadores;  
* verificar carga;  
* atribuir;  
* reatribuir.

## **Possíveis dificuldades**

* avaliador sobrecarregado;  
* área incompatível;  
* entrevista esquecida.

## **Oportunidades**

* carga visível;  
* área;  
* alerta;  
* distribuição futura automática.

---

# **Etapa 8 — Privacidade e consentimentos**

## **Objetivo**

Atender solicitações e controlar uso de dados.

## **Tela**

* ADM-013 — Consentimentos e privacidade.

## **Ações**

* consultar;  
* registrar atendimento;  
* processar revogação;  
* processar exclusão;  
* verificar elegibilidade para IA.

## **Regra**

O administrador não pode consentir pelo usuário.

---

# **Etapa 9 — Auditoria**

## **Objetivo**

Consultar ações críticas.

## **Tela**

* ADM-014 — Logs de auditoria.

## **Eventos**

* bloqueios;  
* acessos;  
* atribuições;  
* reaberturas;  
* exclusões;  
* alterações;  
* operações de IA.

---

# **10\. Jornada resumida do administrador**

| Etapa | Objetivo | Tela | Risco | Oportunidade |
| ----- | ----- | ----- | ----- | ----- |
| Login | Acessar | AUT-001 | Acesso indevido | Segurança |
| Dashboard | Ver pendências | ADM-001 | Excesso de dados | Prioridades |
| Usuários | Operar contas | ADM-002 | Alteração indevida | Logs |
| Avaliadores | Gerenciar equipe | ADM-004 | Sobrecarga | Indicadores |
| Perguntas | Manter conteúdo | ADM-008 | Duplicidade | Categorias |
| Critérios | Padronizar | ADM-011 | Mudança histórica | Versionamento |
| Entrevistas | Acompanhar | ADM-006 | Pendências ocultas | Filtros |
| Atribuição | Distribuir | ADM-007 | Incompatibilidade | Carga e área |
| Privacidade | Tratar dados | ADM-013 | Risco legal | Fluxos claros |
| Auditoria | Verificar ações | ADM-014 | Falta de rastreio | Logs completos |

---

# **11\. Fluxos alternativos e exceções**

# **11.1 E-mail já cadastrado**

Cadastro  
→ Usuário informa e-mail existente  
→ Sistema apresenta mensagem  
→ Oferece login ou recuperação de senha  
---

# **11.2 Perfil incompleto**

Candidato tenta iniciar entrevista  
→ Sistema verifica requisitos  
→ Perfil incompleto  
→ Mostra campos pendentes  
→ Usuário completa  
→ Retorna ao fluxo  
---

# **11.3 Nenhuma vaga cadastrada**

Nova entrevista  
→ Nenhuma vaga disponível  
→ Sistema orienta cadastro  
→ Usuário cadastra vaga  
→ Vaga é selecionada  
→ Continua  
---

# **11.4 Permissão da câmera negada**

Teste técnico  
→ Navegador nega câmera  
→ Sistema identifica  
→ Mostra instruções  
→ Usuário altera permissão  
→ Repete teste  
---

# **11.5 Microfone não encontrado**

Teste técnico  
→ Nenhum microfone detectado  
→ Sistema impede avanço  
→ Usuário conecta ou seleciona dispositivo  
→ Repete teste  
---

# **11.6 Conexão perdida durante gravação**

Entrevista  
→ Conexão cai  
→ Sistema mantém gravação local quando possível  
→ Exibe alerta  
→ Reconecta  
→ Continua ou salva resposta  
---

# **11.7 Falha no upload**

Envio  
→ Um vídeo falha  
→ Sistema marca apenas o item com erro  
→ Usuário tenta novamente  
→ Confirmação ocorre somente após sucesso  
---

# **11.8 Saída acidental da entrevista**

Usuário tenta fechar  
→ Sistema mostra aviso  
→ Usuário permanece ou confirma saída  
→ Progresso é preservado quando possível  
---

# **11.9 Avaliação salva como rascunho**

Avaliador preenche parte  
→ Salva rascunho  
→ Avaliação não aparece ao candidato  
→ Fica em “Em andamento”  
→ Avaliador retoma  
---

# **11.10 Avaliação concluída com pedido de alteração**

Avaliação concluída  
→ Alteração necessária  
→ Avaliador solicita reabertura  
→ Administrador ou responsável autoriza  
→ Motivo é registrado  
→ Avaliação é corrigida  
→ Nova versão é concluída  
---

# **11.11 Conta bloqueada**

Login  
→ Conta bloqueada  
→ Sistema impede acesso  
→ Apresenta canal de suporte  
→ Administrador analisa  
---

# **12\. Fluxo prioritário para o protótipo no Figma**

O primeiro protótipo navegável deverá demonstrar o fluxo principal do produto.

## **Fluxo do candidato**

PUB-001 Página inicial  
→ AUT-002 Cadastro  
→ CAN-001 Dashboard  
→ CAN-003 Perfil profissional  
→ CAN-005 Cadastro de vaga  
→ ENT-003 Orientações  
→ ENT-004 Consentimento  
→ ENT-005 Teste técnico  
→ ENT-006 Entrevista  
→ ENT-007 Revisão  
→ ENT-008 Envio  
→ ENT-009 Concluída  
→ ENT-010 Avaliação pendente  
→ CAN-009 Resultado

## **Fluxo do avaliador**

AUT-001 Login  
→ AVL-001 Dashboard  
→ AVL-002 Fila  
→ AVL-004 Avaliação  
→ AVL-005 Revisão  
→ AVL-006 Concluída

## **Fluxo do administrador**

AUT-001 Login  
→ ADM-001 Dashboard  
→ ADM-006 Entrevistas  
→ ADM-007 Atribuição  
→ ADM-008 Banco de perguntas  
→ ADM-011 Critérios  
---

# **13\. Pontos críticos da experiência**

## **13.1 Cadastro**

Deve ser curto e não exigir perfil completo imediatamente.

## **13.2 Primeiro acesso**

Deve deixar claro o próximo passo.

## **13.3 Teste técnico**

Deve lidar bem com permissões e dispositivos.

## **13.4 Gravação**

Deve transmitir segurança e mostrar claramente o estado.

## **13.5 Upload**

Deve informar progresso e falhas.

## **13.6 Espera**

Deve explicar o status da avaliação.

## **13.7 Relatório**

Deve ser educativo e não apenas numérico.

## **13.8 Avaliação humana**

Deve ser padronizada e preservar rascunhos.

## **13.9 Administração**

Deve priorizar pendências e ações críticas.

---

# **14\. Emoções esperadas do candidato**

| Etapa | Emoção possível | Resposta desejada do produto |
| ----- | ----- | ----- |
| Descoberta | Curiosidade | Clareza |
| Cadastro | Expectativa | Simplicidade |
| Perfil | Dúvida | Orientação |
| Vaga | Foco | Contexto |
| Preparação | Ansiedade | Acolhimento |
| Teste | Insegurança técnica | Confirmação |
| Entrevista | Nervosismo | Controle |
| Envio | Preocupação | Progresso |
| Espera | Impaciência | Transparência |
| Resultado | Vulnerabilidade | Respeito |
| Nova prática | Motivação | Evolução |

---

# **15\. Princípios de experiência derivados das jornadas**

## **Clareza antes da complexidade**

Cada tela deve mostrar uma próxima ação principal.

## **Redução da ansiedade**

A interface não deve simular pressão desnecessária.

## **Transparência**

O usuário deve saber quando está gravando, enviando ou aguardando.

## **Recuperação de falhas**

Erros não devem causar perda silenciosa.

## **Feedback educativo**

Notas precisam ser explicadas.

## **Privacidade**

O uso de imagem, voz e IA deve ser informado.

## **Consistência**

Os fluxos e os componentes devem seguir padrões.

## **Responsividade real**

A experiência deve ser adaptada, não apenas reduzida.

---

# **16\. Decisões pendentes**

A turma ainda precisa definir:

1. Quantas perguntas existirão?  
2. Haverá tempo de preparação?  
3. Qual será o tempo máximo?  
4. Será possível pausar?  
5. Quantas regravações serão permitidas?  
6. O candidato poderá sair e retomar?  
7. O vídeo será enviado por pergunta ou no fim?  
8. O candidato poderá assistir aos vídeos após enviar?  
9. Haverá prazo de avaliação?  
10. O avaliador verá o nome completo?  
11. O relatório será liberado automaticamente?  
12. O candidato poderá pedir revisão?  
13. Quem reabre avaliações?  
14. Haverá notificações?  
15. Quais critérios serão obrigatórios?  
16. Como será calculada a nota?  
17. Quanto tempo os vídeos serão armazenados?  
18. O consentimento de IA poderá ser revogado?  
19. Haverá anonimização?  
20. Quais fluxos precisam estar navegáveis na primeira apresentação?

---

# **17\. Recomendações para o Figma**

## **Criar primeiro**

* mapa geral;  
* jornada do candidato;  
* fluxo principal;  
* wireframes das telas críticas;  
* componentes básicos.

## **Conectar no protótipo**

* cadastro;  
* perfil;  
* vaga;  
* entrevista;  
* envio;  
* avaliação;  
* relatório.

## **Representar estados**

* vazio;  
* carregando;  
* erro;  
* sucesso;  
* pendente;  
* sem permissão;  
* sem dados.

## **Identificar frames**

Exemplos:

CAN-001 — Dashboard — Desktop  
CAN-001 — Dashboard — Mobile

ENT-006 — Entrevista — Desktop  
ENT-006 — Entrevista — Mobile

AVL-004 — Avaliação — Desktop  
---

# **18\. Uso deste documento pela equipe**

## **Produto**

Validar fluxo e prioridade.

## **UX/UI**

Criar arquitetura, wireframes e protótipos.

## **Front-end**

Compreender navegação, estados e ações.

## **Back-end**

Identificar verificações e transições de status.

## **Banco de dados**

Entender entidades envolvidas em cada etapa.

## **RH**

Validar perguntas, critérios e feedback.

## **Testes**

Criar cenários principais e alternativos.

---

# **19\. Próximos passos**

1. Apresentar as jornadas à turma;  
2. Validar o fluxo principal;  
3. Resolver decisões mais críticas;  
4. Criar o mapa no FigJam;  
5. Produzir wireframes;  
6. Definir responsáveis;  
7. Prototipar o fluxo prioritário;  
8. Testar com colegas;  
9. Registrar problemas;  
10. Atualizar para a versão 0.2.

---

# **20\. Conclusão**

As jornadas do RH Connect mostram que o produto depende de três experiências conectadas:

* o candidato precisa conseguir praticar com segurança;  
* o avaliador precisa produzir feedback consistente;  
* o administrador precisa garantir que o fluxo funcione.

O fluxo prioritário continua sendo:

> candidato cria conta, completa perfil, cadastra vaga, grava entrevista, envia respostas, recebe avaliação humana e consulta relatório.

Todas as decisões de UX/UI, front-end e back-end devem preservar esse fluxo antes da implementação de recursos avançados.

A futura Inteligência Artificial deverá ser adicionada de forma gradual e supervisionada, sem substituir prematuramente a avaliação humana nem comprometer a transparência da experiência.

