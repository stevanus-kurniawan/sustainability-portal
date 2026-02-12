import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGrievanceDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicSummary?: string;

  @IsOptional()
  @IsInt()
  evidenceDocumentId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string | null;
}

