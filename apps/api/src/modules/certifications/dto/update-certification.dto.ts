import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCertificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateNo?: string;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  documentId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;
}

