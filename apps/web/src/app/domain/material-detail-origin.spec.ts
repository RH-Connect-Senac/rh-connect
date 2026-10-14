import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../router/routes";
import {
  CANDIDATE_REPORT_PATH_PREFIX,
  DEFAULT_MATERIAL_DETAIL_ORIGIN,
  MATERIALS_LIST_PATH,
  resolveMaterialDetailOrigin,
} from "./material-detail-origin";

const ID = "11111111-1111-4111-8111-111111111111";
const FALLBACK = { path: "/candidate/materials", label: "Voltar para Materiais" };

describe("origem do detalhe do material: retorno contextual", () => {
  it("A. Materiais → detalhe: origem da lista volta para a lista ('Voltar para Materiais')", () => {
    expect(resolveMaterialDetailOrigin("/candidate/materials")).toEqual(FALLBACK);
    // query/hash da lista são descartados: o destino é sempre reconstruído
    expect(resolveMaterialDetailOrigin("/candidate/materials?q=x#topo")).toEqual(FALLBACK);
  });

  it("B/C. Resultado → material recomendado → detalhe: volta ao relatório EXATO de origem", () => {
    expect(resolveMaterialDetailOrigin(`/candidate/reports/${ID}`)).toEqual({
      path: `/candidate/reports/${ID}`,
      label: "Voltar ao resultado",
    });
    const other = "22222222-2222-4222-8222-222222222222";
    expect(resolveMaterialDetailOrigin(`/candidate/reports/${other}`).path).toBe(`/candidate/reports/${other}`);
    // sem query/hash no destino devolvido
    expect(resolveMaterialDetailOrigin(`/candidate/reports/${ID}?next=https://evil.test#x`).path).toBe(
      `/candidate/reports/${ID}`,
    );
  });

  it("D. acesso direto (sem state) mantém o fallback seguro atual", () => {
    for (const absent of [undefined, null]) {
      expect(resolveMaterialDetailOrigin(absent)).toEqual(FALLBACK);
    }
    expect(DEFAULT_MATERIAL_DETAIL_ORIGIN).toEqual(FALLBACK);
  });

  it("E. origem inválida não é aceita: nunca vira destino", () => {
    const invalid: unknown[] = [
      "https://evil.test/candidate/reports/" + ID,
      "http://evil.test",
      "//evil.test/candidate/reports/" + ID,
      "/\\evil.test",
      "\\\\evil.test",
      "javascript:alert(1)",
      "data:text/html,x",
      "candidate/reports/" + ID,
      "/candidate/dashboard",
      "/candidate/settings",
      "/candidate/reports",
      "/candidate/reports/",
      "/candidate/reports/não-é-uuid",
      `/candidate/reports/${ID}/extra`,
      `/candidate/reports/${ID}/../../dashboard`,
      `/candidate/materials/outro`,
      "/candidate/materials/",
      "",
      42,
      {},
      ["/candidate/reports/" + ID],
      true,
    ];
    for (const from of invalid) {
      expect({ from, result: resolveMaterialDetailOrigin(from) }).toEqual({ from, result: FALLBACK });
    }
  });

  it("G. nenhuma rota nova: as origens aceitas são rotas que já existem", () => {
    const paths = APP_ROUTES.map((route) => route.path as string);
    expect(paths).toContain(MATERIALS_LIST_PATH);
    expect(paths).toContain(`${CANDIDATE_REPORT_PATH_PREFIX}:id`);
    expect(paths.filter((path) => /origin|from|return|back/i.test(path))).toEqual([]);
  });
});
