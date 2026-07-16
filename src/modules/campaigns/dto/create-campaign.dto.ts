import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ArrayNotEmpty,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  content: string;

  // Danh sách target (group/page) để đăng.
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  targetIds: string[];

  // Thời điểm đăng (ISO 8601). Bỏ trống = đăng ngay.
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsBoolean()
  aiSpin?: boolean;
}
