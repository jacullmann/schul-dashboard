import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { KeyObject } from 'crypto';
import { AppConfig } from '../../config/env.config';

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly appConfig: AppConfig,
  ) {}

  signUserToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.jwtSecret,
      ...options,
    });
  }

  verifyUserToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.jwtSecret,
    });
  }

  signMfaPendingToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.mfaPendingJwtSecret,
      ...options,
    });
  }

  verifyMfaPendingToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.mfaPendingJwtSecret,
    });
  }

  signOAuthPendingToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.oauthPendingJwtSecret,
      ...options,
    });
  }

  verifyOAuthPendingToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.oauthPendingJwtSecret,
    });
  }

  signPasswordResetToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.passwordResetJwtSecret,
      ...options,
    });
  }

  verifyPasswordResetToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.passwordResetJwtSecret,
    });
  }

  verifyRsaToken(token: string, publicKey: KeyObject, options?: any) {
    return this.nestJwtService.verify(token, {
      secret: publicKey as any,
      ...options,
    });
  }
}
