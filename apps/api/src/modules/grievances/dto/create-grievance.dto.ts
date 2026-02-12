import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGrievanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  caseNo: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  receivedDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicSummary?: string;

  @IsOptional()
  @IsInt()
  evidenceDocumentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string;
}

