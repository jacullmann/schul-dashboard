import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../config/env.config';
import { OAuthPendingGuard } from './guards/oauth-pending.guard';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [AuthModule, AppConfigModule, JwtModule],
  controllers: [OAuthController],
  providers: [OAuthService, OAuthPendingGuard],
})
export class OAuthModule {}
