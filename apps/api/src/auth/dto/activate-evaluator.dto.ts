import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateEvaluatorDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
