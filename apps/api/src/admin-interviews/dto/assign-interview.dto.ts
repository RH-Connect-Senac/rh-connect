import { IsInt, Max, Min } from 'class-validator';

// Corpo de POST /admin/interviews/:id/assign. SOMENTE o avaliador escolhido
// (evaluator_profile_id). Admin, status e datas nunca vêm do cliente: campos
// extras são descartados pelo ValidationPipe global (`whitelist: true`).
export class AssignInterviewDto {
  @IsInt({ message: 'Informe um avaliador válido.' })
  @Min(1, { message: 'Informe um avaliador válido.' })
  @Max(2147483647, { message: 'Informe um avaliador válido.' })
  evaluatorId: number;
}
