import type { LegalDocument } from "./legal-types";

export const privacyPolicy: LegalDocument = {
  title: "Política de Privacidade",
  subtitle: "Saiba como o RH Connect coleta, utiliza, armazena e protege seus dados.",
  updatedAt: "[DATA]",
  closingStatement: "Li, compreendi e concordo com os termos acima.",
  sections: [
    {
      id: "introducao", navTitle: "Introdução", blocks: [
        { type: "paragraph", text: 'Esta Política de Privacidade ("Política") descreve como [NOME DA EMPRESA], inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO] ("Empresa"), coleta, utiliza, armazena, compartilha e protege os dados pessoais de usuários ("Usuário") da plataforma RH Connect ("Plataforma"), em conformidade com a Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014), o Código de Defesa do Consumidor e as normas e orientações da Autoridade Nacional de Proteção de Dados (ANPD).' },
        { type: "paragraph", text: "Esta Política integra os Termos de Uso da RH Connect e deve ser lida em conjunto com eles, com o Termo de Consentimento para Tratamento de Dados, o Termo de Consentimento para Treinamento da Inteligência Artificial, a Política de Retenção e Exclusão de Dados, a Política de Segurança da Informação, a Política de Cookies e a Política de Direitos do Titular dos Dados." },
      ],
    },
    {
      id: "definicoes", navTitle: "Definições", legalTitle: "CAPÍTULO I – DEFINIÇÕES", blocks: [
        { type: "paragraph", text: "Art. 1º Para os efeitos desta Política, aplicam-se as definições constantes do art. 1º dos Termos de Uso da RH Connect, além das seguintes:" },
        { type: "definitions", items: [
          { term: "1.1. Titular", description: "pessoa natural a quem se referem os dados pessoais tratados pela Empresa;" },
          { term: "1.2. Tratamento", description: "toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração, nos termos do art. 5º, X, da LGPD;" },
          { term: "1.3. Controlador", description: "a Empresa, a quem compete as decisões referentes ao tratamento de dados pessoais dos Usuários;" },
          { term: "1.4. Operador", description: "pessoa física ou jurídica que realiza o tratamento de dados pessoais em nome do Controlador;" },
          { term: "1.5. Consentimento", description: "manifestação livre, informada e inequívoca pela qual o Titular concorda com o tratamento de seus dados pessoais para finalidade determinada, nos termos do art. 5º, XII, da LGPD;" },
          { term: "1.6. Dado Sensível", description: "dado pessoal sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dado referente à saúde ou vida sexual, dado genético ou biométrico, quando vinculado a pessoa natural, nos termos do art. 5º, II, da LGPD." },
        ] },
      ],
    },
    {
      id: "dados-coletados", navTitle: "Dados coletados", legalTitle: "CAPÍTULO II – DADOS COLETADOS", blocks: [
        { type: "paragraph", text: "Art. 2º A Plataforma poderá coletar as seguintes categorias de dados pessoais, mediante base legal aplicável:" },
        { type: "chips", title: "Quais dados podem ser coletados", items: ["Nome completo", "Nome de usuário", "E-mail", "Endereço IP", "Navegador e sistema operacional", "Informações do dispositivo", "Cookies e identificadores online", "Localização, quando autorizada", "Logs", "Metadados de uso", "Currículo", "Mensagens e prompts", "Respostas das entrevistas", "Arquivos e documentos", "Fotografias", "Gravações de voz", "Feedbacks", "Histórico de entrevistas e utilização"] },
        { type: "paragraph", text: "2.1. Dados cadastrais:" },
        { type: "list", items: ["a) nome completo;", "b) nome de usuário;", "c) e-mail."] },
        { type: "paragraph", text: "2.2. Dados técnicos e de navegação:" },
        { type: "list", items: ["a) endereço IP;", "b) navegador e sistema operacional;", "c) informações do dispositivo;", "d) cookies e identificadores online;", "e) localização, quando autorizada pelo Usuário;", "f) registros de acesso (logs);", "g) metadados de uso."] },
        { type: "paragraph", text: "2.3. Conteúdo enviado pelo Usuário:" },
        { type: "list", items: ["a) currículo;", "b) mensagens e prompts enviados à IA;", "c) respostas geradas nas Entrevistas Simuladas;", "d) arquivos e documentos anexados;", "e) fotografias;", "f) gravações de voz;", "g) feedbacks enviados pelo Usuário;", "h) histórico de entrevistas e de utilização da Plataforma."] },
        { type: "paragraph", text: "§1º Gravações de voz enviadas nas Entrevistas Simuladas podem conter dados biométricos (padrão de voz). Nesses casos, a Empresa trata tais dados como dados sensíveis, nos termos do art. 5º, II, da LGPD, adotando salvaguardas reforçadas e consentimento específico e destacado, nos termos do Termo de Consentimento para Tratamento de Dados.", emphasis: "notice" },
        { type: "paragraph", text: "§2º A Empresa não solicita, de forma deliberada, o envio de dados sensíveis não relacionados à finalidade da Plataforma (como dados de saúde, orientação sexual, convicção religiosa ou política), e orienta o Usuário a não incluir tais informações em seu currículo, respostas ou gravações, salvo quando estritamente necessário e relevante ao próprio conteúdo da simulação." },
        { type: "paragraph", text: "§3º Os áudios enviados ou gerados nas Entrevistas Simuladas são convertidos em texto por meio de transcrição automatizada, sendo o conteúdo textual resultante da transcrição armazenado para as finalidades desta Política, nos termos da Política de Retenção e Exclusão de Dados." },
      ],
    },
    {
      id: "finalidades", navTitle: "Como utilizamos seus dados", legalTitle: "CAPÍTULO III – FINALIDADES E BASES LEGAIS DO TRATAMENTO", intro: "Como utilizamos seus dados", blocks: [
        { type: "paragraph", text: "Art. 3º Os dados pessoais coletados serão tratados para as seguintes finalidades, com fundamento nas respectivas bases legais previstas no art. 7º da LGPD:" },
        { type: "table", headers: ["Finalidade", "Base Legal (LGPD)"], rows: [
          ["Funcionamento da Plataforma e execução do contrato (Termos de Uso)", "Art. 7º, V"], ["Autenticação e gestão de conta", "Art. 7º, V"], ["Prevenção a fraudes e à segurança do Usuário", "Art. 7º, IX (legítimo interesse)"], ["Suporte técnico e atendimento ao Usuário", "Art. 7º, V"], ["Personalização das Entrevistas Simuladas", "Art. 7º, V"], ["Avaliação de desempenho e geração de relatórios", "Art. 7º, V"], ["Melhoria contínua da Plataforma", "Art. 7º, IX (legítimo interesse)"], ["Treinamento, validação, pesquisa e aperfeiçoamento dos Modelos de IA", "Art. 7º, I (consentimento específico)"], ["Cumprimento de obrigações legais e regulatórias", "Art. 7º, II"], ["Exercício regular de direitos em processos judiciais, administrativos ou arbitrais", "Art. 7º, VI"],
        ] },
        { type: "paragraph", text: "§Único. Nas hipóteses em que o tratamento se fundamentar em legítimo interesse (art. 7º, IX, da LGPD), a Empresa manterá, nos termos do art. 10, §2º, da LGPD, relatório de impacto à proteção de dados pessoais documentando o teste de balanceamento realizado, que poderá ser solicitado pela ANPD." },
        { type: "paragraph", text: "Art. 4º Sempre que a base legal aplicável for o consentimento, este será obtido de forma livre, informada, inequívoca e destacada das demais cláusulas contratuais, podendo ser revogado a qualquer tempo pelo Titular, sem prejuízo da licitude do tratamento realizado anteriormente à revogação.", emphasis: "notice" },
        { type: "paragraph", text: "Art. 5º Sempre que tecnicamente possível e compatível com a finalidade pretendida, os dados utilizados para treinamento, desenvolvimento, validação, pesquisa e aperfeiçoamento dos Modelos de IA serão previamente anonimizados, deixando de ser considerados dados pessoais para os fins da LGPD, nos termos do art. 12 da referida Lei." },
      ],
    },
    {
      id: "compartilhamento", navTitle: "Compartilhamento de dados", legalTitle: "CAPÍTULO IV – COMPARTILHAMENTO DE DADOS", blocks: [
        { type: "paragraph", text: "Art. 6º A Empresa não comercializa dados pessoais dos Usuários.", emphasis: "notice" },
        { type: "paragraph", text: "Art. 7º O compartilhamento de dados pessoais somente ocorrerá nas seguintes hipóteses:" },
        { type: "list", items: ["7.1. Mediante autorização específica do Usuário;", "7.2. Para cumprimento de obrigação legal ou regulatória;", "7.3. Mediante ordem ou determinação judicial;", "7.4. Com operadores e parceiros estritamente necessários ao funcionamento da Plataforma (por exemplo, provedores de infraestrutura de nuvem, provedores de processamento de pagamento e provedores de Modelos de IA subcontratados), sempre sob contrato que assegure padrões de proteção de dados compatíveis com a LGPD;", "7.5. Em caso de reorganização societária, fusão, aquisição ou venda de ativos da Empresa, mediante manutenção das obrigações de proteção de dados pelo sucessor."] },
        { type: "paragraph", text: "Art. 8º Os Operadores contratados pela Empresa estão obrigados, contratualmente, a tratar os dados pessoais exclusivamente conforme as instruções da Empresa, adotando medidas de segurança compatíveis com esta Política e com a Política de Segurança da Informação." },
        { type: "paragraph", text: "Art. 9º Caso algum Operador esteja localizado fora do território nacional, a transferência internacional de dados observará as hipóteses e salvaguardas previstas nos arts. 33 a 36 da LGPD." },
      ],
    },
    {
      id: "retencao", navTitle: "Armazenamento e retenção", legalTitle: "CAPÍTULO V – ARMAZENAMENTO E RETENÇÃO", intro: "Por quanto tempo guardamos seus dados?", blocks: [
        { type: "paragraph", text: "Art. 10. Os dados pessoais serão armazenados em ambiente seguro, conforme descrito na Política de Segurança da Informação, e retidos pelo prazo necessário ao cumprimento das finalidades descritas nesta Política, observados os critérios e prazos estabelecidos na Política de Retenção e Exclusão de Dados." },
        { type: "stat", label: "Prazo de referência", value: "Até 2 anos", text: "Art. 11. Em regra, os dados pessoais poderão permanecer armazenados por até 2 (dois) anos após o encerramento da conta ou o último acesso do Usuário, desde que exista finalidade legítima, necessidade operacional e base legal aplicável, findo o qual serão eliminados ou anonimizados, ressalvadas as hipóteses legais de retenção detalhadas na Política de Retenção e Exclusão de Dados." },
      ],
    },
    {
      id: "seguranca", navTitle: "Segurança", legalTitle: "CAPÍTULO VI – SEGURANÇA DA INFORMAÇÃO", intro: "Segurança", blocks: [
        { type: "paragraph", text: "Art. 12. A Empresa adota medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão, nos termos detalhados na Política de Segurança da Informação, incluindo, entre outras, criptografia em trânsito e em repouso, controle de acesso baseado em perfis, autenticação multifator para administradores e monitoramento contínuo.", emphasis: "notice" },
      ],
    },
    {
      id: "direitos", navTitle: "Seus direitos", legalTitle: "CAPÍTULO VII – DIREITOS DO TITULAR", intro: "Seus direitos", blocks: [
        { type: "paragraph", text: "Art. 13. Nos termos do art. 18 da LGPD, o Titular poderá, mediante requisição à Empresa, exercer, gratuitamente e a qualquer tempo, os direitos de: confirmação da existência de tratamento; acesso aos dados; correção; anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos; portabilidade; informação sobre compartilhamento; revogação do consentimento; e oposição ao tratamento realizado com base em hipótese de dispensa de consentimento, quando aplicável." },
        { type: "paragraph", text: "Art. 14. O procedimento detalhado para exercício de cada direito está descrito na Política de Direitos do Titular dos Dados." },
      ],
    },
    {
      id: "cookies", navTitle: "Cookies", legalTitle: "CAPÍTULO VIII – COOKIES", blocks: [
        { type: "paragraph", text: "Art. 15. A Plataforma utiliza cookies e tecnologias similares para funcionamento, autenticação, segurança, personalização e análise de uso, conforme detalhado na Política de Cookies, que integra esta Política por referência." },
      ],
    },
    {
      id: "menores", navTitle: "Crianças e adolescentes", legalTitle: "CAPÍTULO IX – CRIANÇAS E ADOLESCENTES", blocks: [
        { type: "paragraph", text: "Art. 16. A Plataforma é destinada exclusivamente a maiores de 18 (dezoito) anos. Caso a Empresa identifique o cadastro ou o tratamento de dados de menores de idade, a conta e os respectivos dados pessoais poderão ser excluídos, ressalvadas as hipóteses legais de retenção." },
        { type: "paragraph", text: "§Único. No presente momento, a Empresa não disponibiliza acesso à Plataforma a menores de 18 (dezoito) anos, ainda que mediante assistência ou representação legal, não havendo, até a presente data, definição sobre eventual disponibilização futura da Plataforma a esse público. Esta disposição poderá ser revista pela Empresa a qualquer tempo, mediante atualização desta Política." },
      ],
    },
    {
      id: "alteracoes", navTitle: "Alterações da Política", legalTitle: "CAPÍTULO X – ALTERAÇÕES DESTA POLÍTICA", blocks: [
        { type: "paragraph", text: "Art. 17. Esta Política poderá ser atualizada a qualquer tempo, para refletir alterações legais, regulatórias, técnicas ou de negócio. A versão vigente será sempre disponibilizada na Plataforma, com indicação da data de atualização, e alterações substanciais serão comunicadas ao Usuário por e-mail ou aviso na Plataforma." },
      ],
    },
    {
      id: "contato", navTitle: "DPO e canais de atendimento", legalTitle: "CAPÍTULO XI – ENCARREGADO DE DADOS (DPO) E CANAIS DE ATENDIMENTO", intro: "Contato", blocks: [
        { type: "paragraph", text: "Art. 18. Dúvidas, solicitações e reclamações relacionadas ao tratamento de dados pessoais poderão ser encaminhadas aos seguintes canais:" },
        { type: "definitions", items: [{ term: "18.1. Encarregado de Proteção de Dados (DPO)", description: "[ENCARREGADO DE DADOS (DPO)]" }, { term: "18.2. E-mail", description: "[E-MAIL DE CONTATO]" }, { term: "18.3. Endereço", description: "[ENDEREÇO]" }, { term: "18.4. Site oficial", description: "[SITE OFICIAL]" }] },
        { type: "paragraph", text: "Art. 19. O Titular que não tiver sua solicitação atendida de forma satisfatória poderá apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) ou, na qualidade de consumidor, ao Procon de seu Estado ou pela plataforma consumidor.gov.br." },
      ],
    },
  ],
};
