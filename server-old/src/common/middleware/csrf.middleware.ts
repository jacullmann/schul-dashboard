import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { AppConfig } from '../../config/env.config';

export const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfig) {}

  static setCsrfCookie(res: Response, token: string, config: AppConfig): void {
    res.cookie(CSRF_COOKIE_NAME, token, {
      ...config.baseCookieOptions,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
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

export function rotateCsrfToken(res: Response, config: AppConfig): string {
  const token = crypto.randomBytes(32).toString('hex');
  CsrfMiddleware.setCsrfCookie(res, token, config);
  return token;
}
