import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Отличный пост!', minLength: 1 })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}
