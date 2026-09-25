/**
 * Cadastro REAL de Candidato (Fluxo 01 / Prompt 02).
 *
 * Este serviço fala diretamente com a API (NestJS) e é totalmente
 * independente do Auth mock (`auth-service.ts`): não lê nem escreve nada em
 * localStorage, não alimenta `MOCK_LOGIN_USERS` nem os candidatos
 * registrados no mock (decisão D1 — nenhum adapter, nenhum dual-write).
 *
 * O Login continua 100% mock até o Prompt 03: uma conta criada aqui não é
 * reconhecida pelo `loginMockWithCredentials` enquanto o Prompt 03 não
 * integrar o login real.
 */

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://127.0.0.1:3000"
).replace(/\/+$/, "");

export type RealCandidateUser = {
  id: number;
  name: string;
  email: string;
  role: "CANDIDATE" | "EVALUATOR" | "ADMIN";
  accountStatus: string;
  onboardingCompleted: boolean;
};

export type RegisterCandidateInput = {
  name: string;
  email: string;
  password: string;
  termsAccepted: boolean;
};

export type RegisterCandidateResult =
  | { ok: true; user: RealCandidateUser }
  | { ok: false; message: string };

async function readRegisterErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.map(String).join(" ");
    }
  } catch {
    // Mantém a mensagem padrão quando a API não retorna JSON.
  }

  return fallback;
}

export async function registerRealCandidate(
  data: RegisterCandidateInput,
): Promise<RegisterCandidateResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    };
  }

  if (response.status === 409) {
    return {
      ok: false,
      message: await readRegisterErrorMessage(
        response,
        "Este e-mail já está cadastrado. Use o login para acessar sua conta.",
      ),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: await readRegisterErrorMessage(
        response,
        "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.",
      ),
    };
  }

  const user = (await response.json()) as RealCandidateUser;
  return { ok: true, user };
}
