import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttachmentDto } from './create-document.dto';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl()
  externalLink?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsIn(['V1', 'V2'])
  contentVersion?: 'V1' | 'V2';

  @IsOptional()
  @IsIn(['SOP', 'FORM'])
  policyKind?: 'SOP' | 'FORM' | null;

  @IsOptional()
  @IsIn(['NATIONAL', 'INTERNATIONAL'])
  regulationKind?: 'NATIONAL' | 'INTERNATIONAL' | null;

  @IsOptional()
  @IsIn(['SUSTAINABILITY', 'OPERATIONAL_UNIT'])
  procedureScope?: 'SUSTAINABILITY' | 'OPERATIONAL_UNIT' | null;

  @IsOptional()
  @IsInt()
  operationalUnitId?: number | null;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  versionLabel?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string | null;

  @IsOptional()
  @IsInt({ each: true })
  tagIds?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto | null;
}

