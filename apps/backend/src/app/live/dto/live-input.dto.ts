import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class LiveInputDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsIn(['text', 'audio'])
  type: 'text' | 'audio';
}