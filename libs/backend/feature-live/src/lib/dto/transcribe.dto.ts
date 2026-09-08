import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranscribeDto {
  @IsString()
  @IsNotEmpty()
  audioData!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateTtsDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  targetLanguage?: string;
}
