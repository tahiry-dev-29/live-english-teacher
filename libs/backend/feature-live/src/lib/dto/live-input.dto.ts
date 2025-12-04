import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class LiveInputDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  @IsIn(['text', 'audio'], { message: "Type must be either 'text' or 'audio'." })
  type: 'text' | 'audio';
}