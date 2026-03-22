import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
  validateSync,
  MinLength,
  IsOptional,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  VERSION: string;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  CORS_ORIGIN: string;

  @IsUrl({ require_tld: false })
  CLIENT_VERIFY_URL: string;

  // Supabase
  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  @IsString()
  @MinLength(20)
  SUPABASE_SERVICE_ROLE_KEY: string;

  // JWT Secrets
  @IsString()
  @MinLength(32)
  USER_JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  PASSWORD_RESET_JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  MFA_PENDING_JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  OAUTH_PENDING_JWT_SECRET: string;

  // Google OAuth (optional — feature is disabled when absent)
  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_OAUTH_REDIRECT_URI?: string;

  // Security & Encryption
  @IsString()
  ENCRYPTION_KEY: string;

  @IsString()
  USER_KEY_PEPPER: string;

  // Cloudinary
  @IsString()
  CLOUDINARY_API_KEY: string;

  @IsString()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  CLOUDINARY_FOLDER: string;

  // Email (Resend)
  @IsString()
  RESEND_API_KEY: string;

  @IsString()
  EMAIL_FROM: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config Validation Error: ${errors.toString()}`);
  }
  return validatedConfig;
}
