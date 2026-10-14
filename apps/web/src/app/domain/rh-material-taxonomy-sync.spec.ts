import { describe, expect, it } from "vitest";
import {
  RH_MATERIAL_TAXONOMY,
  RH_TAXONOMY_VERSION,
} from "../../../../api/src/material-recommendations/rh-material-taxonomy";
import { SUPPORT_MATERIALS } from "../mocks/materials";

// Sincronia entre o catálogo real de materiais (frontend) e a taxonomia de
// recomendação (backend). O conteúdo continua no frontend; o backend guarda só
// os metadados que o motor precisa. Qualquer divergência de id, slug, título
// ou área quebra aqui, antes de uma recomendação apontar para um material que
// não existe (ou que mudou).
describe("taxonomia de recomendação x catálogo de materiais RH Connect", () => {
  it("cobre exatamente os mesmos materiais (sem sobra nem falta)", () => {
    const catalogIds = SUPPORT_MATERIALS.map((material) => material.id).sort();
    const taxonomyIds = RH_MATERIAL_TAXONOMY.map((entry) => entry.id).sort();
    expect(taxonomyIds).toEqual(catalogIds);
    expect(RH_TAXONOMY_VERSION).toMatch(/^rh-\d+$/);
  });

  it("id, slug, título e área batem com o catálogo", () => {
    for (const entry of RH_MATERIAL_TAXONOMY) {
      const material = SUPPORT_MATERIALS.find((item) => item.id === entry.id);
      expect(material, `material ${entry.id} ausente do catálogo`).toBeDefined();
      expect(entry.slug).toBe(material!.slug);
      expect(entry.title).toBe(material!.title);
      // Material sem área no catálogo é geral na taxonomia.
      expect(entry.area).toBe(material!.area ?? "GERAL");
    }
  });
});
