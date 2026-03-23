import {
  IsEmail,
  IsString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid credentials.' })
  email: string;

  @IsString({ message: 'Invalid credentials.' })
  @Length(8, 255, { message: 'Invalid credentials.' })
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @IsString()
  @Length(8, 255, {
    message:
      'Password must be at least 8 characters long and contain letters and numbers.',
  })
  password: string;

  @IsOptional()
  preferences?: Record<string, any>;
}

export class VerifyMfaDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'MFA Code must be exactly 6 characters long.',
  })
  code: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordVerifyDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResetPasswordDto {
  @IsString()
  resetToken: string;

  @IsString()
  @Length(8, 255, {
    message:
      'Password must be at least 8 characters long and contain letters and numbers.',
  })
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(8, 255)
  currentPassword: string;

  @IsString()
  @Length(8, 255, {
    message:
      'Password must be at least 8 characters long and contain letters and numbers.',
  })
  newPassword: string;
}
