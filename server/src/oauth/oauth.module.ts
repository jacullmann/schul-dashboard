import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../config/env.config';
import { OAuthPendingGuard } from './guards/oauth-pending.guard';

@Module({
  imports: [AuthModule, AppConfigModule],
  controllers: [OAuthController],
  providers: [OAuthService, OAuthPendingGuard],
})
export class OAuthModule {}
