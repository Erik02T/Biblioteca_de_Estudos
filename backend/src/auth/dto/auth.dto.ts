import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

export class LoginDto extends RegisterDto {}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
