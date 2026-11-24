import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'Текст моего нового поста', minLength: 1 })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
