/**
 * RH Connect — Card da Agenda no Dashboard do candidato
 *
 * Mostra entrevistas REAIS/EXTERNAS (Agenda). Não reutiliza "Entrevistas
 * recentes", que representa as entrevistas SIMULADAS do RH Connect.
 */

import { CalendarDays } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { StatusBadge } from "./ui/status-badge";
import { useExternalInterviews } from "./use-interview-agenda";
import {
  MODALITY_LABEL,
  formatInterviewDate,
  formatInterviewTime,
  getNextUpcomingInterview,
  getProximityLabel,
} from "../domain/interview-agenda";

export function NextInterviewCard({
  candidateId,
  onViewAgenda,
  onAddInterview,
}: {
  candidateId: string;
  onViewAgenda: () => void;
  onAddInterview: () => void;
}) {
  const { interviews, loading, now } = useExternalInterviews(candidateId);

  // Evita piscar o estado "vazio" antes de a leitura terminar.
  if (loading) return null;

  const next = getNextUpcomingInterview(interviews, now);

  // Estado A — nunca cadastrou entrevista. Estado C — já usou a Agenda, sem entrevista futura.
  if (!next) {
    const neverUsed = interviews.length === 0;
    return (
      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <CalendarDays className="size-5 text-blue-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {neverUsed ? "Tem uma entrevista marcada?" : "Nenhuma entrevista agendada"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {neverUsed
                  ? "Adicione à sua agenda e organize sua preparação."
                  : "Quando surgir uma nova oportunidade, adicione à sua agenda para organizar sua preparação."}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onAddInterview} className="min-h-11 w-full shrink-0 sm:min-h-0 sm:w-auto">
            {neverUsed ? "Adicionar à agenda" : "Adicionar entrevista"}
          </Button>
        </div>
      </Card>
    );
  }

  // Estado B — possui entrevista futura (somente a mais próxima).
  return (
    <Card className="mb-6 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <CalendarDays className="size-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sua próxima entrevista</p>
            <p className="mt-0.5 break-words text-sm font-bold text-foreground">{next.position}</p>
            <p className="text-xs text-muted-foreground">
              {next.company} · {MODALITY_LABEL[next.modality]}
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {formatInterviewDate(next.scheduledAt)} • {formatInterviewTime(next.scheduledAt)}
            </p>
            <StatusBadge tone="info" className="mt-2">
              {getProximityLabel(next.scheduledAt, now)}
            </StatusBadge>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onViewAgenda} className="min-h-11 w-full shrink-0 sm:min-h-0 sm:w-auto">
          Ver agenda
        </Button>
      </div>
    </Card>
  );
}
