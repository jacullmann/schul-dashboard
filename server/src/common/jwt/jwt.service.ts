import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { KeyObject } from 'crypto';
import { AppConfig } from '../../config/env.config';

/**
 * JWT service wrapper that manages multiple JWT secrets used throughout the app.
 * Each secret is accessed via a named method for clarity and type safety.
 *
 * Supports both symmetric (HS256) and asymmetric (RS256) algorithms.
 */
@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly appConfig: AppConfig,
  ) {}

  /**
   * Signs a JWT with the primary user session secret.
   * Used for main authentication tokens (7-day expiry).
   */
  signUserToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.jwtSecret,
      ...options,
    });
  }

  /**
   * Verifies a JWT with the primary user session secret.
   * Used for validating main authentication tokens.
   */
  verifyUserToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.jwtSecret,
    });
  }

  /**
   * Signs a JWT with the MFA pending token secret.
   * Used for short-lived tokens during MFA verification (5-min expiry).
   */
  signMfaPendingToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.mfaPendingJwtSecret,
      ...options,
    });
  }

  /**
   * Verifies a JWT with the MFA pending token secret.
   */
  verifyMfaPendingToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.mfaPendingJwtSecret,
    });
  }

  /**
   * Signs a JWT with the OAuth pending token secret.
   * Used for OAuth state cookies and pending link flow (10-min expiry).
   */
  signOAuthPendingToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.oauthPendingJwtSecret,
      ...options,
    });
  }

  /**
   * Verifies a JWT with the OAuth pending token secret.
   */
  verifyOAuthPendingToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.oauthPendingJwtSecret,
    });
  }

  /**
   * Signs a JWT with the password reset token secret.
   * Used for password reset flows (15-min expiry).
   */
  signPasswordResetToken(payload: any, options?: any) {
    return this.nestJwtService.sign(payload, {
      secret: this.appConfig.passwordResetJwtSecret,
      ...options,
    });
  }

  /**
   * Verifies a JWT with the password reset token secret.
   */
  verifyPasswordResetToken(token: string) {
    return this.nestJwtService.verify(token, {
      secret: this.appConfig.passwordResetJwtSecret,
    });
  }

  /**
   * Verifies a JWT signed with an RSA public key (asymmetric algorithm like RS256).
   * Used for third-party tokens like Google ID tokens that use asymmetric signatures.
   *
   * @param token - The JWT token to verify
   * @param publicKey - RSA public key (KeyObject)
   * @param options - Additional verification options (algorithms, audience, issuer, etc.)
   */
  verifyRsaToken(token: string, publicKey: KeyObject, options?: any) {
    return this.nestJwtService.verify(token, {
      secret: publicKey as any,
      ...options,
    });
  }
}
