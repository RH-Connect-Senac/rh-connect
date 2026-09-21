import { IsObject } from 'class-validator';

export class QuestionsDto {
  @IsObject()
  context: Record<string, unknown>;
}
