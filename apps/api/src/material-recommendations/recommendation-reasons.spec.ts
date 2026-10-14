import { GENERAL_PREPARATION_REASON, buildRecommendationReason } from './recommendation-reasons';
import { NEED_KEYS } from './recommendation.types';

describe('buildRecommendationReason (motivos fixos e centralizados)', () => {
  it('cada necessidade tem motivo principal e secundário, curtos, distintos e sem lacunas de template', () => {
    const seen = new Set<string>();
    for (const need of NEED_KEYS) {
      for (const kind of ['primary', 'secondary'] as const) {
        const text = buildRecommendationReason(kind, need, 'TI');
        expect(text.length).toBeGreaterThan(10);
        expect(text.length).toBeLessThanOrEqual(80);
        expect(text.endsWith('.')).toBe(true);
        expect(text).not.toMatch(/undefined|null|\$\{|\{\}/);
        seen.add(text);
      }
    }
    expect(seen.size).toBe(NEED_KEYS.length * 2);
  });

  it('textos de referência', () => {
    expect(buildRecommendationReason('primary', 'clarity', 'GERAL')).toBe(
      'Ajuda a desenvolver clareza na comunicação.',
    );
    expect(buildRecommendationReason('primary', 'organization', 'GERAL')).toBe(
      'Reforça organização e estruturação das respostas.',
    );
    expect(buildRecommendationReason('primary', 'examples', 'GERAL')).toBe(
      'Ajuda a apresentar experiências com exemplos mais estruturados.',
    );
  });

  it('domain_knowledge cita a área do material', () => {
    expect(buildRecommendationReason('primary', 'domain_knowledge', 'TI')).toBe(
      'Apoia o desenvolvimento de conhecimento técnico em Tecnologia.',
    );
    expect(buildRecommendationReason('primary', 'domain_knowledge', 'RH')).toBe(
      'Apoia o desenvolvimento de conhecimento da área de Recursos Humanos.',
    );
    expect(buildRecommendationReason('primary', 'domain_knowledge', 'SECRETARIADO')).toBe(
      'Apoia o desenvolvimento de conhecimento da área de Secretariado.',
    );
  });

  it('preparação geral (ou sem necessidade) usa o texto neutro', () => {
    expect(buildRecommendationReason('general_preparation', null, 'GERAL')).toBe(GENERAL_PREPARATION_REASON);
    expect(buildRecommendationReason('primary', null, 'GERAL')).toBe(GENERAL_PREPARATION_REASON);
  });

  it('é determinístico', () => {
    expect(buildRecommendationReason('secondary', 'coherence', 'GERAL')).toBe(
      buildRecommendationReason('secondary', 'coherence', 'GERAL'),
    );
  });
});
