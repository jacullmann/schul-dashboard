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
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
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
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  // ─── Public: initiate OAuth flow ─────────────────────────────────────────

  /**
   * Generates state + nonce, stores them in a short-lived HttpOnly cookie,
   * and returns the Google authorization URL to redirect the user to.
   */
  buildGoogleAuthUrl(res: Response): string {
    const { state, nonce } = this.setOAuthStateCookie(res);

    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID')!;
    const redirectUri = this.configService.get<string>(
      'GOOGLE_OAUTH_REDIRECT_URI',
    )!;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
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
    const frontendUrl = this.getFrontendUrl();

    // User denied consent on Google's screen
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

      // MFA check for existing users
      if (
        resolution.type === 'login' &&
        resolution.mfaEnabled &&
        resolution.mfaSecret
      ) {
        this.authService.issueMfaPendingToken(userId, email, res);
        return `${frontendUrl}/?auth=mfa-pending`;
      }

      // Normal session issuance
      await this.authService.createUserSession(userId, email, res);
      await this.updateLastLogin(userId);
      return `${frontendUrl}/?auth=success`;
    }

    return `${frontendUrl}/?auth=error&reason=server_error`;
  }

  // ─── Public: link Google to existing account ─────────────────────────────

  /**
   * Called when a user with an existing email/password account wants to link
   * their Google identity. Requires a valid pending_oauth_token cookie and
   * their current account password.
   */
  async linkGoogleAccount(
    googleId: string,
    googleEmail: string,
    password: string,
    res: Response,
  ): Promise<{ ok: true; csrfToken: string }> {
    const sb = this.supabaseService.getClient();

    // Verify password against existing account
    const { data: user } = await sb
      .from('users')
      .select('id, email, password_hash, email_verified')
      .eq('email', googleEmail.toLowerCase())
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('Ungültige Zugangsdaten');
    }

    if (!user.password_hash) {
      throw new BadRequestException('Dieses Konto hat kein Passwort gesetzt.');
    }

    const bcrypt = await import('bcryptjs');
    const passwordOk = await bcrypt.compare(
      password,
      user.password_hash as string,
    );
    if (!passwordOk) {
      throw new UnauthorizedException('Ungültige Zugangsdaten');
    }

    if (!user.email_verified) {
      throw new UnauthorizedException('Bitte E-Mail zuerst verifizieren');
    }

    const { data: ban } = await sb
      .from('banned_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (ban) throw new ForbiddenException('Dein Account ist gesperrt.');

    // Persist the OAuth link — UNIQUE constraint prevents duplicates
    const { error: linkError } = await sb.from('oauth_accounts').insert({
      user_id: user.id,
      provider: 'google',
      provider_user_id: googleId,
      provider_email: googleEmail,
    });

    if (linkError) {
      // Unique constraint violation: already linked (race condition)
      if (linkError.code === '23505') {
        throw new BadRequestException(
          'Dieses Google-Konto ist bereits mit einem anderen Account verknüpft.',
        );
      }
      throw new InternalServerErrorException(
        'Fehler beim Verknüpfen des Kontos.',
      );
    }

    // Clear pending OAuth cookie and establish full session
    this.clearPendingOAuthToken(res);
    const newCsrfToken = rotateCsrfToken(res);
    await this.authService.createUserSession(
      user.id as string,
      user.email as string,
      res,
    );
    await this.updateLastLogin(user.id as string);

    return { ok: true, csrfToken: newCsrfToken };
  }

  // ─── Public: unlink Google from account ──────────────────────────────────

  /**
   * Removes the Google OAuth link from a user's account.
   * Blocked if the user has no password (would lock them out).
   */
  async unlinkGoogleAccount(userId: string): Promise<{ ok: true }> {
    const sb = this.supabaseService.getClient();

    // Lockout prevention: user must have a password to unlink OAuth
    const { data: user } = await sb
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new BadRequestException('Nutzer nicht gefunden');
    if (!user.password_hash) {
      throw new BadRequestException(
        'Bitte zuerst ein Passwort setzen, bevor du Google trennst.',
      );
    }

    const { error } = await sb
      .from('oauth_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      throw new InternalServerErrorException('Fehler beim Trennen des Kontos.');
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
      throw new InternalServerErrorException('Fehler beim Laden der Konten.');

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

    // Step 1: Look for an existing OAuth link by Google's stable `sub`
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
          'Verknüpfter Nutzer nicht gefunden.',
        );

      const { data: ban } = await sb
        .from('banned_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (ban) throw new ForbiddenException('Dein Account ist gesperrt.');

      return {
        type: 'login',
        userId: user.id as string,
        email: user.email as string,
        mfaEnabled: !!user.mfa_enabled,
        mfaSecret: user.mfa_secret,
      };
    }

    // Step 2: Check for an existing email/password account with matching email
    const { data: existingUser } = await sb
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      // Silent auto-linking is dangerous — require password confirmation
      return {
        type: 'link_required',
        googleId,
        googleEmail: email,
      };
    }

    // Step 3: No account exists — create a new one via Google
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
        email_verified: true, // Google already verified the email
        preferences: defaultPreferences,
      })
      .select('id, email')
      .single();

    if (createError || !newUser) {
      this.logger.error('Failed to create OAuth user', createError);
      throw new InternalServerErrorException(
        'Fehler beim Erstellen des Nutzers.',
      );
    }

    // Persist the OAuth link
    const { error: linkError } = await sb.from('oauth_accounts').insert({
      user_id: newUser.id,
      provider: 'google',
      provider_user_id: googleId,
      provider_email: email,
    });

    if (linkError) {
      // Roll back user creation on link failure to avoid orphaned accounts
      await sb.from('users').delete().eq('id', newUser.id);
      throw new InternalServerErrorException(
        'Fehler beim Verknüpfen des Kontos.',
      );
    }

    return { type: 'new_user', userId: newUser.id as string, email };
  }

  // ─── Private: Google token exchange ──────────────────────────────────────

  private async exchangeCodeForTokens(
    code: string,
  ): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: this.configService.get<string>(
        'GOOGLE_OAUTH_CLIENT_SECRET',
      )!,
      redirect_uri: this.configService.get<string>(
        'GOOGLE_OAUTH_REDIRECT_URI',
      )!,
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

  /**
   * Verifies a Google ID token using Google's published JWKS.
   * Validates: signature, iss, aud, exp, email_verified, nonce.
   * Uses Node.js built-in `crypto` for JWK→key conversion — no extra deps.
   */
  private async verifyGoogleIdToken(
    idToken: string,
    expectedNonce: string,
  ): Promise<GoogleIdTokenPayload> {
    // Decode the header to find the signing key ID
    const [headerB64] = idToken.split('.');
    if (!headerB64) throw new UnauthorizedException('Malformed ID token');

    const header = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { kid?: string; alg?: string };

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException('Unexpected ID token algorithm');
    }

    const jwks = await this.getGoogleJwks();
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new UnauthorizedException('Unknown ID token signing key');

    // Convert JWK to a Node.js KeyObject — no third-party lib needed
    const publicKey = crypto.createPublicKey({
      key: jwk as unknown as crypto.JsonWebKey,
      format: 'jwk',
    });

    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID')!;

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as GoogleIdTokenPayload;

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    if (payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('ID token nonce mismatch');
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

  /**
   * Generates state and nonce, signs them into a short-lived JWT stored in an
   * HttpOnly cookie. SameSite=lax allows the cookie to survive Google's
   * top-level GET redirect back to our callback endpoint.
   */
  private setOAuthStateCookie(res: Response): { state: string; nonce: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const secret = this.configService.get<string>('OAUTH_PENDING_JWT_SECRET')!;

    const token = jwt.sign({ state, nonce, purpose: 'oauth_state' }, secret, {
      expiresIn: '10m',
    });

    res.cookie(OAUTH_STATE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    return { state, nonce };
  }

  private clearOAuthStateCookie(res: Response): void {
    res.clearCookie(OAUTH_STATE_COOKIE, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    });
  }

  /**
   * Reads the state cookie, verifies the JWT and the state parameter, clears
   * the cookie (one-time use), and returns the nonce for ID token validation.
   */
  private verifyAndClearOAuthState(
    req: Request,
    res: Response,
    stateParam: string,
  ): string {
    const token = req.cookies[OAUTH_STATE_COOKIE];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('OAuth state cookie missing');
    }

    const secret = this.configService.get<string>('OAUTH_PENDING_JWT_SECRET')!;
    const payload = jwt.verify(token, secret) as {
      state: string;
      nonce: string;
      purpose: string;
    };

    if (payload.purpose !== 'oauth_state' || payload.state !== stateParam) {
      this.clearOAuthStateCookie(res);
      throw new UnauthorizedException('OAuth state mismatch');
    }

    this.clearOAuthStateCookie(res);
    return payload.nonce;
  }

  // ─── Private: pending OAuth token (for link-required flow) ───────────────

  /**
   * Stores the verified Google identity in a short-lived HttpOnly cookie while
   * the user completes the account-linking step (entering their password).
   */
  private setPendingOAuthToken(
    res: Response,
    googleId: string,
    googleEmail: string,
  ): void {
    const secret = this.configService.get<string>('OAUTH_PENDING_JWT_SECRET')!;
    const token = jwt.sign(
      { googleId, googleEmail, purpose: 'oauth_pending' },
      secret,
      { expiresIn: '10m' },
    );

    res.cookie(OAUTH_PENDING_COOKIE, token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
      maxAge: 10 * 60 * 1000,
    });
  }

  private clearPendingOAuthToken(res: Response): void {
    res.clearCookie(OAUTH_PENDING_COOKIE, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
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

  private getFrontendUrl(): string {
    return (
      this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173'
    );
  }
}
