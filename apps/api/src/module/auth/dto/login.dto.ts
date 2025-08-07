import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Registered email address',
    example: 'user@example.com',
    required: true,
  })
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'yourPassword123',
    required: true,
    minLength: 6,
  })
  password: string;
}
