import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

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
  documentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string;

  @IsOptional()
  @IsIn(['V1', 'V2'])
  contentVersion?: 'V1' | 'V2';

  @IsOptional()
  @IsInt()
  operationalUnitId?: number | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;
}

