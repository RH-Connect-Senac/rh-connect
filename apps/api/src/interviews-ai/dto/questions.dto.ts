import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { AiJobContextDto } from './ai-job-context.dto';

export class QuestionsDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AiJobContextDto)
  context: AiJobContextDto;
}
