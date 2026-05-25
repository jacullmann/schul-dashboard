import { Injectable } from '@nestjs/common';
import {
  JwtService as NestJwtService,
  JwtSignOptions,
  JwtVerifyOptions,
} from '@nestjs/jwt';
import { KeyObject } from 'crypto';
import { AppConfig } from '../../config/env.config';

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly appConfig: AppConfig,
  ) {}

  signUserToken(payload: object, options: JwtSignOptions = {}) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.jwtSecret,
      algorithm: 'HS256',
      ...options,
    });
  }

  verifyUserToken<T extends object = any>(token: string): T {
    return this.nestJwtService.verify<T>(token, {
      secret: this.appConfig.jwtSecret,
      algorithms: ['HS256'],
    });
  }

  signMfaPendingToken(payload: object, options: JwtSignOptions = {}) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.mfaPendingJwtSecret,
      algorithm: 'HS256',
      expiresIn: '10m',
      ...options,
    });
  }

  verifyMfaPendingToken<T extends object = any>(token: string): T {
    return this.nestJwtService.verify<T>(token, {
      secret: this.appConfig.mfaPendingJwtSecret,
      algorithms: ['HS256'],
    });
  }

  signOAuthPendingToken(payload: object, options: JwtSignOptions = {}) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.oauthPendingJwtSecret,
      algorithm: 'HS256',
      expiresIn: '10m',
      ...options,
    });
  }

  verifyOAuthPendingToken<T extends object = any>(token: string): T {
    return this.nestJwtService.verify<T>(token, {
      secret: this.appConfig.oauthPendingJwtSecret,
      algorithms: ['HS256'],
    });
  }

  signPasswordResetToken(payload: object, options: JwtSignOptions = {}) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.passwordResetJwtSecret,
      algorithm: 'HS256',
      expiresIn: '30m',
      ...options,
    });
  }

  verifyPasswordResetToken<T extends object = any>(token: string): T {
    return this.nestJwtService.verify<T>(token, {
      secret: this.appConfig.passwordResetJwtSecret,
      algorithms: ['HS256'],
    });
  }

  verifyRsaToken<T extends object = any>(
    token: string,
    publicKey: KeyObject,
    options: JwtVerifyOptions = {},
  ): T {
    return this.nestJwtService.verify<T>(token, {
      secret: publicKey as any,
      algorithms: ['RS256'],
      ...options,
    });
  }
}
