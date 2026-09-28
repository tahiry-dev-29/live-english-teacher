import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;

  /** 'global' → global memory, 'model' → scoped to the x-ai-model header. */
  @IsIn(['global', 'model'])
  scope: 'global' | 'model' = 'global';
}

export class MemoryContextQueryDto {
  /** Optional `provider:modelId` — selects the model memories to merge. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;
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
