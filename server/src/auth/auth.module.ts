import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RefreshController } from './refresh.controller';
import { AppConfigModule } from '../config/env.config';
import { MfaPendingGuard } from '../common/guards/mfa-auth.guard';
import { JwtModule } from '../common/jwt/jwt.module';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [AppConfigModule, JwtModule, SupabaseModule, EmailModule],
  controllers: [AuthController, RefreshController],
  providers: [AuthService, TokenService, MfaPendingGuard],
  exports: [AuthService, TokenService, MfaPendingGuard],
})
export class AuthModule {}
