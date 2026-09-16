export type EvaluatorInvite = {
  token: string;
  name: string;
  email: string;
  organization: string;
};

export type EvaluatorInviteStatus =
  | "valid"
  | "missing-token"
  | "invalid"
  | "expired"
  | "used"
  | "error";

export type EvaluatorInviteResolution =
  | { status: "valid"; invite: EvaluatorInvite }
  | { status: Exclude<EvaluatorInviteStatus, "valid">; message: string };

const MOCK_EVALUATOR_INVITES: Record<string, EvaluatorInvite> = {
  "demo-patricia": {
    token: "demo-patricia",
    name: "Patricia Gomes",
    email: "patricia.gomes@gmail.com",
    organization: "SENAC-DF",
  },
};

const INVITE_ERROR_MESSAGES = {
  "missing-token": "O link de ativação está incompleto. Solicite um novo convite ao administrador.",
  invalid: "Este link de ativação não é válido. Verifique se o endereço foi copiado corretamente.",
  expired: "Este convite expirou. Solicite um novo convite ao administrador.",
  used: "Este convite já foi utilizado. Faça login ou solicite suporte se precisar de ajuda.",
  error: "Não foi possível validar o convite agora. Tente novamente em instantes.",
} satisfies Record<Exclude<EvaluatorInviteStatus, "valid">, string>;

export async function resolveEvaluatorInvite(token: string | null): Promise<EvaluatorInviteResolution> {
  const normalizedToken = token?.trim() ?? "";
  if (!normalizedToken) {
    return { status: "missing-token", message: INVITE_ERROR_MESSAGES["missing-token"] };
  }

  if (normalizedToken === "demo-expired") {
    return { status: "expired", message: INVITE_ERROR_MESSAGES.expired };
  }

  if (normalizedToken === "demo-used") {
    return { status: "used", message: INVITE_ERROR_MESSAGES.used };
  }

  if (normalizedToken === "demo-error") {
    return { status: "error", message: INVITE_ERROR_MESSAGES.error };
  }

  const invite = MOCK_EVALUATOR_INVITES[normalizedToken];
  if (!invite) {
    return { status: "invalid", message: INVITE_ERROR_MESSAGES.invalid };
  }

  return { status: "valid", invite };
}

export async function activateEvaluatorInvite(token: string, password: string) {
  const invite = await resolveEvaluatorInvite(token);
  if (invite.status !== "valid") {
    return invite;
  }

  if (password.trim().length < 8) {
    return { status: "error" as const, message: "A senha deve ter pelo menos 8 caracteres." };
  }

  return { status: "activated" as const, invite: invite.invite };
}
