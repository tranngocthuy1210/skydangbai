import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SpinDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  count?: number;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class HashtagDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
