// Redundâncias editoriais conhecidas: materiais de um mesmo grupo tratam do
// mesmo assunto e, havendo alternativa, não devem aparecer juntos na mesma
// recomendação. Chave de material: `<source>:<ref>` (ver `materialKey`).
//
// É dado editorial separado das taxonomias (que não são alteradas). Um spec
// garante que toda chave citada existe no catálogo e que nenhum material está
// em dois grupos.
export const REDUNDANCY_GROUPS: Readonly<Record<string, readonly string[]>> = {
  // Duas fontes, mesmo tema de conhecimento de RH.
  'diversity-inclusion': [
    'CACHOLA:8dd795a58c91c5db06d57ba448fc1ae4',
    'ORANGO:ORANGO|86',
  ],
  // Falar de si de forma curta e dirigida.
  'self-presentation': [
    'RH_CONNECT:como-se-apresentar-em-entrevistas',
    'RH_CONNECT:como-responder-fale-sobre-voce',
    'RH_CONNECT:elevator-pitch-para-entrevistas',
    'CACHOLA:c5a8088f375aa1535bc228e1b6f0ef30',
  ],
  // Mesmo método, em profundidades diferentes.
  'star-method': [
    'RH_CONNECT:metodo-star-explicado',
    'RH_CONNECT:star-na-pratica-exemplos-reais',
  ],
  // Comunicação assertiva e clara no dia a dia.
  'assertive-communication': [
    'CACHOLA:352c172a38592288cb5406c7e7aff3c7',
    'ORANGO:ORANGO|99',
  ],
  // Porta de entrada no mercado.
  'career-entry': [
    'RH_CONNECT:primeiro-emprego-como-se-preparar',
    'RH_CONNECT:jovem-aprendiz-direitos-e-oportunidades',
    'RH_CONNECT:como-conquistar-uma-vaga-de-estagio',
  ],
};

const GROUP_BY_MATERIAL = new Map<string, string>();
for (const [group, keys] of Object.entries(REDUNDANCY_GROUPS)) {
  for (const key of keys) {
    if (!GROUP_BY_MATERIAL.has(key)) GROUP_BY_MATERIAL.set(key, group);
  }
}

export function redundancyGroupOf(materialKey: string): string | undefined {
  return GROUP_BY_MATERIAL.get(materialKey);
}
