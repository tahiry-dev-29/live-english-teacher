import { IsString, IsNotEmpty, IsIn } from 'class-validator';

/**
 * Data Transfer Object for incoming chat messages.
 * Uses 'content' and 'type' to support future voice input integration (ASR).
 */
export class LiveInputDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  @IsIn(['text', 'audio'], { message: "Type must be either 'text' or 'audio'." })
  type: 'text' | 'audio';
}