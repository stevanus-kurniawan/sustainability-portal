import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsInt()
  documentId?: number;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  externalLink?: string;
}

