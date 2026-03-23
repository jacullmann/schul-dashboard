import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { AppConfig } from '../config/env.config';
import { rotateCsrfToken } from '../common/middleware/csrf.middleware';
import { OAUTH_PENDING_COOKIE } from './guards/oauth-pending.guard';
import { Request, Response } from 'express';

// ─── Google API types ─────────────────────────────────────────────────────────

interface GoogleJwk {
  kid: string;
  n: string;
  e: string;
  alg: string;
  use: string;
  kty: string;
}

interface GoogleJwks {
  keys: GoogleJwk[];
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
  token_type: string;
}

interface GoogleIdTokenPayload {
  /** Google's stable, immutable user identifier */
  sub: string;
  email: string;
  email_verified: boolean;
  nonce: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

// ─── Internal resolution types ────────────────────────────────────────────────

type OAuthResolution =
  | {
      type: 'login';
      userId: string;
      email: string;
      mfaEnabled: boolean;
      mfaSecret: any;
    }
  | { type: 'link_required'; googleId: string; googleEmail: string }
  | { type: 'new_user'; userId: string; email: string };

const OAUTH_STATE_COOKIE = 'oauth_state_token';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  /** In-memory JWKS cache — avoids hitting Google on every callback. */
  private jwksCache: { keys: GoogleJwks; fetchedAt: number } | null = null;
  private readonly JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly appConfig: AppConfig,
    private readonly authService: AuthService,
  ) {}

  // ─── Public: initiate OAuth flow ─────────────────────────────────────────

  /**
   * Generates state + nonce, stores them in a short-lived HttpOnly cookie,
   * and returns the Google authorization URL to redirect the user to.
   */
  buildGoogleAuthUrl(res: Response): string {
    const { state, nonce } = this.setOAuthStateCookie(res);

    const params = new URLSearchParams({
      client_id: this.appConfig.googleClientId,
      redirect_uri: this.appConfig.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      access_type: 'online',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // ─── Public: handle Google callback ──────────────────────────────────────

  /**
   * Handles the OAuth 2.0 callback from Google.
   * Performs full token verification and account resolution, then sets the
   * appropriate cookies and returns the redirect URL.
   */
  async handleCallback(
    code: string | undefined,
    stateParam: string | undefined,
    errorParam: string | undefined,
    req: Request,
    res: Response,
  ): Promise<string> {
    const frontendUrl = this.appConfig.corsOrigin;

    if (errorParam === 'access_denied') {
      this.clearOAuthStateCookie(res);
      return `${frontendUrl}/?auth=error&reason=access_denied`;
    }

    if (!code || !stateParam) {
      this.clearOAuthStateCookie(res);
      return `${frontendUrl}/?auth=error&reason=invalid_request`;
    }

    // ── 1. Validate state + extract nonce ─────────────────────────────────
    let nonce: string;
    try {
      nonce = this.verifyAndClearOAuthState(req, res, stateParam);
    } catch {
      return `${frontendUrl}/?auth=error&reason=invalid_state`;
    }

    // ── 2. Exchange code for tokens ───────────────────────────────────────
    let tokenResponse: GoogleTokenResponse;
    try {
      tokenResponse = await this.exchangeCodeForTokens(code);
    } catch (err) {
      this.logger.error('Google token exchange failed', err);
      return `${frontendUrl}/?auth=error&reason=token_exchange_failed`;
    }

    // ── 3. Verify ID token ────────────────────────────────────────────────
    let googleProfile: GoogleIdTokenPayload;
    try {
      googleProfile = await this.verifyGoogleIdToken(
        tokenResponse.id_token,
        nonce,
      );
    } catch (err) {
      this.logger.error('Google ID token verification failed', err);
      return `${frontendUrl}/?auth=error&reason=token_invalid`;
    }

    const { sub: googleId, email: googleEmail } = googleProfile;

    // ── 4. Account resolution ─────────────────────────────────────────────
    let resolution: OAuthResolution;
    try {
      resolution = await this.resolveAccount(googleId, googleEmail);
    } catch (err) {
      this.logger.error('OAuth account resolution failed', err);
      return `${frontendUrl}/?auth=error&reason=server_error`;
    }

    // ── 5. Act on resolution ──────────────────────────────────────────────
    if (resolution.type === 'link_required') {
      this.setPendingOAuthToken(
        res,
        resolution.googleId,
        resolution.googleEmail,
      );
      return `${frontendUrl}/?auth=link-required`;
    }

    if (resolution.type === 'login' || resolution.type === 'new_user') {
      const { userId, email } = resolution;

      if (
        resolution.type === 'login' &&
        resolution.mfaEnabled &&
        resolution.mfaSecret
      ) {
        this.authService.issueMfaPendingToken(userId, email, res);
        return `${frontendUrl}/?auth=mfa-pending`;
      }

      await this.authService.createUserSession(userId, email, res);
      await this.updateLastLogin(userId);
      rotateCsrfToken(res, this.appConfig);
      return `${frontendUrl}/?auth=success`;
    }

    return `${frontendUrl}/?auth=error&reason=server_error`;
  }

  // ─── Public: link Google to existing account ─────────────────────────────

  async linkGoogleAccount(
    googleId: string,
    googleEmail: string,
    password: string,
    res: Response,
  ): Promise<{ ok: true; csrfToken: string }> {
    const sb = this.supabaseService.getClient();

    const { data: user } = await sb
      .from('users')
      .select('id, email, password_hash, email_verified')
      .eq('email', googleEmail.toLowerCase())
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.password_hash) {
      throw new BadRequestException(
        'This account does not have a password set.',
      );
    }

    const bcrypt = await import('bcryptjs');
    const passwordOk = await bcrypt.compare(
      password,
      user.password_hash as string,
    );
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email address first.',
      );
    }

    const { data: ban } = await sb
      .from('banned_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (ban) throw new ForbiddenException('Your account has been suspended.');

    const { error: linkError } = await sb.from('oauth_accounts').insert({
      user_id: user.id,
      provider: 'google',
      provider_user_id: googleId,
      provider_email: googleEmail,
    });

    if (linkError) {
      if (linkError.code === '23505') {
        throw new BadRequestException(
          'This Google account is already linked to another account.',
        );
      }
      throw new InternalServerErrorException('Failed to link account.');
    }

    this.clearPendingOAuthToken(res);
    const newCsrfToken = rotateCsrfToken(res, this.appConfig);
    await this.authService.createUserSession(
      user.id as string,
      user.email as string,
      res,
    );
    await this.updateLastLogin(user.id as string);

    return { ok: true, csrfToken: newCsrfToken };
  }

  // ─── Public: unlink Google from account ──────────────────────────────────

  async unlinkGoogleAccount(userId: string): Promise<{ ok: true }> {
    const sb = this.supabaseService.getClient();

    const { data: user } = await sb
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new BadRequestException('User not found.');
    if (!user.password_hash) {
      throw new BadRequestException(
        'Please set a password before unlinking your Google account.',
      );
    }

    const { error } = await sb
      .from('oauth_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      throw new InternalServerErrorException('Failed to unlink account.');
    }

    return { ok: true };
  }

  // ─── Public: list linked providers ───────────────────────────────────────

  async getLinkedProviders(
    userId: string,
  ): Promise<{ providers: Array<{ provider: string; email: string }> }> {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('oauth_accounts')
      .select('provider, provider_email')
      .eq('user_id', userId);

    if (error)
      throw new InternalServerErrorException('Failed to load linked accounts.');

    const providers = (data ?? []).map((row: any) => ({
      provider: row.provider as string,
      email: row.provider_email as string,
    }));

    return { providers };
  }

  // ─── Private: account resolution ─────────────────────────────────────────

  private async resolveAccount(
    googleId: string,
    googleEmail: string,
  ): Promise<OAuthResolution> {
    const sb = this.supabaseService.getClient();
    const email = googleEmail.toLowerCase();

    const { data: oauthRow } = await sb
      .from('oauth_accounts')
      .select('user_id, users(id, email, mfa_enabled, mfa_secret)')
      .eq('provider', 'google')
      .eq('provider_user_id', googleId)
      .maybeSingle();

    if (oauthRow) {
      const user = (oauthRow as any).users;
      if (!user)
        throw new InternalServerErrorException(
          'Linked user account not found.',
        );

      const { data: ban } = await sb
        .from('banned_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (ban) throw new ForbiddenException('Your account has been suspended.');

      return {
        type: 'login',
        userId: user.id as string,
        email: user.email as string,
        mfaEnabled: !!user.mfa_enabled,
        mfaSecret: user.mfa_secret,
      };
    }

    const { data: existingUser } = await sb
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return { type: 'link_required', googleId, googleEmail: email };
    }

    const defaultPreferences = {
      theme: 'system',
      language: 'de',
      personalized: 'true',
    };

    const { data: newUser, error: createError } = await sb
      .from('users')
      .insert({
        email,
        password_hash: null,
        email_verified: true,
        preferences: defaultPreferences,
      })
      .select('id, email')
      .single();

    if (createError || !newUser) {
      this.logger.error('Failed to create OAuth user', createError);
      throw new InternalServerErrorException('Failed to create user account.');
    }

    const { error: linkError } = await sb.from('oauth_accounts').insert({
      user_id: newUser.id,
      provider: 'google',
      provider_user_id: googleId,
      provider_email: email,
    });

    if (linkError) {
      await sb.from('users').delete().eq('id', newUser.id);
      throw new InternalServerErrorException('Failed to link Google account.');
    }

    return { type: 'new_user', userId: newUser.id as string, email };
  }

  // ─── Private: Google token exchange ──────────────────────────────────────

  private async exchangeCodeForTokens(
    code: string,
  ): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: this.appConfig.googleClientId,
      client_secret: this.appConfig.googleClientSecret,
      redirect_uri: this.appConfig.googleRedirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error(
        `Google token exchange failed: ${body['error'] ?? response.status}`,
      );
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  // ─── Private: ID token verification ──────────────────────────────────────

  private async verifyGoogleIdToken(
    idToken: string,
    expectedNonce: string,
  ): Promise<GoogleIdTokenPayload> {
    const [headerB64] = idToken.split('.');
    if (!headerB64) throw new UnauthorizedException('Malformed ID token.');

    const header = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { kid?: string; alg?: string };

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException('Unexpected ID token algorithm.');
    }

    const jwks = await this.getGoogleJwks();
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new UnauthorizedException('Unknown ID token signing key.');

    const publicKey = crypto.createPublicKey({
      key: jwk as unknown as crypto.JsonWebKey,
      format: 'jwk',
    });

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: this.appConfig.googleClientId,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as GoogleIdTokenPayload;

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email is not verified.');
    }

    if (payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('ID token nonce mismatch.');
    }

    return payload;
  }

  // ─── Private: JWKS fetch with caching ────────────────────────────────────

  private async getGoogleJwks(): Promise<GoogleJwks> {
    const now = Date.now();
    if (
      this.jwksCache &&
      now - this.jwksCache.fetchedAt < this.JWKS_CACHE_TTL_MS
    ) {
      return this.jwksCache.keys;
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!response.ok) {
      throw new Error(`Failed to fetch Google JWKS: ${response.status}`);
    }

    const keys = (await response.json()) as GoogleJwks;
    this.jwksCache = { keys, fetchedAt: now };
    return keys;
  }

  // ─── Private: OAuth state cookie (CSRF + nonce) ───────────────────────────

  private setOAuthStateCookie(res: Response): { state: string; nonce: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    const token = jwt.sign(
      { state, nonce, purpose: 'oauth_state' },
      this.appConfig.oauthPendingJwtSecret,
      { expiresIn: '10m' },
    );

    res.cookie(OAUTH_STATE_COOKIE, token, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });

    return { state, nonce };
  }

  private clearOAuthStateCookie(res: Response): void {
    res.clearCookie(OAUTH_STATE_COOKIE, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
    });
  }

  private verifyAndClearOAuthState(
    req: Request,
    res: Response,
    stateParam: string,
  ): string {
    const token = req.cookies[OAUTH_STATE_COOKIE];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('OAuth state cookie missing.');
    }

    const payload = jwt.verify(token, this.appConfig.oauthPendingJwtSecret) as {
      state: string;
      nonce: string;
      purpose: string;
    };

    if (payload.purpose !== 'oauth_state' || payload.state !== stateParam) {
      this.clearOAuthStateCookie(res);
      throw new UnauthorizedException('OAuth state mismatch.');
    }

    this.clearOAuthStateCookie(res);
    return payload.nonce;
  }

  // ─── Private: pending OAuth token (for link-required flow) ───────────────

  private setPendingOAuthToken(
    res: Response,
    googleId: string,
    googleEmail: string,
  ): void {
    const token = jwt.sign(
      { googleId, googleEmail, purpose: 'oauth_pending' },
      this.appConfig.oauthPendingJwtSecret,
      { expiresIn: '10m' },
    );

    res.cookie(OAUTH_PENDING_COOKIE, token, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    });
  }

  private clearPendingOAuthToken(res: Response): void {
    res.clearCookie(OAUTH_PENDING_COOKIE, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
    });
  }

  // ─── Private: helpers ─────────────────────────────────────────────────────

  private async updateLastLogin(userId: string): Promise<void> {
    const sb = this.supabaseService.getClient();
    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  }
}
