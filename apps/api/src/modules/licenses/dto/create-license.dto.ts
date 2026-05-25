import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  authority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseNo?: string;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRING', 'EXPIRED', 'PENDING_RENEWAL', 'IN_REVIEW', 'NONE'])
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'PENDING_RENEWAL' | 'IN_REVIEW' | 'NONE';

  @IsOptional()
  @IsInt()
  documentId?: number;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;

  @IsOptional()
  @IsIn(['V1', 'V2'])
  contentVersion?: 'V1' | 'V2';

  @IsOptional()
  @IsInt()
  operationalUnitId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string;
}

