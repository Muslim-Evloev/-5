import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ example: 'Обновлённый текст комментария', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}
