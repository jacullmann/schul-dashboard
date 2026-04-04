import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import { authenticator } from '@otplib/preset-v11';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../common/email/email.service';
import { AppConfig } from '../config/env.config';
import { JwtService } from '../common/jwt/jwt.service';
import { generateUserName } from '../common/utils/name-generator.util';
import { decryptData } from '../common/utils/encryption.util';
import { rotateCsrfToken } from '../common/middleware/csrf.middleware';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { MFA_PENDING_COOKIE } from '../common/guards/mfa-auth.guard';
import { Response } from 'express';

function isWeakPassword(password: string): boolean {
  if (password.length < 8) return true;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return !(hasLetter && hasNumber);
}

const WEAK_PASSWORD_MSG =
  'Password must be at least 8 characters long and contain letters and numbers.';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly appConfig: AppConfig,
    private readonly jwtService: JwtService,
  ) {
    authenticator.options = { step: 30, window: 1 };
  }

  // ─── Private: cookie helpers ─────────────────────────────────────────────

  private setAuthToken(
    res: Response,
    userId: string,
    email: string,
    globalRole: string,
    activeGroupId: string | null,
  ) {
    const payload = {
      sub: userId,
      email,
      gRole: globalRole || 'user',
      gId: activeGroupId || null,
    };

    const token = this.jwtService.signUserToken(payload, {
      expiresIn: '7d',
    });
    res.cookie(COOKIE_NAME, token, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private generateMfaPendingToken(
    res: Response,
    userId: string,
    email: string,
  ) {
    const token = this.jwtService.signMfaPendingToken(
      { sub: userId, email, purpose: 'mfa_pending' },
      { expiresIn: '5m' },
    );

    res.cookie(MFA_PENDING_COOKIE, token, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
    });
  }

  private clearMfaPendingToken(res: Response) {
    res.clearCookie(MFA_PENDING_COOKIE, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
    });
  }

  private clearAuthToken(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
    });
  }

  // ─── Public: login ────────────────────────────────────────────────────────

  async login(email: string, password: string, res: Response, _ip?: string) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select(
        'id, email, password_hash, email_verified, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)',
      )
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const ok = await bcrypt.compare(password, user.password_hash as string);
    if (!ok) {
      // Log the failed attempt for security monitoring. We log only when the
      // user record exists to avoid inserting orphan activity rows; we still
      // return the same generic error so the email is not confirmed to callers.
      await sb.from('user_activity').insert({
        user_id: user.id,
        type: 'auth:login_failed',
        meta: { ip: _ip, reason: 'bad_password' },
      });
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
    if (ban) {
      throw new ForbiddenException('Your account has been suspended.');
    }

    if (user.mfa_enabled && user.mfa_secret) {
      this.generateMfaPendingToken(res, user.id as string, email);
      return { ok: true, requiresMfa: true };
    }

    rotateCsrfToken(res, this.appConfig);
    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const { error: mfaDeleteErr } = await sb
      .from('mfa_pending_secrets')
      .delete()
      .eq('user_id', user.id);
    if (mfaDeleteErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    const userRoles = user.user_roles as any[];
    const globalRole =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';

    const { data: firstGroup } = await sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .not('tenant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    this.setAuthToken(
      res,
      user.id as string,
      user.email as string,
      globalRole,
      firstGroup?.tenant_id || null,
    );

    return { ok: true };
  }

  // ─── Public: MFA verification ─────────────────────────────────────────────

  async verifyMfa(
    code: string,
    userId: string,
    email: string,
    res: Response,
    ip?: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select(
        'id, email, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)',
      )
      .eq('id', userId)
      .maybeSingle();

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      this.clearMfaPendingToken(res);
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new UnauthorizedException('Authentication failed.');
    }

    const secret = await decryptData(user.mfa_secret, userId);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      await sb.from('user_activity').insert({
        user_id: userId,
        type: 'auth:mfa_login_failed',
        meta: { ip },
      });
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new UnauthorizedException('Authentication failed.');
    }

    this.clearMfaPendingToken(res);
    rotateCsrfToken(res, this.appConfig);

    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    const { error: mfaDeleteErr } = await sb
      .from('mfa_pending_secrets')
      .delete()
      .eq('user_id', userId);
    if (mfaDeleteErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'auth:mfa_login', meta: {} });

    const userRoles = user.user_roles as any[];
    const globalRole =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';

    const { data: firstGroup } = await sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .not('tenant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    this.setAuthToken(
      res,
      user.id as string,
      user.email as string,
      globalRole,
      firstGroup?.tenant_id || null,
    );

    return { ok: true };
  }

  cancelMfa(res: Response) {
    this.clearMfaPendingToken(res);
    return { ok: true };
  }

  // ─── Public: registration ─────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    preferences?: Record<string, any>,
  ) {
    if (isWeakPassword(password)) {
      throw new BadRequestException(WEAK_PASSWORD_MSG);
    }

    const sb = this.supabaseService.getClient();
    const { data: exists } = await sb
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (exists) {
      throw new BadRequestException('Email address is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const defaultPreferences = {
      theme: 'system',
      language: 'de',
      personalized: 'true',
    };
    // Only carry over known preference keys to prevent arbitrary data storage.
    const ALLOWED_PREF_KEYS = new Set(Object.keys(defaultPreferences));
    const sanitizedPrefs = Object.fromEntries(
      Object.entries(preferences || {}).filter(([k]) =>
        ALLOWED_PREF_KEYS.has(k),
      ),
    );
    const mergedPreferences = { ...defaultPreferences, ...sanitizedPrefs };

    const { data: user, error } = await sb
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        email_verified: false,
        preferences: mergedPreferences,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('Registration failed.');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = dayjs().add(2, 'day').toISOString();
    await sb
      .from('verifications')
      .insert({ email: user.email, token, expires_at: expiresAt });

    const verifyUrl = `${this.appConfig.clientVerifyUrl}?token=${token}`;

    try {
      await this.emailService.sendVerificationEmail(user.email, verifyUrl);
      return {
        ok: true,
        message:
          'Registration successful. Please check your inbox and spam folder.',
      };
    } catch (_mailErr) {
      return {
        ok: true,
        message:
          'Registration successful but the confirmation email could not be sent.',
      };
    }
  }

  // ─── Public: logout ───────────────────────────────────────────────────────

  logout(res: Response) {
    this.clearAuthToken(res);
    this.clearMfaPendingToken(res);
    rotateCsrfToken(res, this.appConfig);
    return { ok: true };
  }

  // ─── Public: profile ──────────────────────────────────────────────────────

  async getMe(userId: string, activeGroupId: string | null) {
    if (!userId) return { authenticated: false };

    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('*, user_roles(tenant_id, roles(name))')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return { authenticated: false };

    const userRoles = user.user_roles as any[];
    const globalRoleName =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
    const tenantRoleName =
      userRoles?.find((ur) => ur.tenant_id === activeGroupId)?.roles?.name ||
      null;

    const { data: userCourses } = await sb
      .from('user_courses')
      .select('subject_id, course_id')
      .eq('user_id', userId);

    const mappedCourses = (userCourses || []).map((uc: any) => ({
      subjectId: uc.subject_id,
      courseId: uc.course_id
    }));

    return {
      authenticated: true,
      id: user.id,
      email: user.email,
      role: globalRoleName,
      tenantRole: tenantRoleName,
      emailVerified: !!user.email_verified,
      courses: mappedCourses,
      doneSetup: !!user.done_setup,
      personalized: user.personalized !== false,
      mfaEnabled: !!user.mfa_enabled,
      preferences: user.preferences,
    };
  }

  // ─── Public: account deletion ─────────────────────────────────────────────

  async deleteMe(userId: string, res: Response) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, user_roles(roles(name))')
      .eq('id', userId)
      .maybeSingle();
    if (!user) throw new BadRequestException('User not found.');

    const userRoles = user.user_roles as any[];
    if (userRoles?.some((ur) => ur.roles?.name === 'superadmin')) {
      throw new ForbiddenException('Admin accounts cannot be deleted.');
    }

    const { data: ownedGroups } = await sb
      .from('groups')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (ownedGroups && ownedGroups.length > 0) {
      throw new BadRequestException(
        'You own at least one group. Transfer or delete the group before deleting your account.',
      );
    }

    const { error: deleteErr } = await sb
      .from('users')
      .delete()
      .eq('id', userId);
    if (deleteErr) {
      throw new InternalServerErrorException('Failed to delete account.');
    }

    this.clearAuthToken(res);
    this.clearMfaPendingToken(res);
    rotateCsrfToken(res, this.appConfig);
    return { ok: true };
  }

  // ─── Public: email verification ───────────────────────────────────────────

  async verifyEmail(token: string) {
    const sb = this.supabaseService.getClient();
    const { data: ver } = await sb
      .from('verifications')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (!ver) throw new BadRequestException('Invalid verification token.');
    if (dayjs(ver.expires_at).isBefore(dayjs()))
      throw new BadRequestException('Verification token has expired.');

    const { data: user } = await sb
      .from('users')
      .select('id')
      .eq('email', ver.email)
      .maybeSingle();
    if (!user) throw new BadRequestException('User not found.');

    const { error: verifyErr } = await sb
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id);
    if (verifyErr) {
      throw new InternalServerErrorException('Failed to verify email.');
    }

    const { error: deleteErr } = await sb
      .from('verifications')
      .delete()
      .eq('email', ver.email);
    if (deleteErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    return { ok: true };
  }

  // ─── Public: password reset ───────────────────────────────────────────────

  async forgotPassword(email: string) {
    email = email.toLowerCase();
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!user) {
      // Return the same message regardless to prevent user enumeration.
      return {
        ok: true,
        message: 'If the email exists, a recovery email has been sent.',
      };
    }

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = dayjs().add(30, 'minute').toISOString();

    await sb
      .from('password_resets')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false);
    await sb
      .from('password_resets')
      .insert({ email, code, expires_at: expiresAt });

    try {
      await this.emailService.sendPasswordResetEmail(email, code);
    } catch {
      // Swallow mail errors to prevent user enumeration.
    }

    return {
      ok: true,
      message: 'If the email exists, a recovery email has been sent.',
    };
  }

  async verifyResetToken(email: string, code: string) {
    email = email.toLowerCase();
    code = code.trim();
    const sb = this.supabaseService.getClient();

    const { data: pr } = await sb
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pr) throw new BadRequestException('Invalid reset code.');
    if (dayjs(pr.expires_at).isBefore(dayjs()))
      throw new BadRequestException('Reset code has expired.');

    const { error: markUsedErr } = await sb
      .from('password_resets')
      .update({ used: true })
      .eq('id', pr.id);
    if (markUsedErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    const resetToken = this.jwtService.signPasswordResetToken(
      { email, purpose: 'password_reset' },
      { expiresIn: '15m' },
    );

    return { ok: true, resetToken };
  }

  async resetPassword(resetToken: string, password: string) {
    if (isWeakPassword(password)) {
      throw new BadRequestException(WEAK_PASSWORD_MSG);
    }

    let payload: any;
    try {
      payload = this.jwtService.verifyPasswordResetToken(resetToken);
    } catch {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (payload?.purpose !== 'password_reset' || !payload?.email) {
      throw new BadRequestException('Invalid reset token.');
    }

    const email = String(payload.email).toLowerCase();
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, mfa_enabled')
      .eq('email', email)
      .maybeSingle();

    if (!user) throw new BadRequestException('User not found.');

    const passwordHash = await bcrypt.hash(password, 12);
    await sb
      .from('users')
      .update({
        password_hash: passwordHash,
        mfa_enabled: false,
        mfa_secret: null,
      })
      .eq('id', user.id);

    const { error: activityErr } = await sb.from('user_activity').insert({
      user_id: user.id,
      type: 'account:password_reset',
      meta: {
        by: 'self',
        mfaWasEnabled: !!user.mfa_enabled,
        mfaDisabled: true,
      },
    });
    if (activityErr) {
      throw new InternalServerErrorException('Error saving user activity.');
    }

    try {
      await this.emailService.sendSecurityEmail(email);
    } catch {
      // Security notification failure is non-critical.
    }

    return {
      ok: true,
      message: 'Password reset successfully. MFA has been disabled.',
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (isWeakPassword(newPassword)) {
      throw new BadRequestException(WEAK_PASSWORD_MSG);
    }

    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .maybeSingle();
    if (!user) throw new BadRequestException('User not found.');

    const isCorrect = await bcrypt.compare(
      currentPassword,
      user.password_hash as string,
    );
    if (!isCorrect)
      throw new ForbiddenException('Current password is incorrect.');

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await sb
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    const { error: activityErr } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'account:password_change',
      meta: { by: 'self' },
    });
    if (activityErr) {
      throw new InternalServerErrorException('Error saving user activity.');
    }

    return { ok: true, message: 'Password changed successfully.' };
  }

  // ─── OAuth helpers (used by OAuthService) ────────────────────────────────

  /**
   * Issues a full JWT session for a user. Queries the DB for their global role
   * and first tenant group, then sets the auth_token cookie.
   * Used by OAuthService after successful Google authentication.
   */
  async createUserSession(
    userId: string,
    email: string,
    res: Response,
  ): Promise<void> {
    const sb = this.supabaseService.getClient();

    const { data: roleData } = await sb
      .from('user_roles')
      .select('roles(name), tenant_id')
      .eq('user_id', userId);

    const userRoles = (roleData ?? []) as unknown as Array<{
      tenant_id: string | null;
      roles: { name: string } | null;
    }>;
    const globalRole =
      userRoles.find((ur) => !ur.tenant_id)?.roles?.name || 'user';

    const { data: firstGroup } = await sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .not('tenant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    this.setAuthToken(
      res,
      userId,
      email,
      globalRole,
      firstGroup?.tenant_id || null,
    );
  }

  /**
   * Issues an MFA-pending token for a user mid-authentication.
   * Used by OAuthService when Google OAuth identifies a user who has MFA enabled.
   */
  issueMfaPendingToken(userId: string, email: string, res: Response): void {
    this.generateMfaPendingToken(res, userId, email);
  }

  async getGroups(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: userRoles, error } = await sb
      .from('user_roles')
      .select('tenant_id, groups(id, name, owner_id), roles(name)')
      .eq('user_id', userId)
      .not('tenant_id', 'is', null);

    if (error) throw new BadRequestException('Error loading groups.');

    const groups = (userRoles || [])
      .filter((ur: any) => ur.groups?.id)
      .map((ur: any) => ({
        id: ur.groups.id,
        name: ur.groups.name,
        ownerId: ur.groups.owner_id,
        role: ur.roles?.name,
        generatedName: generateUserName(userId, ur.groups.id),
      }));

    return { groups };
  }
}
