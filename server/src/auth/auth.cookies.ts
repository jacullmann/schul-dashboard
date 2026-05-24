import type { CookieOptions, Response } from 'express';
import { AppConfig } from '../config/env.config';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export const REFRESH_COOKIE_PATH = '/api/auth/refresh';

export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function baseOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure ?? true,
    sameSite: 'lax',
    domain: config.cookieDomain,
  };
}

export function setAccessCookie(
  res: Response,
  token: string,
  config: AppConfig,
): void {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseOptions(config),
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export function setRefreshCookie(
  res: Response,
  token: string,
  config: AppConfig,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(config),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(config), path: '/' });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseOptions(config),
    path: REFRESH_COOKIE_PATH,
  });
}
