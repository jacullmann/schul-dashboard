import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';
import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsOptional()
  @IsString()
  VERSION: string;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  CORS_ORIGIN: string;

  @IsString()
  COOKIE_DOMAIN: string;

  @IsOptional()
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  @IsUrl({ require_tld: false })
  CLIENT_VERIFY_URL: string;

  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  @IsString()
  @MinLength(20)
  SUPABASE_SERVICE_ROLE_KEY: string;

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

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_OAUTH_REDIRECT_URI?: string;

  @IsString()
  ENCRYPTION_KEY: string;

  @IsString()
  USER_KEY_PEPPER: string;

  @IsString()
  CLOUDINARY_API_KEY: string;

  @IsString()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  CLOUDINARY_FOLDER: string;

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
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}

@Injectable()
export class AppConfig {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  get isProduction(): boolean {
    return this.nodeEnv === Environment.Production;
  }

  get nodeEnv(): string {
    return this.configService.get('NODE_ENV')!;
  }

  get port(): number {
    return this.configService.get<number>('PORT') ?? 3000;
  }

  get corsOrigin(): string {
    return this.configService.get('CORS_ORIGIN')!;
  }

  get clientVerifyUrl(): string {
    return this.configService.get('CLIENT_VERIFY_URL')!;
  }

  get cookieDomain(): string {
    return this.configService.get('COOKIE_DOMAIN')!;
  }

  get cookieSecure(): boolean {
    const explicit = this.configService.get<boolean>('COOKIE_SECURE');
    if (typeof explicit === 'boolean') return explicit;
    return this.isProduction;
  }

  get baseCookieOptions(): CookieOptions {
    return {
      domain: this.cookieDomain,
      path: '/',
      secure: this.cookieSecure,
      sameSite: 'lax',
    };
  }

  get jwtSecret(): string {
    return this.configService.get('USER_JWT_SECRET')!;
  }

  get mfaPendingJwtSecret(): string {
    return this.configService.get('MFA_PENDING_JWT_SECRET')!;
  }

  get oauthPendingJwtSecret(): string {
    return this.configService.get('OAUTH_PENDING_JWT_SECRET')!;
  }

  get passwordResetJwtSecret(): string {
    return this.configService.get('PASSWORD_RESET_JWT_SECRET')!;
  }

  get googleClientId(): string {
    return this.configService.get('GOOGLE_OAUTH_CLIENT_ID')!;
  }

  get googleClientSecret(): string {
    return this.configService.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
  }

  get googleRedirectUri(): string {
    return this.configService.get('GOOGLE_OAUTH_REDIRECT_URI')!;
  }

  get supabaseUrl(): string {
    return this.configService.get('SUPABASE_URL')!;
  }

  get supabaseServiceRoleKey(): string {
    return this.configService.get('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  get resendApiKey(): string {
    return this.configService.get('RESEND_API_KEY')!;
  }

  get emailFrom(): string {
    return (
      this.configService.get('EMAIL_FROM') ||
      'schul-dashboard <noreply@schul-dashboard.com>'
    );
  }

  get cloudinaryCloudName(): string {
    return this.configService.get('CLOUDINARY_CLOUD_NAME')!;
  }

  get cloudinaryApiKey(): string {
    return this.configService.get('CLOUDINARY_API_KEY')!;
  }

  get cloudinaryApiSecret(): string {
    return this.configService.get('CLOUDINARY_API_SECRET')!;
  }

  get cloudinaryFolder(): string {
    return this.configService.get('CLOUDINARY_FOLDER') || 'hausaufgaben';
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
