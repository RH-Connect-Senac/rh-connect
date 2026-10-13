import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMIN_NOTIFS,
  CANDIDATE_NOTIFS,
  EVAL_NOTIFS,
  welcomeNotifsForRole,
} from "./header-popovers";

describe("notificação de boas-vindas por perfil (V1, estática)", () => {
  it("candidato", () => {
    expect(CANDIDATE_NOTIFS).toEqual([
      {
        id: "welcome",
        title: "Bem-vindo ao RH Connect!",
        desc: "Explore os recursos da plataforma e continue sua jornada de preparação.",
        unread: false,
      },
    ]);
  });

  it("avaliador", () => {
    expect(EVAL_NOTIFS[0].title).toBe("Bem-vindo ao RH Connect!");
    expect(EVAL_NOTIFS[0].desc).toBe("Acompanhe suas avaliações atribuídas e continue seu trabalho pela plataforma.");
    expect(EVAL_NOTIFS[0].unread).toBe(false);
  });

  it("admin", () => {
    expect(ADMIN_NOTIFS[0].title).toBe("Bem-vindo ao RH Connect!");
    expect(ADMIN_NOTIFS[0].desc).toBe("Gerencie candidatos, avaliadores e acompanhe o andamento das entrevistas pela plataforma.");
    expect(ADMIN_NOTIFS[0].unread).toBe(false);
  });

  it("papel desconhecido/ausente usa fallback neutro, sem texto de outro perfil", () => {
    for (const role of ["OUTRO", "", undefined, null, "constructor", "toString"]) {
      const [item] = welcomeNotifsForRole(role);
      expect(item.title).toBe("Bem-vindo ao RH Connect!");
      expect(item.desc).toBe("Explore os recursos da plataforma RH Connect.");
      expect(item.unread).toBe(false);
    }
  });

  it("mesma forma para todos (um item, sem navegação nem horário) e sem storage", () => {
    for (const items of [CANDIDATE_NOTIFS, EVAL_NOTIFS, ADMIN_NOTIFS]) {
      expect(items.length).toBe(1);
      expect(Object.keys(items[0]).sort()).toEqual(["desc", "id", "title", "unread"]);
    }
    const source = readFileSync(join(__dirname, "header-popovers.tsx"), "utf8");
    expect(source).not.toMatch(/localStorage/);
  });
});

describe("tela 'Respostas enviadas!' (candidato): bloco do protocolo responsivo", () => {
  const app = readFileSync(join(__dirname, "..", "App.tsx"), "utf8");
  const start = app.indexOf("{/* Protocolo */}");
  const block = app.slice(start, app.indexOf("{/* Próximos passos */}", start));

  it("uma coluna no mobile e duas a partir de sm; status com largura natural", () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain("grid grid-cols-1 gap-3 sm:grid-cols-2");
    expect(block).toContain("w-fit max-w-full");
  });

  it("mantém os textos e os campos", () => {
    for (const text of ["Protocolo", "Vaga", "Enviado em", "Status", "Aguardando avaliação por IA", "Aguardando avaliação"]) {
      expect(block).toContain(text);
    }
  });
});
