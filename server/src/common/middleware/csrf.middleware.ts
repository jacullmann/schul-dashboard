import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: true,
    path: '/',
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: true,
    path: '/',
    sameSite: 'none',
  });
}

export function rotateCsrfToken(res: Response): string {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  return token;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next();
    }

    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken) {
      // Throw exception formatted for our Exception filter
      throw new ForbiddenException({ error: 'CSRF-Token fehlt' });
    }

    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
      throw new ForbiddenException({ error: 'Ungültiges CSRF-Token Format' });
    }

    const cookieTokenBuffer = Buffer.from(cookieToken, 'utf8');
    const headerTokenBuffer = Buffer.from(headerToken, 'utf8');

    const cookieHash = crypto
      .createHash('sha256')
      .update(cookieTokenBuffer)
      .digest();
    const headerHash = crypto
      .createHash('sha256')
      .update(headerTokenBuffer)
      .digest();

    const isValid =
      crypto.timingSafeEqual(cookieHash, headerHash) &&
      cookieToken.length === headerToken.length;

    if (!isValid) {
      throw new ForbiddenException({ error: 'CSRF-Token ungültig' });
    }

    next();
  }
}
