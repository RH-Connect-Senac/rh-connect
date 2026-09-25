/** RH Connect — Contexto de sessão real (extraído de App.tsx no Prompt 08)
 *
 * Motivo de existir num módulo próprio, fora de App.tsx: antes, `SessionContext`
 * só era usado dentro do próprio App.tsx (por `AuthLayout`, para resolver o
 * nome/e-mail do candidato autenticado no cabeçalho sem precisar receber a
 * sessão via props em ~25 lugares). O Prompt 08 identificou que `EvalLayout`
 * (`components/eval-screens.tsx`) e `AdminLayout` (`components/admin-screens.tsx`)
 * tinham o mesmo problema, mas exibiam sempre um nome/e-mail hardcoded
 * ("Carlos Andrade"/"Ana Martins"), nunca o do avaliador/admin realmente
 * autenticado — porque não tinham como acessar a sessão real sem essa mesma
 * ponte. Como App.tsx já importa telas de `eval-screens.tsx`/`admin-screens.tsx`,
 * definir o contexto ali e importá-lo de volta nesses arquivos criaria uma
 * dependência circular; por isso ele mora aqui, em um módulo que os três
 * lados podem importar sem ciclo.
 */
import { createContext } from "react";
import type { MockAuthSession } from "./services/auth-service";

// Sessão real "vazia" — usada como valor padrão do contexto abaixo (antes de
// `AppSessionBoot` popular a sessão real) e, em App.tsx, para representar a
// sessão após logout/expiração.
export const UNAUTHENTICATED_SESSION: MockAuthSession = {
  version: 1,
  authenticated: false,
  user: null,
};

// Dá acesso à sessão REAL atual (do estado de `AppRoutes`, em App.tsx) para
// componentes que não a recebem via props.
export const SessionContext = createContext<MockAuthSession>(UNAUTHENTICATED_SESSION);
