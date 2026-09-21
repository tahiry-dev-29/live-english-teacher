import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}

export class UpdateMemoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;
}

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;
}

export class UpdateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;
}
