import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Garante que a persistência local do Perfil Profissional não volta: o banco/API
// é a única fonte de verdade.
const SRC_ROOT = resolve(__dirname, "..", "..");
const LEGACY_KEY = ["rhconnect", "candidate-profiles", "v1"].join(":");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("remoção do localStorage do Perfil Profissional", () => {
  const files = listSourceFiles(SRC_ROOT);

  it("nenhum arquivo de produção referencia a chave antiga", () => {
    const offenders = files.filter((file) => readFileSync(file, "utf8").includes(LEGACY_KEY));
    expect(offenders).toEqual([]);
  });

  it("o service do perfil e o hook não usam localStorage", () => {
    const profileFiles = files.filter((file) => /candidate-profile-service\.ts$|use-candidate-profile\.ts$/.test(file));
    expect(profileFiles.length).toBe(2);
    for (const file of profileFiles) {
      expect(readFileSync(file, "utf8")).not.toMatch(/localStorage|sessionStorage/);
    }
  });

  it("Admin não usa o modelo antigo nem placeholders do Fluxo 02", () => {
    const adminScreens = readFileSync(join(SRC_ROOT, "app", "components", "admin-screens.tsx"), "utf8");
    expect(adminScreens).not.toMatch(/domain\/candidate-profile"/);
    expect(adminScreens).not.toMatch(/ainda não são sincronizados com o servidor/);
    expect(adminScreens).not.toMatch(/Localização/);
    expect(adminScreens).not.toMatch(/candidate\.profile\?\.(city|state)/);

    const offenders = files.filter((file) => /domain\/candidate-profile"/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
