import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  feature: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bugFound?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  stepsToReproduce?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  improvementSuggestion?: string;
}
