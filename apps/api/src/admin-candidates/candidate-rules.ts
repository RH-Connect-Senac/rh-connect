// Quem é "candidato cadastrado": toda conta com papel CANDIDATE, em qualquer
// account_status. Usado pela lista do Admin e pelo Dashboard Admin.
export const CANDIDATE_USER_WHERE = { user_role: 'CANDIDATE' } as const;
