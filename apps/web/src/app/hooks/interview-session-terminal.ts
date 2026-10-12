import { createContext } from "react";

/**
 * O wizard (em várias telas) descobre que a entrevista deixou de ser editável
 * (cancelada ou enviada em outro dispositivo). O App raiz precisa saber disso
 * para soltar a proteção de saída (beforeunload / interceptação de navegação):
 * não há mais progresso a proteger numa sessão terminal.
 */
export type ReportInterviewTerminal = (interviewId: string, status: string | null) => void;

export const InterviewSessionTerminalContext = createContext<ReportInterviewTerminal | null>(null);
