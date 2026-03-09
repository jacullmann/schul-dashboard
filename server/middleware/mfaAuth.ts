// middleware/mfaAuth.ts
import jwt from 'jsonwebtoken';
import { authenticator } from '@otplib/preset-v11';
import type { Request, Response, NextFunction } from 'express';

// Cookie-Name für MFA-Pending-Token
const MFA_PENDING_COOKIE = 'mfa_pending_token';

interface MfaPendingPayload {
  sub: string;
  email: string;
  purpose: string;
}

export function generateMfaPendingToken(
  res: Response,
  userId: string,
  email: string,
  secret: string,
): string {
  const token = jwt.sign(
    {
      sub: userId.toString(),
      email,
      purpose: 'mfa_pending',
    },
    secret,
    { expiresIn: '5m' },
  );

  res.cookie(MFA_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'None',
    maxAge: 5 * 60 * 1000,
  });

  return token;
}

// Löschen
export function clearMfaPendingToken(res: Response): void {
  res.clearCookie(MFA_PENDING_COOKIE, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'None',
  });
}

// Verify middleware
export function verifyMfaPendingToken(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token: unknown = req.cookies[MFA_PENDING_COOKIE];

    if (!token || typeof token !== 'string') {
      res.status(401).json({
        error: 'Authentifizierung fehlgeschlagen',
        requiresMfaPending: true,
      });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as MfaPendingPayload;

      if (payload.purpose !== 'mfa_pending' || !payload.sub || !payload.email) {
        res.status(401).json({
          error: 'Authentifizierung fehlgeschlagen',
        });
        return;
      }

      req.mfaPending = {
        sub: payload.sub,
        email: payload.email,
      };
      next();
    } catch {
      res.status(401).json({
        error: 'Authentifizierung fehlgeschlagen',
        requiresMfaPending: true,
      });
    }
  };
}

// Code verifizieren
export function verifyTotpCode(code: string, secret: string): boolean {
  return authenticator.check(code, secret);
}

// config
export function configureOtplib(): void {
  authenticator.options = {
    step: 30,
    window: 1,
  };
}
