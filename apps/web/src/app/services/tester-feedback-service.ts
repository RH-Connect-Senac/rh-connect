type TesterFeedbackInput = {
  feature: string;
  bugFound: string;
  stepsToReproduce: string;
  improvementSuggestion: string;
};

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
    "http://localhost:3000").replace(/\/+$/, "");

async function readFeedbackApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown; error?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Keep fallback when the API does not return JSON.
  }

  return fallback;
}

export async function submitTesterFeedback(input: TesterFeedbackInput) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/feedback/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Não foi possível enviar seu relato. Tente novamente em instantes.");
  }

  if (!response.ok) {
    throw new Error(await readFeedbackApiError(response, "Não foi possível enviar seu relato."));
  }

  return response.json() as Promise<{ ok: boolean }>;
}
