import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppConfigModule } from '../config/env.config';
import { MfaPendingGuard } from '../common/guards/mfa-auth.guard';

@Module({
  imports: [AppConfigModule],
  controllers: [AuthController],
  providers: [AuthService, MfaPendingGuard],
  exports: [AuthService, MfaPendingGuard],
})
export class AuthModule {}
