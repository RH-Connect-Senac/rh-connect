/**
 * Rascunho do formulário de criação de conta, mantido SOMENTE em memória do app.
 *
 * Serve para o usuário consultar Termos/Política de Privacidade durante o cadastro e voltar
 * sem redigitar os campos. Não usa localStorage, sessionStorage, cookies nem URL, nunca é
 * enviado ao backend e não sobrevive a um refresh completo da aplicação.
 * É limpo quando o cadastro conclui ou quando o usuário sai do fluxo
 * cadastro ↔ documentos legais (ver `AppRoutes`).
 */
export type RegisterDraft = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

let registerDraft: RegisterDraft | null = null;

export function getRegisterDraft(): RegisterDraft | null {
  return registerDraft;
}

export function saveRegisterDraft(draft: RegisterDraft) {
  registerDraft = draft;
}

export function clearRegisterDraft() {
  registerDraft = null;
}
