import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./clipboard";

const URL_TEXT = "https://www.empregare.com/pt-br/vaga-estagiario-de-rh_174874";

function fakeDocument(execResult: boolean | "throw") {
  const textarea = {
    value: "",
    style: {} as Record<string, string>,
    parentNode: null as { removeChild: (node: unknown) => void } | null,
    setAttribute: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
  };
  const body = {
    appendChild: vi.fn((node: typeof textarea) => {
      node.parentNode = body;
    }),
    removeChild: vi.fn(),
  };
  const doc = {
    body,
    createElement: vi.fn(() => textarea),
    execCommand: vi.fn(() => {
      if (execResult === "throw") throw new Error("execCommand indisponível");
      return execResult;
    }),
  };
  return { doc, textarea, body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyTextToClipboard", () => {
  it("usa o clipboard moderno quando disponível", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { doc } = fakeDocument(true);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", doc);

    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(URL_TEXT);
    expect(doc.execCommand).not.toHaveBeenCalled();
  });

  it("se o clipboard moderno falhar, usa o fallback com textarea temporário", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const { doc, textarea, body } = fakeDocument(true);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", doc);

    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(doc.execCommand).toHaveBeenCalledWith("copy");
    expect(textarea.value).toBe(URL_TEXT);
    expect(body.removeChild).toHaveBeenCalledTimes(1); // textarea sempre removido
  });

  it("falha total: moderno e fallback falham -> false, sem lançar erro", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const { doc, body } = fakeDocument(false);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", doc);

    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(false);
    expect(body.removeChild).toHaveBeenCalledTimes(1);
  });

  it("falha total: execCommand lança erro -> false e textarea removido", async () => {
    const { doc, body } = fakeDocument("throw");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("x")) } });
    vi.stubGlobal("document", doc);

    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(false);
    expect(body.removeChild).toHaveBeenCalledTimes(1);
  });

  it("sem API de clipboard: usa o fallback", async () => {
    const { doc } = fakeDocument(true);
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", doc);

    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith("copy");
  });

  it("sem API de clipboard e sem document/execCommand: false", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", undefined);
    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(false);

    vi.stubGlobal("document", { body: {}, createElement: vi.fn() });
    await expect(copyTextToClipboard(URL_TEXT)).resolves.toBe(false);
  });
});
