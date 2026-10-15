import { IsString, MaxLength } from 'class-validator';
import { IsAllowedJobUrl, JOB_URL_MAX_LENGTH } from '../job-url';

// Corpo de POST /interviews/ai/job-context. A URL é repassada ao extrator
// Python, por isso só aceita links da Empregare (ver job-url.ts).
export class JobContextDto {
  @IsString()
  @MaxLength(JOB_URL_MAX_LENGTH)
  @IsAllowedJobUrl()
  url: string;
}
