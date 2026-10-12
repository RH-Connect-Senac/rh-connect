import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guarda de código-fonte: texto técnico nunca é literal de tela. O detector de texto técnico
// (user-friendly-error.ts) é a única exceção, pois precisa NOMEAR esses termos para filtrá-los.
const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "mocks" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.spec\.tsx?$/.test(name) && name !== "user-friendly-error.ts" ? [full] : [];
  });
}

describe("copy visível ao usuário", () => {
  const files = sourceFiles(appDir);

  it("nenhum arquivo do app expõe provider de IA, 'Bad Gateway' ou 'Failed to fetch' como texto", () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, "utf8");
      return /(["'`])[^"'`\n]*(groq|bad gateway|failed to fetch|internal server error)[^"'`\n]*\1/i.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it("os serviços não devolvem `error.message`/corpo bruto da API sem classificar", () => {
    for (const name of ["candidate-interviews-service", "interview-context-service", "real-session-service", "candidate-registration-service", "tester-feedback-service"]) {
      const text = readFileSync(join(appDir, "services", `${name}.ts`), "utf8");
      expect(text).toContain("sanitizeServerMessage");
    }
  });
});
