import { IsString, IsUrl } from 'class-validator';

export class JobContextDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url: string;
}
