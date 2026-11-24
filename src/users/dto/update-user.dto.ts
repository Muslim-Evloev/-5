import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'new_username', minLength: 2, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  username?: string;

  @ApiPropertyOptional({ example: 'Пётр', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Петров', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;
}
