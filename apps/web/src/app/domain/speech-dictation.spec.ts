import { describe, expect, it } from "vitest";
import {
  SPEECH_GENERIC_ERROR_MESSAGE,
  appendDictation,
  getNewTranscript,
  getSpeechErrorMessage,
  isSpeechContextSecure,
} from "./speech-dictation";

describe("getSpeechErrorMessage", () => {
  it.each(["not-allowed", "service-not-allowed", "audio-capture", "no-speech", "network"])(
    "%s tem mensagem específica, diferente da genérica",
    (code) => {
      const message = getSpeechErrorMessage(code);
      expect(message).not.toBeNull();
      expect(message).not.toBe(SPEECH_GENERIC_ERROR_MESSAGE);
    },
  );

  it("as mensagens específicas são todas distintas entre si", () => {
    const codes = ["not-allowed", "service-not-allowed", "audio-capture", "no-speech", "network"];
    const messages = codes.map((code) => getSpeechErrorMessage(code));
    expect(new Set(messages).size).toBe(codes.length);
  });

  it("erro desconhecido, vazio ou ausente usa a mensagem genérica", () => {
    expect(getSpeechErrorMessage("language-not-supported")).toBe(SPEECH_GENERIC_ERROR_MESSAGE);
    expect(getSpeechErrorMessage("qualquer-coisa")).toBe(SPEECH_GENERIC_ERROR_MESSAGE);
    expect(getSpeechErrorMessage("")).toBe(SPEECH_GENERIC_ERROR_MESSAGE);
    expect(getSpeechErrorMessage(undefined)).toBe(SPEECH_GENERIC_ERROR_MESSAGE);
    expect(getSpeechErrorMessage(null)).toBe(SPEECH_GENERIC_ERROR_MESSAGE);
  });

  it("aborted não gera mensagem", () => {
    expect(getSpeechErrorMessage("aborted")).toBeNull();
  });

  it("nenhuma mensagem expõe o código técnico e todas oferecem digitar", () => {
    const codes = ["not-allowed", "service-not-allowed", "audio-capture", "no-speech", "network", "x"];
    for (const code of codes) {
      const message = getSpeechErrorMessage(code) as string;
      expect(message.includes(code)).toBe(false);
      expect(/digitando/.test(message)).toBe(true);
    }
  });
});

describe("isSpeechContextSecure", () => {
  it("só é inseguro quando isSecureContext é explicitamente false", () => {
    expect(isSpeechContextSecure(false)).toBe(false);
    expect(isSpeechContextSecure(true)).toBe(true);
    expect(isSpeechContextSecure(undefined)).toBe(true);
  });
});

const MAX = 1000;
const result = (transcript: string) => ({ 0: { transcript } });

describe("getNewTranscript (resultados cumulativos do modo contínuo)", () => {
  it("devolve só os resultados novos desde o último evento", () => {
    const first = getNewTranscript([result("em vendas")], 0);
    expect(first).toEqual({ transcript: "em vendas", processed: 1 });
    const second = getNewTranscript([result("em vendas"), result("e liderança")], first.processed);
    expect(second).toEqual({ transcript: "e liderança", processed: 2 });
  });

  it("sem resultados novos, devolve texto vazio", () => {
    expect(getNewTranscript([result("oi")], 1)).toEqual({ transcript: "", processed: 1 });
  });

  it("junta vários resultados novos, tolera resultado vazio e contagem inconsistente", () => {
    expect(getNewTranscript([result("a"), result("b")], 0).transcript).toBe("a b");
    expect(getNewTranscript([{}, result("b")], 0).transcript).toBe("b");
    expect(getNewTranscript([result("a")], 5)).toEqual({ transcript: "", processed: 1 });
  });
});

describe("appendDictation", () => {
  it("acrescenta com espaço ao valor atual", () => {
    expect(appendDictation("Tenho experiência", "em vendas", MAX)).toBe("Tenho experiência em vendas");
  });

  it("resposta vazia: sem espaço inicial", () => {
    expect(appendDictation("", "olá", MAX)).toBe("olá");
  });

  it("texto ditado vazio não altera a resposta", () => {
    expect(appendDictation("abc", "   ", MAX)).toBe("abc");
  });

  it("respeita o limite de caracteres (corta o trecho)", () => {
    const current = "x".repeat(MAX - 5);
    const next = appendDictation(current, "123456789", MAX);
    expect(next.length).toBe(MAX);
    expect(next.endsWith(" 1234")).toBe(true);
  });

  it("sem espaço sobrando, devolve a resposta como está", () => {
    const full = "x".repeat(MAX);
    expect(appendDictation(full, "mais texto", MAX)).toBe(full);
  });
});

describe("ditado com edição manual no meio (sem perder o que foi digitado)", () => {
  it("resposta inicial -> ditado -> edição manual -> novo ditado preserva a edição", () => {
    // Estado vive no "campo": o ditado sempre parte do valor MAIS RECENTE.
    let answer = "Tenho experiência";
    let processed = 0;

    // 1) trecho vindo do ditado
    const firstEvent = [result("em vendas")];
    const first = getNewTranscript(firstEvent, processed);
    processed = first.processed;
    answer = appendDictation(answer, first.transcript, MAX);
    expect(answer).toBe("Tenho experiência em vendas");

    // 2) edição manual enquanto o ditado continua ativo
    answer = `${answer} e atendimento ao cliente`;

    // 3) novo trecho vindo do ditado (results cumulativo: inclui o primeiro)
    const secondEvent = [result("em vendas"), result("e liderança")];
    const second = getNewTranscript(secondEvent, processed);
    processed = second.processed;
    answer = appendDictation(answer, second.transcript, MAX);

    // 4) a edição manual não foi perdida, nada duplicado
    expect(answer).toBe("Tenho experiência em vendas e atendimento ao cliente e liderança");
    expect(answer.includes("e atendimento ao cliente")).toBe(true);
    expect(answer.split("em vendas").length - 1).toBe(1);
  });

  it("o modelo antigo (base capturada no início) perderia a edição manual", () => {
    const startAnswer = "Tenho experiência";
    const typedLater = `${startAnswer} em vendas e atendimento`;
    const staleResult = appendDictation(startAnswer, "e liderança", MAX); // base velha
    const freshResult = appendDictation(typedLater, "e liderança", MAX); // base atual
    expect(staleResult.includes("atendimento")).toBe(false);
    expect(freshResult.includes("atendimento")).toBe(true);
  });

  it("edição que apaga texto também é respeitada", () => {
    let answer = "Primeira frase.";
    answer = appendDictation(answer, "Segunda frase.", MAX);
    answer = "Segunda frase."; // usuário apagou a primeira
    answer = appendDictation(answer, "Terceira.", MAX);
    expect(answer).toBe("Segunda frase. Terceira.");
  });
});
