// Projeção base da entrevista (sem dependências do service, para poder ser
// reutilizada por interview-history.ts sem import circular). interviews.service
// a reexporta: quem já importava daqui continua funcionando.
// Campos lidos do banco. Explícito (sem `include`): nunca expõe campos
// internos como candidate_user_id/evaluator_profile_id ao candidato.
export const INTERVIEW_SELECT = {
  interview_id: true,
  status: true,
  evaluation_mode: true,
  job_title: true,
  job_company: true,
  job_summary: true,
  job_activities: true,
  job_requirements: true,
  job_location: true,
  job_contract_type: true,
  job_work_mode: true,
  job_source_url: true,
  submitted_at: true,
  created_at: true,
  updated_at: true,
} as const;

export interface InterviewRecord {
  interview_id: string;
  status: string;
  evaluation_mode: string | null;
  job_title: string;
  job_company: string | null;
  job_summary: string | null;
  job_activities: unknown;
  job_requirements: unknown;
  job_location: string | null;
  job_contract_type: string | null;
  job_work_mode: string | null;
  job_source_url: string;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function toInterviewResponse(record: InterviewRecord) {
  return {
    id: record.interview_id,
    status: record.status,
    evaluationMode: record.evaluation_mode,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    context: {
      sourceUrl: record.job_source_url,
      title: record.job_title,
      company: record.job_company,
      summary: record.job_summary,
      activities: toStringList(record.job_activities),
      requirements: toStringList(record.job_requirements),
      location: record.job_location,
      contractType: record.job_contract_type,
      workMode: record.job_work_mode,
    },
  };
}
