import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123456', minLength: 12, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'student1', minLength: 2, maxLength: 128 })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  username: string;

  @ApiProperty({ example: 'Иван', minLength: 2 })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Иванов', minLength: 2 })
  @IsString()
  @MinLength(2)
  lastName: string;
}

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123456' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'your-refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
