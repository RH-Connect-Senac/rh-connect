import type { SupportMaterial } from "../domain/materials";

export const SUPPORT_MATERIALS: SupportMaterial[] = [
  {
    id: "como-se-apresentar-em-entrevistas",
    slug: "como-se-apresentar-em-entrevistas",
    title: "Como se apresentar em entrevistas",
    description: "Aprenda a estruturar uma apresentação pessoal clara, objetiva e impactante.",
    type: "READING",
    category: "Apresentação pessoal",
    competencyIds: ["communication"],
    recommended: true,
    content: {
      intro: "Uma boa apresentação pessoal ajuda o avaliador a entender rapidamente quem você é, o que busca e por que aquela vaga faz sentido para sua trajetória.",
      sections: [
        {
          id: "estrutura",
          title: "Estruture sua fala",
          paragraphs: [
            "Comece pelo seu nome, formação ou experiência principal. Em seguida, conecte suas vivências ao tipo de vaga ou área desejada.",
            "Evite contar toda a sua história. A apresentação deve abrir a conversa e criar contexto para as próximas perguntas.",
          ],
          bullets: ["Quem você é", "O que já fez ou está aprendendo", "Por que tem interesse na vaga"],
        },
        {
          id: "objetividade",
          title: "Seja objetivo",
          paragraphs: ["Uma apresentação de 40 a 60 segundos costuma ser suficiente para entrevistas iniciais."],
          example: "Sou estudante de tecnologia, tenho praticado projetos web e busco uma oportunidade para aplicar front-end em produtos reais.",
          tip: "Treine em voz alta, mas não decore palavra por palavra. O objetivo é soar natural.",
        },
      ],
      summary: "Apresente quem você é, conecte sua experiência à vaga e finalize demonstrando interesse claro.",
    },
  },
  {
    id: "elevator-pitch-para-entrevistas",
    slug: "elevator-pitch-para-entrevistas",
    title: "Elevator pitch para entrevistas",
    description: "Como resumir seu perfil profissional em 60 segundos de forma convincente.",
    type: "READING",
    category: "Apresentação pessoal",
    competencyIds: ["communication"],
    recommended: true,
    content: {
      intro: "O elevator pitch é um resumo curto do seu perfil, útil para iniciar entrevistas, networking e apresentações rápidas.",
      sections: [
        {
          id: "formula",
          title: "Use uma fórmula simples",
          bullets: ["Contexto profissional", "Competências mais relevantes", "Objetivo ou interesse atual"],
          paragraphs: ["A clareza vem da seleção. Escolha apenas os pontos que ajudam o avaliador a entender seu encaixe com a oportunidade."],
        },
        {
          id: "ajuste",
          title: "Adapte para a vaga",
          paragraphs: ["O mesmo pitch pode mudar conforme o cargo. Destaque experiências e aprendizados que conversem com os requisitos da vaga."],
          example: "Tenho base em atendimento e organização, e estou buscando uma vaga em secretariado para apoiar rotinas administrativas e comunicação com equipes.",
        },
      ],
      summary: "Um bom pitch é curto, específico e ajustado ao contexto da entrevista.",
    },
  },
  {
    id: "comunicacao-verbal-e-nao-verbal",
    slug: "comunicacao-verbal-e-nao-verbal",
    title: "Comunicação verbal e não verbal",
    description: "Entenda como clareza, escuta e postura profissional influenciam a conversa com o avaliador.",
    type: "READING",
    category: "Comunicação",
    competencyIds: ["communication"],
    content: {
      intro: "Comunicação em entrevista envolve o que você diz, como organiza suas ideias e como demonstra atenção durante a conversa.",
      sections: [
        {
          id: "verbal",
          title: "Comunicação verbal",
          bullets: ["Responda ao que foi perguntado", "Evite rodeios excessivos", "Use exemplos concretos"],
          tip: "Se precisar pensar, faça uma pausa breve e organize a resposta antes de começar.",
        },
        {
          id: "profissional",
          title: "Postura profissional",
          paragraphs: ["Em entrevistas presenciais ou online, mantenha atenção, escuta ativa e respeito ao tempo do avaliador."],
          tip: "Demonstre interesse fazendo conexões com a vaga, sem exagerar no tom ou tentar parecer algo que você não é.",
        },
      ],
      summary: "Comunicação forte combina clareza, escuta e exemplos alinhados ao contexto profissional.",
    },
  },
  {
    id: "como-articular-ideias-com-clareza",
    slug: "como-articular-ideias-com-clareza",
    title: "Como articular ideias com clareza",
    description: "Técnicas para organizar e transmitir suas ideias de forma coerente e direta.",
    type: "READING",
    category: "Comunicação",
    competencyIds: ["communication", "problem-solving"],
    content: {
      intro: "Muitas respostas ficam confusas porque a pessoa tenta explicar tudo ao mesmo tempo. Clareza exige sequência.",
      sections: [
        {
          id: "sequencia",
          title: "Pense em começo, meio e fim",
          bullets: ["Contexto", "Ação realizada", "Resultado ou aprendizado"],
          paragraphs: ["Antes de responder, identifique qual ponto principal precisa ficar claro para o avaliador."],
        },
        {
          id: "sinais",
          title: "Use sinais de organização",
          paragraphs: ["Expressões como 'primeiro', 'depois' e 'por fim' ajudam o avaliador a acompanhar seu raciocínio."],
          example: "Primeiro entendi o problema, depois organizei as prioridades e por fim alinhei a entrega com a equipe.",
        },
      ],
      summary: "Respostas claras têm foco, sequência e fechamento.",
    },
  },
  {
    id: "postura-e-linguagem-corporal",
    slug: "postura-e-linguagem-corporal",
    title: "Postura e linguagem corporal",
    description: "Dicas práticas para transmitir profissionalismo em entrevistas presenciais ou online.",
    type: "READING",
    category: "Postura",
    competencyIds: ["communication"],
    recommended: true,
    content: {
      intro: "Postura profissional não é performance. É demonstrar atenção, respeito e presença durante a interação.",
      sections: [
        {
          id: "presenca",
          title: "Demonstre presença",
          bullets: ["Mantenha atenção na conversa", "Evite interromper", "Responda com calma"],
          paragraphs: ["A forma como você participa da conversa pode reforçar ou enfraquecer o conteúdo da resposta."],
        },
        {
          id: "online",
          title: "Em conversas online",
          paragraphs: ["Prepare o ambiente, reduza distrações e confirme se consegue ouvir e responder com tranquilidade."],
          tip: "Mesmo sem vídeo, postura também aparece na pontualidade, no cuidado com as respostas e na escuta.",
        },
      ],
      summary: "Postura profissional é atenção, clareza e respeito ao contexto da entrevista.",
    },
  },
  {
    id: "metodo-star-explicado",
    slug: "metodo-star-explicado",
    title: "O método STAR explicado",
    description: "Aprenda a usar Situação, Tarefa, Ação e Resultado para responder perguntas comportamentais.",
    type: "READING",
    category: "Método STAR",
    competencyIds: ["communication", "problem-solving"],
    recommended: true,
    content: {
      intro: "O método STAR ajuda a transformar experiências em respostas objetivas e fáceis de avaliar.",
      sections: [
        {
          id: "partes",
          title: "As quatro partes",
          bullets: ["Situação: contexto", "Tarefa: responsabilidade", "Ação: o que você fez", "Resultado: impacto ou aprendizado"],
        },
        {
          id: "uso",
          title: "Quando usar",
          paragraphs: ["Use STAR em perguntas sobre desafios, conflitos, trabalho em equipe, liderança, organização ou resolução de problemas."],
          example: "Em um projeto com prazo curto, organizei tarefas, combinei prioridades com o grupo e entregamos a apresentação no prazo.",
        },
      ],
      summary: "STAR deixa sua resposta concreta, organizada e focada em evidências.",
    },
  },
  {
    id: "star-na-pratica-exemplos-reais",
    slug: "star-na-pratica-exemplos-reais",
    title: "STAR na prática: exemplos reais",
    description: "Exemplos guiados para aplicar o método STAR em diferentes contextos profissionais.",
    type: "READING",
    category: "Método STAR",
    competencyIds: ["communication", "collaboration", "problem-solving"],
    content: {
      intro: "Este material apresenta exemplos de respostas estruturadas. Ele não é um exercício interativo nesta etapa.",
      sections: [
        {
          id: "exemplo-equipe",
          title: "Exemplo: trabalho em equipe",
          paragraphs: ["Situação: um grupo precisava entregar uma atividade com pouco tempo. Tarefa: organizar a divisão das partes. Ação: combinei responsáveis e revisei o material final. Resultado: entregamos no prazo e reduzimos retrabalho."],
          tip: "O avaliador precisa entender sua ação específica, não apenas o que o grupo fez.",
        },
        {
          id: "exemplo-problema",
          title: "Exemplo: resolução de problema",
          paragraphs: ["Situação: um processo estava gerando atrasos. Tarefa: identificar a causa. Ação: comparei as etapas, encontrei gargalos e sugeri nova ordem. Resultado: a equipe ganhou previsibilidade."],
        },
      ],
      summary: "Bons exemplos mostram contexto, sua contribuição e o efeito da ação.",
    },
  },
  {
    id: "perguntas-comportamentais-mais-comuns",
    slug: "perguntas-comportamentais-mais-comuns",
    title: "Perguntas comportamentais mais comuns",
    description: "Perguntas frequentes e como abordá-las com segurança.",
    type: "READING",
    category: "Perguntas comportamentais",
    competencyIds: ["communication"],
    recommended: true,
    content: {
      intro: "Perguntas comportamentais buscam entender como você age em situações reais ou prováveis do trabalho.",
      sections: [
        {
          id: "temas",
          title: "Temas frequentes",
          bullets: ["Trabalho em equipe", "Conflitos", "Pressão e prazos", "Aprendizado com erro", "Organização"],
        },
        {
          id: "resposta",
          title: "Como responder",
          paragraphs: ["Escolha uma situação verdadeira e explique sua participação de forma objetiva. Evite respostas genéricas como 'sou perfeccionista' sem exemplo."],
          tip: "Prepare 3 histórias reais que possam ser adaptadas a mais de uma pergunta.",
        },
      ],
      summary: "A melhor preparação é ter exemplos reais organizados antes da entrevista.",
    },
  },
  {
    id: "como-responder-fale-sobre-voce",
    slug: "como-responder-fale-sobre-voce",
    title: "Como responder 'fale sobre você'",
    description: "Veja como estruturar uma resposta segura para uma das perguntas mais comuns.",
    type: "READING",
    category: "Perguntas comportamentais",
    competencyIds: ["communication"],
    content: {
      intro: "Essa pergunta costuma abrir a entrevista. Ela pede uma apresentação profissional, não uma biografia completa.",
      sections: [
        {
          id: "foco",
          title: "Escolha o foco certo",
          bullets: ["Formação ou trajetória", "Experiências relevantes", "Interesse pela vaga"],
          paragraphs: ["A resposta deve ajudar o avaliador a seguir para perguntas mais específicas."],
        },
        {
          id: "fechamento",
          title: "Finalize conectando com a oportunidade",
          example: "Por isso, tenho interesse nessa vaga, porque ela combina atendimento, organização e aprendizado em rotinas administrativas.",
        },
      ],
      summary: "Fale sobre você com foco profissional e conexão clara com a vaga.",
    },
  },
  {
    id: "primeiro-emprego-como-se-preparar",
    slug: "primeiro-emprego-como-se-preparar",
    title: "Primeiro emprego: como se preparar",
    description: "Guia para quem está buscando a primeira experiência profissional.",
    type: "READING",
    category: "Primeiro emprego",
    competencyIds: ["organization", "continuous-learning"],
    recommended: true,
    content: {
      intro: "Sem experiência formal, o foco deve estar em disposição para aprender, responsabilidade e exemplos de atividades escolares, cursos ou projetos.",
      sections: [
        {
          id: "evidencias",
          title: "Use experiências possíveis",
          bullets: ["Projetos de curso", "Trabalhos em grupo", "Atividades voluntárias", "Responsabilidades familiares ou comunitárias"],
        },
        {
          id: "preparo",
          title: "Prepare o básico",
          paragraphs: ["Revise seu currículo, pesquise a empresa e pratique respostas sobre seus objetivos e disponibilidade."],
          tip: "Não peça desculpas por não ter experiência. Mostre preparo e vontade de evoluir.",
        },
      ],
      summary: "Primeira oportunidade exige clareza, responsabilidade e exemplos do seu potencial.",
    },
  },
  {
    id: "jovem-aprendiz-direitos-e-oportunidades",
    slug: "jovem-aprendiz-direitos-e-oportunidades",
    title: "Jovem Aprendiz: direitos e oportunidades",
    description: "Entenda o programa Jovem Aprendiz e como se destacar no processo seletivo.",
    type: "READING",
    category: "Jovem Aprendiz",
    competencyIds: ["continuous-learning"],
    content: {
      intro: "O programa Jovem Aprendiz combina experiência prática e formação, sendo uma porta de entrada importante para o mercado de trabalho.",
      sections: [
        {
          id: "perfil",
          title: "O que as empresas observam",
          bullets: ["Pontualidade", "Interesse em aprender", "Boa comunicação", "Responsabilidade com estudos e trabalho"],
        },
        {
          id: "entrevista",
          title: "Como se posicionar",
          paragraphs: ["Explique seus objetivos, sua rotina de estudos e por que deseja desenvolver experiência profissional."],
          tip: "Mostre disponibilidade real e compromisso com a aprendizagem.",
        },
      ],
      summary: "Jovem Aprendiz é uma oportunidade de entrada que valoriza postura, aprendizado e responsabilidade.",
    },
  },
  {
    id: "como-conquistar-uma-vaga-de-estagio",
    slug: "como-conquistar-uma-vaga-de-estagio",
    title: "Como conquistar uma vaga de estágio",
    description: "Dicas específicas para candidatos que buscam oportunidades de estágio.",
    type: "READING",
    category: "Estágio",
    competencyIds: ["continuous-learning", "organization"],
    content: {
      intro: "No estágio, a empresa busca potencial de aprendizado e relação entre sua formação e as atividades da vaga.",
      sections: [
        {
          id: "preparacao",
          title: "Conecte curso e prática",
          paragraphs: ["Mostre disciplinas, projetos ou interesses que se aproximem da vaga. Isso ajuda o avaliador a enxergar seu potencial."],
          bullets: ["Projetos acadêmicos", "Ferramentas conhecidas", "Interesses de carreira"],
        },
        {
          id: "atitude",
          title: "Demonstre atitude de aprendizagem",
          tip: "Fale sobre o que você já está estudando e como pretende evoluir na área.",
        },
      ],
      summary: "Uma boa candidatura de estágio conecta formação, curiosidade e disponibilidade para aprender.",
    },
  },
  {
    id: "recolocacao-profissional-por-onde-comecar",
    slug: "recolocacao-profissional-por-onde-comecar",
    title: "Recolocação profissional: por onde começar",
    description: "Estratégias para quem está em transição de carreira ou voltando ao mercado.",
    type: "READING",
    category: "Recolocação profissional",
    competencyIds: ["organization", "continuous-learning"],
    content: {
      intro: "Recolocação exige clareza de objetivo, atualização do perfil e rotina de candidatura.",
      sections: [
        {
          id: "diagnostico",
          title: "Revise seu posicionamento",
          bullets: ["Quais experiências continuam fortes", "Quais habilidades precisam atualização", "Quais vagas fazem sentido agora"],
        },
        {
          id: "rotina",
          title: "Crie uma rotina de busca",
          paragraphs: ["Organize vagas, datas, retornos e adaptações de currículo. Isso reduz ansiedade e aumenta consistência."],
          tip: "Transição de carreira pode exigir explicar escolhas. Prepare uma narrativa honesta e positiva.",
        },
      ],
      summary: "Recolocação fica mais leve quando você transforma a busca em processo organizado.",
    },
  },
  {
    id: "perguntas-tecnicas-como-se-preparar",
    slug: "perguntas-tecnicas-como-se-preparar",
    title: "Perguntas técnicas: como se preparar",
    description: "Como estudar e responder perguntas técnicas específicas da sua área de atuação.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["logic", "web-foundations", "javascript-typescript"],
    content: {
      intro: "Perguntas técnicas avaliam raciocínio e familiaridade com conceitos da área. A resposta pode mostrar seu processo, não apenas uma definição pronta.",
      sections: [
        {
          id: "base",
          title: "Revise fundamentos",
          bullets: ["Conceitos principais da vaga", "Ferramentas citadas nos requisitos", "Projetos ou exemplos que você consegue explicar"],
        },
        {
          id: "nao-saber",
          title: "Quando não souber",
          paragraphs: ["Se não souber uma resposta, explique como você buscaria a solução ou relacione com algo próximo que conhece."],
          tip: "Não invente domínio técnico. Clareza sobre seu nível real também conta.",
        },
      ],
      summary: "Preparação técnica combina estudo de fundamentos, exemplos práticos e honestidade sobre o que você sabe.",
    },
  },
  {
    id: "fundamentos-de-logica",
    slug: "fundamentos-de-logica",
    title: "Fundamentos de Lógica",
    description: "Introdução ao raciocínio estruturado para resolver problemas técnicos com mais clareza.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["logic"],
    content: {
      intro: "Lógica ajuda a transformar um problema grande em partes menores, compreensíveis e testáveis.",
      sections: [
        {
          id: "decomposicao",
          title: "Quebre o problema em passos",
          paragraphs: ["Antes de pensar em código, descreva a entrada, o processamento esperado e a saída desejada."],
          bullets: ["O que eu recebo?", "O que preciso descobrir?", "Quais regras não posso esquecer?"],
        },
        {
          id: "raciocinio",
          title: "Explique seu raciocínio",
          paragraphs: ["Em entrevistas, muitas vezes o avaliador quer entender como você pensa, não apenas se chega rapidamente à resposta final."],
          tip: "Use exemplos simples para testar sua ideia antes de generalizar.",
        },
      ],
      summary: "A lógica se fortalece com decomposição, teste de hipóteses e explicação clara do raciocínio.",
    },
  },
  {
    id: "fundamentos-da-web",
    slug: "fundamentos-da-web",
    title: "Fundamentos da Web",
    description: "Base introdutória sobre HTML, CSS, navegador e estrutura de páginas web.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["web-foundations"],
    recommended: true,
    content: {
      intro: "Fundamentos Web formam a base para evoluir em front-end, JavaScript e responsividade.",
      sections: [
        {
          id: "base",
          title: "O que revisar",
          bullets: ["HTML como estrutura", "CSS como apresentação", "Navegador como ambiente de execução", "Acessibilidade e semântica básica"],
        },
        {
          id: "entrevista",
          title: "Como falar sobre fundamentos",
          paragraphs: ["Explique a função de cada tecnologia e cite exemplos simples de uso em projetos ou estudos."],
          example: "Uso HTML para organizar o conteúdo, CSS para controlar layout e JavaScript para lidar com interações.",
        },
      ],
      summary: "Uma base Web sólida torna mais fácil aprender frameworks e explicar decisões técnicas.",
    },
  },
  {
    id: "introducao-ao-javascript",
    slug: "introducao-ao-javascript",
    title: "Introdução ao JavaScript",
    description: "Conceitos iniciais de JavaScript para responder melhor perguntas técnicas de front-end.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["javascript-typescript"],
    content: {
      intro: "JavaScript adiciona comportamento às interfaces e é uma base importante para a trilha de desenvolvimento front-end.",
      sections: [
        {
          id: "conceitos",
          title: "Conceitos essenciais",
          bullets: ["Variáveis", "Funções", "Condições", "Arrays e objetos", "Eventos no navegador"],
        },
        {
          id: "resposta",
          title: "Respondendo em entrevista",
          paragraphs: ["Relacione conceitos a situações práticas, como validar um formulário, exibir uma mensagem ou atualizar uma lista na tela."],
          tip: "Se estiver começando, seja honesto sobre seu nível e destaque o que já praticou.",
        },
      ],
      summary: "JavaScript deve ser explicado com exemplos de comportamento visível na interface.",
    },
  },
  {
    id: "introducao-ao-git-e-versionamento",
    slug: "introducao-ao-git-e-versionamento",
    title: "Introdução ao Git e Versionamento",
    description: "Entenda o papel do versionamento no trabalho em equipe e na organização de projetos.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["git-versioning"],
    content: {
      intro: "Versionamento registra a evolução de um projeto e ajuda equipes a colaborar com mais segurança.",
      sections: [
        {
          id: "conceitos",
          title: "Conceitos para conhecer",
          bullets: ["Repositório", "Commit", "Branch", "Pull request", "Histórico de alterações"],
        },
        {
          id: "limite",
          title: "O que o RH Connect registra",
          paragraphs: ["Concluir este material representa progresso de aprendizagem. A plataforma não valida uso real de Git nesta etapa."],
          tip: "Em entrevistas, fale sobre como você organiza versões e aprende com o histórico do projeto.",
        },
      ],
      summary: "Git é uma prática de organização e colaboração, mas seu domínio real depende de uso contínuo.",
    },
  },
  {
    id: "responsividade-e-mobile-first",
    slug: "responsividade-e-mobile-first",
    title: "Responsividade e Mobile First",
    description: "Conceitos iniciais para adaptar interfaces a diferentes tamanhos de tela.",
    type: "READING",
    category: "Perguntas técnicas",
    area: "TI",
    track: "Desenvolvimento Front-end",
    competencyIds: ["responsiveness"],
    content: {
      intro: "Responsividade busca manter uma boa experiência em celular, tablet e desktop.",
      sections: [
        {
          id: "principios",
          title: "Princípios básicos",
          bullets: ["Layouts flexíveis", "Quebra de colunas em telas menores", "Texto legível", "Áreas de toque confortáveis"],
        },
        {
          id: "mobile-first",
          title: "Mobile first",
          paragraphs: ["Começar pelo mobile ajuda a priorizar conteúdo e simplificar a interface antes de expandir para telas maiores."],
          tip: "A conclusão deste material indica aprendizagem sobre o tema, não valida uma interface responsiva real.",
        },
      ],
      summary: "Responsividade combina hierarquia, adaptação de layout e atenção ao uso real em diferentes dispositivos.",
    },
  },
];

export const SUPPORT_MATERIAL_CATEGORIES = [
  "Todas as categorias",
  ...Array.from(new Set(SUPPORT_MATERIALS.map((material) => material.category))),
];

export function findSupportMaterialBySlug(slug: string) {
  return SUPPORT_MATERIALS.find((material) => material.slug === slug);
}

export function findSupportMaterialById(materialId: string) {
  return SUPPORT_MATERIALS.find((material) => material.id === materialId);
}
