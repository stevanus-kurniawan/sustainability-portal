import { IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

const UNIT_COLOR_CLASSES = ['text-primary', 'text-success', 'text-warning', 'text-brand-deep', 'text-charcoal'] as const;

export class UpdateOperationalUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^uploads\/[a-zA-Z0-9._\-\/]+$/, { message: 'logoFileKey must be a valid uploads key' })
  logoFileKey?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(UNIT_COLOR_CLASSES)
  colorClass?: string;
}
