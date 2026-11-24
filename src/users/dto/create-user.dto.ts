import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '$scrypt$...' })
  passwordHash: string;

  @ApiProperty({ example: 'student1' })
  username: string;

  @ApiProperty({ example: 'Иван' })
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  lastName: string;
}
