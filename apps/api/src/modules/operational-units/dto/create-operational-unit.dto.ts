import { IsString, MaxLength } from 'class-validator';

export class CreateOperationalUnitDto {
  @IsString()
  @MaxLength(120)
  name: string;
}
