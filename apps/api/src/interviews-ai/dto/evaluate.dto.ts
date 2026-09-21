import { IsArray, IsObject } from 'class-validator';

export class EvaluateDto {
  @IsObject()
  context: Record<string, unknown>;

  @IsArray()
  answers: Array<Record<string, unknown>>;
}
