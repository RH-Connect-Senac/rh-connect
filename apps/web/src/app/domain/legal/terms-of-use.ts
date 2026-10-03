import type { LegalDocument } from "./legal-types";

export const termsOfUse: LegalDocument = {
  title: "Termos de Uso",
  subtitle: "RH Connect — Plataforma de simulação de entrevistas com Inteligência Artificial",
  updatedAt: "14/09/2026",
  closingStatement: "Li, compreendi e concordo com os Termos de Uso.",
  sections: [
    {
      id: "introducao", navTitle: "Introdução", blocks: [
        { type: "paragraph", text: 'Estes Termos de Uso ("Termos") regulam a utilização da plataforma de Inteligência Artificial RH Connect ("Plataforma"), de titularidade de [NOME DA EMPRESA], pessoa jurídica de direito privado, inscrita no CNPJ sob o n° [CNPJ], com sede em [ENDEREÇO], doravante denominada simplesmente "Empresa".' },
        { type: "paragraph", text: "O RH Connect é uma plataforma destinada ao desenvolvimento profissional de candidatos, por meio da realização de entrevistas simuladas com apoio de Inteligência Artificial, com o objetivo de auxiliar o Usuário a aprimorar seu desempenho em processos seletivos reais.", emphasis: "notice" },
        { type: "paragraph", text: "Ao acessar, cadastrar-se ou utilizar a Plataforma, o Usuário declara ter lido, compreendido e aceitado integralmente estes Termos, bem como a Política de Privacidade, a Política de Cookies e demais políticas complementares disponibilizadas pela Empresa, que passam a integrar este instrumento para todos os fins de direito." },
        { type: "paragraph", text: "Caso o Usuário não concorde com qualquer disposição destes Termos, deverá abster-se de utilizar a Plataforma." },
        { type: "paragraph", text: "Estes Termos são regidos pela legislação brasileira, em especial pelo Código Civil (Lei n° 10.406/2002), pelo Código de Defesa do Consumidor (Lei n° 8.078/1990), pelo Marco Civil da Internet (Lei n° 12.965/2014), pela Lei Geral de Proteção de Dados Pessoais – LGPD (Lei n° 13.709/2018) e pela Lei n° 12.737/2012 (Lei Carolina Dieckmann), além das normas e orientações emitidas pela Autoridade Nacional de Proteção de Dados (ANPD)." },
      ],
    },
    {
      id: "definicoes", navTitle: "Definições", legalTitle: "CAPÍTULO I – DEFINIÇÕES", blocks: [
        { type: "paragraph", text: "Art. 1º Para os efeitos deste instrumento, consideram-se:" },
        { type: "definitions", items: [
          { term: "1.1. Plataforma", description: "o conjunto de sistemas, softwares, interfaces, aplicativos e serviços de Inteligência Artificial disponibilizados pela Empresa sob a marca RH Connect;" },
          { term: "1.2. Usuário", description: "pessoa física que se cadastra e utiliza a Plataforma na qualidade de candidato interessado em desenvolvimento profissional;" },
          { term: "1.3. Conta", description: "registro individual criado pelo Usuário para acesso e utilização da Plataforma, associado a credenciais de autenticação;" },
          { term: "1.4. Entrevista Simulada", description: "interação, por texto, voz ou vídeo, entre o Usuário e o Modelo de IA, com finalidade de simular um processo seletivo real para fins de treinamento e desenvolvimento;" },
          { term: "1.5. Conteúdo do Usuário", description: "currículos, mensagens, prompts, arquivos, documentos, fotografias, vídeos, gravações de voz, gravações de entrevistas, feedbacks e demais materiais inseridos, enviados ou gerados pelo Usuário na Plataforma;" },
          { term: "1.6. Modelo de Inteligência Artificial (Modelo de IA)", description: "sistema computacional baseado em aprendizado de máquina, processamento de linguagem natural, análise de voz/vídeo ou tecnologias correlatas, utilizado pela Plataforma para gerar perguntas, avaliar respostas e produzir feedbacks;" },
          { term: "1.7. Conteúdo Gerado por IA", description: "avaliações, sugestões, relatórios, pontuações, feedbacks e demais resultados produzidos pelo Modelo de IA em decorrência da interação do Usuário com a Plataforma;" },
          { term: "1.8. Dados Pessoais", description: "informações relacionadas a pessoa natural identificada ou identificável, nos termos do art. 5º, I, da LGPD;" },
          { term: "1.9. Anonimização", description: "processo pelo qual um dado perde a possibilidade de associação, direta ou indireta, a um indivíduo, nos termos do art. 5º, XI, da LGPD;" },
          { term: "1.10. Encarregado (DPO)", description: "pessoa indicada pela Empresa para atuar como canal de comunicação entre a Empresa, os titulares dos dados e a ANPD, nos termos do art. 5º, VIII, da LGPD." },
        ] },
      ],
    },
    {
      id: "objeto", navTitle: "Objeto e natureza do serviço", legalTitle: "CAPÍTULO II – OBJETO E NATUREZA DO SERVIÇO", blocks: [
        { type: "paragraph", text: "Art. 2º A Plataforma tem por objeto disponibilizar ao Usuário funcionalidades de simulação de entrevistas por meio de Inteligência Artificial, incluindo, sem limitação:" },
        { type: "list", items: ["2.1. Entrevistas simuladas por texto, voz e/ou vídeo;", "2.2. Geração automática de perguntas de entrevista;", "2.3. Análise de respostas, comunicação escrita e comunicação verbal;", "2.4. Análise de desempenho durante as entrevistas simuladas;", "2.5. Sugestões de melhoria e recomendações de estudo;", "2.6. Geração de relatórios e histórico de evolução do Usuário;", "2.7. Personalização do treinamento por meio de Inteligência Artificial."] },
        { type: "paragraph", text: "Art. 3º O RH Connect não é uma agência de recrutamento, consultoria de recolocação profissional, empresa contratante, psicólogo ou coach de carreira, e não substitui recrutadores humanos, profissionais de psicologia ou consultores especializados." },
        { type: "paragraph", text: "Art. 4º Os feedbacks, avaliações, pontuações e demais Conteúdos Gerados por IA possuem caráter exclusivamente educativo, informativo e de desenvolvimento profissional, não representando, em nenhuma hipótese:", emphasis: "notice" },
        { type: "list", items: ["4.1. Garantia de aprovação em processos seletivos reais;", "4.2. Garantia de contratação ou obtenção de emprego;", "4.3. Garantia de aumento de empregabilidade;", "4.4. Avaliação psicológica, psicotécnica ou profissional com validade formal fora do ambiente da Plataforma;", "4.5. Substituição da avaliação realizada por recrutadores, empresas contratantes ou processos seletivos reais, os quais adotam critérios próprios, humanos e institucionais, alheios à Plataforma."] },
        { type: "paragraph", text: "Art. 5º A Empresa poderá, a seu exclusivo critério, incluir, modificar, suspender ou descontinuar funcionalidades da Plataforma, no todo ou em parte, mediante comunicação prévia ao Usuário sempre que tal alteração impactar significativamente a experiência de uso, ressalvadas situações de urgência, caso fortuito ou força maior." },
      ],
    },
    {
      id: "cadastro", navTitle: "Cadastro e conta do usuário", legalTitle: "CAPÍTULO III – CADASTRO E CONTA DE USUÁRIO", blocks: [
        { type: "paragraph", text: "Art. 6º O acesso às funcionalidades da Plataforma exige cadastro prévio, mediante fornecimento de dados como nome completo, nome de usuário, e-mail, telefone, data de nascimento e, quando necessário, CPF." },
        { type: "paragraph", text: "§1º O Usuário compromete-se a fornecer informações verdadeiras, exatas, atuais e completas, sendo de sua exclusiva responsabilidade a veracidade dos dados informados." },
        { type: "paragraph", text: "§2º A Empresa poderá, a qualquer tempo, solicitar comprovação das informações cadastrais e suspender ou cancelar contas que contenham dados falsos, incompletos ou que gerem fundada suspeita de fraude." },
        { type: "paragraph", text: "Art. 7º A Plataforma destina-se exclusivamente a maiores de 18 (dezoito) anos, sendo vedado o cadastro de menores de idade, independentemente de assistência ou representação legal. A Empresa poderá, a qualquer tempo, solicitar comprovação da maioridade do Usuário e, caso identifique o cadastro de menor de idade, poderá excluir a conta e os dados pessoais correspondentes, ressalvadas as hipóteses legais de retenção previstas na Política de Retenção e Exclusão de Dados." },
        { type: "paragraph", text: "§Único. No presente momento, a Empresa não disponibiliza acesso à Plataforma a menores de 18 (dezoito) anos, não havendo, até a presente data, definição sobre eventual disponibilização futura da Plataforma a esse público, podendo esta disposição ser revista pela Empresa a qualquer tempo, mediante atualização destes Termos." },
        { type: "paragraph", text: "Art. 8º O Usuário é o único responsável pela guarda e sigilo de sua senha e demais credenciais de acesso, comprometendo-se a:" },
        { type: "list", items: ["8.1. Não compartilhar suas credenciais com terceiros;", "8.2. Comunicar imediatamente à Empresa qualquer uso não autorizado de sua Conta;", "8.3. Adotar medidas razoáveis de segurança em seus próprios dispositivos."] },
        { type: "paragraph", text: "§Único. A Empresa não se responsabiliza por acessos não autorizados decorrentes de negligência do Usuário na proteção de suas credenciais, sem prejuízo do dever da Empresa de manter medidas técnicas e administrativas adequadas de segurança da informação." },
      ],
    },
    {
      id: "entrevistas-ia", navTitle: "Entrevistas e Inteligência Artificial", legalTitle: "CAPÍTULO IV – USO DAS ENTREVISTAS SIMULADAS E DA INTELIGÊNCIA ARTIFICIAL", blocks: [
        { type: "paragraph", text: "Art. 9º O Usuário poderá enviar Conteúdo do Usuário à Plataforma — incluindo currículo, respostas em texto, gravações de voz e/ou vídeo — para processamento pelos Modelos de IA, recebendo em contrapartida Conteúdo Gerado por IA na forma de feedbacks, avaliações e relatórios." },
        { type: "paragraph", text: 'Art. 10. O Conteúdo Gerado por IA é produzido por meio de processos probabilísticos e estatísticos, podendo conter imprecisões, incompletudes, vieses residuais ou erros ("alucinações"), razão pela qual deve ser interpretado como ferramenta de apoio ao autodesenvolvimento, e não como avaliação definitiva, técnica ou pericial sobre as competências do Usuário.', emphasis: "notice" },
        { type: "paragraph", text: "Art. 11. Sem prejuízo do disposto na Política de Privacidade e na Política de Retenção e Exclusão de Dados, o Usuário tem ciência de que:" },
        { type: "list", items: ["11.1. As gravações de vídeo produzidas nas Entrevistas Simuladas ficam disponíveis para consulta e download pelo Usuário por um prazo limitado de 7 (sete) dias corridos, contados da respectiva entrevista, sendo excluídas de forma permanente e irreversível ao término desse prazo;", "11.2. Os áudios enviados ou gerados nas Entrevistas Simuladas são convertidos em texto por meio de transcrição automatizada, sendo o conteúdo textual resultante utilizado para as finalidades da Plataforma;", "11.3. Caso prefira não se basear na avaliação gerada pela Inteligência Artificial, o Usuário poderá solicitar a realização de avaliação por um avaliador humano, em substituição ao Conteúdo Gerado por IA, nos termos da Política de Direitos do Titular dos Dados, ficando tal solicitação sujeita a fila de espera, com prazo estimado de atendimento de 72 (setenta e duas) horas, prazo este meramente hipotético e estimado, podendo variar conforme a demanda de solicitações e a disponibilidade de avaliadores humanos."] },
        { type: "paragraph", text: "Art. 12. É expressamente vedado ao Usuário utilizar a Plataforma para:" },
        { type: "list", items: ["12.1. Praticar, incitar ou fomentar atividades ilícitas, incluindo os crimes previstos na Lei nº 12.737/2012;", "12.2. Violar direitos autorais, marcários, de imagem, de personalidade ou quaisquer direitos de propriedade intelectual de terceiros;", "12.3. Enviar conteúdo discriminatório, difamatório, obsceno, violento ou que viole a dignidade de terceiros;", "12.4. Enviar currículos, gravações ou documentos de terceiros sem autorização destes;", "12.5. Tentar realizar engenharia reversa, extração indevida, cópia ou uso não autorizado dos Modelos de IA ou de seus parâmetros;", "12.6. Tentar acessar sistemas, contas ou dados de terceiros sem autorização;", "12.7. Utilizar a Plataforma para fraudes, phishing, disseminação de malware ou qualquer ataque cibernético;", "12.8. Utilizar meios automatizados (bots, scraping) não autorizados para acessar a Plataforma."] },
        { type: "paragraph", text: "Art. 13. A Empresa poderá, a seu critério e mediante notificação ao Usuário sempre que viável, suspender, restringir ou encerrar o acesso à Plataforma em caso de violação a estes Termos, sem prejuízo das medidas legais cabíveis." },
      ],
    },
    {
      id: "propriedade-intelectual", navTitle: "Propriedade intelectual", legalTitle: "CAPÍTULO V – PROPRIEDADE INTELECTUAL", blocks: [
        { type: "paragraph", text: "Art. 14. A Plataforma, seus Modelos de IA, algoritmos, softwares, marcas, layouts, banco de perguntas e demais elementos de propriedade intelectual são de titularidade exclusiva da Empresa ou de seus licenciantes, sendo protegidos pela legislação brasileira e por tratados internacionais." },
        { type: "paragraph", text: "Art. 15. O Usuário mantém a titularidade sobre o Conteúdo do Usuário que enviar à Plataforma (incluindo currículo e gravações de entrevistas), concedendo à Empresa licença não exclusiva, mundial, gratuita e pelo prazo necessário à prestação dos serviços, para armazenar, processar, reproduzir e utilizar tal conteúdo estritamente para: (i) operar e fornecer a funcionalidade de entrevista simulada; (ii) cumprir obrigações legais; e (iii) as finalidades de aperfeiçoamento de IA descritas no Termo de Consentimento para Treinamento da Inteligência Artificial, quando aplicável e mediante consentimento específico." },
        { type: "paragraph", text: "Art. 16. O Conteúdo Gerado por IA (feedbacks, relatórios e avaliações) poderá ser utilizado pelo Usuário livremente para fins pessoais de desenvolvimento profissional, vedada sua comercialização ou redistribuição como se fosse avaliação técnica ou pericial de terceiros." },
      ],
    },
    {
      id: "responsabilidades", navTitle: "Responsabilidades do usuário", legalTitle: "CAPÍTULO VI – RESPONSABILIDADES DO USUÁRIO", blocks: [
        { type: "paragraph", text: "Art. 17. Sem prejuízo de outras disposições destes Termos, o Usuário é responsável por:" },
        { type: "list", items: ["17.1. Fornecer informações verdadeiras em seu cadastro e em suas interações com a Plataforma;", "17.2. Manter sua senha protegida e sua Conta segura;", "17.3. Não compartilhar suas credenciais de acesso com terceiros;", "17.4. Utilizar a Plataforma apenas para fins lícitos;", "17.5. Respeitar direitos de terceiros, inclusive direitos autorais de materiais eventualmente utilizados nas simulações;", "17.6. Não enviar conteúdos ilícitos, ofensivos ou protegidos por direitos autorais sem a devida autorização;", "17.7. Não tentar acessar sistemas ou dados de terceiros;", "17.8. Não utilizar a Plataforma para fraudes ou atividades ilegais."] },
      ],
    },
    {
      id: "protecao-dados", navTitle: "Proteção de dados pessoais", legalTitle: "CAPÍTULO VII – PROTEÇÃO DE DADOS PESSOAIS", blocks: [
        { type: "paragraph", text: "Art. 18. O tratamento de dados pessoais realizado pela Empresa é disciplinado pela Política de Privacidade, pelo Termo de Consentimento para Tratamento de Dados e, quando aplicável, pelo Termo de Consentimento para Treinamento da Inteligência Artificial, documentos que integram estes Termos por referência." },
        { type: "paragraph", text: "Art. 19. A Empresa não comercializa dados pessoais de Usuários. Eventual compartilhamento de dados somente ocorrerá mediante autorização do Usuário, cumprimento de obrigação legal ou regulatória, determinação judicial, ou com operadores estritamente necessários ao funcionamento da Plataforma, sempre em conformidade com a LGPD." },
        { type: "paragraph", text: "Art. 20. Sempre que tecnicamente viável e compatível com a finalidade, os dados utilizados para treinamento, desenvolvimento, validação, pesquisa e aperfeiçoamento dos Modelos de IA serão previamente anonimizados, nos termos da Política de Retenção e Exclusão de Dados." },
      ],
    },
    {
      id: "disponibilidade", navTitle: "Disponibilidade e responsabilidade", legalTitle: "CAPÍTULO VIII – DISPONIBILIDADE E LIMITAÇÃO DE RESPONSABILIDADE", blocks: [
        { type: "paragraph", text: "Art. 21. A Empresa envia esforços razoáveis para manter a Plataforma disponível de forma contínua e ininterrupta, porém não garante disponibilidade absoluta, podendo ocorrer interrupções decorrentes de manutenção, atualização, falhas técnicas, ataques cibernéticos ou motivos de caso fortuito e força maior." },
        { type: "paragraph", text: "Art. 22. Observadas as normas de ordem pública e as disposições do Código de Defesa do Consumidor, o RH Connect não se responsabiliza por:" },
        { type: "list", items: ["22.1. Uso indevido da Plataforma pelo Usuário, em desacordo com estes Termos ou com a legislação aplicável;", "22.2. Danos decorrentes de informações falsas, incompletas ou desatualizadas fornecidas pelo Usuário;", "22.3. Compartilhamento voluntário, pelo próprio Usuário, de seus dados pessoais ou credenciais com terceiros;", "22.4. Indisponibilidade temporária do serviço decorrente de manutenção, caso fortuito ou força maior;", "22.5. Ataques cibernéticos que, mesmo diante da adoção de medidas técnicas e administrativas de segurança compatíveis com o estado da arte, não puderem ser razoavelmente evitados;", "22.6. Resultados de processos seletivos reais em que o Usuário venha a participar, os quais dependem de critérios próprios de terceiros (empresas contratantes, recrutadores), estranhos à atuação da Plataforma;", "22.7. Decisões tomadas pelo Usuário com base exclusiva em Conteúdo Gerado por IA, sem a devida ponderação crítica."] },
        { type: "paragraph", text: "Art. 23. O RH Connect não garante, em qualquer hipótese:" },
        { type: "list", items: ["23.1. Aprovação em entrevistas ou processos seletivos reais;", "23.2. Contratação em vagas de emprego;", "23.3. Aumento de empregabilidade do Usuário;", "23.4. Equivalência entre o desempenho nas Entrevistas Simuladas e o desempenho em processos seletivos reais, os quais envolvem variáveis alheias à Plataforma."] },
        { type: "paragraph", text: "§Único. As limitações previstas neste Capítulo não afastam direitos irrenunciáveis assegurados por lei ao Usuário, notadamente aqueles previstos no Código de Defesa do Consumidor e na LGPD, nem excluem a responsabilidade da Empresa por dolo, culpa grave ou descumprimento de obrigações legais de segurança da informação." },
        { type: "paragraph", text: "Art. 24. Em qualquer hipótese, a responsabilidade da Empresa, quando reconhecida judicial ou administrativamente, ficará limitada aos danos diretos e efetivamente comprovados, sendo excluídos, nos limites permitidos por lei, danos indiretos, lucros cessantes e danos emergentes não comprovados." },
      ],
    },
    {
      id: "alteracoes", navTitle: "Alterações dos Termos", legalTitle: "CAPÍTULO IX – ALTERAÇÕES DESTES TERMOS", blocks: [
        { type: "paragraph", text: "Art. 25. A Empresa poderá alterar estes Termos a qualquer tempo, visando refletir atualizações legais, regulatórias, técnicas ou de negócio, comprometendo-se a:" },
        { type: "list", items: ["25.1. Publicar a versão atualizada na Plataforma, com indicação da data de vigência;", "25.2. Notificar o Usuário, por e-mail ou aviso na própria Plataforma, sobre alterações substanciais, com antecedência razoável;", "25.3. Assegurar ao Usuário a possibilidade de manifestar-se ou encerrar sua Conta caso não concorde com as alterações, sem prejuízo de direitos já adquiridos."] },
        { type: "paragraph", text: "Art. 26. A utilização continuada da Plataforma após a entrada em vigor das alterações implica concordância tácita com os novos Termos, ressalvadas as hipóteses em que a legislação exigir consentimento expresso." },
      ],
    },
    {
      id: "encerramento", navTitle: "Rescisão e encerramento da conta", legalTitle: "CAPÍTULO X – RESCISÃO E ENCERRAMENTO DE CONTA", blocks: [
        { type: "paragraph", text: "Art. 27. O Usuário poderá, a qualquer tempo, encerrar sua Conta e solicitar a eliminação de seus dados pessoais, observadas as hipóteses legais de retenção previstas na Política de Retenção e Exclusão de Dados." },
        { type: "paragraph", text: "Art. 28. A Empresa poderá suspender ou encerrar a Conta do Usuário, mediante comunicação prévia sempre que possível, nas hipóteses de:" },
        { type: "list", items: ["28.1. Violação destes Termos ou de qualquer política complementar;", "28.2. Prática de atos ilícitos por meio da Plataforma;", "28.3. Determinação legal ou judicial;", "28.4. Inatividade prolongada da Conta, nos termos da Política de Retenção e Exclusão de Dados."] },
      ],
    },
    {
      id: "atendimento", navTitle: "Canais de atendimento", legalTitle: "CAPÍTULO XI – CANAIS DE ATENDIMENTO", blocks: [
        { type: "paragraph", text: "Art. 29. Dúvidas, solicitações, reclamações ou exercício de direitos previstos na legislação de proteção de dados poderão ser encaminhados pelos seguintes canais:" },
        { type: "definitions", items: [{ term: "29.1. E-mail", description: "[E-MAIL DE CONTATO]" }, { term: "29.2. Encarregado de Proteção de Dados (DPO)", description: "[ENCARREGADO DE DADOS (DPO)]" }, { term: "29.3. Endereço", description: "[ENDEREÇO]" }, { term: "29.4. Site oficial", description: "[SITE OFICIAL]" }] },
      ],
    },
    {
      id: "disposicoes-gerais", navTitle: "Disposições gerais", legalTitle: "CAPÍTULO XII – DISPOSIÇÕES GERAIS", blocks: [
        { type: "paragraph", text: "Art. 30. Caso qualquer disposição destes Termos seja considerada nula ou inaplicável, as demais disposições permanecerão em pleno vigor." },
        { type: "paragraph", text: "Art. 31. A tolerância da Empresa quanto ao eventual descumprimento de qualquer disposição destes Termos não implicará novação ou renúncia de direitos." },
        { type: "paragraph", text: "Art. 32. Estes Termos não criam relação de sociedade, mandato, franquia, agenciamento de emprego ou vínculo empregatício entre a Empresa e o Usuário, nem entre a Empresa e eventuais empresas contratantes ou recrutadores mencionados pelo Usuário." },
        { type: "paragraph", text: "Art. 33. A Empresa poderá ceder ou transferir os direitos e obrigações decorrentes destes Termos em caso de reorganização societária, fusão, aquisição ou venda de ativos, mediante comunicação ao Usuário." },
        { type: "paragraph", text: "Art. 34. Fica eleito o foro da Comarca de [CIDADE/ESTADO], com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir controvérsias oriundas destes Termos, ressalvado o foro de domicílio do consumidor, quando aplicável por força do Código de Defesa do Consumidor." },
      ],
    },
  ],
};
