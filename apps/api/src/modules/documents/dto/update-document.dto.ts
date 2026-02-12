import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
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
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsInt()
  subContentId?: number | null;

  @IsOptional()
  @IsInt({ each: true })
  tagIds?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto | null;
}

