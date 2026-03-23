import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { AppConfig } from '../../config/env.config';

export const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfig) {}

  /**
   * Sets (or refreshes) the CSRF cookie on the given response.
   * The cookie is intentionally non-HttpOnly so that the browser-side JS can
   * read it and attach it as the `x-csrf-token` request header.
   */
  static setCsrfCookie(res: Response, token: string, config: AppConfig): void {
    res.cookie(CSRF_COOKIE_NAME, token, {
      ...config.baseCookieOptions,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
      return next();
    }

    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing.');
    }

    try {
      const cookieBuf = Buffer.from(cookieToken as string);
      const headerBuf = Buffer.from(headerToken as string);

      // Buffers must be the same byte-length for timingSafeEqual.
      // If lengths differ the tokens are clearly different, so reject immediately.
      if (cookieBuf.length !== headerBuf.length) {
        throw new Error('length mismatch');
      }

      const isMatch = crypto.timingSafeEqual(cookieBuf, headerBuf);
      if (!isMatch) throw new Error('mismatch');
    } catch {
      throw new ForbiddenException('Invalid CSRF token.');
    }

    next();
  }
}

/**
 * Generates a new CSRF token, sets the cookie, and returns the token string.
 * Call this whenever the authentication state changes (login, logout, group switch).
 */
export function rotateCsrfToken(res: Response, config: AppConfig): string {
  const token = crypto.randomBytes(32).toString('hex');
  CsrfMiddleware.setCsrfCookie(res, token, config);
  return token;
}
