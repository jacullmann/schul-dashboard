import {
  IsEmail,
  IsString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Ungültige Zugangsdaten' })
  email: string;

  @IsString({ message: 'Ungültige Zugangsdaten' })
  @Length(8, 255, { message: 'Ungültige Zugangsdaten' })
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Ungültige E-Mail-Adresse' })
  email: string;

  @IsString()
  @Length(8, 255, {
    message:
      'Das Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
  })
  password: string;

  @IsOptional()
  preferences?: Record<string, any>;
}

export class VerifyMfaDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'MFA Code muss genau 6 Ziffern enthalten' })
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
      'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
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
      'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
  })
  newPassword: string;
}
